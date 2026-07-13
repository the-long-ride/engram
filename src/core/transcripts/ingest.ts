/** Host-neutral opt-in transcript sanitization and inbox-only persistence. */
import path from 'node:path';
import { listFiles } from '../system/fsx.js';
import { writeObservation } from '../memory/observe.js';
import type { TranscriptEvent, TranscriptIngestOptions, TranscriptIngestResult } from './types.js';

/** Host-neutral, opt-in transcript capture. Sanitized output remains non-indexed inbox data. */
export async function ingestTranscript(root: string, event: TranscriptEvent, options: TranscriptIngestOptions = {}): Promise<TranscriptIngestResult> {
  if (options.enabled !== true) return { status: 'disabled', redacted: 0, removed_injection_lines: 0, truncated: false };
  const maxChars = Math.max(1, Math.min(options.max_chars ?? 20_000, 100_000));
  const truncated = event.text.length > maxChars;
  const text = event.text.slice(0, maxChars);
  if (!text.trim()) return { status: 'empty', redacted: 0, removed_injection_lines: 0, truncated };
  const existing = (await listFiles(path.join(root, 'inbox'))).filter((file) => file.endsWith('.md')).length;
  if (existing >= Math.max(1, Math.min(options.max_files ?? 100, 1000))) return { status: 'limited', redacted: 0, removed_injection_lines: 0, truncated };
  const observed = await writeObservation(root, text, event.source_file ?? `host:${event.host}`);
  return { status: 'stored', file: observed.file, redacted: observed.redacted, removed_injection_lines: observed.removedInjectionLines, truncated };
}
