/** Deterministic routing and load helpers for relevant memory selection. */
import type { EngramConfig, MemoryEntry, MemoryGraph, MemoryIndex } from '../runtime/types.js';
import { readGuardedMemory } from '../safety/safe-read.js';
import { isIgnored } from '../safety/ignore.js';
import { lexicalScore, words } from '../system/text.js';
import { routeWithGraph } from './graph.js';
import type { VectorRouteHit } from './vector-db.js';

type RouteOptions = { all?: boolean; ignorePatterns?: string[]; vectorHits?: VectorRouteHit[]; candidatePool?: number };
export type RouteFacet = { tag: string; count: number };
export type RouteDetail = {
  entries: MemoryEntry[];
  candidates: number;
  selected: number;
  omitted: number;
  refined: boolean;
  facets: RouteFacet[];
};

const ROUTE_LIMIT = 8;
const STOP_TAGS = new Set([
  'and', 'are', 'but', 'for', 'from', 'has', 'have', 'into', 'must', 'not', 'the', 'this', 'that',
  'use', 'uses', 'using', 'when', 'with', 'your'
]);

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
  return routeDetailed(index, query, config, manual, options, graph).entries;
}

/** Select relevant entries and expose read-only refinement diagnostics. */
export function routeDetailed(index: MemoryIndex, query: string, config: EngramConfig, manual = false, options: RouteOptions = {}, graph?: MemoryGraph): RouteDetail {
  const entries = prefilter(index, config, manual, options.ignorePatterns);
  const max = ROUTE_LIMIT;
  const pool = Math.max(max, options.candidatePool ?? config.vector?.candidate_pool ?? max);
  if (options.all) {
    const selected = rankRows(entries.map((entry) => ({ entry, score: lexicalScore(query, entryText(entry)) })), query).map((row) => row.entry);
    return detail(selected, selected, query, false);
  }
  if (!options.all && (config.graph.enabled && graph?.nodes.length || options.vectorHits?.length)) {
    const lexical = lexicalRoute(entries, query, pool);
    const graphHits = config.graph.enabled && graph?.nodes.length ? routeWithGraph(entries, graph, query, pool) : [];
    const candidates = blendCandidateRows(entries, query, lexical, graphHits, options.vectorHits ?? []);
    return selectDetailed(candidates, query, max);
  }
  const scored = entries.map((entry) => ({
    entry,
    score: lexicalScore(query, `${entry.id} ${entry.type} ${entry.tags.join(' ')} ${entry.summary}`)
  }));
  return selectDetailed(scored.filter((row) => row.score > 0), query, max);
}

function lexicalRoute(entries: MemoryEntry[], query: string, max: number): MemoryEntry[] {
  return entries
    .map((entry) => ({ entry, score: lexicalScore(query, entryText(entry)) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || scopePriority(a.entry) - scopePriority(b.entry) || a.entry.file.localeCompare(b.entry.file))
    .slice(0, max)
    .map((row) => row.entry);
}

function blendCandidateRows(
  visible: MemoryEntry[],
  query: string,
  lexical: MemoryEntry[],
  graph: MemoryEntry[],
  vector: VectorRouteHit[]
): Array<{ entry: MemoryEntry; score: number }> {
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
  return [...scores.values()];
}

function selectDetailed(candidates: Array<{ entry: MemoryEntry; score: number }>, query: string, max: number): RouteDetail {
  const ranked = rankRows(candidates, query);
  const selected = ranked.slice(0, max).map((row) => row.entry);
  return detail(selected, ranked.map((row) => row.entry), query, ranked.length > max);
}

function rankRows(rows: Array<{ entry: MemoryEntry; score: number }>, query: string): Array<{ entry: MemoryEntry; score: number }> {
  return rows
    .map((row) => ({ ...row, score: row.score + refinementScore(row.entry, query) }))
    .sort((a, b) => b.score - a.score || scopePriority(a.entry) - scopePriority(b.entry) || a.entry.file.localeCompare(b.entry.file));
}

function refinementScore(entry: MemoryEntry, query: string): number {
  const queryWords = words(query);
  if (!queryWords.size) return 0;
  const tagHits = entry.tags.filter((tag) => tagMatchesQuery(tag, queryWords)).length;
  const typeHit = typeMatchesQuery(entry.type, queryWords) ? 1 : 0;
  return tagHits * 0.08 + typeHit * 0.06 + lexicalScore(query, entry.summary) * 0.08 + recencyScore(entry.updated) * 0.015;
}

function detail(selected: MemoryEntry[], candidates: MemoryEntry[], query: string, refined: boolean): RouteDetail {
  return {
    entries: selected,
    candidates: candidates.length,
    selected: selected.length,
    omitted: Math.max(0, candidates.length - selected.length),
    refined,
    facets: suggestedFacets(candidates, selected, query)
  };
}

function suggestedFacets(candidates: MemoryEntry[], selected: MemoryEntry[], query: string): RouteFacet[] {
  const queryWords = words(query);
  const selectedKeys = new Set(selected.map(entryKey));
  const counts = new Map<string, { tag: string; count: number; selected: number }>();
  for (const entry of candidates) {
    const selectedHit = selectedKeys.has(entryKey(entry));
    for (const tag of entry.tags) {
      const normalized = tag.toLowerCase();
      if (STOP_TAGS.has(normalized) || tagMatchesQuery(normalized, queryWords)) continue;
      const current = counts.get(normalized) ?? { tag: normalized, count: 0, selected: 0 };
      current.count += 1;
      if (selectedHit) current.selected += 1;
      counts.set(normalized, current);
    }
  }
  return [...counts.values()]
    .filter((facet) => facet.count > 1 || facet.selected > 0)
    .sort((a, b) => b.selected - a.selected || b.count - a.count || a.tag.localeCompare(b.tag))
    .slice(0, 5)
    .map(({ tag, count }) => ({ tag, count }));
}

function tagMatchesQuery(tag: string, queryWords: Set<string>): boolean {
  if (queryWords.has(tag)) return true;
  return tag.split('-').some((part) => queryWords.has(part));
}

function typeMatchesQuery(type: MemoryEntry['type'], queryWords: Set<string>): boolean {
  if (queryWords.has(type)) return true;
  return type === 'skill' && (queryWords.has('workflow') || queryWords.has('workflows'));
}

function recencyScore(updated: string): number {
  const time = Date.parse(updated);
  if (!Number.isFinite(time)) return 0;
  const ageDays = Math.max(0, (Date.now() - time) / 864e5);
  return 1 / (1 + ageDays / 90);
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
