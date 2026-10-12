/** `engram observe --queue`: drain the opt-in SessionEnd transcript queue into sanitized traces. Writes no memory. */
import path from 'node:path';
import { getContext } from '../core/memory/context.js';
import { drainSessionQueue, SESSION_QUEUE_MAX } from '../core/memory/session-queue.js';
import type { SessionQueueOutcome } from '../core/memory/session-queue.js';
import { EngramError } from '../core/runtime/exit-codes.js';
import { readJson } from '../core/system/fsx.js';
import type { TranscriptIngestOptions } from '../core/transcripts/types.js';

/**
 * Drain `session-queue.json`. Each entry is checked (exists, regular file, not a link, at most 5 MiB), sanitized through
 * `ingestTranscript`, and stored as a trace plus an inbox wrapper. Inbox and size quotas come from the optional
 * `.agents/engram.transcripts.json` (`max_files`, `max_chars`, `sensitivity`, `retention`); without it the transcript
 * defaults apply. Promotion to memory stays with `observe --propose` or `save-session`.
 */
export async function cmdObserveQueue(args: string[], flags: Record<string, any>): Promise<string> {
  if (args.length || flags.file !== undefined || flags.f !== undefined || flags.propose === true) {
    throw new EngramError('ENG_USAGE', 'observe --queue takes no note, --file, or --propose; it writes no memory', 2);
  }
  const limit = parseLimit(flags.limit);
  const ctx = await getContext();
  const root = ctx.roots.workspace;
  if (!root) throw new EngramError('ENG_USAGE', 'observe --queue needs workspace memory; run engram inject first', 2);
  const dryRun = flags['dry-run'] === true;
  const ingest = await readJson<TranscriptIngestOptions>(path.join(process.cwd(), '.agents', 'engram.transcripts.json'), {});
  const outcomes = await drainSessionQueue(root, { dryRun, limit, ingest });
  return render(outcomes, dryRun);
}

function parseLimit(value: unknown): number | undefined {
  if (value === undefined) return undefined;
  const parsed = Number(value);
  if (typeof value !== 'string' || !Number.isInteger(parsed) || parsed < 1) {
    throw new EngramError('ENG_USAGE', `observe --limit must be a positive integer (the queue holds at most ${SESSION_QUEUE_MAX})`, 2);
  }
  return parsed;
}

function render(outcomes: SessionQueueOutcome[], dryRun: boolean): string {
  if (!outcomes.length) return 'Session queue is empty.';
  const count = (status: SessionQueueOutcome['status']) => outcomes.filter((item) => item.status === status).length;
  const summary = dryRun
    ? `Session queue (dry run): ${outcomes.length} checked, ${count('would-store')} would be stored, ${count('skipped')} would be skipped`
    : `Session queue: ${outcomes.length} checked, ${count('stored')} stored, ${count('skipped')} skipped, ${count('kept')} kept for later`;
  const lines = outcomes.map((item) => {
    const label = `${item.host} ${item.session}`;
    if (item.status === 'stored') return `- stored ${label} -> ${item.file} (trace ${item.trace_id})`;
    if (item.status === 'would-store') return `- would store ${label}`;
    return `- ${item.status} ${label}: ${item.reason ?? 'unknown'}`;
  });
  return [summary, ...lines, 'No memory written. Review inbox files, then run engram save-session --file <inbox file>.'].join('\n');
}
