/** Opt-in SessionEnd transcript queue: the hook appends paths, `engram observe --queue` drains them into sanitized traces. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { exists, FileLockTimeoutError, readJson, readJsonForUpdate, withFileLock, writeJsonAtomic } from '../system/fsx.js';
import { ingestTranscript } from '../transcripts/ingest.js';
import type { TranscriptIngestOptions } from '../transcripts/types.js';
import { ensureScopeGitignore } from './scope-gitignore.js';

export type SessionQueueHost = 'claude' | 'codex';
export type SessionQueueEntry = { transcript_path: string; host: SessionQueueHost; session: string; at: string };
export type SessionQueueFile = { version: 1; entries: SessionQueueEntry[] };
export type SessionQueueStatus = 'stored' | 'would-store' | 'skipped' | 'kept';
export type SessionQueueOutcome = {
  host: SessionQueueHost;
  session: string;
  status: SessionQueueStatus;
  reason?: string;
  file?: string;
  trace_id?: string;
};

/** Scope-root, gitignored: the queue holds absolute transcript paths, which name the OS user. */
export const SESSION_QUEUE_FILE = 'session-queue.json';
/** Oldest entries are dropped past this many. */
export const SESSION_QUEUE_MAX = 50;
/** Larger transcripts are skipped, never read. */
export const SESSION_QUEUE_MAX_BYTES = 5 * 1024 * 1024;
/** The SessionEnd hook has about a second; a busy lock skips the append (fail open). */
const QUEUE_LOCK_TIMEOUT_MS = 800;

function isEntry(value: unknown): value is SessionQueueEntry {
  const item = value as Partial<SessionQueueEntry> | null;
  return Boolean(item) && typeof item === 'object'
    && typeof item?.transcript_path === 'string' && item.transcript_path.length > 0
    && (item.host === 'claude' || item.host === 'codex')
    && typeof item.session === 'string' && item.session.length > 0
    && typeof item.at === 'string';
}

/** Only well-formed entries survive a read; a corrupt or foreign file reads as empty. */
function validEntries(raw: unknown): SessionQueueEntry[] {
  const entries = (raw as Partial<SessionQueueFile> | null)?.entries;
  return Array.isArray(entries) ? entries.filter(isEntry) : [];
}

const sameSession = (a: SessionQueueEntry, b: SessionQueueEntry): boolean => a.host === b.host && a.session === b.session;

/** The queued entries, oldest first. */
export async function readSessionQueue(root: string): Promise<SessionQueueEntry[]> {
  return validEntries(await readJson<unknown>(path.join(root, SESSION_QUEUE_FILE), {}));
}

/**
 * Append one entry under the queue lock. A repeat of the same (host, session) replaces the earlier entry, and the
 * oldest entries are dropped past the cap. A scope folder that does not exist is never created. Throws on a write
 * failure; a busy lock skips the append. The SessionEnd hook catches everything and still answers `{}`.
 */
export async function enqueueSession(root: string, entry: SessionQueueEntry): Promise<void> {
  if (!root || !(await exists(root))) return;
  const file = path.join(root, SESSION_QUEUE_FILE);
  if (!(await exists(file))) await ensureScopeGitignore(root);
  try {
    await withFileLock(file, async () => {
      const entries = validEntries(await readJsonForUpdate<unknown>(file, {})).filter((item) => !sameSession(item, entry));
      const next: SessionQueueFile = { version: 1, entries: [...entries, entry].slice(-SESSION_QUEUE_MAX) };
      await writeJsonAtomic(file, next);
    }, { timeoutMs: QUEUE_LOCK_TIMEOUT_MS });
  } catch (error) {
    if (!(error instanceof FileLockTimeoutError)) throw error;
  }
}

/** Remove drained entries by (host, session), so an entry appended while a drain runs survives. */
async function removeEntries(root: string, done: SessionQueueEntry[]): Promise<void> {
  if (!done.length) return;
  const file = path.join(root, SESSION_QUEUE_FILE);
  await withFileLock(file, async () => {
    const entries = validEntries(await readJsonForUpdate<unknown>(file, {})).filter((item) => !done.some((gone) => sameSession(item, gone)));
    await writeJsonAtomic(file, { version: 1, entries } satisfies SessionQueueFile);
  });
}

/** Why a transcript must not be read, or undefined when it is a plain regular file within the size cap. */
async function unreadableReason(file: string): Promise<string | undefined> {
  let stat;
  try {
    stat = await fs.lstat(file);
  } catch (error) {
    return (error as { code?: string }).code === 'ENOENT' ? 'transcript is missing' : 'transcript cannot be inspected';
  }
  if (stat.isSymbolicLink()) return 'transcript is a symbolic link';
  if (!stat.isFile()) return 'transcript is not a regular file';
  if (stat.nlink > 1) return 'transcript is a hard link';
  if (stat.size > SESSION_QUEUE_MAX_BYTES) return 'transcript is over 5 MiB';
  return undefined;
}

/**
 * Drain queued transcripts into sanitized traces and inbox wrappers (redaction and injection removal run inside
 * `ingestTranscript`). Writes no memory: promotion still goes through `observe --propose` or `save-session`.
 * Skipped entries (missing, linked, oversized) and stored ones leave the queue; entries that hit the inbox quota or
 * fail to read stay for a later run. A dry run inspects every entry and changes nothing.
 */
export async function drainSessionQueue(
  root: string,
  options: { dryRun?: boolean; limit?: number; ingest?: TranscriptIngestOptions } = {}
): Promise<SessionQueueOutcome[]> {
  const queued = await readSessionQueue(root);
  const batch = options.limit === undefined ? queued : queued.slice(0, options.limit);
  const outcomes: SessionQueueOutcome[] = [];
  const done: SessionQueueEntry[] = [];
  for (const entry of batch) {
    const base = { host: entry.host, session: entry.session };
    const skip = await unreadableReason(entry.transcript_path);
    if (skip) {
      outcomes.push({ ...base, status: 'skipped', reason: skip });
      done.push(entry);
      continue;
    }
    if (options.dryRun) {
      outcomes.push({ ...base, status: 'would-store' });
      continue;
    }
    try {
      const bytes = await fs.readFile(entry.transcript_path);
      if (bytes.length > SESSION_QUEUE_MAX_BYTES) {
        outcomes.push({ ...base, status: 'skipped', reason: 'transcript is over 5 MiB' });
        done.push(entry);
        continue;
      }
      const result = await ingestTranscript(root, {
        text: bytes.toString('utf8'),
        host: entry.host,
        session_id: entry.session,
        event_time: Number.isNaN(Date.parse(entry.at)) ? undefined : new Date(entry.at).toISOString(),
        source: 'session-end',
        trust_level: 'generated'
      }, { ...options.ingest, enabled: true });
      if (result.status === 'limited') outcomes.push({ ...base, status: 'kept', reason: 'inbox quota reached' });
      else if (result.status === 'stored') {
        outcomes.push({ ...base, status: 'stored', file: result.file, trace_id: result.trace_id });
        done.push(entry);
      } else {
        outcomes.push({ ...base, status: 'skipped', reason: 'transcript is empty' });
        done.push(entry);
      }
    } catch (error) {
      // An entry that cannot be read or stored now (a busy file, a write error) stays queued for the next run.
      // Text that sanitizes to nothing (all injection-like lines) will never store; the error text could name the path, so only a code is shown.
      if (error instanceof Error && /non-empty text/u.test(error.message)) {
        outcomes.push({ ...base, status: 'skipped', reason: 'transcript is empty after safety filtering' });
        done.push(entry);
      } else {
        outcomes.push({ ...base, status: 'kept', reason: (error as { code?: string }).code ?? 'read or store failed' });
      }
    }
  }
  if (!options.dryRun) await removeEntries(root, done);
  return outcomes;
}
