/** Write commands: save, save-session, and take-control. */
import path from 'node:path';
import { stdin as input, stdout as output } from 'node:process';
import { createInterface } from 'node:readline/promises';
import { entryPath, getContext } from '../core/memory/context.js';
import { generatedMemoryGuidance, inferMemoryType, normalizeMemoryType, parseMemoryCandidate, parseMemoryCandidates, saveSessionGuidance } from '../core/memory/memory-candidate.js';
import type { MemorySourceMeta } from '../core/memory/memory-template.js';
import { planMemorySave, previewSavePlans, type SavePlan, type SavePreviewOptions } from '../core/memory/save-plan.js';
import type { SaveRelatedHint } from '../core/memory/save-plan.js';
import { parseMemory } from '../core/memory/schema.js';
import { classifyTaskType, normalizeTaskType, TASK_TYPES, type TaskType } from '../core/memory/task-classifier.js';
import { resolveAuthor, writeApprovedMemory } from '../core/memory/storage.js';
import type { EngramContext } from '../core/memory/context.js';
import type { InboxCandidate } from '../core/runtime/types.js';
import { buildReceipt, writeReceipt } from '../core/review/inbox.js';
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
      plans = await planMemorySave({ ctx, text, type, scopes, author, role, context: candidate.context, triggers: candidate.triggers, dependsOn: candidate.dependsOn, level: candidate.level, updateId: candidate.updateId, taskType: resolvedTaskType, variants: candidate.variants });
      return previewSavePlans(plans, previewOptions);
    }, { explicitType, guidance: generatedMemoryGuidance(explicitType, { ruleLineTarget: ctx.config.memory.rule_line_target, ruleLineHardLimit: ctx.config.memory.rule_line_hard_limit }) });
    if (!captured) return 'Discarded. No file written.';
    approval = captured.approval;
  } else {
    const taskType = await saveTaskType(text, flags, explicitTaskType);
    const candidate = parseMemoryCandidate(text, { explicitType });
    type = candidate.type;
    text = candidate.text;
    plans = await planMemorySave({ ctx, text, type, scopes, author, role, context: candidate.context, triggers: candidate.triggers, dependsOn: candidate.dependsOn, level: candidate.level, updateId: candidate.updateId, taskType, variants: candidate.variants });
    const force = flags.force === true || flags.f === true;
    approval = force ? { accepted: true } : await requestApproval(previewSavePlans(plans, previewOptions));
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
  const force = flags.force === true || flags.f === true;
  const queryLevel = queryLevelFromFlags(flags);
  const guidance = saveSessionGuidance({ queryLevel, limits: { ruleLineTarget: ctx.config.memory.rule_line_target, ruleLineHardLimit: ctx.config.memory.rule_line_hard_limit } });
  const previewOptions = previewOptionsFromFlags(flags);
  let text = await saveSessionInput(args, flags);
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
        plans = await planSaveSessionCandidates(ctx, generated, scopes, author, role, undefined, explicitTaskType);
        return previewSavePlans(plans, previewOptions);
      }, { guidance });
      if (!captured) return 'Discarded. No file written.';
      approval = captured.approval;
    }
  } else {
    plans = await planSaveSessionCandidates(ctx, text, scopes, author, role, undefined, explicitTaskType);
    if (!force) approval = await requestSelectionApproval(previewSavePlans(plans, previewOptions));
  }
  if (force && text && !plans.length) plans = await planSaveSessionCandidates(ctx, text, scopes, author, role, undefined, explicitTaskType);
  if (!plans.length) return 'No memory candidates detected.';
  if (!approval?.accepted) return 'Discarded. No file written.';
  if (approval.selected?.length) plans = plans.filter((plan) => plan.candidateIndex === undefined || approval.selected?.includes(plan.candidateIndex));
  if (!plans.length) return 'Discarded. No selected candidates written.';
  if (force) {
    const inboxOptions = flags.inbox === true && text ? { ctx, text, role } : undefined;
    return writeForcedSaveSessionPlans(plans, approval.edits, 'Forced save-session candidates (--force).', inboxOptions);
  }
  const saved = await writeSavePlans(plans, approval.edits);
  return saved;
}

/** Run supplied save-session candidate lines through the normal approval/write path. */
export async function runSaveSessionCandidates(options: SaveSessionCandidateRunOptions): Promise<string> {
  const author = await resolveAuthor();
  const role = rolesFromFlags(options.flags ?? {});
  const force = options.flags?.force === true || options.flags?.f === true;
  const previewOptions = previewOptionsFromFlags(options.flags ?? {});
  const plans = await planSaveSessionCandidates(options.ctx, options.text, options.scopes, author, role, options.source, explicitTaskTypeFromFlags(options.flags ?? {}));
  if (!plans.length) return 'No memory candidates detected.';
  if (options.flags?.['dry-run'] === true) return `${options.dryRunLabel ?? 'Save-session dry-run'}\n${previewSavePlans(plans, previewOptions)}`;
  let approval: SelectionApproval | undefined = force ? { accepted: true } : await requestSelectionApproval(previewSavePlans(plans, previewOptions));
  if (!approval?.accepted) return 'Discarded. No file written.';
  let selectedPlans = plans;
  if (approval.selected?.length) {
    selectedPlans = plans.filter((plan) => plan.candidateIndex === undefined || approval.selected?.includes(plan.candidateIndex));
  }
  if (!selectedPlans.length) return 'Discarded. No selected candidates written.';
  if (force) {
    const restructure = forceRestructureResponse(selectedPlans, options.forceRerunCommand, previewOptions);
    if (restructure) return restructure;
  }
  const saved = await writeSavePlans(selectedPlans, approval.edits);
  return force ? `${options.forceLabel ?? 'Forced save-session candidates (--force).'}\n${saved}` : saved;
}

/** Convert existing workspace guidance into approved Engram memories with agent help. */
export async function cmdTakeControl(args: string[], flags: Record<string, any> = {}): Promise<string> {
  const ctx = await getContext();
  const sourceHashes = await importedSourceHashes(ctx);
  const takeControlFlags = { ...flags, 'known-source-hashes': sourceHashes };
  if (flags.plan === true) return renderTakeControlPlan(await planTakeControlSources(process.cwd(), ctx.ignorePatterns, takeControlFlags));
  const force = flags.force === true || flags.f === true;
  const sources = await discoverTakeControlSources(process.cwd(), ctx.ignorePatterns, takeControlFlags);
  const guidance = takeControlGuidance(sources, { acceptAll: force });
  if (flags['dry-run']) return guidance;
  if (!sources.length && !args.join(' ').trim()) return 'No workspace guidance files found. Try engram take-control --all or --file <path>.';
  const scopes = saveScopes(ctx, flags);
  const author = await resolveAuthor();
  const role = rolesFromFlags(flags);
  const explicitTaskType = explicitTaskTypeFromFlags(flags);
  const previewOptions = previewOptionsFromFlags(flags);
  let text = args.join(' ').trim();
  let plans: SavePlan[] = [];
  let approval: SelectionApproval | undefined = force ? { accepted: true } : undefined;
  const source = takeControlSourceMeta(sources);
  if (!text) {
    if (force) text = await requestGeneratedSelectionText({ guidance, acceptAll: true }) ?? '';
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
    if (!force) approval = await requestSelectionApproval(previewSavePlans(plans, previewOptions));
  }
  if (force && text && !plans.length) plans = await planSaveSessionCandidates(ctx, text, scopes, author, role, source, explicitTaskType);
  if (!plans.length) return 'No memory candidates detected.';
  if (!approval?.accepted) return 'Discarded. No file written.';
  if (approval.selected?.length) plans = plans.filter((plan) => plan.candidateIndex === undefined || approval.selected?.includes(plan.candidateIndex));
  if (!plans.length) return 'Discarded. No selected candidates written.';
  if (force && flags.metacognize === true) {
    const restructure = forceRestructureResponse(plans, takeControlMetacognizeRerunCommand(flags), previewOptions);
    if (restructure) return restructure;
  }
  const saved = await writeSavePlans(plans, approval.edits);
  const prefix = force ? 'Take-control forced candidates (--force).' : `Take-control consumed ${sources.length} source file${sources.length === 1 ? '' : 's'}.`;
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
      triggers: candidate.triggers,
      dependsOn: candidate.dependsOn,
      level: candidate.level,
      updateId: candidate.updateId,
      source,
      taskType,
      variants: candidate.variants
    });
    plans.push(...candidatePlans.map((plan) => ({ ...plan, candidateIndex })));
    candidateIndex += 1;
  }
  return plans;
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
    'Use `DEPENDS_ON: memory-id` when a candidate builds on existing memory; use `UPDATE: memory-id` when it should merge into a possible duplicate; omit candidates that are already covered.',
    '',
    previewSavePlans(pending, previewOptions)
  ].join('\n');
}

async function writeForcedSaveSessionPlans(
  plans: SavePlan[],
  edits: string | undefined,
  label: string,
  inboxOptions?: { ctx: EngramContext; text: string }
): Promise<string> {
  const { ready, deferred } = splitForcedSaveSessionPlans(plans);
  const lines = [label];
  if (ready.length) lines.push(await writeSavePlans(ready, edits));
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
        ...(candidate.updateId ? { updateId: candidate.updateId } : {})
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
    const updateIds = uniqueHintIds(item.hints.filter((hint) => hint.action === 'possible-duplicate'));
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
    if (updateIds.length) lines.push(`Action: rerun with UPDATE: ${updateIds.join(', ')}`);
  }
  return lines.join('\n');
}

function uniqueHintIds(hints: SaveRelatedHint[]): string[] {
  return [...new Set(hints.map((hint) => hint.id).filter(Boolean))];
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

function scoreDisplaysAsExactDuplicate(score: number): boolean {
  return Math.round((score + Number.EPSILON) * 100) >= 100;
}

function displayExactDuplicateScore(score: number): string {
  return scoreDisplaysAsExactDuplicate(score)
    ? '1.00'
    : score.toFixed(2);
}

function takeControlMetacognizeRerunCommand(flags: Record<string, any>): string {
  const parts = ['engram take-control --metacognize --force'];
  if (typeof flags.scope === 'string' && flags.scope.trim()) parts.push(`--scope ${flags.scope.trim()}`);
  return parts.join(' ');
}

async function saveSessionInput(args: string[], flags: Record<string, any>): Promise<string> {
  const files = [
    ...(Array.isArray(flags.file) ? flags.file : typeof flags.file === 'string' ? [flags.file] : []),
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

function kindFromPlan(plan: SavePlan): MemoryType {
  if (plan.file.startsWith('rules/')) return 'rule';
  if (plan.file.startsWith('skills/')) return 'skill';
  return 'knowledge';
}

