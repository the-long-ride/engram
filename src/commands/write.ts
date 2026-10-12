/** Write commands: save, save-session, take-control, and the working tier (promote, working prune, working note). */
import path from 'node:path';
import { stdin as input, stdout as output } from 'node:process';
import { createInterface } from 'node:readline/promises';
import { entryPath, getContext } from '../core/memory/context.js';
import { generatedMemoryGuidance, inferMemoryType, normalizeMemoryType, parseMemoryCandidate, parseMemoryCandidates, saveSessionGuidance, type MemoryCandidate } from '../core/memory/memory-candidate.js';
import type { MemorySourceMeta } from '../core/memory/memory-template.js';
import { displayExactDuplicateScore, planMemorySave, previewSavePlans, scoreDisplaysAsExactDuplicate, type PinnedVerdict, type SavePlan, type SavePreviewOptions } from '../core/memory/save-plan.js';
import { applyApprovedSupersedes } from '../core/memory/save-supersede.js';
import type { SaveRelatedHint } from '../core/memory/save-plan.js';
import { OBJECTIVE_MAX_CHARS, parseMemory } from '../core/memory/schema.js';
import { isWorkingPath } from '../core/runtime/constants.js';
import { frontmatterStringList, parseFrontmatter } from '../core/memory/frontmatter.js';
import { classifyTaskType, normalizeTaskType, TASK_TYPES, type TaskType } from '../core/memory/task-classifier.js';
import { writeApprovedMemory } from '../core/memory/storage.js';
import { requireResolvedAuthor } from '../core/author/resolve.js';
import type { ResolvedAuthor } from '../core/author/types.js';
import type { EngramContext } from '../core/memory/context.js';
import type { InboxCandidate } from '../core/runtime/types.js';
import { buildReceipt, writeReceipt } from '../core/review/inbox.js';
import { discoverTakeControlSources, isDefaultTakeControlScan, planTakeControlSources, renderTakeControlPlan, takeControlGuidance, takeControlRefreshGuidance } from '../core/memory/take-control.js';
import { planRefresh, refreshCandidate, refreshRejection, type RefreshCandidates, type RefreshPlan } from '../core/memory/refresh.js';
import { hostImportSourceMeta, hostPresetFromFlags, planHostImport } from '../core/memory/host-memory-plan.js';
import { clearStaleKeys, workspaceOrigin } from '../core/memory/freshness.js';
import { parseSaveTarget, writeScopes } from '../core/runtime/config.js';
import type { EngramConfig, MemoryType, Scope } from '../core/runtime/types.js';
import { applyApprovalEdit, queuePromptAnswer, readPipedPromptAnswer, requestApproval, requestGeneratedMemoryApproval, requestGeneratedSelectionApproval, requestGeneratedSelectionText, requestSelectionApproval, type SelectionApproval } from '../core/safety/approval.js';
import { readText, readTextFromStdin } from '../core/system/fsx.js';
import { today } from '../core/system/text.js';
import { crossTierUpdateAdvice, promoteWorking, pruneWorking, undatedWorkingFiles, workingTierMeta } from '../core/memory/working-tier.js';
import { normalizeRef } from '../core/memory/memory-ref.js';
import { describeNote, planNote, writeNote, type NoteCandidate, type NoteMarker, type NoteWritten } from '../core/memory/working-note.js';
import { cmdWorkingNote } from './working-note.js';
import { isTraceExpired } from '../core/traces/codec.js';
import { readTrace } from '../core/traces/storage.js';

export type SaveSessionCandidateRunOptions = {
  ctx: EngramContext;
  text: string;
  scopes: Scope[];
  flags?: Record<string, any>;
  source?: MemorySourceMeta;
  dryRunLabel?: string;
  forceLabel?: string;
  forceRerunCommand?: string;
};

/** Draft, approve, and write a memory. */
export async function cmdSave(args: string[], flags: Record<string, any>): Promise<string> {
  const explicitType = normalizeMemoryType(args[0]);
  let type: MemoryType = explicitType ?? inferMemoryType(args.join(' '));
  let text = (explicitType ? args.slice(1) : args).join(' ').trim();
  if (!explicitType && await shouldSwitchToSaveSession(text)) return cmdSaveSession([text], flags);
  const ctx = await getContext();
  const scopes = saveScopes(ctx, flags);
  const author = await requireResolvedAuthor(process.cwd());
  const role = rolesFromFlags(flags);
  const explicitTaskType = explicitTaskTypeFromFlags(flags);
  const previewOptions = previewOptionsFromFlags(flags);
  const force = flags.force === true || flags.f === true;
  // Generated text (no inline text) is always previewed interactively, so --force only skips the preview for inline text.
  const unpreviewed = force && Boolean(text);
  let approval;
  let plans: SavePlan[] = [];
  if (!text) {
    const captured = await requestGeneratedMemoryApproval(async (generated) => {
      const candidate = parseMemoryCandidate(generated, { explicitType });
      type = candidate.type;
      text = candidate.text;
      const resolvedTaskType = await saveTaskType(text, flags, explicitTaskType);
      plans = await planSingleCandidate(ctx, { ...candidate, role, taskType: resolvedTaskType }, scopes, author);
      return previewSavePlans(plans, previewOptions);
    }, { explicitType, guidance: generatedMemoryGuidance(explicitType, { ruleLineTarget: ctx.config.memory.rule_line_target, ruleLineHardLimit: ctx.config.memory.rule_line_hard_limit }) });
    if (!captured) return 'Discarded. No file written.';
    approval = captured.approval;
  } else {
    const taskType = await saveTaskType(text, flags, explicitTaskType);
    const candidate = parseMemoryCandidate(text, { explicitType });
    type = candidate.type;
    text = candidate.text;
    const guard = scopeGuardFor(force);
    plans = await planSingleCandidate(ctx, { ...candidate, role, taskType }, scopes, author, guard);
    if (!plans.length) return withScopeDeferrals('No file written.', guard);
    approval = force ? { accepted: true } : await requestApproval(previewSavePlans(plans, previewOptions));
  }
  if (!approval.accepted) return 'Discarded. No file written.';
  // An unpreviewed (--force) save never applies a SUPERSEDE; a numberless single save is explicit, so a NOOP is still written.
  const { ready, held } = unpreviewed ? holdSupersedes(plans) : { ready: approveSupersedes(plans), held: [] };
  if (!ready.length) return ['No file written.', ...held].join('\n');
  return withHeld(await writeSavePlans(ready, approval.edits), held);
}

/** Propose multiple memories from a long session summary or agent brainstorm. */
export async function cmdSaveSession(args: string[], flags: Record<string, any> = {}, source?: MemorySourceMeta): Promise<string> {
  const ctx = await getContext();
  let scopes = saveScopes(ctx, flags);
  const author = await requireResolvedAuthor(process.cwd());
  const role = rolesFromFlags(flags);
  const explicitTaskType = explicitTaskTypeFromFlags(flags);
  const force = flags.force === true || flags.f === true;
  const guard = scopeGuardFor(force);
  const queryLevel = queryLevelFromFlags(flags);
  const guidance = saveSessionGuidance({ queryLevel, limits: { ruleLineTarget: ctx.config.memory.rule_line_target, ruleLineHardLimit: ctx.config.memory.rule_line_hard_limit } });
  const previewOptions = previewOptionsFromFlags(flags);
  const sessionInput = await saveSessionInput(ctx, args, flags);
  let text = sessionInput.text;
  const sessionSource = mergeMemorySourceMeta(sessionInput.source, source);
  scopes = evidenceBoundScopes(scopes, sessionSource?.evidenceScope, flags);
  let plans: SavePlan[] = [];
  let approval: SelectionApproval | undefined = force ? { accepted: true } : undefined;
  if (!text) {
    if (force) {
      text = await requestGeneratedSelectionText({ guidance, acceptAll: true }) ?? '';
      if (!text) return 'Discarded. No file written.';
    }
    else {
      const captured = await requestGeneratedSelectionApproval(async (generated) => {
        text = generated;
        plans = await planSaveSessionCandidates(ctx, generated, scopes, author, role, sessionSource, explicitTaskType);
        return previewSavePlans(plans, previewOptions);
      }, { guidance });
      if (!captured) return 'Discarded. No file written.';
      approval = captured.approval;
    }
  } else {
    plans = await planSaveSessionCandidates(ctx, text, scopes, author, role, sessionSource, explicitTaskType, guard);
    if (!force) approval = await requestSelectionApproval(previewSavePlans(plans, previewOptions));
  }
  if (force && text && !plans.length) plans = await planSaveSessionCandidates(ctx, text, scopes, author, role, sessionSource, explicitTaskType, guard);
  if (!plans.length) return guard?.deferred.length ? withScopeDeferrals('No file written.', guard) : 'No memory candidates detected.';
  if (!approval?.accepted) return 'Discarded. No file written.';
  const selection = selectApprovedPlans(plans, approval, force);
  plans = selection.plans;
  if (!plans.length) return noneWritten(selection);
  if (force) {
    const inboxOptions = flags.inbox === true && text ? { ctx, text, role } : undefined;
    return withScopeDeferrals(await writeForcedSaveSessionPlans(plans, approval.edits, 'Forced save-session candidates (--force).', inboxOptions), guard);
  }
  return withHeld(await writeSavePlans(approveSupersedes(plans), approval.edits), selection.skipped);
}

/** Run supplied save-session candidate lines through the normal approval/write path. */
export async function runSaveSessionCandidates(options: SaveSessionCandidateRunOptions): Promise<string> {
  const author = await requireResolvedAuthor(process.cwd());
  const role = rolesFromFlags(options.flags ?? {});
  const force = options.flags?.force === true || options.flags?.f === true;
  const previewOptions = previewOptionsFromFlags(options.flags ?? {});
  const guard = scopeGuardFor(force && options.flags?.['dry-run'] !== true);
  const plans = await planSaveSessionCandidates(options.ctx, options.text, options.scopes, author, role, options.source, explicitTaskTypeFromFlags(options.flags ?? {}), guard);
  if (!plans.length) return guard?.deferred.length ? withScopeDeferrals('No file written.', guard) : 'No memory candidates detected.';
  if (options.flags?.['dry-run'] === true) return `${options.dryRunLabel ?? 'Save-session dry-run'}\n${previewSavePlans(plans, previewOptions)}`;
  let approval: SelectionApproval | undefined = force ? { accepted: true } : await requestSelectionApproval(previewSavePlans(plans, previewOptions));
  if (!approval?.accepted) return 'Discarded. No file written.';
  const selection = selectApprovedPlans(plans, approval, force);
  const selectedPlans = selection.plans;
  if (!selectedPlans.length) return noneWritten(selection);
  if (force) {
    const restructure = forceRestructureResponse(selectedPlans, options.forceRerunCommand, previewOptions);
    if (restructure) return withScopeDeferrals(restructure, guard);
  }
  // --force has no preview, so a SUPERSEDE is held back and only listed.
  const { ready, held } = force ? holdSupersedes(selectedPlans) : { ready: approveSupersedes(selectedPlans), held: selection.skipped };
  if (!ready.length) return withScopeDeferrals(['No file written.', ...held].join('\n'), guard);
  const saved = withHeld(await writeSavePlans(ready, approval.edits), held);
  return force ? withScopeDeferrals(`${options.forceLabel ?? 'Forced save-session candidates (--force).'}\n${saved}`, guard) : saved;
}

/** Convert existing workspace guidance into approved Engram memories with agent help. */
export async function cmdTakeControl(args: string[], flags: Record<string, any> = {}): Promise<string> {
  const ctx = await getContext();
  // E21 --from: validated first, so a bad preset or an incompatible flag fails before anything is read.
  const hostPreset = hostPresetFromFlags(flags);
  // D17 --refresh: only the memories in stale.json, re-digested from their own source files.
  const refresh = flags.refresh === true ? await planRefresh(ctx, flags) : undefined;
  if (refresh && !refresh.targets.length) return 'No stale memories to refresh. Run engram verify --sources to check source files.';
  const objective = objectiveFromFlags(flags);
  // An objective scan re-reads already imported guidance: it asks for task memories the earlier import did not need.
  const imported = objective ? undefined : await importedSourceHashes(ctx);
  const known = imported ? { 'known-source-hashes': imported } : {};
  const host = hostPreset ? await planHostImport(process.cwd(), hostPreset, flags, imported ?? new Set()) : undefined;
  const plan = refresh ? refresh.plan : host ? host.plan : await planTakeControlSources(process.cwd(), ctx.ignorePatterns, { ...flags, ...known });
  if (flags.plan === true) return flags.json === true ? JSON.stringify(plan, null, 2) : renderTakeControlPlan(plan);
  const force = flags.force === true || flags.f === true;
  const sources = plan.sources;
  const guidance = refresh
    ? takeControlRefreshGuidance(refresh.targets, sources, { acceptAll: force, budgetTokens: plan.budgetTokens })
    : takeControlGuidance(sources, { acceptAll: force, omitted: isDefaultTakeControlScan(plan) ? 0 : plan.omitted, budgetTokens: plan.budgetTokens, objective, ...(host ? { hostPreset: host.root.preset } : {}) });
  if (flags['dry-run']) return guidance;
  if (!refresh && !sources.length && !args.join(' ').trim()) {
    return host
      ? `No importable host memory files found. Run engram take-control --from ${host.root.preset} --plan to see why files were skipped.`
      : 'No workspace guidance files found. Try engram take-control --all or --file <path>.';
  }
  const scopes = saveScopes(ctx, flags);
  const author = await requireResolvedAuthor(process.cwd());
  const role = rolesFromFlags(flags);
  const explicitTaskType = explicitTaskTypeFromFlags(flags);
  const previewOptions = previewOptionsFromFlags(flags);
  const guard = scopeGuardFor(force);
  let text = args.join(' ').trim();
  let plans: SavePlan[] = [];
  let approval: SelectionApproval | undefined = force ? { accepted: true } : undefined;
  const source = refresh ? undefined : host ? await hostImportSourceMeta(host.root, sources) : takeControlSourceMeta(sources, await workspaceOrigin(ctx.cwd));
  const planText = (candidates: string, scopeGuard?: ScopeGuard) => {
    refresh?.skipped.splice(0);
    return planSaveSessionCandidates(ctx, candidates, scopes, author, role, source, explicitTaskType, scopeGuard, objective, refresh);
  };
  const preview = (planned: SavePlan[]) => withRefreshSkips(previewSavePlans(planned, previewOptions), refresh);
  if (!text) {
    if (force) text = await requestGeneratedSelectionText({ guidance, acceptAll: true }) ?? '';
    else {
      const captured = await requestGeneratedSelectionApproval(async (generated) => {
        text = generated;
        plans = await planText(generated);
        return preview(plans);
      }, { guidance });
      if (!captured) return 'Discarded. No file written.';
      approval = captured.approval;
    }
  } else {
    plans = await planText(text, guard);
    if (!force) approval = await requestSelectionApproval(preview(plans));
  }
  if (force && text && !plans.length) plans = await planText(text, guard);
  if (!plans.length) {
    if (refresh?.skipped.length) return withScopeDeferrals(withRefreshSkips('No file written.', refresh), guard);
    return guard?.deferred.length ? withScopeDeferrals('No file written.', guard) : 'No memory candidates detected.';
  }
  if (!approval?.accepted) return 'Discarded. No file written.';
  const selection = selectApprovedPlans(plans, approval, force);
  plans = selection.plans;
  if (!plans.length) return noneWritten(selection);
  if (force && flags.metacognize === true) {
    const restructure = forceRestructureResponse(plans, takeControlMetacognizeRerunCommand(flags), previewOptions);
    if (restructure) return withScopeDeferrals(restructure, guard);
  }
  // --force has no preview, so a SUPERSEDE is held back (like the other forced paths) and only listed.
  const { ready, held } = force ? holdSupersedes(plans) : { ready: approveSupersedes(plans), held: selection.skipped };
  plans = ready;
  if (!plans.length) return withScopeDeferrals(['No file written.', ...held].join('\n'), guard);
  const saved = withHeld(await writeSavePlans(plans, approval.edits), held);
  // The refreshed memories now record their current source hashes; drop them from stale.json right away.
  if (refresh) await clearStaleKeys(ctx.roots.workspace, plans.map((plan) => `${plan.scope}:${plan.file}`));
  const prefix = force ? 'Take-control forced candidates (--force).' : `Take-control ${refresh ? 'refresh ' : ''}consumed ${sources.length} source file${sources.length === 1 ? '' : 's'}.`;
  return withScopeDeferrals(withRefreshSkips(`${prefix}\n${saved}`, refresh), guard);
}

/** take-control --refresh: candidates that were not an UPDATE of a stale memory, listed and never written. */
function withRefreshSkips(output: string, refresh?: RefreshPlan): string {
  const skipped = [...new Set(refresh?.skipped ?? [])];
  return skipped.length ? `${output}\n\nRefresh candidates skipped (not written):\n${skipped.join('\n')}` : output;
}

/**
 * `A` and `B` without numbers drop NOOP plans (listed in `skipped`); `A 1,3` writes exactly the numbered ones, NOOP included.
 * An unpreviewed `--force` keeps every plan: its duplicates are deferred by the related-memory check instead.
 */
function selectApprovedPlans(plans: SavePlan[], approval: { selected?: number[] }, force = false): { plans: SavePlan[]; skipped: string[] } {
  if (approval.selected?.length) return { plans: plans.filter((plan) => plan.candidateIndex === undefined || approval.selected?.includes(plan.candidateIndex)), skipped: [] };
  if (force) return { plans, skipped: [] };
  const skipped = plans.filter((plan) => plan.verdict.kind === 'NOOP').map((plan) => `Skipped candidate ${plan.candidateIndex ?? 1}: NOOP duplicate of ${plan.verdict.target} (select it by number to write anyway).`);
  return { plans: plans.filter((plan) => plan.verdict.kind !== 'NOOP'), skipped };
}

function noneWritten(selection: { skipped: string[] }): string {
  return selection.skipped.length ? ['No candidates written.', ...selection.skipped].join('\n') : 'Discarded. No selected candidates written.';
}

/** Unpreviewed (--force) writes never apply a SUPERSEDE: hold those plans back and say how to review them. */
function holdSupersedes(plans: SavePlan[]): { ready: SavePlan[]; held: string[] } {
  const held = plans.filter((plan) => plan.verdict.kind === 'SUPERSEDE');
  return {
    ready: plans.filter((plan) => plan.verdict.kind !== 'SUPERSEDE'),
    held: held.map((plan) => `Candidate ${plan.candidateIndex ?? 1}: not written\n${supersedeAction(plan)}`)
  };
}

/** Mark the SUPERSEDE plans a human previewed and accepted; only a marked plan may retire its target. */
function approveSupersedes(plans: SavePlan[]): SavePlan[] {
  return plans.map((plan) => (plan.verdict.kind === 'SUPERSEDE' ? { ...plan, supersedeApproved: true } : plan));
}

function supersedeAction(plan: SavePlan): string {
  return `Action: rerun without --force to review SUPERSEDE ${plan.verdict.target}`;
}

function withHeld(output: string, lines: string[]): string {
  return lines.length ? `${output}\n${lines.join('\n')}` : output;
}

/** A parsed candidate plus the role and task type its proposal previewed; `note` marks a working-tier note (engram_note). */
export type PlannedCandidate = MemoryCandidate & { taskType?: TaskType; note?: NoteMarker };
/**
 * `objective` is the command's `--objective` text, stored on working-tier (`OBJECTIVE: task`) memories. `refresh`
 * (take-control --refresh) limits candidates to UPDATEs of those stale memories, each with its own source metadata.
 */
export type PlanCandidateOptions = { source?: MemorySourceMeta; explicitTaskType?: TaskType; indexes?: number[]; scopeGuard?: ScopeGuard; objective?: string; refresh?: RefreshCandidates };
/**
 * Unpreviewed (--force) writes: a candidate whose own SCOPE leaves the command scope is deferred and listed, never
 * written, since force-mode candidates may come from untrusted sources. Previews and MCP token commits show the target.
 */
export type ScopeGuard = { deferred: string[] };

function scopeGuardFor(force: boolean): ScopeGuard | undefined {
  return force ? { deferred: [] } : undefined;
}

function withScopeDeferrals(output: string, guard?: ScopeGuard): string {
  const deferred = [...new Set(guard?.deferred ?? [])];
  return deferred.length ? `${output}\n\nCandidates outside the command scope (not written):\n${deferred.join('\n')}` : output;
}

/**
 * Write human-approved candidates through the `save-session --force` path (MCP `engram_commit`).
 * Candidates are planned exactly as their proposal previewed them; `indexes` keeps the proposal's 1-based numbering.
 * `expected` are the verdicts the proposal pinned: a SUPERSEDE is applied only while its recomputed verdict still
 * matches, and is deferred (with no write) when it changed or was never pinned.
 */
export async function commitApprovedCandidates(cwd: string, candidates: PlannedCandidate[], scope: EngramConfig['scope'], indexes?: number[], expected?: PinnedVerdict[], sink?: { notes: NoteWritten[] }): Promise<string> {
  const ctx = await getContext(cwd);
  const scopes = writeScopes(scope, ctx.config).filter((current) => Boolean(ctx.roots[current]));
  if (!scopes.length) throw new Error('save target requires global memory; set ENGRAM_GLOBAL_DIR or run engram inject --global-path <path>');
  const author = await requireResolvedAuthor(ctx.cwd);
  if (candidates.some((candidate) => candidate.note)) return commitApprovedNotes(ctx, candidates, scopes, author, sink);
  const plans = await planCandidates(ctx, candidates, scopes, author, { indexes });
  if (!plans.length) return 'No memory candidates detected.';
  const { kept, changed } = checkPinnedVerdicts(plans, expected);
  if (!kept.length) return ['No candidates written.', ...changed].join('\n');
  const written = await writeForcedSaveSessionPlans(kept, undefined, 'Approved candidates committed (engram_commit).', undefined, ctx.cwd);
  return withHeld(written, changed);
}

/** An approved engram_note proposal: each note is re-sanitized and planned into the working tier, never merged into durable memory. */
async function commitApprovedNotes(ctx: EngramContext, candidates: PlannedCandidate[], scopes: Scope[], author: ResolvedAuthor, sink?: { notes: NoteWritten[] }): Promise<string> {
  if (candidates.some((candidate) => !candidate.note)) throw new Error('a note proposal cannot be committed together with other candidates');
  const lines: string[] = [];
  for (const candidate of candidates) {
    const written = await writeNote(ctx.cwd, await planNote(ctx, candidate as NoteCandidate, scopes, author));
    sink?.notes.push(written);
    lines.push(describeNote(written));
  }
  return lines.join('\n');
}

/**
 * A plan whose pinned or recomputed verdict is SUPERSEDE must match the pin exactly; one that drifted is dropped with a
 * line. Without a pin a SUPERSEDE stays unapproved, so the related-memory check defers it.
 */
function checkPinnedVerdicts(plans: SavePlan[], expected?: PinnedVerdict[]): { kept: SavePlan[]; changed: string[] } {
  const changed: string[] = [];
  const kept = plans.filter((plan) => {
    const pinned = expected?.find((item) => item.candidate === (plan.candidateIndex ?? 1) && item.scope === plan.scope);
    if (!pinned) return true;
    const same = pinned.kind === plan.verdict.kind && (pinned.target ?? '') === (plan.verdict.target ?? '');
    if (same) {
      if (plan.verdict.kind === 'SUPERSEDE') plan.supersedeApproved = true;
      return true;
    }
    if (pinned.kind !== 'SUPERSEDE' && plan.verdict.kind !== 'SUPERSEDE') return true;
    const now = plan.verdict.target ? `${plan.verdict.kind} ${plan.verdict.target}` : plan.verdict.kind;
    changed.push(`Candidate ${plan.candidateIndex ?? 1}: not written. Verdict changed since the proposal (now ${now}); propose again.`);
    return false;
  });
  return { kept, changed };
}

/** A single `save` previews one unnumbered candidate through the shared planner (so per-candidate SCOPE applies). */
async function planSingleCandidate(ctx: EngramContext, candidate: PlannedCandidate, scopes: Scope[], author: ResolvedAuthor, scopeGuard?: ScopeGuard): Promise<SavePlan[]> {
  return (await planCandidates(ctx, [candidate], scopes, author, { scopeGuard })).map((plan) => ({ ...plan, candidateIndex: undefined }));
}

async function planSaveSessionCandidates(ctx: EngramContext, text: string, scopes: Scope[], author: ResolvedAuthor, role?: string[], source?: MemorySourceMeta, explicitTaskType?: TaskType, scopeGuard?: ScopeGuard, objective?: string, refresh?: RefreshCandidates): Promise<SavePlan[]> {
  return planCandidates(ctx, parseMemoryCandidates(text).map((candidate) => ({ ...candidate, role })), scopes, author, { source, explicitTaskType, scopeGuard, objective, refresh });
}

/**
 * Shared planner for save-session, take-control, MCP proposals, and engram_commit; each candidate uses its own role.
 * D16: an `OBJECTIVE: task` candidate plans a working-tier memory (`working/`, `tier: working`, TTL `valid_until`).
 */
export async function planCandidates(ctx: EngramContext, candidates: PlannedCandidate[], scopes: Scope[], author: ResolvedAuthor, options: PlanCandidateOptions = {}): Promise<SavePlan[]> {
  const { explicitTaskType, indexes, scopeGuard, objective } = options;
  const day = today();
  const plans: SavePlan[] = [];
  for (const [position, proposed] of candidates.entries()) {
    const candidateIndex = indexes?.[position] ?? position + 1;
    const refreshed = options.refresh ? refreshCandidate(options.refresh.targets, proposed) : undefined;
    if (options.refresh && !refreshed) {
      options.refresh.skipped.push(`Candidate ${candidateIndex}: ${refreshRejection(options.refresh.targets, proposed)}`);
      continue;
    }
    const candidate = refreshed?.candidate ?? proposed;
    const source = refreshed?.source ?? options.source;
    const taskType = explicitTaskType ?? candidate.taskType ?? classifyTaskType(candidate.text).taskType;
    if (scopeGuard && candidate.scope && !scopes.includes(candidate.scope)) {
      scopeGuard.deferred.push(`Candidate ${candidateIndex} requests SCOPE: ${candidate.scope} outside command scope ${scopes.join('+')}; not written. Rerun without --force to review it, or with --scope ${candidate.scope}|both.`);
      continue;
    }
    const target = candidateScopes(ctx, candidate, scopes, source?.evidenceScope);
    const candidatePlans = await planMemorySave({
      ctx,
      text: candidate.text,
      type: candidate.type,
      scopes: target.scopes,
      authorName: author.name,
      authorEmail: author.email,
      role: candidate.role,
      context: candidate.context,
      triggers: candidate.triggers,
      dependsOn: candidate.dependsOn,
      level: candidate.level,
      updateId: candidate.updateId,
      parent: candidate.parent,
      source,
      taskType,
      variants: candidate.variants,
      directive: candidate.directive,
      appliesTo: candidate.appliesTo,
      working: candidate.objective === 'task' ? workingTierMeta(ctx.config, day, objective) : undefined
    });
    plans.push(...candidatePlans.map((plan) => ({
      ...plan,
      candidateIndex,
      ...(target.note ? { scopeNote: target.note } : {}),
      ...(candidate.objective ? { objective: candidate.objective } : {})
    })));
  }
  return plans;
}

/**
 * D15: a candidate's own SCOPE replaces the command scope. The target must be available exactly as an explicit
 * `--scope` would require, evidence stays in its own scope, and any override is named in the preview (`note`).
 */
function candidateScopes(ctx: EngramContext, candidate: PlannedCandidate, scopes: Scope[], evidenceScope?: Scope): { scopes: Scope[]; note?: string } {
  if (!candidate.scope) return { scopes };
  if (evidenceScope && candidate.scope !== evidenceScope) {
    throw new Error(`Evidence belongs to ${evidenceScope} scope; candidate SCOPE: ${candidate.scope} cannot move it`);
  }
  if (!writeScopes(candidate.scope, ctx.config).includes(candidate.scope) || !ctx.roots[candidate.scope]) {
    throw new Error(candidate.scope === 'global'
      ? 'candidate SCOPE: global requires global memory; set ENGRAM_GLOBAL_DIR or run engram inject --global-path <path>'
      : `candidate SCOPE: workspace is not available for active profile ${ctx.profile.active || '<none>'}`);
  }
  const same = scopes.length === 1 && scopes[0] === candidate.scope;
  return { scopes: [candidate.scope], ...(same ? {} : { note: `candidate SCOPE: ${candidate.scope} overrides command scope ${scopes.join('+')}` }) };
}

export function forceRestructureResponse(plans: SavePlan[], rerunCommand = 'engram save-session --force', previewOptions: SavePreviewOptions = {}): string {
  const pending = plans.filter((plan) => unresolvedRelatedHints(plan).length);
  if (!pending.length) return '';
  const exactDuplicates = pending.flatMap((plan) => (plan.related ?? [])
    .filter((hint) => hint.action === 'possible-duplicate' && scoreDisplaysAsExactDuplicate(hint.score))
    .map((hint) => ({ plan, hint })));
  if (exactDuplicates.length) {
    const duplicateLines = exactDuplicates.map(({ plan, hint }) =>
      `Candidate ${plan.candidateIndex ?? 1}: memory id ${hint.id} already covers this (${hint.scope}:${hint.file}, score ${displayExactDuplicateScore(hint.score)}).`);
    const updateLines = exactDuplicates.map(({ plan, hint }) =>
      `TYPE: ${kindFromPlan(plan)} | TEXT: ... | UPDATE: ${hint.id}`);
    return [
      exactDuplicates.length === 1
        ? 'Existing memory already covers this candidate.'
        : 'Existing memories already cover one or more candidates.',
      ...duplicateLines,
      'No file written.',
      'If you need to extend one, rerun with:',
      ...updateLines,
      'Do not retry as a new memory.',
      '',
      previewSavePlans(pending, previewOptions)
    ].filter(Boolean).join('\n');
  }
  return [
    'Forced save-session candidates (--force), but Engram found related memories before writing.',
    `No file written yet. Agent action: brainstorm a restructured candidate set and rerun \`${rerunCommand}\`.`,
    ...pending.filter((plan) => plan.verdict.kind === 'SUPERSEDE').map(supersedeAction),
    'Use `DEPENDS_ON: memory-id` when a candidate builds on existing memory; use `UPDATE: memory-id` when it should merge into a possible duplicate; omit candidates that are already covered.',
    '',
    previewSavePlans(pending, previewOptions)
  ].join('\n');
}

async function writeForcedSaveSessionPlans(
  plans: SavePlan[],
  edits: string | undefined,
  label: string,
  inboxOptions?: { ctx: EngramContext; text: string },
  cwd = process.cwd()
): Promise<string> {
  const { ready, deferred } = splitForcedSaveSessionPlans(plans);
  const lines = [label];
  // Only plans whose SUPERSEDE was approved (a still-matching pinned verdict) are ever ready; the rest were deferred above.
  if (ready.length) lines.push(await writeSavePlans(ready, edits, cwd));
  else lines.push('No candidates written. All candidates require related-memory review.');
  const deferredWithReceipts = inboxOptions ? await attachReceipts(deferred, inboxOptions) : deferred.map((item) => ({ item, receiptId: undefined }));
  if (deferredWithReceipts.length) lines.push('', renderDeferredSaveSessionPlans(deferredWithReceipts));
  return lines.join('\n');
}

async function attachReceipts(
  deferred: Array<{ plan: SavePlan; hints: SaveRelatedHint[] }>,
  inboxOptions: { ctx: EngramContext; text: string; role?: string[] }
): Promise<Array<{ item: { plan: SavePlan; hints: SaveRelatedHint[] }; receiptId?: string }>> {
  const candidates = parseMemoryCandidates(inboxOptions.text);
  const out: Array<{ item: { plan: SavePlan; hints: SaveRelatedHint[] }; receiptId?: string }> = [];
  for (const item of deferred) {
    const idx = (item.plan.candidateIndex ?? 1) - 1;
    const candidate = candidates[idx];
    let receiptId: string | undefined;
    if (candidate) {
      const inboxCandidate: InboxCandidate = {
        type: candidate.type,
        text: candidate.text,
        scope: item.plan.scope,
        ...(inboxOptions.role?.length ? { role: inboxOptions.role } : {}),
        ...(candidate.role?.length ? { role: candidate.role } : {}),
        ...(candidate.context ? { context: candidate.context } : {}),
        ...(candidate.triggers?.length ? { triggers: candidate.triggers } : {}),
        ...(candidate.dependsOn?.length ? { dependsOn: candidate.dependsOn } : {}),
        ...(candidate.level ? { level: candidate.level } : {}),
        ...(candidate.updateId ? { updateId: candidate.updateId } : {}),
        ...(candidate.parent?.length ? { parent: candidate.parent } : {}),
        // D16: a task candidate stays task-scoped through the inbox; apply writes it to the working tier.
        ...(candidate.objective === 'task' ? { objective: 'task' as const } : {}),
        ...(candidate.appliesTo?.length ? { appliesTo: candidate.appliesTo } : {}),
        ...(candidate.directive ? { directive: candidate.directive } : {})
      };
      const receipt = buildReceipt({
        scope: item.plan.scope,
        source: 'save-session',
        candidate: inboxCandidate,
        related_ids: uniqueHintIds(item.hints)
      });
      const root = inboxOptions.ctx.roots[item.plan.scope];
      if (root) receiptId = await writeReceipt(root, receipt);
    }
    out.push({ item, receiptId });
  }
  return out;
}

function splitForcedSaveSessionPlans(plans: SavePlan[]): { ready: SavePlan[]; deferred: Array<{ plan: SavePlan; hints: SaveRelatedHint[] }> } {
  const ready: SavePlan[] = [];
  const deferred: Array<{ plan: SavePlan; hints: SaveRelatedHint[] }> = [];
  for (const plan of plans) {
    const hints = unresolvedRelatedHints(plan);
    if (hints.length) deferred.push({ plan, hints });
    else ready.push(plan);
  }
  return { ready, deferred };
}

function renderDeferredSaveSessionPlans(deferred: Array<{ item: { plan: SavePlan; hints: SaveRelatedHint[] }; receiptId?: string }>): string {
  const lines = [
    'Deferred candidates not written.',
    'Load related memory IDs, then rerun only deferred candidates with DEPENDS_ON or UPDATE.'
  ];
  for (const entry of deferred) {
    const item = entry.item;
    const candidate = item.plan.candidateIndex ?? 1;
    const type = kindFromPlan(item.plan);
    const dependencyIds = uniqueHintIds(item.hints.filter((hint) => hint.action === 'suggested-dependency'));
    const relatedIds = uniqueHintIds(item.hints);
    lines.push(
      `Candidate ${candidate}: not written`,
      `Type: ${type}`,
      `Scope: ${item.plan.scope}`,
      `Related IDs: ${relatedIds.join(', ')}`,
      `Inspect: engram load --id ${relatedIds.join(',')}`
    );
    if (entry.receiptId) lines.push(`Receipt: engram review inspect ${entry.receiptId}`, `Apply:   engram review apply ${entry.receiptId}`);
    if (dependencyIds.length) lines.push(`Action: rerun with DEPENDS_ON: ${dependencyIds.join(', ')}`);
    if (item.plan.verdict.kind === 'SUPERSEDE') lines.push(supersedeAction(item.plan));
    lines.push(...updateActions(item.plan.file, item.hints.filter((hint) => hint.action === 'possible-duplicate')));
  }
  return lines.join('\n');
}

/** `UPDATE: <id>` actions for possible duplicates; a duplicate in the other tier gets the action that can succeed. */
function updateActions(planFile: string, duplicates: SaveRelatedHint[]): string[] {
  const sameTier = uniqueHintIds(duplicates.filter((hint) => !crossTierUpdateAdvice(planFile, hint.file, hint.id)));
  const lines = sameTier.length ? [`Action: rerun with UPDATE: ${sameTier.join(', ')}`] : [];
  for (const hint of duplicates) {
    const advice = crossTierUpdateAdvice(planFile, hint.file, hint.id);
    if (advice) lines.push(`Action: ${advice}`);
  }
  return [...new Set(lines)];
}

function uniqueHintIds(hints: SaveRelatedHint[]): string[] {
  return [...new Set(hints.map((hint) => hint.id).filter(Boolean))];
}

function unresolvedRelatedHints(plan: SavePlan) {
  const dependsOn = frontmatterStrings(parseMemory(plan.content).frontmatter.depends_on).map((ref) => normalizeRef(ref));
  const dependencyIntent = hasDependencyIntent(plan.content);
  return (plan.related ?? []).filter((hint) => {
    // Hints for memories the candidate explicitly declared as children (PARENT: ...)
    // are intentional generalization, not unresolved overlap — never defer on them.
    if (hint.declaredChild) return false;
    // A SUPERSEDE target is a possible-duplicate hint, so without approval it stays deferred (the human never saw the verdict).
    if (plan.verdict.kind === 'SUPERSEDE' && hint.id === plan.verdict.target) return plan.supersedeApproved !== true;
    if (hint.action === 'possible-duplicate') return plan.action !== 'update';
    return dependencyIntent && !dependsOn.includes(normalizeRef(hint.id)) && !dependsOn.includes(normalizeRef(hint.file));
  });
}

/** Source hashes durable memories already imported; task-scoped working memories never hide a source from later scans. */
async function importedSourceHashes(ctx: EngramContext): Promise<Set<string>> {
  const hashes = new Set<string>();
  for (const entry of ctx.index.entries.filter((item) => !isWorkingPath(item.file))) {
    try {
      const raw = await readText(entryPath(ctx, entry.scope, entry.file));
      const doc = parseMemory(raw);
      for (const hash of frontmatterStrings(doc.frontmatter.source_hashes)) hashes.add(hash);
    } catch {
      continue;
    }
  }
  return hashes;
}

/**
 * D17: code/config/manifest sources record their digest hash (`source_hash_mode: digest`); docs keep the raw hash.
 * `origin` is the workspace fingerprint a global memory records so other workspaces never check or refresh it.
 */
function takeControlSourceMeta(sources: Awaited<ReturnType<typeof discoverTakeControlSources>>, origin: string): MemorySourceMeta | undefined {
  if (!sources.length) return undefined;
  return {
    source: 'take-control',
    sourceFiles: sources.map((source) => source.file),
    sourceHashes: sources.map((source) => source.digestHash ?? source.hash),
    ...(sources.some((source) => source.digestHash) ? { sourceHashMode: 'digest' as const } : {}),
    sourceOrigin: origin
  };
}

function frontmatterStrings(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string' && Boolean(item.trim()));
  return typeof value === 'string' && value.trim() ? [value] : [];
}

function hasDependencyIntent(text: string): boolean {
  return /\b(depends? on|builds? on|based on|extends?|requires?|prerequisite|foundation|foundational|follow(?:s|ing)?|must follow)\b/i.test(text);
}


function takeControlMetacognizeRerunCommand(flags: Record<string, any>): string {
  const parts = ['engram take-control --metacognize --force'];
  if (typeof flags.scope === 'string' && flags.scope.trim()) parts.push(`--scope ${flags.scope.trim()}`);
  return parts.join(' ');
}

type SaveSessionInput = { text: string; source?: MemorySourceMeta };

async function saveSessionInput(ctx: EngramContext, args: string[], flags: Record<string, any>): Promise<SaveSessionInput> {
  const files = [
    ...(Array.isArray(flags.file) ? flags.file : typeof flags.file === 'string' ? [flags.file] : []),
  ];
  if (files.length > 1) throw new Error('save-session accepts only one --file');
  const file = files[0] ?? '';
  const inline = args.join(' ').trim();
  if (!file) return { text: inline };
  if (inline) throw new Error('save-session accepts either --file or inline text, not both');
  if (file === '-') return { text: await readTextFromStdin() };
  const absolute = path.resolve(file);
  const raw = await readText(absolute);
  const parsed = parseFrontmatter(raw);
  if (!parsed.rawBlock || parsed.data.authority !== 'evidence' || !parsed.data.trace_id) {
    return {
      text: raw,
      source: { sourceFiles: [path.relative(process.cwd(), absolute).replace(/\\/g, '/')] }
    };
  }

  const sourceScope = evidenceWrapperScope(ctx, absolute);
  if (!sourceScope) throw new Error('Evidence wrapper must be inside a configured Engram inbox');
  const traceIds = frontmatterStringList(parsed.data.trace_id);
  if (traceIds.length !== 1) throw new Error('Evidence wrapper must reference exactly one trace');
  const trace = await readTrace(ctx.roots[sourceScope], traceIds[0]);
  if (!trace) throw new Error(`Missing evidence trace: ${traceIds[0]}`);
  if (isTraceExpired(trace)) throw new Error(`Expired evidence trace: ${trace.traceId}`);
  const wrapperHash = frontmatterStringList(parsed.data.source_hash);
  if (wrapperHash.length && (wrapperHash.length !== 1 || wrapperHash[0] !== trace.sourceHash)) {
    throw new Error(`Evidence wrapper source hash mismatch: ${trace.traceId}`);
  }

  return {
    text: trace.text,
    source: {
      source: trace.source,
      sourceFiles: [path.relative(process.cwd(), absolute).replace(/\\/g, '/')],
      sourceHashes: [trace.sourceHash],
      evidenceRefs: [trace.traceId],
      derivedFrom: [trace.sessionId],
      evidenceScope: sourceScope
    }
  };
}

function evidenceWrapperScope(ctx: EngramContext, absolute: string): Scope | undefined {
  for (const scope of ['workspace', 'global'] as const) {
    const root = ctx.roots[scope];
    if (!root) continue;
    const relative = path.relative(path.resolve(root), absolute);
    const insideRoot = relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
    if (insideRoot && relative.replace(/\\/g, '/').startsWith('inbox/')) return scope;
  }
  return undefined;
}

function evidenceBoundScopes(scopes: Scope[], evidenceScope: Scope | undefined, flags: Record<string, any>): Scope[] {
  if (!evidenceScope) return scopes;
  const explicit = typeof flags.scope === 'string' && Boolean(flags.scope.trim());
  if (explicit && (scopes.length !== 1 || scopes[0] !== evidenceScope)) {
    throw new Error(`Evidence belongs to ${evidenceScope} scope; rerun with --scope ${evidenceScope}`);
  }
  return [evidenceScope];
}

function mergeMemorySourceMeta(first?: MemorySourceMeta, second?: MemorySourceMeta): MemorySourceMeta | undefined {
  if (!first && !second) return undefined;
  if (first?.evidenceScope && second?.evidenceScope && first.evidenceScope !== second.evidenceScope) {
    throw new Error('Cannot combine evidence from different scopes in one save-session operation');
  }
  const unique = (values: string[]) => [...new Set(values.map((value) => value.trim()).filter(Boolean))];
  return {
    source: second?.source ?? first?.source,
    sourceFiles: unique([...(first?.sourceFiles ?? []), ...(second?.sourceFiles ?? [])]),
    sourceHashes: unique([...(first?.sourceHashes ?? []), ...(second?.sourceHashes ?? [])]),
    evidenceRefs: unique([...(first?.evidenceRefs ?? []), ...(second?.evidenceRefs ?? [])]),
    derivedFrom: unique([...(first?.derivedFrom ?? []), ...(second?.derivedFrom ?? [])]),
    evidenceScope: second?.evidenceScope ?? first?.evidenceScope
  };
}

/**
 * Write the approved plans, then retire each SUPERSEDE target (through the same approved-write path). A SUPERSEDE plan
 * without `supersedeApproved` (the human never saw the verdict) is refused rather than half-applied.
 */
async function writeSavePlans(plans: SavePlan[], edits?: string, cwd = process.cwd()): Promise<string> {
  if (plans.some((plan) => plan.verdict.kind === 'SUPERSEDE' && plan.supersedeApproved !== true)) throw new Error('SUPERSEDE needs a previewed approval; rerun without --force');
  const written = [];
  for (const plan of plans) {
    const content = applyApprovalEdit(plan.content, edits);
    written.push(await writeApprovedMemory({ cwd, scope: plan.scope, file: plan.file, content, message: plan.message }));
  }
  return [`Saved -> ${written.join(', ')}`, ...await applyApprovedSupersedes(cwd, plans)].join('\n');
}

async function shouldSwitchToSaveSession(text: string): Promise<boolean> {
  if (!text || !process.stdin.isTTY || !process.stdout.isTTY || !looksLikeLongSession(text)) return false;
  const rl = createInterface({ input, output });
  try {
    const answer = (await rl.question('This looks like a long session. Use engram save-session to propose multiple memories? [y/N] ')).trim();
    return /^y(es)?$/i.test(answer);
  } finally {
    rl.close();
  }
}

function looksLikeLongSession(text: string): boolean {
  return text.length > 800 || text.split(/\r?\n/).filter(Boolean).length >= 8;
}

function rolesFromFlags(flags: Record<string, any>): string[] | undefined {
  const value = typeof flags.role === 'string' ? flags.role : typeof flags.roles === 'string' ? flags.roles : '';
  const roles = value.split(',').map((role) => role.trim()).filter(Boolean);
  return roles.length ? roles : undefined;
}

function saveScopes(ctx: EngramContext, flags: Record<string, any>): Scope[] {
  const requested = typeof flags.scope === 'string' ? flags.scope.trim() : '';
  const explicitProfile = typeof flags.profile === 'string' ? flags.profile.trim() : '';
  const target = requested
    ? parseSaveTarget(requested, 'save --scope')
    : explicitProfile && ctx.profile.workspace_default && explicitProfile !== ctx.profile.workspace_default
      ? 'global'
    : ctx.config.scope;
  if (requested && target !== 'workspace' && !ctx.roots.global) {
    throw new Error('save --scope requires global memory; set ENGRAM_GLOBAL_DIR or run engram inject --global-path <path>');
  }
  const configured = writeScopes(target, ctx.config);
  const available = configured.filter((scope) => Boolean(ctx.roots[scope]));
  if (requested && available.length !== configured.length) {
    throw new Error(`save --scope ${requested} is not available for active profile ${ctx.profile.active || '<none>'}`);
  }
  if (!available.length) throw new Error('save target requires global memory; set ENGRAM_GLOBAL_DIR, create a profile, or run engram inject --global-path <path>');
  return available;
}

function queryLevelFromFlags(flags: Record<string, any>): number | undefined {
  const value = flags['query-level'];
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || !/^\d+$/.test(value)) throw new Error('save-session --query-level must be a positive integer');
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) throw new Error('save-session --query-level must be a positive integer');
  return parsed;
}

/** `take-control --objective "<text>"`: one line, at most OBJECTIVE_MAX_CHARS. */
function objectiveFromFlags(flags: Record<string, any>): string | undefined {
  if (flags.objective === undefined) return undefined;
  const objective = typeof flags.objective === 'string' ? flags.objective.replace(/\s+/g, ' ').trim() : '';
  if (!objective) throw new Error('take-control --objective expects text, e.g. --objective "add billing export"');
  if (objective.length > OBJECTIVE_MAX_CHARS) throw new Error(`take-control --objective must be <= ${OBJECTIVE_MAX_CHARS} characters`);
  return objective;
}

function previewOptionsFromFlags(flags: Record<string, any>): SavePreviewOptions {
  return { showRuleVariants: flags['show-rule-variants'] === true };
}

function explicitTaskTypeFromFlags(flags: Record<string, any>): TaskType | undefined {
  return typeof flags['task-type'] === 'string' ? normalizeTaskType(flags['task-type']) : undefined;
}

async function saveTaskType(text: string, flags: Record<string, any>, seed?: TaskType): Promise<TaskType> {
  if (seed) return seed;
  const classified = classifyTaskType(text);
  if (classified.taskType !== 'unknown') return classified.taskType;
  if (flags['skip-task-type-prompt'] === true) return 'unknown';
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    output.write(`Task type unclear for this save. Choose one: ${TASK_TYPES.filter((taskType) => taskType !== 'unknown').join(', ')}\n`);
    const answer = await readPipedPromptAnswer('Task type: ');
    if (!answer) return 'unknown';
    if (looksLikeApprovalAnswer(answer)) {
      queuePromptAnswer(answer);
      return 'unknown';
    }
    return normalizeTaskType(answer);
  }
  const rl = createInterface({ input, output });
  try {
    output.write(`Task type unclear for this save. Choose one: ${TASK_TYPES.filter((taskType) => taskType !== 'unknown').join(', ')}\n`);
    for (;;) {
      const answer = (await rl.question('Task type: ')).trim();
      const normalized = normalizeTaskType(answer);
      if (normalized !== 'unknown') return normalized;
      output.write(`Unknown task type. Valid values: ${TASK_TYPES.join(', ')}\n`);
    }
  } finally {
    rl.close();
  }
}

function looksLikeApprovalAnswer(answer: string): boolean {
  return /^(?:a(?:\s|$)|b(?:\s|$)|c(?:\s|$))/i.test(answer.trim());
}

function kindFromPlan(plan: SavePlan): MemoryType {
  const file = isWorkingPath(plan.file) ? plan.file.slice(plan.file.indexOf('/') + 1) : plan.file;
  if (file.startsWith('rules/')) return 'rule';
  if (file.startsWith('skills/')) return 'skill';
  return 'knowledge';
}

/** `engram promote <id>` (D16): move a working-tier memory to durable memory after A/B/C approval. */
export async function cmdPromote(args: string[]): Promise<string> {
  const id = args[0]?.trim();
  if (!id) throw new Error('promote requires a working memory id, e.g. engram promote <memory-id>');
  return promoteWorking(process.cwd(), id, requestApproval);
}

/** `engram working prune [--dry-run]` (D16): delete expired working-tier memories and list them; `engram working note` proposes one task note. */
export async function cmdWorking(args: string[], flags: Record<string, any> = {}): Promise<string> {
  if (args[0] === 'note') return cmdWorkingNote(args.slice(1), flags);
  if (args[0] !== 'prune') throw new Error('usage: engram working prune [--dry-run] | engram working note "<text>" [--objective <text>] [--type knowledge|rule] [--scope workspace|global]');
  const dryRun = flags['dry-run'] === true;
  const pruned = await pruneWorking(process.cwd(), today(), { dryRun });
  const undated = await undatedWorkingFiles(process.cwd());
  const noun = `expired working memor${pruned.length === 1 ? 'y' : 'ies'}`;
  const head = dryRun ? `Would prune ${pruned.length} ${noun} (--dry-run; nothing deleted):` : `Pruned ${pruned.length} ${noun}:`;
  const lines = pruned.length ? [head, ...pruned.map((file) => `- ${file}`)] : ['No expired working memories.'];
  // A working memory without valid_until never expires; report it so a human can promote or delete it.
  if (undated.length) lines.push('', `Kept ${undated.length} working memor${undated.length === 1 ? 'y' : 'ies'} with no valid_until (never expire; engram promote <id> or delete the file):`, ...undated.map((file) => `- ${file}`));
  return lines.join('\n');
}

