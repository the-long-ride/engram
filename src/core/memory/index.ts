/** JSON index rebuild, read, write, and workspace/global merge logic. */
import path from 'node:path';
import fs from 'node:fs/promises';
import { GRAPH_FILE, HASH_FILE, INDEX_FILE, VERSION, WORKING_INDEX_FILE, isActiveMemoryPath, isWorkingPath } from '../runtime/constants.js';
import type { MemoryEntry, MemoryIndex, Scope } from '../runtime/types.js';
import { exists, listFiles, readJson, readText, writeJsonAtomic, writeJsonIfChanged } from '../system/fsx.js';
import { loadHashes, saveHashes } from '../safety/hash.js';
import { entryFromMemory } from './schema.js';
import { isIgnored } from '../safety/ignore.js';

export type InvalidMemoryFile = { scope: Scope; file: string; error: string };

/** Empty index with current schema version. */
export function emptyIndex(): MemoryIndex {
  return { version: VERSION, last_updated: new Date().toISOString(), entries: [] };
}

/**
 * Load an index from a scope root: committed durable entries plus the local `working/` index. Working entries are
 * kept only while their file exists, so a clone without `working/` (or a stale index from an older build that still
 * listed working entries in the committed index) never shows phantoms.
 */
export async function loadIndex(root: string): Promise<MemoryIndex> {
  const main = await readJson<MemoryIndex>(path.join(root, INDEX_FILE), emptyIndex());
  const local = await readJson<MemoryIndex>(path.join(root, WORKING_INDEX_FILE), emptyIndex());
  // The path decides the tier, so a durable entry never keeps a `tier` an older build copied from frontmatter.
  const durable = (main.entries ?? []).filter((entry) => !isWorkingPath(entry.file)).map(({ tier: _tier, ...entry }) => entry);
  const working = await presentEntries(root, uniqueByFile([...(local.entries ?? []), ...(main.entries ?? []).filter((entry) => isWorkingPath(entry.file))]));
  return { ...main, entries: [...durable, ...working] };
}

/**
 * Persist an index: durable entries to the committed index, working entries to the gitignored `working/` index.
 * The committed index is only rewritten when its durable content changes, so working-only writes touch no tracked file.
 */
export async function writeIndex(root: string, index: MemoryIndex): Promise<void> {
  index.last_updated = new Date().toISOString();
  const working = index.entries.filter((entry) => isWorkingPath(entry.file));
  await writeJsonIfChanged(path.join(root, INDEX_FILE), { ...index, entries: index.entries.filter((entry) => !isWorkingPath(entry.file)) }, ['last_updated']);
  if (working.length) await writeJsonAtomic(path.join(root, WORKING_INDEX_FILE), { ...index, entries: working });
  else await fs.rm(path.join(root, WORKING_INDEX_FILE), { force: true });
}

/** Working entries the stored indexes list but `loadIndex` drops: committed by an older build, or file missing. */
export async function staleWorkingEntries(root: string): Promise<MemoryEntry[]> {
  const main = await readJson<MemoryIndex>(path.join(root, INDEX_FILE), emptyIndex());
  const local = await readJson<MemoryIndex>(path.join(root, WORKING_INDEX_FILE), emptyIndex());
  const committed = (main.entries ?? []).filter((entry) => isWorkingPath(entry.file));
  const present = new Set((await presentEntries(root, local.entries ?? [])).map((entry) => entry.file));
  return uniqueByFile([...committed, ...(local.entries ?? []).filter((entry) => !present.has(entry.file))]);
}

/** Working-tier keys and nodes an older build left in the committed hash store and graph (`rebuild-index` moves them). */
export async function committedWorkingRefs(root: string): Promise<{ hashes: string[]; graphNodes: string[] }> {
  const hashes = Object.keys(await readJson<Record<string, string>>(path.join(root, HASH_FILE), {})).filter((file) => isWorkingPath(file));
  const graph = await readJson<{ nodes?: Array<{ id: string; file?: string }> }>(path.join(root, GRAPH_FILE), {});
  const graphNodes = (graph.nodes ?? []).filter((node) => node.file && isWorkingPath(node.file)).map((node) => node.id);
  return { hashes, graphNodes };
}

/** Rebuild index entries from Markdown memory files. */
export async function rebuildIndex(root: string, scope: Scope, patterns: string[] = []): Promise<MemoryIndex> {
  const entries: MemoryEntry[] = [];
  const files = (await listFiles(root)).filter((file) => isMemoryFile(root, file));
  for (const file of files) {
    const rel = path.relative(root, file).replace(/\\/g, '/');
    try {
      const entry = entryFromMemory(await readText(file), rel, scope);
      entry.ignored = isIgnored(rel, patterns);
      entries.push(entry);
    } catch {
      continue;
    }
  }
  const index = { ...emptyIndex(), entries };
  await writeIndex(root, index);
  // Re-split the hash store too: an older build kept working keys in the committed store.
  await saveHashes(root, await loadHashes(root));
  return index;
}

/** Report memory files that rebuildIndex would skip because schema validation fails. */
export async function invalidMemoryFiles(root: string, scope: Scope): Promise<InvalidMemoryFile[]> {
  const invalid: InvalidMemoryFile[] = [];
  const files = (await listFiles(root)).filter((file) => isMemoryFile(root, file));
  for (const file of files) {
    const rel = path.relative(root, file).replace(/\\/g, '/');
    try {
      entryFromMemory(await readText(file), rel, scope);
    } catch (error: any) {
      invalid.push({ scope, file: rel, error: error?.message ?? String(error) });
    }
  }
  return invalid;
}

/** Merge indexes with workspace priority on duplicate IDs and list order. */
export function mergeIndexes(workspace: MemoryIndex, global: MemoryIndex): MemoryIndex {
  const map = new Map<string, MemoryEntry>();
  for (const entry of global.entries) map.set(entry.id, { ...entry, scope: 'global' });
  for (const entry of workspace.entries) map.set(entry.id, { ...entry, scope: 'workspace' });
  const entries = [...map.values()].sort((a, b) => scopePriority(a.scope) - scopePriority(b.scope) || a.file.localeCompare(b.file));
  return { ...emptyIndex(), entries };
}

function scopePriority(scope: Scope): number {
  return scope === 'workspace' ? 0 : 1;
}

async function presentEntries(root: string, entries: MemoryEntry[]): Promise<MemoryEntry[]> {
  const present: MemoryEntry[] = [];
  for (const entry of entries) {
    const file = path.resolve(root, entry.file);
    if (path.relative(root, file).startsWith('..')) continue;
    if (await exists(file)) present.push(entry);
  }
  return present;
}

function uniqueByFile(entries: MemoryEntry[]): MemoryEntry[] {
  const seen = new Set<string>();
  return entries.filter((entry) => !seen.has(entry.file) && Boolean(seen.add(entry.file)));
}

function isMemoryFile(root: string, file: string): boolean {
  const rel = path.relative(root, file).replace(/\\/g, '/');
  return isActiveMemoryPath(rel);
}
