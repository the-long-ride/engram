/** Deterministic routing and load helpers for relevant memory selection. */
import type { EngramConfig, MemoryEntry, MemoryIndex, Scope } from './types.js';
import { scopeRoots } from './config.js';
import { inside, readText } from './fsx.js';
import { scanInjection } from './security.js';
import { lexicalScore } from './text.js';
import { renderMemoryForConfig } from './rule-variants.js';

/** Filter index entries before scoring. */
export function prefilter(index: MemoryIndex, config: EngramConfig, manual = false): MemoryEntry[] {
  return index.entries.filter((entry) => {
    if (entry.ignored) return false;
    if (!manual && entry.confidence === 'low') return false;
    if (entry.role?.length && config.roles.length && !entry.role.some((r) => config.roles.includes(r))) return false;
    return true;
  });
}

/** Select the 3-8 most relevant entries using lexical similarity. */
export function route(index: MemoryIndex, query: string, config: EngramConfig, manual = false): MemoryEntry[] {
  const scored = prefilter(index, config, manual).map((entry) => ({
    entry,
    score: lexicalScore(query, `${entry.id} ${entry.type} ${entry.tags.join(' ')} ${entry.summary}`)
  }));
  return scored.sort((a, b) => b.score - a.score).filter((row) => row.score > 0 || manual).slice(0, 8).map((row) => row.entry);
}

/** Load routed files and quarantine prompt-injection matches by skipping them. */
export async function loadEntries(cwd: string, entries: MemoryEntry[], config: EngramConfig): Promise<Array<{ entry: MemoryEntry; content: string; flagged?: string }>> {
  const roots = scopeRoots(cwd);
  const loaded = [];
  for (const entry of entries) {
    const root = roots[entry.scope as Scope];
    const content = await readText(inside(root, entry.file));
    const injection = scanInjection(content);
    loaded.push({ entry, content: injection.length ? '' : renderMemoryForConfig(content, entry, config), flagged: injection[0]?.value });
  }
  return loaded;
}
