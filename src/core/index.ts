/** JSON index rebuild, read, write, and workspace/global merge logic. */
import path from 'node:path';
import { INDEX_FILE, VERSION } from './constants.js';
import type { MemoryEntry, MemoryIndex, Scope } from './types.js';
import { listFiles, readJson, readText, writeJson } from './fsx.js';
import { entryFromMemory } from './schema.js';
import { isIgnored } from './ignore.js';

/** Empty index with current schema version. */
export function emptyIndex(): MemoryIndex {
  return { version: VERSION, last_updated: new Date().toISOString(), entries: [] };
}

/** Load an index from a scope root. */
export async function loadIndex(root: string): Promise<MemoryIndex> {
  return readJson<MemoryIndex>(path.join(root, INDEX_FILE), emptyIndex());
}

/** Persist an index to a scope root. */
export async function writeIndex(root: string, index: MemoryIndex): Promise<void> {
  index.last_updated = new Date().toISOString();
  await writeJson(path.join(root, INDEX_FILE), index);
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
  return index;
}

/** Merge indexes with workspace priority on duplicate IDs. */
export function mergeIndexes(workspace: MemoryIndex, global: MemoryIndex): MemoryIndex {
  const map = new Map<string, MemoryEntry>();
  for (const entry of global.entries) map.set(entry.id, { ...entry, scope: 'global' });
  for (const entry of workspace.entries) map.set(entry.id, { ...entry, scope: 'workspace' });
  return { ...emptyIndex(), entries: [...map.values()] };
}

function isMemoryFile(root: string, file: string): boolean {
  const rel = path.relative(root, file).replace(/\\/g, '/');
  return file.endsWith('.md') && /^(rules|skills|knowledge)\//.test(rel);
}
