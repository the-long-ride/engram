/** D17 `take-control --refresh`: stale memories from `stale.json`, their re-digested sources, and per-memory UPDATE targets. */
import type { MemoryType, Scope } from '../runtime/types.js';
import { readText } from '../system/fsx.js';
import { entryPath, type EngramContext } from './context.js';
import { readStale, readWorkspaceSource, workspaceOrigin, workspaceRelPath } from './freshness.js';
import { matchesMemoryRef, normalizeRef } from './memory-ref.js';
import { frontmatterStringList, parseFrontmatter } from './frontmatter.js';
import type { MemoryCandidate } from './memory-candidate.js';
import type { MemorySourceMeta } from './memory-template.js';
import { planTakeControlSources, type RefreshGuidanceMemory, type TakeControlPlan, type TakeControlSource } from './take-control.js';

/** One stale memory a refresh candidate may UPDATE, and the replacement source metadata that update records. */
export type RefreshTarget = RefreshGuidanceMemory & { key: string; type: MemoryType; scope: Scope; file: string; source: MemorySourceMeta };
/** What candidate planning needs: the UPDATE targets, and the messages for candidates it skipped (refilled per plan). */
export type RefreshCandidates = { targets: RefreshTarget[]; skipped: string[] };
export type RefreshPlan = RefreshCandidates & { plan: TakeControlPlan };

/** take-control's own --max-sources ceiling; refresh reads every stale memory's sources up to it. */
const REFRESH_MAX_SOURCES = 100;

/**
 * Resolve `stale.json` keys to indexed memories (unknown keys are ignored) and re-digest their readable sources with
 * every extractor kind. Missing, rejected, and guarded files are left out, so the update drops them from the memory.
 * A global memory is refreshed only in the workspace its `source_origin` names; elsewhere its key is ignored, so this
 * workspace's files never replace its sources.
 */
export async function planRefresh(ctx: EngramContext, flags: Record<string, any> = {}): Promise<RefreshPlan> {
  const stale = await readStale(ctx.roots.workspace);
  const origin = await workspaceOrigin(ctx.cwd);
  const memories: Array<{ key: string; entry: EngramContext['index']['entries'][number]; changed: string[]; files: string[] }> = [];
  for (const [key, changed] of Object.entries(stale)) {
    const entry = ctx.index.entries.find((item) => `${item.scope}:${item.file}` === key);
    if (!entry) continue;
    let data: Record<string, any>;
    try { data = parseFrontmatter(await readText(entryPath(ctx, entry.scope, entry.file))).data; }
    catch { continue; }
    // Host-memory imports are read from a machine-local store, never from workspace files: refresh does not touch them.
    if (data.source === 'host-memory') continue;
    if (entry.scope === 'global' && data.source_origin !== origin) continue;
    const files: string[] = [];
    for (const file of frontmatterStringList(data.source_files)) {
      const rel = workspaceRelPath(file);
      if (rel && !files.includes(rel) && 'text' in await readWorkspaceSource(ctx.cwd, rel, ctx.ignorePatterns)) files.push(rel);
    }
    memories.push({ key, entry, changed, files });
  }
  const files = [...new Set(memories.flatMap((memory) => memory.files))];
  const plan = files.length
    ? await planTakeControlSources(ctx.cwd, ctx.ignorePatterns, { file: files, kind: 'all', 'max-sources': REFRESH_MAX_SOURCES, ...(flags['max-chars'] !== undefined ? { 'max-chars': flags['max-chars'] } : {}), plan: flags.plan })
    : emptyPlan();
  // Rejected sources were inspected and can be dropped; limit omissions must retain provenance and stale state.
  const selected = new Set([
    ...plan.sources.map((source) => source.file),
    ...plan.skipped.filter((source) => !source.reason.startsWith('over --')).map((source) => source.file)
  ]);
  const targets = memories.filter((memory) => memory.files.every((file) => selected.has(file))).map(({ key, entry, changed, files: memoryFiles }): RefreshTarget => {
    const sources = plan.sources.filter((source) => memoryFiles.includes(source.file));
    return {
      key, id: entry.id, type: entry.type, scope: entry.scope, file: entry.file, summary: entry.summary, changed,
      working: entry.tier === 'working',
      source: refreshSourceMeta(sources, origin)
    };
  });
  return { targets, skipped: [], plan };
}

/**
 * A refresh candidate must UPDATE one of the stale memories; anything else gets undefined and is skipped, not
 * written. It targets that memory's scope, keeps its tier (a working memory updates as `OBJECTIVE: task`), and records
 * only the sources re-read now. Explicit fields still win, so the D15/D16 scope and cross-tier guards apply as for
 * any other candidate.
 */
export function refreshCandidate<T extends MemoryCandidate>(targets: RefreshTarget[], candidate: T): { candidate: T; source: MemorySourceMeta } | undefined {
  const requested = normalizeRef(candidate.updateId ?? '');
  const target = requested
    ? targets.find((item) => matchesMemoryRef(item, requested)
      && (!candidate.scope || item.scope === candidate.scope))
    : undefined;
  if (!target) return undefined;
  return {
    candidate: { ...candidate, scope: candidate.scope ?? target.scope, ...(target.working && !candidate.objective ? { objective: 'task' as const } : {}) },
    source: target.source
  };
}

/** Why `refreshCandidate` skipped a candidate, for the command output. */
export function refreshRejection(targets: RefreshTarget[], candidate: MemoryCandidate): string {
  const got = candidate.updateId ? `UPDATE: ${candidate.updateId}` : 'a new memory';
  return `take-control --refresh accepts only UPDATE candidates for stale memories (${targets.map((item) => item.id).join(', ')}); got ${got}.`;
}

function refreshSourceMeta(sources: TakeControlSource[], origin: string): MemorySourceMeta {
  return {
    source: 'take-control',
    sourceFiles: sources.map((source) => source.file),
    sourceHashes: sources.map((source) => source.digestHash ?? source.hash),
    ...(sources.some((source) => source.digestHash) ? { sourceHashMode: 'digest' as const } : {}),
    replaceSources: true,
    sourceOrigin: origin
  };
}

function emptyPlan(): TakeControlPlan {
  return { sources: [], skipped: [], tokenEstimate: 0, maxSources: REFRESH_MAX_SOURCES, maxChars: 0, includes: [], excludes: [], kinds: [], budgetTokens: null, omitted: 0, notRead: 0 };
}
