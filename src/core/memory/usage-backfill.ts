/** Backfill local usage telemetry from Git commit history. */
import { execFile } from 'node:child_process';
import path from 'node:path';
import type { EngramContext } from './context.js';
import { memoryKey } from './memory-ref.js';
import { entriesForPath } from './path-triggers.js';
import { prefilter, routeDetailed } from './routing.js';
import { recordUsageCounts, type UsageKind } from './usage.js';
import { stem } from '../system/bm25.js';
import { meaningfulWordList, meaningfulWords } from '../system/text.js';

export type UsageBackfillSummary = {
  commits_scanned: number;
  injected_events: number;
  applied_events: number;
  updated_keys: number;
};

type GitCommitRecord = { subject: string; paths: string[] };

const COMMIT_PREFIX = '__ENG_COMMIT__\t';

/** Scan recent non-merge commits and backfill injected/applied usage counters in one locked write. */
export async function backfillUsageFromGit(
  ctx: EngramContext,
  options?: { range?: string; limit?: number; cwd?: string }
): Promise<UsageBackfillSummary> {
  const empty: UsageBackfillSummary = { commits_scanned: 0, injected_events: 0, applied_events: 0, updated_keys: 0 };
  if (!ctx.roots.workspace) return empty;
  const limit = Math.max(1, options?.limit ?? 50);
  const args = [
    'log',
    '--no-merges',
    '-n',
    String(limit),
    '--pretty=format:__ENG_COMMIT__%x09%s',
    '--name-only',
    ...(options?.range ? [options.range] : [])
  ];
  let output = '';
  try {
    output = await new Promise<string>((resolve, reject) => {
      execFile('git', args, { cwd: options?.cwd ?? ctx.cwd }, (err: any, stdout: string) => {
        if (err) reject(err);
        else resolve(String(stdout ?? ''));
      });
    });
  } catch {
    return empty;
  }

  const commits = parseGitCommits(output);
  if (!commits.length) return empty;

  const visible = prefilter(ctx.index, ctx.config, false, ctx.ignorePatterns);
  const entryStemMap = new Map<string, Set<string>>();
  for (const entry of visible) {
    const stems = new Set<string>();
    const sources = [entry.id, ...(entry.autoTags ? [] : entry.tags)];
    for (const source of sources) {
      for (const word of meaningfulWordList(source)) stems.add(stem(word));
    }
    entryStemMap.set(memoryKey(entry), stems);
  }

  const injectedCounts = new Map<string, number>();
  const appliedCounts = new Map<string, number>();
  let commitsScanned = 0;
  let injectedEvents = 0;
  let appliedEvents = 0;

  for (const commit of commits) {
    commitsScanned += 1;
    if (meaningfulWords(commit.subject).size === 0) continue;
    const routed = routeDetailed(
      ctx.index,
      commit.subject,
      ctx.config,
      false,
      { ignorePatterns: ctx.ignorePatterns },
      ctx.graph
    ).entries;

    for (const entry of routed) {
      const k = memoryKey(entry);
      injectedCounts.set(k, (injectedCounts.get(k) ?? 0) + 1);
      injectedEvents += 1;
    }

    if (!commit.paths.length) continue;
    const appliedKeys = new Set<string>();
    const basenameStems = new Set<string>();
    for (const relPath of commit.paths) {
      for (const entry of entriesForPath(visible, relPath)) appliedKeys.add(memoryKey(entry));
      const base = path.posix.basename(relPath, path.posix.extname(relPath));
      for (const word of meaningfulWordList(base)) basenameStems.add(stem(word));
    }
    if (basenameStems.size) {
      for (const entry of routed) {
        const k = memoryKey(entry);
        const stems = entryStemMap.get(k);
        if (stems && [...stems].some((term) => basenameStems.has(term))) appliedKeys.add(k);
      }
    }
    for (const k of appliedKeys) {
      appliedCounts.set(k, (appliedCounts.get(k) ?? 0) + 1);
      appliedEvents += 1;
    }
  }

  const deltas: Array<{ key: string; kind: UsageKind; count: number }> = [];
  const updatedKeys = new Set<string>();
  for (const [key, count] of injectedCounts) {
    deltas.push({ key, kind: 'injected', count });
    updatedKeys.add(key);
  }
  for (const [key, count] of appliedCounts) {
    deltas.push({ key, kind: 'applied', count });
    updatedKeys.add(key);
  }
  if (deltas.length) await recordUsageCounts(ctx.roots.workspace, deltas);

  return {
    commits_scanned: commitsScanned,
    injected_events: injectedEvents,
    applied_events: appliedEvents,
    updated_keys: updatedKeys.size
  };
}

function parseGitCommits(raw: string): GitCommitRecord[] {
  const commits: GitCommitRecord[] = [];
  let current: GitCommitRecord | undefined;
  for (const line of raw.split(/\r?\n/)) {
    if (line.startsWith(COMMIT_PREFIX)) {
      current = { subject: line.slice(COMMIT_PREFIX.length).trim(), paths: [] };
      commits.push(current);
      continue;
    }
    const trimmed = line.trim();
    if (current && trimmed) current.paths.push(trimmed.replace(/\\/g, '/'));
  }
  return commits;
}
