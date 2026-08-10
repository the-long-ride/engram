/** Immutable trace persistence under one-record JSONL files. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { TRACE_DIR } from '../runtime/constants.js';
import type { TraceUnit, TraceWriteInput } from '../runtime/types.js';
import { ensureDir, exists, inside, readText } from '../system/fsx.js';
import { buildTraceUnit, parseTraceUnit, serializeTraceUnit } from './codec.js';

export function traceFile(traceId: string): string {
  if (!/^tr_[A-Za-z0-9_-]+$/.test(traceId)) throw new Error(`Invalid trace id: ${traceId}`);
  return `${TRACE_DIR}/${traceId}.jsonl`;
}

export async function writeTrace(root: string, input: TraceWriteInput): Promise<{ trace: TraceUnit; file: string; fullPath: string }> {
  const trace = buildTraceUnit(input, { traceId: input.traceId, ingestedAt: input.ingestedAt });
  const file = traceFile(trace.traceId);
  const fullPath = inside(root, file);
  await ensureDir(path.dirname(fullPath));
  await fs.writeFile(fullPath, serializeTraceUnit(trace), { flag: 'wx' });
  return { trace, file, fullPath };
}

export async function readTrace(root: string, traceId: string): Promise<TraceUnit | undefined> {
  const fullPath = inside(root, traceFile(traceId));
  if (!(await exists(fullPath))) return undefined;
  return parseTraceUnit(await readText(fullPath));
}

export async function traceExists(root: string, traceId: string): Promise<boolean> {
  return exists(inside(root, traceFile(traceId)));
}
