/** Observe command: capture sanitized raw notes into inbox. */
import path from 'node:path';
import { jsonOk } from '../core/cli/json-output.js';
import { captureSessionLearnings, harvestGitLearnings } from '../core/learning/capture.js';
import { getContext } from '../core/memory/context.js';
import { writeObservation } from '../core/memory/observe.js';
import { parseSaveTarget, writeScopes } from '../core/runtime/config.js';
import { readText, readTextFromStdin } from '../core/system/fsx.js';
import { cmdSaveSession } from './write.js';
import { cmdObserveQueue } from './observe-queue.js';

/** Capture a raw session note in inbox, optionally mining it through save-session or session learning. */
export async function cmdObserve(args: string[], flags: Record<string, any> = {}): Promise<string> {
  if (flags.queue === true) return cmdObserveQueue(args, flags);
  if (flags.learn === true) return cmdObserveLearn(args, flags);
  const ctx = await getContext();
  const scopes = flags.scope ? writeScopes(parseSaveTarget(flags.scope, 'observe --scope'), ctx.config) : writeScopes(ctx.config.scope, ctx.config);
  const scope = scopes[0];
  if (!scope) throw new Error('observe --scope requires global memory; set ENGRAM_GLOBAL_DIR or run engram inject --global-path <path>');
  const root = ctx.roots[scope];
  if (!root) throw new Error(`${scope} memory is not configured`);
  const sourceFile = observeFile(flags);
  const text = sourceFile ? (sourceFile === '-' ? await readTextFromStdin() : await readText(path.resolve(sourceFile))) : args.join(' ').trim();
  if (!text) throw new Error('observe requires text or --file <path>');
  const observed = await writeObservation(
    root,
    text,
    sourceFile ? path.relative(process.cwd(), path.resolve(sourceFile)) : '',
    { host: 'cli', sessionId: String(flags.session ?? 'manual'), source: 'observe' }
  );
  if (flags.propose === true) {
    const nextFlags = { ...flags };
    delete nextFlags.file;
    delete nextFlags.f;
    delete nextFlags.propose;
    const saved = await cmdSaveSession([observed.text], nextFlags, {
      source: 'observe',
      sourceHashes: [observed.sourceHash],
      evidenceRefs: [observed.traceId],
      derivedFrom: [observed.sessionId],
      evidenceScope: scope
    });
    return `Observed -> ${observed.fullPath}\nTrace: ${observed.traceId}\n${observeSafetyLine(observed)}\n${saved}`;
  }
  return `Observed -> ${observed.fullPath}\nTrace: ${observed.traceId}\n${observeSafetyLine(observed)}\nNext: engram save-session --file ${observed.fullPath}`;
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

async function cmdObserveLearn(args: string[], flags: Record<string, any>): Promise<string> {
  const cwd = process.cwd();
  const sourceFile = observeFile(flags);
  const useGit = flags.git !== undefined && flags.git !== false;
  let text = '';
  let source: 'observe' | 'git' = 'observe';
  if (useGit) {
    const range = typeof flags.git === 'string' ? flags.git : undefined;
    text = await harvestGitLearnings(cwd, range);
    source = 'git';
  } else if (sourceFile) {
    text = sourceFile === '-' ? await readTextFromStdin() : await readText(path.resolve(sourceFile));
  } else {
    text = args.join(' ').trim();
  }
  if (!text) throw new Error('observe --learn requires text, --file <path>, or --git [range]');
  const result = await captureSessionLearnings(cwd, {
    text,
    host: 'cli',
    sessionId: String(flags.session ?? 'manual'),
    source
  });
  if (flags.json === true) {
    return jsonOk({
      working_written: result.workingWritten,
      receipts_written: result.receiptsWritten,
      skipped_duplicates: result.skippedDuplicates,
      ...(result.traceId ? { trace_id: result.traceId } : {})
    });
  }
  const lines = [
    `Learned: ${result.workingWritten.length} working memories active, ${result.receiptsWritten.length} durable receipts staged (run engram review inbox).`
  ];
  if (result.traceId) lines.push(`Trace: ${result.traceId}`);
  if (result.skippedDuplicates) lines.push(`Skipped duplicates: ${result.skippedDuplicates}`);
  return lines.join('\n');
}
