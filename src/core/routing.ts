/** Deterministic routing and load helpers for relevant memory selection. */
import type { EngramConfig, MemoryEntry, MemoryIndex } from './types.js';
import { readGuardedMemory } from './safe-read.js';
import { isIgnored } from './ignore.js';
import { lexicalScore } from './text.js';

type RouteOptions = { all?: boolean; ignorePatterns?: string[] };

/** Filter index entries before scoring. */
export function prefilter(index: MemoryIndex, config: EngramConfig, manual = false, ignorePatterns: string[] = []): MemoryEntry[] {
  return visibleEntries(index.entries, config, manual, ignorePatterns);
}

/** Return entries visible to read/export surfaces under current policy. */
export function visibleEntries(entries: MemoryEntry[], config: EngramConfig, manual = false, ignorePatterns: string[] = []): MemoryEntry[] {
  return entries.filter((entry) => {
    if (entry.ignored || isIgnored(entry.file, ignorePatterns)) return false;
    if (!manual && entry.confidence === 'low') return false;
    if (entry.role?.length && config.roles.length && !entry.role.some((r) => config.roles.includes(r))) return false;
    return true;
  });
}

/** Select the 3-8 most relevant entries using lexical similarity. */
export function route(index: MemoryIndex, query: string, config: EngramConfig, manual = false, options: RouteOptions = {}): MemoryEntry[] {
  const scored = prefilter(index, config, manual, options.ignorePatterns).map((entry) => ({
    entry,
    score: lexicalScore(query, `${entry.id} ${entry.type} ${entry.tags.join(' ')} ${entry.summary}`)
  }));
  return scored.sort((a, b) => b.score - a.score).filter((row) => row.score > 0 || options.all).slice(0, 8).map((row) => row.entry);
}

/** Load routed files and quarantine prompt-injection matches by skipping them. */
export async function loadEntries(cwd: string, entries: MemoryEntry[], config: EngramConfig): Promise<Array<{ entry: MemoryEntry; content: string; flagged?: string }>> {
  const loaded = [];
  for (const entry of entries) {
    loaded.push(await readGuardedMemory(cwd, entry, config));
  }
  return loaded;
}
