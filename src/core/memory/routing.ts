/** Deterministic routing and load helpers for relevant memory selection. */
import type { EngramConfig, MemoryEntry, MemoryGraph, MemoryIndex } from '../runtime/types.js';
import { readGuardedMemory } from '../safety/safe-read.js';
import { isIgnored } from '../safety/ignore.js';
import { lexicalScore, meaningfulWords, words } from '../system/text.js';
import { dependencyContextEntries, routeWithGraph } from './graph.js';
import type { VectorRouteHit } from './vector-db.js';
import { normalizeLoadLimit } from '../runtime/load-limit.js';

type RouteOptions = { all?: boolean; ignorePatterns?: string[]; vectorHits?: VectorRouteHit[]; candidatePool?: number; limit?: number };
export type RouteFacet = { tag: string; count: number };
type RouteContext = { query: string; anchors: Set<string>; terms: Map<string, Set<string>> };
export type RouteReason = {
  key: string;
  kind: 'direct' | 'dependency' | 'vector' | 'graph';
  terms?: string[];
  score?: number;
  source?: string;
};
export type RouteDetail = {
  entries: MemoryEntry[];
  candidates: number;
  selected: number;
  omitted: number;
  refined: boolean;
  facets: RouteFacet[];
  reasons?: RouteReason[];
};

const STOP_TAGS = new Set([
  'and', 'are', 'but', 'for', 'from', 'has', 'have', 'into', 'must', 'not', 'the', 'this', 'that',
  'use', 'uses', 'using', 'when', 'with', 'your', 'also', 'only', 'each', 'just', 'does',
  'used', 'make', 'made', 'been', 'being', 'same', 'such', 'take', 'very', 'much', 'well',
  'back', 'over', 'come', 'keep', 'them', 'they', 'their', 'both', 'some', 'more', 'most',
  'here', 'where', 'able', 'else', 'ever', 'lives', 'new'
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

function isStartSession(entry: MemoryEntry): boolean {
  if (entry.type === 'rule') return true;
  const startTags = ['session-start', 'always-load', 'start-session', 'always'];
  return entry.tags.some((t) => startTags.includes(t.toLowerCase()));
}

/** Select the configured compact set of most relevant entries using lexical similarity. */
export function route(index: MemoryIndex, query: string, config: EngramConfig, manual = false, options: RouteOptions = {}, graph?: MemoryGraph): MemoryEntry[] {
  return routeDetailed(index, query, config, manual, options, graph).entries;
}

/** Select relevant entries and expose read-only refinement diagnostics. */
export function routeDetailed(index: MemoryIndex, query: string, config: EngramConfig, manual = false, options: RouteOptions = {}, graph?: MemoryGraph): RouteDetail {
  const entries = prefilter(index, config, manual, options.ignorePatterns);
  const activeGraph = config.graph.enabled ? graph : undefined;
  const max = normalizeLoadLimit(options.limit ?? config.load?.limit);
  const pool = Math.max(max, options.candidatePool ?? config.vector?.candidate_pool ?? max);
  const isCurrentSession = query.trim().toLowerCase() === 'current session';
  const routeCtx = routeContext(query);
  if (!isCurrentSession && !routeCtx.anchors.size) return detail([], [], query, false);
  if (options.all) {
    const selected = rankRows(entries.map((entry) => {
      let score = directScore(entry, routeCtx);
      if (isCurrentSession && isStartSession(entry)) {
        score = Math.max(0.5, score);
      }
      return { entry, score };
    }).filter((row) => row.score > 0), routeCtx).map((row) => row.entry);
    const ordered = activeGraph ? dependencyContextEntries(selected, entries, activeGraph, selected.length) : selected;
    return detail(ordered, selected, query, false, reasonMap(ordered, routeCtx, selected));
  }
  if (!options.all && (config.graph.enabled && graph?.nodes.length || options.vectorHits?.length)) {
    const lexical = lexicalRoute(entries, query, pool, routeCtx);
    const graphHits = config.graph.enabled && graph?.nodes.length ? routeWithGraph(entries, graph, query, pool) : [];
    const candidates = blendCandidateRows(entries, query, routeCtx, lexical, graphHits, options.vectorHits ?? []);
    return selectDetailed(candidates, routeCtx, max, activeGraph, entries);
  }
  const scored = entries.map((entry) => {
    let score = directScore(entry, routeCtx);
    if (isCurrentSession && isStartSession(entry)) {
      score = Math.max(0.5, score);
    }
    return { entry, score };
  });
  return selectDetailed(scored.filter((row) => row.score > 0), routeCtx, max, activeGraph, entries);
}

function lexicalRoute(entries: MemoryEntry[], query: string, max: number, routeCtx: RouteContext): MemoryEntry[] {
  const isCurrentSession = query.trim().toLowerCase() === 'current session';
  return entries
    .map((entry) => {
      let score = directScore(entry, routeCtx);
      if (isCurrentSession && isStartSession(entry)) {
        score = Math.max(0.5, score);
      }
      return { entry, score };
    })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || scopePriority(a.entry) - scopePriority(b.entry) || a.entry.file.localeCompare(b.entry.file))
    .slice(0, max)
    .map((row) => row.entry);
}

function blendCandidateRows(
  visible: MemoryEntry[],
  query: string,
  routeCtx: RouteContext,
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
  const isCurrentSession = query.trim().toLowerCase() === 'current session';
  for (const entry of lexical) {
    let baseLexicalScore = directScore(entry, routeCtx);
    if (isCurrentSession && isStartSession(entry)) {
      baseLexicalScore = Math.max(0.5, baseLexicalScore);
    }
    bump(entry, baseLexicalScore + 0.22);
  }
  graph
    .filter((entry) => hasAnchorOverlap(entry, routeCtx))
    .forEach((entry, index) => bump(entry, 0.4 * rankScore(index, graph.length)));
  vector
    .filter((hit) => hasAnchorOverlap(hit.entry, routeCtx))
    .forEach((hit, index) => bump(hit.entry, 0.36 * Math.max(hit.score, rankScore(index, vector.length) * 0.75)));
  return [...scores.values()];
}

function selectDetailed(candidates: Array<{ entry: MemoryEntry; score: number }>, routeCtx: RouteContext, max: number, graph?: MemoryGraph, visible?: MemoryEntry[]): RouteDetail {
  const ranked = rankRows(candidates, routeCtx);
  // When there are many candidates, drop entries scoring below 40% of the top score.
  // For small pools (< 2× max), keep all entries — the floor is only for large pools.
  const topScore = ranked[0]?.score ?? 0;
  const minScore = ranked.length > max * 2 ? topScore * 0.40 : 0;
  const relevant = ranked.filter((row) => row.score >= minScore).slice(0, max);
  let selected = relevant.map((row) => row.entry);
  const primarySelected = selected;
  if (graph) selected = dependencyContextEntries(selected, visible ?? ranked.map((row) => row.entry), graph, max);
  const candidateEntries = withSelected(ranked.map((row) => row.entry), selected);
  return detail(selected, candidateEntries, routeCtx.query, candidateEntries.length > max, reasonMap(selected, routeCtx, primarySelected));
}

function rankRows(rows: Array<{ entry: MemoryEntry; score: number }>, routeCtx: RouteContext): Array<{ entry: MemoryEntry; score: number }> {
  return rows
    .map((row) => ({ ...row, score: row.score + refinementScore(row.entry, routeCtx) }))
    .sort((a, b) => b.score - a.score || scopePriority(a.entry) - scopePriority(b.entry) || a.entry.file.localeCompare(b.entry.file));
}

function refinementScore(entry: MemoryEntry, routeCtx: RouteContext): number {
  const queryWords = routeCtx.anchors;
  if (!queryWords.size) return 0;
  const tagHits = entry.tags.filter((tag) => tagMatchesQuery(tag, queryWords)).length;
  // Boost entries with tag overlap, don't penalize — the floor handles filtering in large pools.
  return tagHits * 0.15 + lexicalScore(routeCtx.query, routingText(entry)) * 0.06 + recencyScore(entry.updated) * 0.01;
}

function detail(selected: MemoryEntry[], candidates: MemoryEntry[], query: string, refined: boolean, reasons?: Map<string, RouteReason>): RouteDetail {
  return {
    entries: selected,
    candidates: candidates.length,
    selected: selected.length,
    omitted: Math.max(0, candidates.length - selected.length),
    refined,
    facets: suggestedFacets(candidates, selected, query),
    ...(reasons?.size ? { reasons: selected.map((entry) => reasons.get(entryKey(entry))).filter((reason): reason is RouteReason => Boolean(reason)) } : {})
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
  return `${typeRoutingTerms(entry).join(' ')} ${entry.tags.join(' ')} ${(entry.dependsOn ?? []).join(' ')} ${entry.summary} ${(entry.routingTerms ?? []).join(' ')}`;
}

function routingText(entry: MemoryEntry): string {
  return `${entry.id} ${entryText(entry)}`;
}

function routeContext(query: string): RouteContext {
  return { query, anchors: meaningfulWords(query), terms: new Map() };
}

function directScore(entry: MemoryEntry, routeCtx: RouteContext): number {
  return hasAnchorOverlap(entry, routeCtx) ? lexicalScore(routeCtx.query, routingText(entry)) : 0;
}

function hasAnchorOverlap(entry: MemoryEntry, routeCtx: RouteContext): boolean {
  if (!routeCtx.anchors.size) return false;
  const candidate = candidateTerms(entry, routeCtx);
  for (const anchor of routeCtx.anchors) if (candidate.has(anchor)) return true;
  return false;
}

function candidateTerms(entry: MemoryEntry, routeCtx: RouteContext): Set<string> {
  const key = entryKey(entry);
  const cached = routeCtx.terms.get(key);
  if (cached) return cached;
  const terms = new Set([
    ...meaningfulWords(entry.id),
    ...typeRoutingTerms(entry),
    ...entry.tags.flatMap((tag) => [...meaningfulWords(tag)]),
    ...((entry.dependsOn ?? []).flatMap((dep) => [...meaningfulWords(dep)])),
    ...meaningfulWords(entry.summary),
    ...(entry.routingTerms ?? [])
  ]);
  routeCtx.terms.set(key, terms);
  return terms;
}

function typeRoutingTerms(entry: MemoryEntry): string[] {
  return entry.type === 'skill' ? ['workflow', 'workflows'] : [];
}

function reasonMap(selected: MemoryEntry[], routeCtx: RouteContext, primarySelected: MemoryEntry[]): Map<string, RouteReason> {
  const primary = new Set(primarySelected.map(entryKey));
  const out = new Map<string, RouteReason>();
  for (const entry of selected) {
    const terms = [...routeCtx.anchors].filter((anchor) => candidateTerms(entry, routeCtx).has(anchor));
    const direct = primary.has(entryKey(entry));
    out.set(entryKey(entry), {
      key: entryKey(entry),
      kind: direct ? 'direct' : 'dependency',
      ...(terms.length ? { terms } : {}),
      score: direct ? Number(directScore(entry, routeCtx).toFixed(3)) : undefined,
      ...(direct ? {} : { source: 'depends_on' })
    });
  }
  return out;
}

function entryKey(entry: MemoryEntry): string {
  return `${entry.scope}:${entry.file}`;
}

type LoadEntriesOptions = { forAgents?: boolean };

/** Load routed files and quarantine prompt-injection matches by skipping them. */
export async function loadEntries(cwd: string, entries: MemoryEntry[], config: EngramConfig, options: LoadEntriesOptions = {}): Promise<Array<{ entry: MemoryEntry; content: string; flagged?: string }>> {
  const loaded = [];
  for (const entry of entries) {
    loaded.push(await readGuardedMemory(cwd, entry, config, { forAgents: options.forAgents }));
  }
  return loaded;
}

function scopePriority(entry: MemoryEntry): number {
  return entry.scope === 'workspace' ? 0 : 1;
}

function withSelected(candidates: MemoryEntry[], selected: MemoryEntry[]): MemoryEntry[] {
  const seen = new Set(candidates.map(entryKey));
  const out = [...candidates];
  for (const entry of selected) {
    if (seen.has(entryKey(entry))) continue;
    seen.add(entryKey(entry));
    out.push(entry);
  }
  return out;
}
