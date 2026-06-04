/** Deterministic routing and load helpers for relevant memory selection. */
import type { EngramConfig, MemoryEntry, MemoryGraph, MemoryIndex } from '../runtime/types.js';
import { readGuardedMemory } from '../safety/safe-read.js';
import { isIgnored } from '../safety/ignore.js';
import { lexicalScore } from '../system/text.js';
import { routeWithGraph } from './graph.js';
import type { VectorRouteHit } from './vector-db.js';

type RouteOptions = { all?: boolean; ignorePatterns?: string[]; vectorHits?: VectorRouteHit[]; candidatePool?: number };

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
export function route(index: MemoryIndex, query: string, config: EngramConfig, manual = false, options: RouteOptions = {}, graph?: MemoryGraph): MemoryEntry[] {
  const entries = prefilter(index, config, manual, options.ignorePatterns);
  const max = 8;
  const pool = Math.max(max, options.candidatePool ?? config.vector?.candidate_pool ?? max);
  if (!options.all && (config.graph.enabled && graph?.nodes.length || options.vectorHits?.length)) {
    const lexical = lexicalRoute(entries, query, pool);
    const graphHits = config.graph.enabled && graph?.nodes.length ? routeWithGraph(entries, graph, query, pool) : [];
    return blendCandidates(entries, query, lexical, graphHits, options.vectorHits ?? [], max);
  }
  const scored = entries.map((entry) => ({
    entry,
    score: lexicalScore(query, `${entry.id} ${entry.type} ${entry.tags.join(' ')} ${entry.summary}`)
  }));
  return scored
    .sort((a, b) => b.score - a.score || scopePriority(a.entry) - scopePriority(b.entry) || a.entry.file.localeCompare(b.entry.file))
    .filter((row) => row.score > 0 || options.all)
    .slice(0, 8)
    .map((row) => row.entry);
}

function lexicalRoute(entries: MemoryEntry[], query: string, max: number): MemoryEntry[] {
  return entries
    .map((entry) => ({ entry, score: lexicalScore(query, entryText(entry)) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || scopePriority(a.entry) - scopePriority(b.entry) || a.entry.file.localeCompare(b.entry.file))
    .slice(0, max)
    .map((row) => row.entry);
}

function blendCandidates(
  visible: MemoryEntry[],
  query: string,
  lexical: MemoryEntry[],
  graph: MemoryEntry[],
  vector: VectorRouteHit[],
  max: number
): MemoryEntry[] {
  const allowed = new Map(visible.map((entry) => [entryKey(entry), entry]));
  const scores = new Map<string, { entry: MemoryEntry; score: number }>();
  const bump = (entry: MemoryEntry, score: number) => {
    const key = entryKey(entry);
    if (!allowed.has(key) || score <= 0) return;
    const current = scores.get(key)?.score ?? 0;
    scores.set(key, { entry, score: current + score });
  };
  for (const entry of lexical) bump(entry, lexicalScore(query, entryText(entry)) + 0.22);
  graph.forEach((entry, index) => bump(entry, 0.4 * rankScore(index, graph.length)));
  vector.forEach((hit, index) => bump(hit.entry, 0.36 * Math.max(hit.score, rankScore(index, vector.length) * 0.75)));
  return [...scores.values()]
    .sort((a, b) => b.score - a.score || scopePriority(a.entry) - scopePriority(b.entry) || a.entry.file.localeCompare(b.entry.file))
    .slice(0, max)
    .map((row) => row.entry);
}

function rankScore(index: number, total: number): number {
  return total ? (total - index) / total : 0;
}

function entryText(entry: MemoryEntry): string {
  return `${entry.id} ${entry.type} ${entry.tags.join(' ')} ${entry.summary}`;
}

function entryKey(entry: MemoryEntry): string {
  return `${entry.scope}:${entry.file}`;
}

/** Load routed files and quarantine prompt-injection matches by skipping them. */
export async function loadEntries(cwd: string, entries: MemoryEntry[], config: EngramConfig): Promise<Array<{ entry: MemoryEntry; content: string; flagged?: string }>> {
  const loaded = [];
  for (const entry of entries) {
    loaded.push(await readGuardedMemory(cwd, entry, config));
  }
  return loaded;
}

function scopePriority(entry: MemoryEntry): number {
  return entry.scope === 'workspace' ? 0 : 1;
}
