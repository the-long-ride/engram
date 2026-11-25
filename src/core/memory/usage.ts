/** D10 local usage signal: per-memory injected/fetched counters in the gitignored `usage.json`. All access fails open. */
import path from 'node:path';
import { exists, readJson, readJsonForUpdate, withFileLock, writeJsonAtomic } from '../system/fsx.js';
import { ensureScopeGitignore } from './scope-gitignore.js';

export type UsageRecord = { injected: number; fetched: number; applied?: number; corrected?: number; last: string };
export type UsageMap = Record<string, UsageRecord>;
export type UsageKind = 'injected' | 'fetched' | 'applied' | 'corrected';

export const USAGE_FILE = 'usage.json';
/** `stats --usage` reports memories injected but never fetched for at least this long. */
export const NEVER_FETCHED_DAYS = 30;
/** Minimum injections with zero utility before noise decay and `stats --usage` noisy reporting trigger. */
export const NOISE_DECAY_MIN_INJECTIONS = 20;
const USAGE_BOOST_WEIGHT = 0.03;
/** A load waits at most this long for the usage lock, then skips the increment (fail open). */
const USAGE_LOCK_TIMEOUT_MS = 1500;

/** Read the usage store; a missing, corrupt, or malformed file yields only the valid rows. */
export async function readUsage(root: string): Promise<UsageMap> {
  try {
    return validRows(await readJson<unknown>(path.join(root, USAGE_FILE), {}));
  } catch {
    return {};
  }
}

function validRows(raw: unknown): UsageMap {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const usage: UsageMap = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const record = value as Partial<UsageRecord> | null;
    if (!record || typeof record !== 'object') continue;
    if (!Number.isFinite(record.injected) || !Number.isFinite(record.fetched) || typeof record.last !== 'string') continue;
    const row: UsageRecord = { injected: record.injected as number, fetched: record.fetched as number, last: record.last };
    if (typeof record.applied === 'number' && Number.isFinite(record.applied) && record.applied > 0) row.applied = record.applied;
    if (typeof record.corrected === 'number' && Number.isFinite(record.corrected) && record.corrected > 0) row.corrected = record.corrected;
    usage[key] = row;
  }
  return usage;
}

/**
 * Count one injection, fetch, application, or correction per key. Never throws; `now` is injectable for tests. A scope
 * folder that does not exist is never created (a repo that only uses global memory stays clean). The read-modify-write
 * runs under a file lock, so parallel hooks never lose each other's rows; a lock still busy after the timeout skips
 * this increment.
 */
export async function recordUsage(root: string, keys: string[], kind: UsageKind, now: Date = new Date()): Promise<void> {
  try {
    const unique = [...new Set(keys)];
    if (!unique.length || !root || !(await exists(root))) return;
    const file = path.join(root, USAGE_FILE);
    if (!(await exists(file))) await ensureScopeGitignore(root);
    await withFileLock(file, async () => {
      const usage = validRows(await readJsonForUpdate<unknown>(file, {}));
      for (const key of unique) {
        const current = usage[key] ?? { injected: 0, fetched: 0, last: '' };
        const nextValue = (current[kind] ?? 0) + 1;
        const next: UsageRecord = {
          injected: kind === 'injected' ? nextValue : current.injected,
          fetched: kind === 'fetched' ? nextValue : current.fetched,
          last: now.toISOString()
        };
        const applied = kind === 'applied' ? nextValue : (current.applied ?? 0);
        const corrected = kind === 'corrected' ? nextValue : (current.corrected ?? 0);
        if (applied > 0) next.applied = applied;
        if (corrected > 0) next.corrected = corrected;
        usage[key] = next;
      }
      await writeJsonAtomic(file, usage);
    }, { timeoutMs: USAGE_LOCK_TIMEOUT_MS });
  } catch {
    // Usage is advisory; a write failure must never block a load.
  }
}

/** Apply a batch of usage count increments in one locked read-modify-write; fails open. */
export async function recordUsageCounts(
  workspaceRoot: string,
  deltas: Array<{ key: string; kind: UsageKind; count: number }>,
  now = new Date().toISOString()
): Promise<void> {
  try {
    const valid = deltas.filter((delta) => delta.key && Number.isFinite(delta.count) && Math.floor(delta.count) > 0);
    if (!valid.length || !workspaceRoot || !(await exists(workspaceRoot))) return;
    const file = path.join(workspaceRoot, USAGE_FILE);
    if (!(await exists(file))) await ensureScopeGitignore(workspaceRoot);
    await withFileLock(file, async () => {
      const usage = validRows(await readJsonForUpdate<unknown>(file, {}));
      for (const delta of valid) {
        const inc = Math.floor(delta.count);
        const current = usage[delta.key] ?? { injected: 0, fetched: 0, last: '' };
        const next: UsageRecord = {
          injected: delta.kind === 'injected' ? current.injected + inc : current.injected,
          fetched: delta.kind === 'fetched' ? current.fetched + inc : current.fetched,
          last: now
        };
        const applied = delta.kind === 'applied' ? (current.applied ?? 0) + inc : (current.applied ?? 0);
        const corrected = delta.kind === 'corrected' ? (current.corrected ?? 0) + inc : (current.corrected ?? 0);
        if (applied > 0) next.applied = applied;
        if (corrected > 0) next.corrected = corrected;
        usage[delta.key] = next;
      }
      await writeJsonAtomic(file, usage);
    }, { timeoutMs: USAGE_LOCK_TIMEOUT_MS });
  } catch {
    // Usage is advisory; a write failure must never block callers.
  }
}

/** Memories injected at least once, never fetched, and last touched over `days` ago. */
export function neverFetched(usage: UsageMap, now: Date = new Date(), days = NEVER_FETCHED_DAYS): Array<{ key: string } & UsageRecord> {
  const cutoff = now.getTime() - days * 864e5;
  return Object.entries(usage)
    .filter(([, record]) => record.injected > 0 && record.fetched === 0 && Date.parse(record.last) < cutoff)
    .map(([key, record]) => ({ key, ...record }))
    .sort((a, b) => a.last.localeCompare(b.last) || a.key.localeCompare(b.key));
}

/** Memories injected at least `NOISE_DECAY_MIN_INJECTIONS` times with zero fetches and zero applied signals. */
export function noisyMemories(usage: UsageMap): Array<{ key: string } & UsageRecord> {
  return Object.entries(usage)
    .filter(([, record]) => record.injected >= NOISE_DECAY_MIN_INJECTIONS && record.fetched === 0 && (record.applied ?? 0) === 0)
    .map(([key, record]) => ({ key, ...record }))
    .sort((a, b) => b.injected - a.injected || a.key.localeCompare(b.key));
}

/** D5 ranking boost with closed-loop utility, noise decay, and correction penalty, clamped to `[-0.15, 0.25]`. */
export function usageBoost(
  record: Partial<Pick<UsageRecord, 'fetched' | 'injected' | 'applied' | 'corrected'>> | undefined
): number {
  if (!record) return 0;
  const utility = (record.fetched ?? 0) + 0.5 * (record.applied ?? 0);
  let score = utility > 0 ? USAGE_BOOST_WEIGHT * Math.log(1 + utility) : 0;
  if (utility === 0 && (record.injected ?? 0) >= NOISE_DECAY_MIN_INJECTIONS) {
    score -= Math.min(0.12, 0.03 * Math.log(1 + ((record.injected! - (NOISE_DECAY_MIN_INJECTIONS - 1)) / 5)));
  }
  if (utility === 0 && (record.corrected ?? 0) > 0) {
    score -= 0.02 * Math.min(3, record.corrected ?? 0);
  }
  return Math.max(-0.15, Math.min(0.25, score));
}
