/** Canonical trace construction, validation, and one-record JSONL encoding. */
import { randomUUID } from 'node:crypto';
import { sha256 } from '../safety/hash.js';
import type { Sensitivity, TraceRetention, TraceUnit, TraceWriteInput, TrustLevel } from '../runtime/types.js';

const trustLevels = new Set<TrustLevel>(['human', 'repository', 'tool', 'web', 'generated']);
const sensitivities = new Set<Sensitivity>(['public', 'internal', 'private', 'secret']);

export function buildTraceUnit(input: TraceWriteInput, options: { traceId?: string; ingestedAt?: string } = {}): TraceUnit {
  const trace: TraceUnit = {
    traceId: options.traceId ?? input.traceId ?? `tr_${randomUUID().replace(/-/g, '')}`,
    sessionId: requireText(input.sessionId, 'sessionId'),
    ...(input.turnId === undefined ? {} : { turnId: input.turnId }),
    ...(input.speaker ? { speaker: input.speaker } : {}),
    host: requireText(input.host, 'host'),
    eventTime: requireDate(input.eventTime, 'eventTime'),
    ingestedAt: requireDate(options.ingestedAt ?? input.ingestedAt ?? new Date().toISOString(), 'ingestedAt'),
    source: requireText(input.source, 'source'),
    ...(input.sourceFile ? { sourceFile: input.sourceFile.replace(/\\/g, '/') } : {}),
    sourceHash: `sha256:${sha256(input.text)}`,
    trustLevel: input.trustLevel,
    sensitivity: input.sensitivity,
    retention: input.retention,
    authority: 'evidence',
    text: input.text,
    redactedFindings: nonNegativeInteger(input.redactedFindings, 'redactedFindings'),
    removedInjectionLines: nonNegativeInteger(input.removedInjectionLines, 'removedInjectionLines')
  };
  validateTraceUnit(trace);
  return trace;
}

export function serializeTraceUnit(trace: TraceUnit): string {
  validateTraceUnit(trace);
  return `${JSON.stringify(sortRecord(trace))}\n`;
}

export function parseTraceUnit(raw: string): TraceUnit {
  const lines = raw.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length !== 1) throw new Error('Trace file must contain exactly one JSONL record');
  const trace = JSON.parse(lines[0]) as TraceUnit;
  validateTraceUnit(trace);
  if (trace.sourceHash !== `sha256:${sha256(trace.text)}`) throw new Error('Trace source hash mismatch');
  return trace;
}

export function traceExpiresAt(trace: TraceUnit): string | null {
  if (trace.retention === 'permanent') return null;
  const days = Number(trace.retention.slice(0, -1));
  return new Date(Date.parse(trace.ingestedAt) + days * 86_400_000).toISOString();
}

export function isTraceExpired(trace: TraceUnit, now = new Date()): boolean {
  const expiry = traceExpiresAt(trace);
  return expiry !== null && now.getTime() >= Date.parse(expiry);
}

function validateTraceUnit(trace: TraceUnit): void {
  if (!/^tr_[A-Za-z0-9_-]+$/.test(trace.traceId)) throw new Error('Invalid traceId');
  requireText(trace.sessionId, 'sessionId');
  requireText(trace.host, 'host');
  requireDate(trace.eventTime, 'eventTime');
  requireDate(trace.ingestedAt, 'ingestedAt');
  requireText(trace.source, 'source');
  requireText(trace.text, 'text');
  if (!/^sha256:[a-f0-9]{64}$/.test(trace.sourceHash)) throw new Error('Invalid sourceHash');
  if (!trustLevels.has(trace.trustLevel)) throw new Error('Invalid trustLevel');
  if (!sensitivities.has(trace.sensitivity)) throw new Error('Invalid sensitivity');
  if (trace.authority !== 'evidence') throw new Error('Trace authority must be evidence');
  if (trace.retention !== 'permanent' && !/^[1-9]\d*d$/.test(trace.retention)) {
    throw new Error('retention must be permanent or a positive Nd duration');
  }
  if (trace.turnId !== undefined) nonNegativeInteger(trace.turnId, 'turnId');
  nonNegativeInteger(trace.redactedFindings, 'redactedFindings');
  nonNegativeInteger(trace.removedInjectionLines, 'removedInjectionLines');
}

function requireText(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${field} must be non-empty text`);
  return value;
}

function requireDate(value: unknown, field: string): string {
  const text = requireText(value, field);
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) throw new Error(`${field} must be a valid timestamp`);
  return parsed.toISOString();
}

function nonNegativeInteger(value: unknown, field: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) throw new Error(`${field} must be a non-negative integer`);
  return parsed;
}

function sortRecord(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortRecord);
  if (!value || typeof value !== 'object') return value;
  const record = value as Record<string, unknown>;
  return Object.fromEntries(Object.keys(record).sort().map((key) => [key, sortRecord(record[key])]));
}
