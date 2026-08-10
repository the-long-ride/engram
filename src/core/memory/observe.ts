/** Inbox observations: sanitized evidence captured explicitly, then reviewed into memories. */
import type { Sensitivity, TraceRetention, TrustLevel } from '../runtime/types.js';
import { inside, writeText } from '../system/fsx.js';
import { slugify, summarize } from '../system/text.js';
import { renderFrontmatter } from './frontmatter.js';
import { sanitizeTraceText } from '../traces/sanitize.js';
import { writeTrace } from '../traces/storage.js';

export type ObservationMetadata = {
  host?: string;
  sessionId?: string;
  turnId?: number;
  speaker?: string;
  eventTime?: string;
  trustLevel?: TrustLevel;
  sensitivity?: Sensitivity;
  retention?: TraceRetention;
  source?: string;
};

export type ObservationWrite = {
  file: string;
  fullPath: string;
  text: string;
  redacted: number;
  redactedFindings: number;
  removedInjectionLines: number;
  traceId: string;
  traceFile: string;
  sessionId: string;
  sourceHash: string;
};

/** Write sanitized evidence to an immutable trace and a non-indexed inbox review wrapper. */
export async function writeObservation(
  root: string,
  text: string,
  sourceFile = '',
  metadata: ObservationMetadata = {}
): Promise<ObservationWrite> {
  const sanitized = sanitizeTraceText(text);
  if (!sanitized.text.trim()) throw new Error('observe requires non-empty text after safety filtering');
  const eventTime = metadata.eventTime ?? new Date().toISOString();
  const sessionId = metadata.sessionId?.trim() || 'default';
  const written = await writeTrace(root, {
    sessionId,
    ...(metadata.turnId === undefined ? {} : { turnId: metadata.turnId }),
    ...(metadata.speaker ? { speaker: metadata.speaker } : {}),
    host: metadata.host ?? 'manual',
    eventTime,
    source: metadata.source ?? 'observe',
    ...(sourceFile ? { sourceFile } : {}),
    trustLevel: metadata.trustLevel ?? 'human',
    sensitivity: metadata.sensitivity ?? 'private',
    retention: metadata.retention ?? '30d',
    text: sanitized.text,
    redactedFindings: sanitized.redactedFindings,
    removedInjectionLines: sanitized.removedInjectionLines
  });

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const title = summarize(sanitized.text, 70) || 'Observation';
  const file = `inbox/${stamp}-${slugify(title)}.md`;
  const fullPath = inside(root, file);
  await writeText(fullPath, renderObservation(sanitized.text, file, sourceFile, written.trace));
  return {
    file,
    fullPath,
    text: sanitized.text,
    redacted: sanitized.redactedFindings,
    redactedFindings: sanitized.redactedFindings,
    removedInjectionLines: sanitized.removedInjectionLines,
    traceId: written.trace.traceId,
    traceFile: written.file,
    sessionId,
    sourceHash: written.trace.sourceHash
  };
}

function renderObservation(
  text: string,
  file: string,
  sourceFile: string,
  trace: Awaited<ReturnType<typeof writeTrace>>['trace']
): string {
  const frontmatter = renderFrontmatter({
    authority: 'evidence',
    created: trace.ingestedAt,
    event_time: trace.eventTime,
    host: trace.host,
    redacted_findings: trace.redactedFindings,
    removed_injection_lines: trace.removedInjectionLines,
    retention: trace.retention,
    sensitivity: trace.sensitivity,
    session_id: trace.sessionId,
    ...(trace.speaker ? { speaker: trace.speaker } : {}),
    ...(trace.turnId === undefined ? {} : { turn_id: trace.turnId }),
    source: trace.source,
    ...(sourceFile ? { source_file: sourceFile.replace(/\\/g, '/') } : {}),
    source_hash: trace.sourceHash,
    trace_id: trace.traceId,
    trust_level: trace.trustLevel
  });
  return `${frontmatter}
# Observation: ${summarize(text, 60) || 'Session note'}

## Raw Note

${text}

## Next

Run \`engram save-session --file .agents/.engram/${file}\` only after reviewing the observation.
`;
}
