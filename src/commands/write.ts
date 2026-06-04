/** Write commands: save, save-session, and take-control. */
import path from 'node:path';
import { stdin as input, stdout as output } from 'node:process';
import { createInterface } from 'node:readline/promises';
import { entryPath, getContext } from '../core/memory/context.js';
import { generatedMemoryGuidance, inferMemoryType, normalizeMemoryType, parseMemoryCandidate, parseMemoryCandidates, saveSessionGuidance } from '../core/memory/memory-candidate.js';
import type { MemorySourceMeta } from '../core/memory/memory-template.js';
import { planMemorySave, previewSavePlans, withGlobalSaveCopy, type SavePlan } from '../core/memory/save-plan.js';
import { parseMemory } from '../core/memory/schema.js';
import { resolveAuthor, writeApprovedMemory } from '../core/memory/storage.js';
import { discoverTakeControlSources, planTakeControlSources, renderTakeControlPlan, takeControlGuidance } from '../core/memory/take-control.js';
import { writeScopes } from '../core/runtime/config.js';
import type { MemoryType, Scope } from '../core/runtime/types.js';
import { applyApprovalEdit, requestApproval, requestGeneratedMemoryApproval, requestGeneratedSelectionApproval, requestGeneratedSelectionText, requestSelectionApproval, type SelectionApproval } from '../core/safety/approval.js';
import { readText } from '../core/system/fsx.js';

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
  let approval;
  let plans: SavePlan[] = [];
  if (!text) {
    const captured = await requestGeneratedMemoryApproval(async (generated) => {
      const candidate = parseMemoryCandidate(generated, { explicitType });
      type = candidate.type;
      text = candidate.text;
      plans = await planMemorySave({ ctx, text, type, scopes, author, role });
      return previewSavePlans(plans);
    }, { explicitType, guidance: generatedMemoryGuidance(explicitType) });
    if (!captured) return 'Discarded. No file written.';
    approval = captured.approval;
  } else {
    const candidate = parseMemoryCandidate(text, { explicitType });
    type = candidate.type;
    text = candidate.text;
    plans = await planMemorySave({ ctx, text, type, scopes, author, role });
    approval = await requestApproval(previewSavePlans(plans));
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
  const acceptAll = flags['accept-all'] === true;
  const queryLevel = queryLevelFromFlags(flags);
  const guidance = saveSessionGuidance({ queryLevel });
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
        plans = await planSaveSessionCandidates(ctx, generated, scopes, author, role);
        return previewSavePlans(plans);
      }, { guidance });
      if (!captured) return 'Discarded. No file written.';
      approval = captured.approval;
    }
  } else {
    plans = await planSaveSessionCandidates(ctx, text, scopes, author, role);
    if (!acceptAll) approval = await requestSelectionApproval(previewSavePlans(plans));
  }
  if (acceptAll && text && !plans.length) plans = await planSaveSessionCandidates(ctx, text, scopes, author, role);
  if (!plans.length) return 'No memory candidates detected.';
  if (!approval?.accepted) return 'Discarded. No file written.';
  if (approval.selected?.length) plans = plans.filter((plan) => plan.candidateIndex === undefined || approval.selected?.includes(plan.candidateIndex));
  if (!plans.length) return 'Discarded. No selected candidates written.';
  const saved = await writeSavePlans(plans, approval.edits);
  return acceptAll ? `Accepted all save-session candidates (--accept-all).\n${saved}` : saved;
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
  let text = args.join(' ').trim();
  let plans: SavePlan[] = [];
  let approval: SelectionApproval | undefined = acceptAll ? { accepted: true } : undefined;
  const source = takeControlSourceMeta(sources);
  if (!text) {
    if (acceptAll) text = await requestGeneratedSelectionText({ guidance, acceptAll }) ?? '';
    else {
      const captured = await requestGeneratedSelectionApproval(async (generated) => {
        text = generated;
        plans = await planSaveSessionCandidates(ctx, generated, scopes, author, role, source);
        return previewSavePlans(plans);
      }, { guidance });
      if (!captured) return 'Discarded. No file written.';
      approval = captured.approval;
    }
  } else {
    plans = await planSaveSessionCandidates(ctx, text, scopes, author, role, source);
    if (!acceptAll) approval = await requestSelectionApproval(previewSavePlans(plans));
  }
  if (acceptAll && text && !plans.length) plans = await planSaveSessionCandidates(ctx, text, scopes, author, role, source);
  if (!plans.length) return 'No memory candidates detected.';
  if (!approval?.accepted) return 'Discarded. No file written.';
  if (approval.selected?.length) plans = plans.filter((plan) => plan.candidateIndex === undefined || approval.selected?.includes(plan.candidateIndex));
  if (!plans.length) return 'Discarded. No selected candidates written.';
  const saved = await writeSavePlans(plans, approval.edits);
  const prefix = acceptAll ? 'Take-control accepted all candidates (--accept-all).' : `Take-control consumed ${sources.length} source file${sources.length === 1 ? '' : 's'}.`;
  return `${prefix}\n${saved}`;
}

async function planSaveSessionCandidates(ctx: Awaited<ReturnType<typeof getContext>>, text: string, scopes: Scope[], author: string, role?: string[], source?: MemorySourceMeta): Promise<SavePlan[]> {
  const plans: SavePlan[] = [];
  let candidateIndex = 1;
  for (const candidate of parseMemoryCandidates(text)) {
    const candidatePlans = await planMemorySave({ ctx, text: candidate.text, type: candidate.type, scopes, author, role, source });
    plans.push(...candidatePlans.map((plan) => ({ ...plan, candidateIndex })));
    candidateIndex += 1;
  }
  return plans;
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
  if (requested && requested !== 'workspace' && requested !== 'global' && requested !== 'both') throw new Error('save --scope must be workspace, global, or both');
  const configured = requested === 'workspace' || requested === 'global' || requested === 'both'
    ? writeScopes(requested, ctx.config)
    : writeScopes(ctx.config.scope, ctx.config);
  return withGlobalSaveCopy(ctx, configured);
}

function queryLevelFromFlags(flags: Record<string, any>): number | undefined {
  const value = flags['query-level'];
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || !/^\d+$/.test(value)) throw new Error('save-session --query-level must be a positive integer');
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) throw new Error('save-session --query-level must be a positive integer');
  return parsed;
}
