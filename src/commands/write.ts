/** Write commands: save, save-session, and take-control. */
import path from 'node:path';
import { stdin as input, stdout as output } from 'node:process';
import { createInterface } from 'node:readline/promises';
import { entryPath, getContext } from '../core/memory/context.js';
import { generatedMemoryGuidance, inferMemoryType, normalizeMemoryType, parseMemoryCandidate, parseMemoryCandidates, saveSessionGuidance } from '../core/memory/memory-candidate.js';
import type { MemorySourceMeta } from '../core/memory/memory-template.js';
import { planMemorySave, previewSavePlans, type SavePlan, type SavePreviewOptions } from '../core/memory/save-plan.js';
import { parseMemory } from '../core/memory/schema.js';
import { classifyTaskType, normalizeTaskType, TASK_TYPES, type TaskType } from '../core/memory/task-classifier.js';
import { resolveAuthor, writeApprovedMemory } from '../core/memory/storage.js';
import { discoverTakeControlSources, planTakeControlSources, renderTakeControlPlan, takeControlGuidance } from '../core/memory/take-control.js';
import { parseSaveTarget, writeScopes } from '../core/runtime/config.js';
import type { MemoryType, Scope } from '../core/runtime/types.js';
import { applyApprovalEdit, queuePromptAnswer, readPipedPromptAnswer, requestApproval, requestGeneratedMemoryApproval, requestGeneratedSelectionApproval, requestGeneratedSelectionText, requestSelectionApproval, type SelectionApproval } from '../core/safety/approval.js';
import { readText, readTextFromStdin } from '../core/system/fsx.js';

export type SaveSessionCandidateRunOptions = {
  ctx: Awaited<ReturnType<typeof getContext>>;
  text: string;
  scopes: Scope[];
  flags?: Record<string, any>;
  source?: MemorySourceMeta;
  dryRunLabel?: string;
  acceptAllLabel?: string;
  acceptAllRerunCommand?: string;
};

/** Draft, approve, and write a memory. */
export async function cmdSave(args: string[], flags: Record<string, any>): Promise<string> {
  const explicitType = normalizeMemoryType(args[0]);
  let type: MemoryType = explicitType ?? inferMemoryType(args.join(' '));
  let text = (explicitType ? args.slice(1) : args).join(' ').trim();
  if (!explicitType && await shouldSwitchToSaveSession(text)) return cmdSaveSession([text], flags);
  const ctx = await getContext();
  const scopes = saveScopes(ctx, flags);
  const author = await resolveAuthor();
  const role = rolesFromFlags(flags);
  const explicitTaskType = explicitTaskTypeFromFlags(flags);
  const previewOptions = previewOptionsFromFlags(flags);
  let approval;
  let plans: SavePlan[] = [];
  if (!text) {
    const captured = await requestGeneratedMemoryApproval(async (generated) => {
      const candidate = parseMemoryCandidate(generated, { explicitType });
      type = candidate.type;
      text = candidate.text;
      const resolvedTaskType = await saveTaskType(text, flags, explicitTaskType);
      plans = await planMemorySave({ ctx, text, type, scopes, author, role, context: candidate.context, triggers: candidate.triggers, dependsOn: candidate.dependsOn, level: candidate.level, updateId: candidate.updateId, taskType: resolvedTaskType });
      return previewSavePlans(plans, previewOptions);
    }, { explicitType, guidance: generatedMemoryGuidance(explicitType, { ruleLineTarget: ctx.config.memory.rule_line_target, ruleLineHardLimit: ctx.config.memory.rule_line_hard_limit }) });
    if (!captured) return 'Discarded. No file written.';
    approval = captured.approval;
  } else {
    const taskType = await saveTaskType(text, flags, explicitTaskType);
    const candidate = parseMemoryCandidate(text, { explicitType });
    type = candidate.type;
    text = candidate.text;
    plans = await planMemorySave({ ctx, text, type, scopes, author, role, context: candidate.context, triggers: candidate.triggers, dependsOn: candidate.dependsOn, level: candidate.level, updateId: candidate.updateId, taskType });
    approval = await requestApproval(previewSavePlans(plans, previewOptions));
  }
  if (!approval.accepted) return 'Discarded. No file written.';
  return writeSavePlans(plans, approval.edits);
}

/** Propose multiple memories from a long session summary or agent brainstorm. */
export async function cmdSaveSession(args: string[], flags: Record<string, any> = {}): Promise<string> {
  const ctx = await getContext();
  const scopes = saveScopes(ctx, flags);
  const author = await resolveAuthor();
  const role = rolesFromFlags(flags);
  const explicitTaskType = explicitTaskTypeFromFlags(flags);
  const acceptAll = flags['accept-all'] === true;
  const queryLevel = queryLevelFromFlags(flags);
  const guidance = saveSessionGuidance({ queryLevel, limits: { ruleLineTarget: ctx.config.memory.rule_line_target, ruleLineHardLimit: ctx.config.memory.rule_line_hard_limit } });
  const previewOptions = previewOptionsFromFlags(flags);
  let text = await saveSessionInput(args, flags);
  let plans: SavePlan[] = [];
  let approval: SelectionApproval | undefined = acceptAll ? { accepted: true } : undefined;
  if (!text) {
    if (acceptAll) {
      text = await requestGeneratedSelectionText({ guidance, acceptAll }) ?? '';
      if (!text) return 'Discarded. No file written.';
    }
    else {
      const captured = await requestGeneratedSelectionApproval(async (generated) => {
        text = generated;
        plans = await planSaveSessionCandidates(ctx, generated, scopes, author, role, undefined, explicitTaskType);
        return previewSavePlans(plans, previewOptions);
      }, { guidance });
      if (!captured) return 'Discarded. No file written.';
      approval = captured.approval;
    }
  } else {
    plans = await planSaveSessionCandidates(ctx, text, scopes, author, role, undefined, explicitTaskType);
    if (!acceptAll) approval = await requestSelectionApproval(previewSavePlans(plans, previewOptions));
  }
  if (acceptAll && text && !plans.length) plans = await planSaveSessionCandidates(ctx, text, scopes, author, role, undefined, explicitTaskType);
  if (!plans.length) return 'No memory candidates detected.';
  if (!approval?.accepted) return 'Discarded. No file written.';
  if (approval.selected?.length) plans = plans.filter((plan) => plan.candidateIndex === undefined || approval.selected?.includes(plan.candidateIndex));
  if (!plans.length) return 'Discarded. No selected candidates written.';
  if (acceptAll) {
    const restructure = acceptAllRestructureResponse(plans, undefined, previewOptions);
    if (restructure) return restructure;
  }
  const saved = await writeSavePlans(plans, approval.edits);
  return acceptAll ? `Accepted all save-session candidates (--accept-all).\n${saved}` : saved;
}

/** Run supplied save-session candidate lines through the normal approval/write path. */
export async function runSaveSessionCandidates(options: SaveSessionCandidateRunOptions): Promise<string> {
  const author = await resolveAuthor();
  const role = rolesFromFlags(options.flags ?? {});
  const acceptAll = options.flags?.['accept-all'] === true;
  const previewOptions = previewOptionsFromFlags(options.flags ?? {});
  const plans = await planSaveSessionCandidates(options.ctx, options.text, options.scopes, author, role, options.source, explicitTaskTypeFromFlags(options.flags ?? {}));
  if (!plans.length) return 'No memory candidates detected.';
  if (options.flags?.['dry-run'] === true) return `${options.dryRunLabel ?? 'Save-session dry-run'}\n${previewSavePlans(plans, previewOptions)}`;
  let approval: SelectionApproval | undefined = acceptAll ? { accepted: true } : await requestSelectionApproval(previewSavePlans(plans, previewOptions));
  if (!approval?.accepted) return 'Discarded. No file written.';
  let selectedPlans = plans;
  if (approval.selected?.length) {
    selectedPlans = plans.filter((plan) => plan.candidateIndex === undefined || approval.selected?.includes(plan.candidateIndex));
  }
  if (!selectedPlans.length) return 'Discarded. No selected candidates written.';
  if (acceptAll) {
    const restructure = acceptAllRestructureResponse(selectedPlans, options.acceptAllRerunCommand, previewOptions);
    if (restructure) return restructure;
  }
  const saved = await writeSavePlans(selectedPlans, approval.edits);
  return acceptAll ? `${options.acceptAllLabel ?? 'Accepted all save-session candidates (--accept-all).'}\n${saved}` : saved;
}

/** Convert existing workspace guidance into approved Engram memories with agent help. */
export async function cmdTakeControl(args: string[], flags: Record<string, any> = {}): Promise<string> {
  const ctx = await getContext();
  const sourceHashes = await importedSourceHashes(ctx);
  const takeControlFlags = { ...flags, 'known-source-hashes': sourceHashes };
  if (flags.plan === true) return renderTakeControlPlan(await planTakeControlSources(process.cwd(), ctx.ignorePatterns, takeControlFlags));
  const acceptAll = flags['accept-all'] === true;
  const sources = await discoverTakeControlSources(process.cwd(), ctx.ignorePatterns, takeControlFlags);
  const guidance = takeControlGuidance(sources, { acceptAll });
  if (flags['dry-run']) return guidance;
  if (!sources.length && !args.join(' ').trim()) return 'No workspace guidance files found. Try engram take-control --all or --file <path>.';
  const scopes = saveScopes(ctx, flags);
  const author = await resolveAuthor();
  const role = rolesFromFlags(flags);
  const explicitTaskType = explicitTaskTypeFromFlags(flags);
  const previewOptions = previewOptionsFromFlags(flags);
  let text = args.join(' ').trim();
  let plans: SavePlan[] = [];
  let approval: SelectionApproval | undefined = acceptAll ? { accepted: true } : undefined;
  const source = takeControlSourceMeta(sources);
  if (!text) {
    if (acceptAll) text = await requestGeneratedSelectionText({ guidance, acceptAll }) ?? '';
    else {
      const captured = await requestGeneratedSelectionApproval(async (generated) => {
        text = generated;
        plans = await planSaveSessionCandidates(ctx, generated, scopes, author, role, source, explicitTaskType);
        return previewSavePlans(plans, previewOptions);
      }, { guidance });
      if (!captured) return 'Discarded. No file written.';
      approval = captured.approval;
    }
  } else {
    plans = await planSaveSessionCandidates(ctx, text, scopes, author, role, source, explicitTaskType);
    if (!acceptAll) approval = await requestSelectionApproval(previewSavePlans(plans, previewOptions));
  }
  if (acceptAll && text && !plans.length) plans = await planSaveSessionCandidates(ctx, text, scopes, author, role, source, explicitTaskType);
  if (!plans.length) return 'No memory candidates detected.';
  if (!approval?.accepted) return 'Discarded. No file written.';
  if (approval.selected?.length) plans = plans.filter((plan) => plan.candidateIndex === undefined || approval.selected?.includes(plan.candidateIndex));
  if (!plans.length) return 'Discarded. No selected candidates written.';
  if (acceptAll && flags.metacognize === true) {
    const restructure = acceptAllRestructureResponse(plans, takeControlMetacognizeRerunCommand(flags), previewOptions);
    if (restructure) return restructure;
  }
  const saved = await writeSavePlans(plans, approval.edits);
  const prefix = acceptAll ? 'Take-control accepted all candidates (--accept-all).' : `Take-control consumed ${sources.length} source file${sources.length === 1 ? '' : 's'}.`;
  return `${prefix}\n${saved}`;
}

async function planSaveSessionCandidates(ctx: Awaited<ReturnType<typeof getContext>>, text: string, scopes: Scope[], author: string, role?: string[], source?: MemorySourceMeta, explicitTaskType?: TaskType): Promise<SavePlan[]> {
  const plans: SavePlan[] = [];
  let candidateIndex = 1;
  for (const candidate of parseMemoryCandidates(text)) {
    const taskType = explicitTaskType ?? classifyTaskType(candidate.text).taskType;
    const candidatePlans = await planMemorySave({
      ctx,
      text: candidate.text,
      type: candidate.type,
      scopes,
      author,
      role,
      context: candidate.context,
      dependsOn: candidate.dependsOn,
      level: candidate.level,
      updateId: candidate.updateId,
      source,
      taskType
    });
    plans.push(...candidatePlans.map((plan) => ({ ...plan, candidateIndex })));
    candidateIndex += 1;
  }
  return plans;
}

function acceptAllRestructureResponse(plans: SavePlan[], rerunCommand = 'engram save-session --accept-all', previewOptions: SavePreviewOptions = {}): string {
  const pending = plans.filter((plan) => unresolvedRelatedHints(plan).length);
  if (!pending.length) return '';
  return [
    'Accepted all save-session candidates (--accept-all), but Engram found related memories before writing.',
    `No file written yet. Agent action: brainstorm a restructured candidate set and rerun \`${rerunCommand}\`.`,
    'Use `DEPENDS_ON: memory-id` when a candidate builds on existing memory; use `UPDATE: memory-id` when it should merge into a possible duplicate; omit candidates that are already covered.',
    '',
    previewSavePlans(pending, previewOptions)
  ].join('\n');
}

function unresolvedRelatedHints(plan: SavePlan) {
  const dependsOn = frontmatterStrings(parseMemory(plan.content).frontmatter.depends_on).map((ref) => normalizeRef(ref));
  const dependencyIntent = hasDependencyIntent(plan.content);
  return (plan.related ?? []).filter((hint) => {
    if (hint.action === 'possible-duplicate') return plan.action !== 'update';
    return dependencyIntent && !dependsOn.includes(normalizeRef(hint.id)) && !dependsOn.includes(normalizeRef(hint.file));
  });
}

async function importedSourceHashes(ctx: Awaited<ReturnType<typeof getContext>>): Promise<Set<string>> {
  const hashes = new Set<string>();
  for (const entry of ctx.index.entries) {
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

function takeControlSourceMeta(sources: Awaited<ReturnType<typeof discoverTakeControlSources>>): MemorySourceMeta | undefined {
  if (!sources.length) return undefined;
  return {
    source: 'take-control',
    sourceFiles: sources.map((source) => source.file),
    sourceHashes: sources.map((source) => source.hash)
  };
}

function frontmatterStrings(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string' && Boolean(item.trim()));
  return typeof value === 'string' && value.trim() ? [value] : [];
}

function normalizeRef(ref: string): string {
  return ref.trim().replace(/\\/g, '/').replace(/\.md$/i, '').toLowerCase();
}

function hasDependencyIntent(text: string): boolean {
  return /\b(depends? on|builds? on|based on|extends?|requires?|prerequisite|foundation|foundational|follow(?:s|ing)?|must follow)\b/i.test(text);
}

function takeControlMetacognizeRerunCommand(flags: Record<string, any>): string {
  const parts = ['engram take-control --metacognize --accept-all'];
  if (typeof flags.scope === 'string' && flags.scope.trim()) parts.push(`--scope ${flags.scope.trim()}`);
  return parts.join(' ');
}

async function saveSessionInput(args: string[], flags: Record<string, any>): Promise<string> {
  const files = [
    ...(Array.isArray(flags.file) ? flags.file : typeof flags.file === 'string' ? [flags.file] : []),
    ...(typeof flags.f === 'string' ? [flags.f] : [])
  ];
  if (files.length > 1) throw new Error('save-session accepts only one --file');
  const file = files[0] ?? '';
  const inline = args.join(' ').trim();
  if (!file) return inline;
  if (inline) throw new Error('save-session accepts either --file or inline text, not both');
  if (file === '-') return readTextFromStdin();
  return readText(path.resolve(file));
}

async function writeSavePlans(plans: SavePlan[], edits?: string): Promise<string> {
  const written = [];
  for (const plan of plans) {
    const content = applyApprovalEdit(plan.content, edits);
    written.push(await writeApprovedMemory({ cwd: process.cwd(), scope: plan.scope, file: plan.file, content, message: plan.message }));
  }
  return `Saved -> ${written.join(', ')}`;
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

function saveScopes(ctx: Awaited<ReturnType<typeof getContext>>, flags: Record<string, any>): Scope[] {
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
