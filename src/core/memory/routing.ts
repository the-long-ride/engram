/** Deterministic routing and load helpers for relevant memory selection. */
import type { EngramConfig, MemoryEntry, MemoryGraph, MemoryIndex } from '../runtime/types.js';
import { readGuardedMemory } from '../safety/safe-read.js';
import { isIgnored } from '../safety/ignore.js';
import { pathAnchorHit, queryPaths, type QueryPath } from './path-anchors.js';
import { meaningfulWordList, meaningfulWords, today, words } from '../system/text.js';
import { buildBm25F, stem, type Bm25FieldSpec } from '../system/bm25.js';
import { buildCorpusConceptMap, expandConceptStems, hasStrongConceptOverlap } from './concepts.js';
import { dependencyContextEntries, routeWithGraph } from './graph.js';
import type { VectorRouteHit } from './vector-db.js';
import { normalizeLoadLimit } from '../runtime/load-limit.js';
import type { TaskIntent } from './task-intent.js';
import { usageBoost, type UsageMap } from './usage.js';
import type { StaleMap } from './freshness.js';
import { isExpired, memoryKey } from './memory-ref.js';

/** `stale` is the D17 `stale.json` map (`scope:file` keys); a listed memory gets the D5 stale factor. */
export type RouteOptions = { all?: boolean; ignorePatterns?: string[]; vectorHits?: VectorRouteHit[]; candidatePool?: number; limit?: number; intent?: TaskIntent; semanticRelaxed?: boolean; usage?: UsageMap; stale?: StaleMap; sessionObjective?: string; rawQuery?: string };
export type RouteFacet = { tag: string; count: number };
/** `anchors` are the raw query words; `stems` their stemmed forms used for matching and BM25; `rawStems` come from the unexpanded query for gating; `paths` the file paths the query names (D9). */
type RouteContext = { query: string; anchors: Set<string>; stems: Set<string>; rawStems: Set<string>; paths: QueryPath[]; fields: Map<string, EntryFields>; scores: Map<string, number>; day: string; usage?: UsageMap; stale?: StaleMap; allowConceptFallback?: boolean; corpusConcepts?: Map<string, Set<string>> };
/**
 * Stemmed routing terms per entry; `strong` fields (id, tags, directive, applies_to) gate and weigh double.
 * `pathHit` is set when a query path matches an `applies_to` glob (D9), which counts as a strong anchor.
 */
type EntryFields = { strong: Set<string>; all: Set<string>; title: string[]; tags: string[]; body: string[]; pathHit: boolean };
type CandidateRow = { entry: MemoryEntry; score: number; contributions: Set<string> };
export type RouteReason = {
  key: string;
  kind: 'direct' | 'dependency' | 'vector' | 'graph';
  matchedBy: Array<'literal' | 'intent' | 'vector' | 'graph' | 'dependency'>;
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
  candidateEntries?: MemoryEntry[];
  /** Candidates that cleared the relevance floor (`score >= minScore`), plus any selected entries. */
  relevantEntries?: MemoryEntry[];
  /** Matching memories left out because their `valid_until` has passed. */
  lifecycleOmitted?: MemoryEntry[];
};

// D6: queries with this many anchors need two anchor hits or one strong-field hit.
const GATE_MIN_ANCHORS = 4;
// D9: score added when a file path named in the query matches the entry's `applies_to`. Detection only
// accepts real file paths against non-universal globs, so a hit is a deliberate signal: enough to route a
// path-only match, while a top BM25 hit (normalised to about 1.0) still outranks it.
const PATH_ANCHOR_SCORE = 0.5;
const VALIDITY_WEIGHTS = { reviewDue: 0.7, stale: 0.6, mediumConfidence: 0.9, workspace: 1.1 };

const STOP_TAGS = new Set([
  'and', 'are', 'but', 'for', 'from', 'has', 'have', 'into', 'must', 'not', 'the', 'this', 'that',
  'use', 'uses', 'using', 'when', 'with', 'your', 'also', 'only', 'each', 'just', 'does',
  'used', 'make', 'made', 'been', 'being', 'same', 'such', 'take', 'very', 'much', 'well',
  'back', 'over', 'come', 'keep', 'them', 'they', 'their', 'both', 'some', 'more', 'most',
  'here', 'where', 'able', 'else', 'ever', 'lives', 'new'
]);

/** Filter index entries before scoring; expired memories never route. */
export function prefilter(index: MemoryIndex, config: EngramConfig, manual = false, ignorePatterns: string[] = [], day = today()): MemoryEntry[] {
  return visibleEntries(index.entries, config, manual, ignorePatterns).filter((entry) => validityFactor(entry, false, day) !== 'exclude');
}

/** D5 ranking multiplier: expired `valid_until` excludes; review_due, staleness, and medium confidence demote; workspace scope promotes. */
export function validityFactor(entry: MemoryEntry, stale: boolean, today: string): number | 'exclude' {
  if (isExpired(entry.validUntil, today)) return 'exclude';
  let factor = 1;
  if (entry.lifecycle === 'review_due') factor *= VALIDITY_WEIGHTS.reviewDue;
  if (stale) factor *= VALIDITY_WEIGHTS.stale;
  if (entry.confidence === 'medium') factor *= VALIDITY_WEIGHTS.mediumConfidence;
  if (entry.scope === 'workspace') factor *= VALIDITY_WEIGHTS.workspace;
  return factor;
}

/** Return entries visible to read/export surfaces under current policy. */
export function visibleEntries(entries: MemoryEntry[], config: EngramConfig, manual = false, ignorePatterns: string[] = []): MemoryEntry[] {
  return entries.filter((entry) => {
    if (entry.ignored || isIgnored(entry.file, ignorePatterns)) return false;
    if (entry.lifecycle === 'archived' || entry.lifecycle === 'superseded') return false;
    if (!manual && entry.confidence === 'low') return false;
    if (entry.role?.length && config.roles.length && !entry.role.some((r) => config.roles.includes(r))) return false;
    return true;
  });
}

const EXPLICIT_START_TAGS = new Set(['session-start', 'always-load', 'start-session', 'always']);
const EXPLICIT_START_PHRASE = /\bsession[\s-]+start(?:up)?\b|\bstart(?:up)?[\s-]+session\b/i;

/** True when a memory explicitly declares that it belongs on SessionStart. */
export function hasExplicitStartupSignal(entry: MemoryEntry): boolean {
  if (entry.tags.some((t) => EXPLICIT_START_TAGS.has(t.toLowerCase()))) return true;
  return EXPLICIT_START_PHRASE.test(`${entry.id} ${entry.summary}`);
}

function isSessionEligible(entry: MemoryEntry): boolean {
  return hasExplicitStartupSignal(entry) || (entry.type === 'rule' && !entry.appliesTo?.length);
}

function currentSessionScore(entry: MemoryEntry, routeCtx: RouteContext): number {
  const explicit = hasExplicitStartupSignal(entry);
  const generalRule = entry.type === 'rule' && !entry.appliesTo?.length;
  if (!explicit && !generalRule) return 0;
  const factor = validityFactor(entry, Boolean(routeCtx.stale?.[memoryKey(entry)]?.length), routeCtx.day);
  if (factor === 'exclude') return 0;
  const base = directScore(entry, routeCtx);
  return Math.max((explicit ? 0.85 : 0.45) * factor, base);
}

function isStartSession(entry: MemoryEntry): boolean {
  return entry.type === 'rule' || hasExplicitStartupSignal(entry);
}

/** Select the configured compact set of most relevant entries using lexical similarity. */
export function route(index: MemoryIndex, query: string, config: EngramConfig, manual = false, options: RouteOptions = {}, graph?: MemoryGraph): MemoryEntry[] {
  return routeDetailed(index, query, config, manual, options, graph).entries;
}

/** The session objective a hook run carries, set by whoever starts the host session (`ENGRAM_SESSION_OBJECTIVE`). */
export function sessionObjectiveFromEnv(): string | undefined {
  return process.env.ENGRAM_SESSION_OBJECTIVE?.trim() || undefined;
}

/** A working-tier note belongs to the session only when its objective equals (or contains, or is contained in) the session objective; every other memory always passes. */
export function noteMatchesObjective(entry: MemoryEntry, sessionObjective?: string): boolean {
  if (!entry.note) return true;
  const normalize = (value?: string) => (value ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
  const session = normalize(sessionObjective);
  const own = normalize(entry.objective);
  return Boolean(session && own && (session === own || session.includes(own) || own.includes(session)));
}

/** Select relevant entries and expose read-only refinement diagnostics. */
export function routeDetailed(index: MemoryIndex, query: string, config: EngramConfig, manual = false, options: RouteOptions = {}, graph?: MemoryGraph): RouteDetail {
  const day = today();
  const prefiltered = prefilter(index, config, manual, options.ignorePatterns, day);
  // SessionStart never carries a task note unless the session objective names it; `all` is an explicit full listing.
  const sessionStart = query.trim().toLowerCase() === 'current session' && options.all !== true;
  const entries = sessionStart ? prefiltered.filter((entry) => noteMatchesObjective(entry, options.sessionObjective ?? sessionObjectiveFromEnv())) : prefiltered;
  const routeCtx = routeContext(query, entries, day, options.usage, options.stale, options.rawQuery);
  const routed = routeEntries(entries, routeCtx, config, options, graph);
  // Expired memories that would have matched are reported, never routed.
  const expired = visibleEntries(index.entries, config, manual, options.ignorePatterns)
    .filter((entry) => validityFactor(entry, false, day) === 'exclude' && hasAnchorOverlap(entry, routeCtx));
  return expired.length ? { ...routed, lifecycleOmitted: expired } : routed;
}

function routeEntries(entries: MemoryEntry[], routeCtx: RouteContext, config: EngramConfig, options: RouteOptions, graph?: MemoryGraph): RouteDetail {
  const query = routeCtx.query;
  const activeGraph = config.graph.enabled ? graph : undefined;
  const max = normalizeLoadLimit(options.limit ?? config.load?.limit);
  const pool = Math.max(max, options.candidatePool ?? config.vector?.candidate_pool ?? max);
  const isCurrentSession = query.trim().toLowerCase() === 'current session';
  if (!isCurrentSession && !routeCtx.anchors.size && !routeCtx.paths.length) return detail([], [], query, false);
  if (options.all) {
    const allRows: CandidateRow[] = entries.map((entry) => {
      let score = directScore(entry, routeCtx);
      if (isCurrentSession && isStartSession(entry)) {
        score = Math.max(0.5, score);
      }
      return { entry, score, contributions: new Set(['lexical']) };
    }).filter((row) => row.score > 0);
    const ranked = rankRows(allRows, routeCtx);
    const selected = ranked.map((row) => row.entry);
    const ordered = activeGraph ? dependencyContextEntries(selected, entries, activeGraph, selected.length) : selected;
    const contributions = new Map<string, Set<string>>(ranked.map((row) => [memoryKey(row.entry), row.contributions]));
    const scores = new Map<string, number>(ranked.map((row) => [memoryKey(row.entry), row.score]));
    return detail(ordered, selected, query, false, reasonMap(ordered, routeCtx, selected, undefined, contributions, scores));
  }
  if (!options.all && (config.graph.enabled && graph?.nodes.length || options.vectorHits?.length)) {
    const lexical = lexicalRoute(entries, query, pool, routeCtx);
    const graphHits = config.graph.enabled && graph?.nodes.length ? routeWithGraph(entries, graph, query, pool) : [];
    const candidates = blendCandidateRows(entries, query, routeCtx, lexical, graphHits, options.vectorHits ?? []);
    const intentTerms = options.intent ? new Set(options.intent.retrievalTerms) : undefined;
    return selectDetailed(candidates, routeCtx, max, activeGraph, entries, intentTerms);
  }
  const scored: CandidateRow[] = entries.map((entry) => {
    const score = isCurrentSession ? currentSessionScore(entry, routeCtx) : directScore(entry, routeCtx);
    return { entry, score, contributions: new Set(['lexical']) };
  });
  return selectDetailed(scored.filter((row) => row.score > 0), routeCtx, max, activeGraph, entries, options.intent ? new Set(options.intent.retrievalTerms) : undefined);
}

function lexicalRoute(entries: MemoryEntry[], query: string, max: number, routeCtx: RouteContext): MemoryEntry[] {
  const isCurrentSession = query.trim().toLowerCase() === 'current session';
  return entries
    .map((entry) => {
      const score = isCurrentSession ? currentSessionScore(entry, routeCtx) : directScore(entry, routeCtx);
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
): Array<CandidateRow> {
  const allowed = new Map(visible.map((entry) => [memoryKey(entry), entry]));
  const scores = new Map<string, CandidateRow>();
  const bump = (entry: MemoryEntry, score: number, source: string) => {
    const key = memoryKey(entry);
    if (!allowed.has(key) || score <= 0) return;
    const current = scores.get(key);
    if (current) {
      current.score += score;
      current.contributions.add(source);
    } else {
      scores.set(key, { entry, score, contributions: new Set([source]) });
    }
  };
  const isCurrentSession = query.trim().toLowerCase() === 'current session';
  const eligible = (entry: MemoryEntry) => !isCurrentSession || isSessionEligible(entry);
  for (const entry of lexical) {
    const baseLexicalScore = isCurrentSession ? currentSessionScore(entry, routeCtx) : directScore(entry, routeCtx);
    if (baseLexicalScore > 0) bump(entry, baseLexicalScore + 0.22, 'lexical');
  }
  // D6: graph and vector hits must pass the same anchor gate; hashed vectors are not semantic.
  graph
    .filter((entry) => eligible(entry) && hasAnchorOverlap(entry, routeCtx))
    .forEach((entry, index) => bump(entry, 0.4 * rankScore(index, graph.length), 'graph'));
  vector
    .filter((hit) => eligible(hit.entry) && hasAnchorOverlap(hit.entry, routeCtx))
    .forEach((hit, index) => bump(hit.entry, 0.36 * Math.max(hit.score, rankScore(index, vector.length) * 0.75), 'vector'));
  return [...scores.values()];
}

function selectDetailed(candidates: CandidateRow[], routeCtx: RouteContext, max: number, graph?: MemoryGraph, visible?: MemoryEntry[], intentRetrievalTerms?: Set<string>): RouteDetail {
  const ranked = rankRows(candidates, routeCtx);
  // When there are many candidates, drop entries scoring below 40% of the top score.
  // For small pools (< 2× max), keep all entries — the floor is only for large pools.
  const topScore = ranked[0]?.score ?? 0;
  const minScore = ranked.length > max * 2 ? topScore * 0.40 : 0;
  const relevantRows = ranked.filter((row) => row.score >= minScore);
  const relevant = relevantRows.slice(0, max);
  let selected = relevant.map((row) => row.entry);
  const primarySelected = selected;
  if (graph) selected = dependencyContextEntries(selected, visible ?? ranked.map((row) => row.entry), graph, max);
  const candidateEntries = withSelected(ranked.map((row) => row.entry), selected);
  const relevantEntries = withSelected(relevantRows.map((row) => row.entry), selected);
  const contributions = new Map<string, Set<string>>(ranked.map((row) => [memoryKey(row.entry), row.contributions]));
  const scores = new Map<string, number>(ranked.map((row) => [memoryKey(row.entry), row.score]));
  return detail(selected, candidateEntries, routeCtx.query, candidateEntries.length > max, reasonMap(selected, routeCtx, primarySelected, intentRetrievalTerms, contributions, scores), relevantEntries);
}

function rankRows(rows: CandidateRow[], routeCtx: RouteContext): CandidateRow[] {
  return rows
    .map((row) => ({ ...row, score: row.score + refinementScore(row.entry, routeCtx) }))
    .sort((a, b) => b.score - a.score || scopePriority(a.entry) - scopePriority(b.entry) || a.entry.file.localeCompare(b.entry.file));
}

function refinementScore(entry: MemoryEntry, routeCtx: RouteContext): number {
  if (!routeCtx.stems.size) return 0;
  // Title-derived tags repeat the id; only authored tags earn the boost.
  const tagHits = entry.autoTags ? 0 : entry.tags.filter((tag) => tagMatchesStems(tag, routeCtx.stems)).length;
  // Boost entries with tag overlap, don't penalize — the floor handles filtering in large pools.
  return tagHits * 0.15 + knowledgeFreshnessBoost(entry, routeCtx.day) + usageBoost(routeCtx.usage?.[memoryKey(entry)]);
}

function detail(selected: MemoryEntry[], candidates: MemoryEntry[], query: string, refined: boolean, reasons?: Map<string, RouteReason>, relevantEntries?: MemoryEntry[]): RouteDetail {
  return {
    entries: selected,
    candidates: candidates.length,
    selected: selected.length,
    omitted: Math.max(0, candidates.length - selected.length),
    refined,
    facets: suggestedFacets(candidates, selected, query),
    candidateEntries: candidates,
    ...(relevantEntries ? { relevantEntries } : {}),
    ...(reasons?.size ? { reasons: selected.map((entry) => reasons.get(memoryKey(entry))).filter((reason): reason is RouteReason => Boolean(reason)) } : {})
  };
}

function suggestedFacets(candidates: MemoryEntry[], selected: MemoryEntry[], query: string): RouteFacet[] {
  const queryWords = words(query);
  const selectedKeys = new Set(selected.map(memoryKey));
  const counts = new Map<string, { tag: string; count: number; selected: number }>();
  for (const entry of candidates) {
    const selectedHit = selectedKeys.has(memoryKey(entry));
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

function tagMatchesStems(tag: string, stems: Set<string>): boolean {
  const normalized = tag.toLowerCase();
  return [normalized, ...normalized.split('-')].some((part) => stems.has(stem(part)));
}

/** Return the most recent valid timestamp (ms) across lastConfirmed, updated, and validFrom. */
export function freshestTimestamp(entry: MemoryEntry): number | undefined {
  const times = [entry.lastConfirmed, entry.updated, entry.validFrom]
    .map((value) => (value ? Date.parse(value) : Number.NaN))
    .filter((time) => Number.isFinite(time));
  return times.length ? Math.max(...times) : undefined;
}

function knowledgeFreshnessBoost(entry: MemoryEntry, day: string): number {
  let boost = 0;
  const latestTime = freshestTimestamp(entry);
  const refTime = Date.parse(day);
  if (latestTime !== undefined && Number.isFinite(refTime)) {
    const ageDays = Math.max(0, (refTime - latestTime) / 864e5);
    boost += 0.12 * (1 / (1 + ageDays / 30));
  }
  if (entry.tier === 'working') boost += 0.08;
  boost += 0.02 * Math.min(3, Math.max(0, (entry.revision ?? 1) - 1));
  return boost;
}

function rankScore(index: number, total: number): number {
  return total ? (total - index) / total : 0;
}

const BM25F_SPECS: Bm25FieldSpec[] = [
  { name: 'title', weight: 2.2, b: 0.65 },
  { name: 'tags', weight: 2.0, b: 0.65 },
  { name: 'body', weight: 1.0, b: 0.75 }
];
const CONCEPT_SYNONYM_WEIGHT = 0.45;

/** Build the per-query context: stemmed anchors plus BM25F & concept scores normalised to the best hit, times the validity factor. */
function routeContext(query: string, entries: MemoryEntry[], day: string, usage?: UsageMap, stale?: StaleMap, rawQuery?: string): RouteContext {
  const anchors = meaningfulWords(query);
  const rawAnchors = meaningfulWords(rawQuery ?? query);
  const ctx: RouteContext = {
    query,
    anchors,
    stems: new Set([...anchors].map(stem)),
    rawStems: new Set([...rawAnchors].map(stem)),
    paths: queryPaths(rawQuery ?? query),
    fields: new Map(),
    scores: new Map(),
    day,
    ...(usage ? { usage } : {}),
    ...(stale ? { stale } : {})
  };
  if (!anchors.size) return ctx;
  const bm25f = buildBm25F(
    entries.map((entry) => {
      const f = entryFields(entry, ctx);
      return { key: memoryKey(entry), fields: { title: f.title, tags: f.tags, body: f.body } };
    }),
    BM25F_SPECS
  );
  const exactAnchoredCount = entries.filter(
    (entry) => validityFactor(entry, Boolean(stale?.[memoryKey(entry)]?.length), day) !== 'exclude' && hasExactAnchorOverlap(entry, ctx)
  ).length;
  ctx.allowConceptFallback = exactAnchoredCount === 0;
  if (ctx.allowConceptFallback) ctx.corpusConcepts = buildCorpusConceptMap(entries);
  const raw = bm25f.score([...ctx.stems]);
  const conceptStems = ctx.allowConceptFallback ? expandConceptStems(ctx.rawStems.size ? ctx.rawStems : ctx.stems, ctx.corpusConcepts) : new Set<string>();
  const synScores = conceptStems.size ? bm25f.score([...conceptStems]) : undefined;
  const combined = new Map<string, number>(raw);
  if (synScores?.size) {
    for (const [key, synScore] of synScores) {
      if (synScore > 0) combined.set(key, (combined.get(key) ?? 0) + CONCEPT_SYNONYM_WEIGHT * synScore);
    }
  }
  const max = Math.max(0, ...combined.values());
  if (!max) return ctx;
  for (const entry of entries) {
    const score = combined.get(memoryKey(entry));
    const factor = validityFactor(entry, Boolean(stale?.[memoryKey(entry)]?.length), day);
    if (score && factor !== 'exclude') ctx.scores.set(memoryKey(entry), (score / max) * factor);
  }
  return ctx;
}

function intentOverlap(entry: MemoryEntry, intentTerms: Set<string>, routeCtx: RouteContext): boolean {
  const entryTerms = entryFields(entry, routeCtx).all;
  for (const term of intentTerms) {
    if (entryTerms.has(stem(term))) return true;
  }
  return false;
}

function directScore(entry: MemoryEntry, routeCtx: RouteContext): number {
  if (!hasAnchorOverlap(entry, routeCtx)) return 0;
  const pathBonus = entryFields(entry, routeCtx).pathHit ? PATH_ANCHOR_SCORE : 0;
  return (routeCtx.scores.get(memoryKey(entry)) ?? 0) + pathBonus;
}

/** D6 candidate gate: any anchor hit for short queries; longer ones need two hits or one strong-field hit. */
function hasExactAnchorOverlap(entry: MemoryEntry, routeCtx: RouteContext): boolean {
  const { all, strong, pathHit } = entryFields(entry, routeCtx);
  if (pathHit) return true;
  const gateStems = routeCtx.rawStems.size ? routeCtx.rawStems : routeCtx.stems;
  if (!gateStems.size) return false;
  let hits = 0;
  for (const anchor of gateStems) {
    if (!all.has(anchor)) continue;
    hits += 1;
    if (gateStems.size < GATE_MIN_ANCHORS || strong.has(anchor) || hits >= 2) return true;
  }
  return false;
}

/** D6 candidate gate with strong-field concept synonym fallback when exact queries find zero matches. */
function hasAnchorOverlap(entry: MemoryEntry, routeCtx: RouteContext): boolean {
  if (hasExactAnchorOverlap(entry, routeCtx)) return true;
  if (!routeCtx.allowConceptFallback) return false;
  const { all, strong } = entryFields(entry, routeCtx);
  const gateStems = routeCtx.rawStems.size ? routeCtx.rawStems : routeCtx.stems;
  return hasStrongConceptOverlap(gateStems, strong, all, routeCtx.corpusConcepts);
}

function entryFields(entry: MemoryEntry, routeCtx: RouteContext): EntryFields {
  const key = memoryKey(entry);
  const cached = routeCtx.fields.get(key);
  if (cached) return cached;
  // Title-derived tags (no frontmatter `tags`) are ordinary terms, not a strong field.
  const tags = entry.tags ?? [];
  const title = stemmedTerms([entry.id, entry.directive ?? '', ...(entry.appliesTo ?? [])]);
  const authoredTags = entry.autoTags ? [] : stemmedTerms(tags);
  const tagTerms = stemmedTerms([...(entry.autoTags ? [] : tags), ...(entry.routingTerms ?? [])]);
  const body = stemmedTerms([...typeRoutingTerms(entry), ...(entry.autoTags ? tags : []), entry.summary ?? '']);
  const strong = [...title, ...authoredTags];
  const pathHit = pathAnchorHit(routeCtx.paths, entry.appliesTo);
  const fields = {
    strong: new Set(strong),
    all: new Set([...strong, ...tagTerms, ...body]),
    title,
    tags: tagTerms,
    body,
    pathHit
  };
  routeCtx.fields.set(key, fields);
  return fields;
}

function stemmedTerms(texts: string[]): string[] {
  return texts.flatMap((text) => meaningfulWordList(text).map(stem));
}

function typeRoutingTerms(entry: MemoryEntry): string[] {
  return entry.type === 'skill' ? ['workflow', 'workflows'] : [];
}

function reasonMap(selected: MemoryEntry[], routeCtx: RouteContext, primarySelected: MemoryEntry[], intentRetrievalTerms?: Set<string>, contributions?: Map<string, Set<string>>, scores?: Map<string, number>): Map<string, RouteReason> {
  const primary = new Set(primarySelected.map(memoryKey));
  const out = new Map<string, RouteReason>();
  for (const entry of selected) {
    const terms = [...routeCtx.anchors].filter((anchor) => entryFields(entry, routeCtx).all.has(stem(anchor)));
    const direct = primary.has(memoryKey(entry));
    const entryContributions = contributions?.get(memoryKey(entry));
    const matchedBy: Array<'literal' | 'intent' | 'vector' | 'graph' | 'dependency'> = [];
    if (direct) {
      if (entryContributions?.has('vector')) matchedBy.push('vector');
      if (entryContributions?.has('graph')) matchedBy.push('graph');
      if (entryContributions?.has('lexical') || matchedBy.length === 0) matchedBy.push('literal');
    } else {
      matchedBy.push('dependency');
    }
    if (intentRetrievalTerms?.size && intentOverlap(entry, intentRetrievalTerms, routeCtx)) matchedBy.push('intent');
    const kind: RouteReason['kind'] = direct
      ? (entryContributions?.has('vector') ? 'vector' : entryContributions?.has('graph') ? 'graph' : 'direct')
      : 'dependency';
    out.set(memoryKey(entry), {
      key: memoryKey(entry),
      kind,
      matchedBy,
      ...(terms.length ? { terms } : {}),
      score: scores?.get(memoryKey(entry)) ?? (direct ? Number(directScore(entry, routeCtx).toFixed(3)) : undefined),
      ...(direct ? {} : { source: 'depends_on' })
    });
  }
  return out;
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
  const seen = new Set(candidates.map(memoryKey));
  const out = [...candidates];
  for (const entry of selected) {
    if (seen.has(memoryKey(entry))) continue;
    seen.add(memoryKey(entry));
    out.push(entry);
  }
  return out;
}
