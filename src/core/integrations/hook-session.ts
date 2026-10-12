/** D7 per-session hook cache: which memory bodies each (host, cwd, session) already received. */
import path from 'node:path';
import { exists, FileLockTimeoutError, readJson, readJsonForUpdate, withFileLock, writeJsonAtomic } from '../system/fsx.js';
import { ensureScopeGitignore } from '../memory/scope-gitignore.js';
import { workspaceRoot } from '../runtime/config.js';

export type HookSessionRecord = { delivered: string[]; updated: string };
export type HookCache = { records: Record<string, HookSessionRecord> };

export const HOOK_CACHE_FILE = 'agent-hook-cache.json';
/** Records not touched for this many days are dropped. */
export const SESSION_TTL_DAYS = 7;
/** At most this many session records are kept, most recently updated first. */
export const MAX_SESSION_RECORDS = 200;
/** At most this many subagent records (`#agent:` keys) are kept; they are short-lived. */
export const MAX_SUBAGENT_RECORDS = 100;
const SUBAGENT_KEY_MARKER = '#agent:';
/** A hook waits at most this long for the cache lock, then skips the write (fail open). */
const HOOK_LOCK_TIMEOUT_MS = 1500;

/** Delivered keys for one session; a missing, corrupt, or malformed cache yields an empty set. */
export async function readSession(cwd: string, key: string): Promise<HookSessionRecord> {
  const record = (await readCache(cwd)).records[key];
  return record ?? { delivered: [], updated: '' };
}

/**
 * Replace one session's delivered set, pruning stale and excess records in the same write. A workspace without an
 * Engram folder is left alone (the hook never creates `.agents/.engram`). The read-modify-write runs under a file lock so
 * parallel hooks never drop each other's sessions; when the lock is busy past the timeout the write is skipped.
 */
export async function writeSession(cwd: string, key: string, delivered: string[]): Promise<void> {
  const root = workspaceRoot(cwd);
  if (!(await exists(root))) return;
  const file = cacheFile(cwd);
  if (!(await exists(file))) await ensureScopeGitignore(root);
  try {
    await withFileLock(file, async () => {
      const now = new Date();
      const cache = validCache(await readJsonForUpdate<Partial<HookCache>>(file, {}));
      cache.records[key] = { delivered: [...new Set(delivered)], updated: now.toISOString() };
      await writeJsonAtomic(file, pruneSessions(cache, now));
    }, { timeoutMs: HOOK_LOCK_TIMEOUT_MS });
  } catch (error) {
    if (!(error instanceof FileLockTimeoutError)) throw error;
  }
}

/**
 * Keep valid records updated within the TTL, newest first, capped at the record limit. Subagent records are capped
 * separately first, so a burst of subagents never evicts parent sessions.
 */
export function pruneSessions(cache: HookCache, now: Date): HookCache {
  const cutoff = now.getTime() - SESSION_TTL_DAYS * 864e5;
  const sorted = Object.entries(cache.records)
    .filter(([, record]) => isRecord(record) && Date.parse(record.updated) >= cutoff)
    .sort(([, a], [, b]) => Date.parse(b.updated) - Date.parse(a.updated));
  const subagents = new Set(sorted.filter(([key]) => key.includes(SUBAGENT_KEY_MARKER)).slice(0, MAX_SUBAGENT_RECORDS).map(([key]) => key));
  const fresh = sorted
    .filter(([key]) => !key.includes(SUBAGENT_KEY_MARKER) || subagents.has(key))
    .slice(0, MAX_SESSION_RECORDS);
  return { records: Object.fromEntries(fresh) };
}

async function readCache(cwd: string): Promise<HookCache> {
  return validCache(await readJson<Partial<HookCache>>(cacheFile(cwd), {}));
}

function validCache(raw: Partial<HookCache>): HookCache {
  const records = raw && typeof raw === 'object' && isObject(raw.records) ? raw.records : {};
  // Legacy signature records and malformed rows are dropped rather than trusted.
  return { records: Object.fromEntries(Object.entries(records).filter(([, record]) => isRecord(record))) };
}

function cacheFile(cwd: string): string {
  return path.join(workspaceRoot(cwd), HOOK_CACHE_FILE);
}

function isRecord(value: unknown): value is HookSessionRecord {
  if (!isObject(value)) return false;
  return Array.isArray(value.delivered)
    && value.delivered.every((item: unknown) => typeof item === 'string')
    && typeof value.updated === 'string'
    && Number.isFinite(Date.parse(value.updated));
}

function isObject(value: unknown): value is Record<string, any> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
