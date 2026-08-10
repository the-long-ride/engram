/** Idempotent conversion of legacy inbox observations into immutable traces. */
import path from 'node:path';
import { parseFrontmatter, renderFrontmatter } from '../memory/frontmatter.js';
import type { Scope } from '../runtime/types.js';
import { sha256 } from '../safety/hash.js';
import { listFiles, readText, writeText } from '../system/fsx.js';
import { sanitizeTraceText } from './sanitize.js';
import { readTrace, traceExists, writeTrace } from './storage.js';

export async function migrateLegacyObservations(root: string, scope: Scope): Promise<{ migrated: number; skipped: number }> {
  let migrated = 0;
  let skipped = 0;
  for (const fullPath of (await listFiles(path.join(root, 'inbox'))).filter((file) => file.endsWith('.md'))) {
    const raw = await readText(fullPath);
    const parsed = parseFrontmatter(raw);
    if (parsed.data.source !== 'observe' || parsed.data.trace_id) {
      skipped += 1;
      continue;
    }
    const text = parsed.body.match(/(?:^|\n)## Raw Note\r?\n\r?\n([\s\S]*?)(?=\r?\n## |\s*$)/)?.[1]?.trim() ?? '';
    const sanitized = sanitizeTraceText(text);
    if (!sanitized.text) {
      skipped += 1;
      continue;
    }
    const eventTime = validIso(parsed.data.created) ?? new Date(0).toISOString();
    const relative = path.relative(root, fullPath).replace(/\\/g, '/');
    const provenanceKey = `${scope}\n${relative}`;
    const traceId = `tr_legacy_${sha256(`${provenanceKey}\n${sanitized.text}`).slice(0, 24)}`;
    const existing = await traceExists(root, traceId) ? await readTrace(root, traceId) : undefined;
    const trace = existing ?? (await writeTrace(root, {
      traceId,
      sessionId: `legacy:${scope}:${sha256(provenanceKey).slice(0, 16)}`,
      host: 'legacy',
      eventTime,
      source: 'observe',
      ...(typeof parsed.data.source_file === 'string' && parsed.data.source_file ? { sourceFile: parsed.data.source_file } : {}),
      trustLevel: 'human',
      sensitivity: 'private',
      retention: '30d',
      text: sanitized.text,
      redactedFindings: nonNegativeCount(parsed.data.redacted_findings, sanitized.redactedFindings),
      removedInjectionLines: nonNegativeCount(parsed.data.removed_injection_lines, sanitized.removedInjectionLines)
    })).trace;
    const next = {
      ...parsed.data,
      authority: 'evidence',
      trace_id: trace.traceId,
      session_id: trace.sessionId,
      host: trace.host,
      event_time: trace.eventTime,
      source_hash: trace.sourceHash,
      trust_level: trace.trustLevel,
      sensitivity: trace.sensitivity,
      retention: trace.retention
    };
    await writeText(fullPath, `${renderFrontmatter(next)}${parsed.body}`);
    migrated += 1;
  }
  return { migrated, skipped };
}

function validIso(value: unknown): string | undefined {
  if (!value) return undefined;
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

function nonNegativeCount(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
}
