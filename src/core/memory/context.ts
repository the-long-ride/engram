/** Shared command context: config, roots, ignore rules, and merged index. */
import type { EngramConfig, MemoryIndex, ProfileResolution } from '../runtime/types.js';
import type { MemoryGraph } from '../runtime/types.js';
import { loadConfig, profileResolutionForConfig, scopeRoots, scopeRootsForConfig } from '../runtime/config.js';
import { isIgnored, loadIgnore } from '../safety/ignore.js';
import { emptyIndex, loadIndex, mergeIndexes, rebuildIndex } from './index.js';
import { emptyGraph, loadGraph, mergeGraphs, rebuildGraph } from './graph.js';
import { exists, inside } from '../system/fsx.js';
import { style } from '../cli/format.js';

export type EngramContext = {
  cwd: string;
  config: EngramConfig;
  roots: ReturnType<typeof scopeRoots>;
  profile: ProfileResolution;
  scopeIndexes: { workspace: MemoryIndex; global: MemoryIndex };
  index: MemoryIndex;
  graph: MemoryGraph;
  hiddenCount: number;
  ignorePatterns: string[];
};

export type ContextOptions = { rebuild?: boolean };

/** Load current config and merged index, rebuilding indexes when present. */
export async function getContext(cwd = process.cwd(), options: ContextOptions = {}): Promise<EngramContext> {
  const config = await loadConfig(cwd);
  const profile = profileResolutionForConfig(config);
  const resolvedRoots = scopeRootsForConfig(cwd, config);
  const roots = profile.workspace_allowed ? resolvedRoots : { ...resolvedRoots, workspace: '' };
  const ignore = await loadIgnore(cwd, config);
  const workspace = await readIndex(roots.workspace, 'workspace', ignore.patterns, Boolean(options.rebuild));
  const global = roots.global ? await readIndex(roots.global, 'global', ignore.patterns, Boolean(options.rebuild)) : emptyIndex();
  const index = mergeIndexes(workspace, global);
  const workspaceGraph = await readGraph(roots.workspace, 'workspace', workspace, config, Boolean(options.rebuild));
  const globalGraph = roots.global ? await readGraph(roots.global, 'global', global, config, Boolean(options.rebuild)) : emptyGraph();
  const graph = mergeGraphs(workspaceGraph, globalGraph);
  const hiddenCount = index.entries.filter((entry) => entry.ignored || isIgnored(entry.file, ignore.patterns)).length;
  return { cwd, config, roots, profile, scopeIndexes: { workspace, global }, index, graph, hiddenCount, ignorePatterns: ignore.patterns };
}

/** Format the session-start load summary. */
export function loadSummary(entries: { type: string; id: string; scope: string }[], hidden: number, relatedTotal?: number): string {
  const workspace = entries.filter((e) => e.scope === 'workspace').length;
  const global = entries.filter((e) => e.scope === 'global').length;
  const groups = entries.reduce<Record<string, string[]>>((acc, e) => {
    acc[e.type] = [...(acc[e.type] ?? []), e.id];
    return acc;
  }, {});
  const totalStr = style.number(String(entries.length));
  const wsStr = style.number(String(workspace));
  const glStr = style.number(String(global));
  const hidStr = style.number(String(hidden));
  const related = relatedTotal === undefined ? '' : ` / ${style.number(String(relatedTotal))} total related memories`;
  const lines = [
    `${style.heading('engram:')} loaded ${totalStr} memory files${related} (${style.label('workspace:')} ${wsStr}, ${style.label('global:')} ${glStr}) [${hidStr} hidden by ignore]`
  ];
  for (const [type, ids] of Object.entries(groups)) {
    lines.push(`  ${style.label(type)}: ${ids.map((id) => style.value(id)).join(', ')}`);
  }
  return lines.join('\n');
}

/** Resolve a memory entry to an absolute file path. */
export function entryPath(ctx: EngramContext, scope: string, file: string): string {
  const root = ctx.roots[scope as 'workspace' | 'global'];
  if (!root) throw new Error(`${scope} memory is not available for the active profile`);
  return inside(root, file);
}

async function readIndex(root: string, scope: 'workspace' | 'global', patterns: string[], rebuild: boolean): Promise<MemoryIndex> {
  if (!root) return emptyIndex();
  if (!(await exists(root))) return loadIndex(root);
  return rebuild ? rebuildIndex(root, scope, patterns) : loadIndex(root);
}

async function readGraph(root: string, scope: 'workspace' | 'global', index: MemoryIndex, config: EngramConfig, rebuild: boolean): Promise<MemoryGraph> {
  if (!root) return emptyGraph();
  if (!(await exists(root))) return emptyGraph();
  return rebuild ? rebuildGraph(root, scope, index, config) : loadGraph(root);
}
