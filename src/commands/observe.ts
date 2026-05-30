/** Observe command: capture sanitized raw notes into inbox. */
import path from 'node:path';
import { getContext } from '../core/memory/context.js';
import { writeObservation } from '../core/memory/observe.js';
import { writeScopes } from '../core/runtime/config.js';
import { readText } from '../core/system/fsx.js';
import { cmdAutosave } from './core.js';
import type { Scope } from '../core/runtime/types.js';

/** Capture a raw session note in inbox, optionally mining it through autosave. */
export async function cmdObserve(args: string[], flags: Record<string, any> = {}): Promise<string> {
  const ctx = await getContext();
  const scopes = flags.scope ? [flags.scope as Scope] : writeScopes(ctx.config.scope, ctx.config);
  const scope = scopes[0];
  const root = ctx.roots[scope];
  if (!root) throw new Error(`${scope} memory is not configured`);
  const sourceFile = observeFile(flags);
  const text = sourceFile ? await readText(path.resolve(sourceFile)) : args.join(' ').trim();
  if (!text) throw new Error('observe requires text or --file <path>');
  const observed = await writeObservation(root, text, sourceFile ? path.relative(process.cwd(), path.resolve(sourceFile)) : '');
  if (flags.propose === true) {
    const nextFlags = { ...flags };
    delete nextFlags.file;
    delete nextFlags.f;
    delete nextFlags.propose;
    const saved = await cmdAutosave([observed.text], nextFlags);
    return `Observed -> ${observed.fullPath}\n${observeSafetyLine(observed)}\n${saved}`;
  }
  return `Observed -> ${observed.fullPath}\n${observeSafetyLine(observed)}\nNext: engram autosave --file ${observed.fullPath}`;
}

function observeFile(flags: Record<string, any>): string {
  const files = [
    ...(Array.isArray(flags.file) ? flags.file : typeof flags.file === 'string' ? [flags.file] : []),
    ...(typeof flags.f === 'string' ? [flags.f] : [])
  ];
  if (files.length > 1) throw new Error('observe accepts only one --file');
  return files[0] ?? '';
}

function observeSafetyLine(observed: Awaited<ReturnType<typeof writeObservation>>): string {
  const parts = [];
  if (observed.redacted) parts.push(`${observed.redacted} sensitive finding(s) redacted`);
  if (observed.removedInjectionLines) parts.push(`${observed.removedInjectionLines} injection-like line(s) removed`);
  return parts.length ? `Safety: ${parts.join(', ')}` : 'Safety: no redactions';
}
