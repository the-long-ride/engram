/** Shared command context: config, roots, ignore rules, and merged index. */
import type { EngramConfig, MemoryIndex } from './types.js';
import { loadConfig, scopeRoots } from './config.js';
import { isIgnored, loadIgnore } from './ignore.js';
import { loadIndex, mergeIndexes, rebuildIndex } from './index.js';
import { exists, inside } from './fsx.js';

export type EngramContext = {
  cwd: string;
  config: EngramConfig;
  roots: ReturnType<typeof scopeRoots>;
  index: MemoryIndex;
  hiddenCount: number;
  ignorePatterns: string[];
};

export type ContextOptions = { rebuild?: boolean };

/** Load current config and merged index, rebuilding indexes when present. */
export async function getContext(cwd = process.cwd(), options: ContextOptions = {}): Promise<EngramContext> {
  const config = await loadConfig(cwd);
  const roots = scopeRoots(cwd);
  const ignore = await loadIgnore(cwd, config);
  const workspace = await readIndex(roots.workspace, 'workspace', ignore.patterns, Boolean(options.rebuild));
  const global = await readIndex(roots.global, 'global', ignore.patterns, Boolean(options.rebuild));
  const index = mergeIndexes(workspace, global);
  const hiddenCount = index.entries.filter((entry) => entry.ignored || isIgnored(entry.file, ignore.patterns)).length;
  return { cwd, config, roots, index, hiddenCount, ignorePatterns: ignore.patterns };
}

/** Format the session-start load summary. */
export function loadSummary(entries: { type: string; id: string; scope: string }[], hidden: number): string {
  const workspace = entries.filter((e) => e.scope === 'workspace').length;
  const global = entries.filter((e) => e.scope === 'global').length;
  const groups = entries.reduce<Record<string, string[]>>((acc, e) => {
    acc[e.type] = [...(acc[e.type] ?? []), e.id];
    return acc;
  }, {});
  const lines = [`engram: loaded ${entries.length} memory files (workspace: ${workspace}, global: ${global}) [${hidden} hidden by ignore]`];
  for (const [type, ids] of Object.entries(groups)) lines.push(`  ${type}: ${ids.join(', ')}`);
  return lines.join('\n');
}

/** Resolve a memory entry to an absolute file path. */
export function entryPath(ctx: EngramContext, scope: string, file: string): string {
  return inside(ctx.roots[scope as 'workspace' | 'global'], file);
}

async function readIndex(root: string, scope: 'workspace' | 'global', patterns: string[], rebuild: boolean): Promise<MemoryIndex> {
  if (!(await exists(root))) return loadIndex(root);
  return rebuild ? rebuildIndex(root, scope, patterns) : loadIndex(root);
}
