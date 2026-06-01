/** JSON index rebuild, read, write, and workspace/global merge logic. */
import path from 'node:path';
import { INDEX_FILE, VERSION } from '../runtime/constants.js';
import type { MemoryEntry, MemoryIndex, Scope } from '../runtime/types.js';
import { listFiles, readJson, readText, writeJson } from '../system/fsx.js';
import { entryFromMemory } from './schema.js';
import { isIgnored } from '../safety/ignore.js';

export type InvalidMemoryFile = { scope: Scope; file: string; error: string };

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

function isMemoryFile(root: string, file: string): boolean {
  const rel = path.relative(root, file).replace(/\\/g, '/');
  return file.endsWith('.md') && /^(rules|skills|knowledge)\//.test(rel);
}
