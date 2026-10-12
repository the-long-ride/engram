/** `take-control --from`: validate flags, resolve a host store, and plan its topic files as redacted preset-relative sources. */
import { digestHostMemory } from '../ingest/registry.js';
import { HOST_TYPE_MAP, hostMemoryType } from '../ingest/extractors/host-memory.js';
import { EngramError, ExitCode } from '../runtime/exit-codes.js';
import type { MemorySourceMeta } from './memory-template.js';
import {
  HOST_MEMORY_PRESETS, hostLabel, hostMemoryOrigin, readHostMemorySource, resolveHostMemoryRoot, walkHostMemory,
  type HostMemoryPreset, type HostMemoryRoot
} from './host-memory.js';
import { estimateTokens, proposedTypesFor, takeControlLimits, type TakeControlPlan, type TakeControlSkipped, type TakeControlSource } from './take-control.js';

export type HostImport = { plan: TakeControlPlan; root: HostMemoryRoot };
/** Workspace-scan selectors and budgets that have no meaning for a host store; they are refused instead of ignored. */
const INCOMPATIBLE_FLAGS = ['refresh', 'kind', 'include', 'file', 'exclude', 'budget-tokens', 'all'] as const;
const USER_TYPE_REASON = 'type user (personal profile data; not imported)';

/** The `--from` preset, or undefined when the flag is absent. Unknown presets and incompatible flags are usage errors. */
export function hostPresetFromFlags(flags: Record<string, any>): HostMemoryPreset | undefined {
  if (flags.from === undefined) return undefined;
  const preset = HOST_MEMORY_PRESETS.find((item) => item === flags.from);
  if (!preset) throw usage('take-control --from must be claude-auto-memory or codex-memories');
  const clash = INCOMPATIBLE_FLAGS.find((name) => flags[name] !== undefined && flags[name] !== false);
  if (clash) throw usage(`take-control --from cannot be combined with --${clash}`);
  if (Array.isArray(flags.dir) && flags.dir.length > 1) throw usage('take-control --from accepts one --dir');
  return preset;
}

/** Resolve the store (a wrong or ambiguous root asks for --dir) and plan its sources. `known` are already imported hashes. */
export async function planHostImport(cwd: string, preset: HostMemoryPreset, flags: Record<string, any>, known: Set<string>): Promise<HostImport> {
  const dir = Array.isArray(flags.dir) ? flags.dir[0] : flags.dir;
  if (dir !== undefined && typeof dir !== 'string') throw usage('take-control --dir expects a path');
  const root = await resolveHostMemoryRoot(cwd, preset, dir);
  if ('reason' in root) throw usage(root.reason);
  const plan = await planHostMemorySources(cwd, root, { ...takeControlLimits(flags), knownSourceHashes: known });
  return { plan, root };
}

/**
 * Plan sources: Markdown topic files only. Claude's `MEMORY.md` index, `type: user` files, and (Claude) untyped files are
 * skipped with reasons. `type: feedback` proposes a rule; `project` and `reference` propose knowledge; Codex files carry
 * no type, so the text decides. Excerpts are redacted and injection-filtered; labels are `<preset>/<relative path>`.
 */
export async function planHostMemorySources(
  _cwd: string, root: HostMemoryRoot, options: { maxSources: number; maxChars: number; knownSourceHashes: Set<string> }
): Promise<TakeControlPlan> {
  const walk = await walkHostMemory(root);
  const skipped: TakeControlSkipped[] = [
    ...root.notes,
    ...walk.skipped.map((item) => ({ file: hostLabel(root.preset, item.rel), reason: item.reason }))
  ];
  const sources: TakeControlSource[] = [];
  let tokenEstimate = 0;
  let omitted = 0;
  for (const { rel } of walk.files) {
    const label = hostLabel(root.preset, rel);
    if (sources.length >= options.maxSources) {
      skipped.push({ file: label, reason: `over --max-sources ${options.maxSources}` });
      omitted += 1;
      continue;
    }
    const read = await readHostMemorySource(root, rel);
    if (!('text' in read)) {
      skipped.push({ file: label, reason: 'missing' in read ? 'missing' : read.unchecked });
      continue;
    }
    const type = hostMemoryType(read.text);
    const hint = HOST_TYPE_MAP.get(type);
    if (type === 'user') skipped.push({ file: label, reason: USER_TYPE_REASON });
    else if (!hint && root.preset === 'claude-auto-memory') skipped.push({ file: label, reason: 'no host memory type' });
    else {
      const digest = digestHostMemory(label, read.text, options.maxChars);
      const excerpt = digest.lines.join('\n');
      if (!excerpt) skipped.push({ file: label, reason: 'no safe text after redaction' });
      else if (options.knownSourceHashes.has(digest.rawHash)) skipped.push({ file: label, reason: 'already imported source hash' });
      else {
        const tokens = estimateTokens(excerpt);
        sources.push({
          file: label, excerpt, lines: read.text.split(/\r?\n/).length, chars: read.text.length, excerptChars: excerpt.length,
          tokenEstimate: tokens, conversion: 'text', proposedTypes: hint ? [hint] : proposedTypesFor(excerpt), hash: digest.rawHash, kind: 'docs'
        });
        tokenEstimate += tokens;
      }
    }
  }
  return {
    sources, skipped, tokenEstimate, maxSources: options.maxSources, maxChars: options.maxChars, includes: [], excludes: [],
    kinds: ['docs'], budgetTokens: null, omitted, notRead: 0, host: { preset: root.preset, via: root.via }
  };
}

/**
 * `source: host-memory` with preset-relative `source_files`, raw `source_hashes`, and the store's origin hash. Left without a
 * `source_hash_mode` on purpose: older Engram then skips these memories in freshness instead of marking them `missing`.
 */
export async function hostImportSourceMeta(root: HostMemoryRoot, sources: TakeControlSource[]): Promise<MemorySourceMeta | undefined> {
  if (!sources.length) return undefined;
  return {
    source: 'host-memory',
    sourceFiles: sources.map((source) => source.file),
    sourceHashes: sources.map((source) => source.hash),
    sourceOrigin: await hostMemoryOrigin(root.dir)
  };
}

function usage(message: string): EngramError {
  return new EngramError('ENG_USAGE', message, ExitCode.UsageError);
}
