/** D10 local usage signal: per-memory injected/fetched counters in the gitignored `usage.json`. All access fails open. */
import path from 'node:path';
import { exists, readJson, readJsonForUpdate, withFileLock, writeJsonAtomic } from '../system/fsx.js';
import { ensureScopeGitignore } from './scope-gitignore.js';

export type UsageRecord = { injected: number; fetched: number; last: string };
export type UsageMap = Record<string, UsageRecord>;
export type UsageKind = 'injected' | 'fetched';

export const USAGE_FILE = 'usage.json';
/** `stats --usage` reports memories injected but never fetched for at least this long. */
export const NEVER_FETCHED_DAYS = 30;
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
    usage[key] = { injected: record.injected as number, fetched: record.fetched as number, last: record.last };
  }
  return usage;
}

/**
 * Count one injection or fetch per key. Never throws; `now` is injectable for tests. A scope folder that does not exist
 * is never created (a repo that only uses global memory stays clean). The read-modify-write runs under a file lock, so
 * parallel hooks never lose each other's rows; a lock still busy after the timeout skips this increment.
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
        usage[key] = { ...current, [kind]: current[kind] + 1, last: now.toISOString() };
      }
      await writeJsonAtomic(file, usage);
    }, { timeoutMs: USAGE_LOCK_TIMEOUT_MS });
  } catch {
    // Usage is advisory; a write failure must never block a load.
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

/** D5 ranking boost: `+0.03·ln(1+fetches)`. */
export function usageBoost(record: Pick<UsageRecord, 'fetched'> | undefined): number {
  return record && record.fetched > 0 ? USAGE_BOOST_WEIGHT * Math.log(1 + record.fetched) : 0;
}
