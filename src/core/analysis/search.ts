/** Search, stats, and duplicate detection helpers. */
import type { MemoryEntry } from '../runtime/types.js';
import { lexicalScore, words } from '../system/text.js';

/** Return entries ranked by lexical match. */
export function searchEntries(entries: MemoryEntry[], query: string): MemoryEntry[] {
  return entries
    .map((entry) => ({ entry, score: lexicalScore(query, `${entry.id} ${entry.tags.join(' ')} ${entry.summary}`) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((row) => row.entry);
}

/** Find likely duplicates with deterministic token overlap. */
export function duplicatePairs(entries: MemoryEntry[]): Array<[MemoryEntry, MemoryEntry, number]> {
  const pairs: Array<[MemoryEntry, MemoryEntry, number]> = [];
  for (let i = 0; i < entries.length; i += 1) {
    for (let j = i + 1; j < entries.length; j += 1) {
      const score = overlap(`${entries[i].id} ${entries[i].summary}`, `${entries[j].id} ${entries[j].summary}`);
      if (score >= 0.75) pairs.push([entries[i], entries[j], score]);
    }
  }
  return pairs;
}

/** Summarize memory counts by type and scope. */
export function stats(entries: MemoryEntry[]): string {
  const by = (key: 'type' | 'scope') => entries.reduce<Record<string, number>>((acc, e) => {
    acc[e[key]] = (acc[e[key]] ?? 0) + 1;
    return acc;
  }, {});
  return `Total: ${entries.length}\nBy type: ${JSON.stringify(by('type'))}\nBy scope: ${JSON.stringify(by('scope'))}`;
}

function overlap(a: string, b: string): number {
  const aw = words(a);
  const bw = words(b);
  let hit = 0;
  for (const word of aw) if (bw.has(word)) hit += 1;
  return hit / Math.max(1, Math.min(aw.size, bw.size));
}
