/** LoadPlan orchestration contract and shared routing representation. */
import { loadSummary, type EngramContext } from './context.js';
import type { MemoryEntry, EngramConfig, MemoryGraph } from '../runtime/types.js';
import { memoryKey } from './memory-ref.js';
import type { RouteDetail, RouteOptions } from './routing.js';
import { loadEntries, noteMatchesObjective, routeDetailed, sessionObjectiveFromEnv } from './routing.js';
import type { VectorRouteHit } from './vector-db.js';
import { vectorRouteHits } from './vector-db.js';
import type { ProjectionSection } from './payload-plan.js';
import { CANDIDATE_CARD_LIMIT, estimateTokens, packPayload, packTiered } from './payload-plan.js';
import { renderAgentCard } from './agent-render.js';
import type { TaskIntent } from './task-intent.js';
import { inferTaskIntent, taskIntentQuery, intentIsActionable } from './task-intent.js';
import { readUsage } from './usage.js';
import { readStale } from './freshness.js';

export type LoadPlanOmissionReason =
  | 'low-relevance'
  | 'duplicate'
  | 'budget'
  | 'scope'
  | 'profile'
  | 'lifecycle'
  | 'safety'
  | 'weak-small-pool';

export type LoadPlan = {
  contract_version: 1;
  query: {
    original: string;
    entities: string[];
    intent: Record<string, unknown> | null;
    negative: string[];
    session?: string;
  };
  candidates_by_source: {
    lexical: MemoryEntry[];
    graph: MemoryEntry[];
    vector: MemoryEntry[];
    feedback: MemoryEntry[];
  };
  fused_rank: Array<{ key: string; rank: number; score: number; sources: string[] }>;
  dependency_additions: string[];
  selected_ids: string[];
  projected_payload: Array<{
    key: string;
    entry: MemoryEntry;
    sections: ProjectionSection[];
    estimated_tokens: number | null;
  }>;
  token_budget: { max: number; used: number | null; dependency_reserve: number };
  omitted: Array<{ key: string; reason: LoadPlanOmissionReason }>;
  profile_scope: { profile: string | null; scope: 'workspace' | 'global' | 'both' };
  payload_rows: PlannedLoadRow[];
  /** Selected rows and up to five omitted candidates rendered as one-line cards (tiered disclosure). */
  card_rows: PlannedLoadRow[];
  /** Routed keys left out because the caller already holds them (`excludeKeys` or delivered hits). */
  already_loaded: string[];
  /** D17: rendered keys listed in `stale.json`; their cards end with ` (stale)`. Absent when none are stale. */
  stale_keys?: string[];
  disclosure: LoadDisclosure;
  skipped_rows: PlannedLoadRow[];
  routeDetail?: RouteDetail;
};

export type PlannedLoadRow = { entry: MemoryEntry; content: string; flagged?: string };

export type LoadDisclosure = 'auto' | 'full';

export type PlanLoadOptions = RouteOptions & {
  full?: boolean;
  budgetTokens?: number;
  id?: string[];
  forAgents?: boolean;
  disclosure?: LoadDisclosure;
  excludeKeys?: string[];
  /**
   * Keys the caller already received as bodies (hook session delta, D7). Unlike `excludeKeys`
   * they still rank and occupy expansion slots; they are only left out of the rendered output.
   */
  deliveredKeys?: string[];
};

const DEFAULT_EXPAND_TOP = 3;

/** Plan and execute memory loading through a single unified contract. */
export async function planLoad(
  ctx: EngramContext,
  queryStr: string,
  options: PlanLoadOptions = {},
  graph?: MemoryGraph
): Promise<LoadPlan> {
  const targetIds = options.id ?? [];
  let entries: MemoryEntry[] = [];
  let routed: RouteDetail;
  let intent: TaskIntent | undefined;

  const activeGraph = graph ?? ctx.graph;
  // D17: a missing or corrupt stale.json is `{}`, which keeps routing and cards exactly as before.
  const stale = options.stale ?? await readStale(ctx.roots.workspace);
  const isStale = (entry: MemoryEntry) => Boolean(stale[memoryKey(entry)]?.length);

  if (targetIds.length > 0) {
    entries = ctx.index.entries.filter((e) => targetIds.includes(e.id));
    routed = {
      entries,
      candidates: entries.length,
      selected: entries.length,
      omitted: 0,
      refined: false,
      facets: [],
      reasons: entries.map((e) => ({
        key: memoryKey(e),
        kind: 'direct' as const,
        matchedBy: ['literal' as const],
        terms: [e.id]
      }))
    };
  } else {
    const rawQuery = queryStr || 'current session';
    const all = options.all === true;
    const forAgents = options.forAgents ?? !options.full;
    // The SessionStart query is literal; intent inference must not rewrite it.
    intent = options.intent ?? (forAgents && rawQuery !== 'current session' ? inferTaskIntent(rawQuery) : undefined);
    const routingQuery = intent && intentIsActionable(intent) ? taskIntentQuery(intent) : rawQuery;
    const vectorHits = options.vectorHits ?? (all ? [] : await vectorRouteHits(ctx.roots, ctx.scopeIndexes, ctx.config, routingQuery, ctx.ignorePatterns, all));

    routed = routeDetailed(
      ctx.index,
      routingQuery,
      ctx.config,
      all,
      {
        ...options,
        all,
        ignorePatterns: ctx.ignorePatterns,
        vectorHits,
        usage: options.usage ?? (ctx.roots.workspace ? await readUsage(ctx.roots.workspace) : undefined),
        candidatePool: options.candidatePool ?? ctx.config.vector.candidate_pool,
        intent,
        semanticRelaxed: forAgents,
        stale
      },
      activeGraph
    );
    entries = routed.entries;
  }

  const maxBudget = options.budgetTokens ?? ctx.config.load?.max_tokens ?? 1600;
  const bypassBudget = options.full === true || options.all === true || targetIds.length > 0;
  const forAgents = options.forAgents ?? !options.full;
  const reserveRatio = ctx.config.load?.dependency_reserve_ratio ?? 0.2;
  // Explicit --id fetches always return what was asked for, even if already delivered.
  const excluded = new Set(targetIds.length > 0 ? [] : options.excludeKeys ?? []);
  const tieredDisclosure = !bypassBudget && forAgents && (options.disclosure ?? ctx.config.load?.disclosure ?? 'auto') === 'auto';
  // A working-tier note whose objective does not match the session stays a card: never an expanded body (tiered disclosure only).
  const sessionObjective = options.sessionObjective ?? sessionObjectiveFromEnv();
  const noteCards = tieredDisclosure && targetIds.length === 0 ? entries.filter((e) => !noteMatchesObjective(e, sessionObjective)) : [];
  const bodyEntries = noteCards.length ? entries.filter((e) => !noteCards.includes(e)) : entries;
  const loaded = await loadEntries(ctx.cwd, bodyEntries.filter((e) => !excluded.has(memoryKey(e))), ctx.config, { forAgents });
  const skippedRows = loaded.filter((row) => !row.content || row.flagged);
  const readableRows = loaded.filter((row) => Boolean(row.content) && !row.flagged);
  const disclosure: LoadDisclosure = tieredDisclosure ? 'auto' : 'full';
  const omittedEntries = [...noteCards, ...(routed.candidateEntries ?? []).filter((e) => !entries.includes(e))];

  let payloadRows = readableRows;
  let cardRows: PlannedLoadRow[] = [];
  let used: number | undefined;
  let budgetOmitted: string[] = [];
  if (disclosure === 'auto') {
    const candidates = omittedEntries.filter((e) => !excluded.has(memoryKey(e))).slice(0, CANDIDATE_CARD_LIMIT);
    const candidateRows = (await loadEntries(ctx.cwd, candidates, ctx.config, { forAgents })).filter((row) => Boolean(row.content) && !row.flagged);
    const dependencyKeys = new Set((routed.reasons ?? []).filter((r) => r.kind === 'dependency').map((r) => r.key));
    const candidateSet = new Set(candidateRows);
    // Routed entries are in foundation-first order; expansion follows relevance instead.
    const score = new Map((routed.reasons ?? []).map((r) => [r.key, r.score ?? -1]));
    const scoreOf = (row: PlannedLoadRow) => score.get(memoryKey(row.entry)) ?? -1;
    const ranked = [...readableRows].sort((a, b) => scoreOf(b) - scoreOf(a));
    const tiered = packTiered([...ranked, ...candidateRows], {
      maxTokens: maxBudget,
      expandTop: expandTopOf(ctx.config),
      reserveRatio,
      isDependency: (row) => dependencyKeys.has(memoryKey(row.entry)),
      isCandidate: (row) => candidateSet.has(row),
      card: (row) => renderAgentCard(row.entry, isStale(row.entry)),
      render: (rows, cards) => renderTiered(ctx, routed, rows, skippedRows, cards)
    });
    // Bodies keep the foundation-first order so prerequisites read before dependents.
    payloadRows = readableRows.filter((row) => tiered.expanded.includes(row));
    cardRows = tiered.cards;
    used = tiered.used;
    // Selected rows shed to honour the cap; candidates already report as low-relevance.
    const selectedKeys = new Set(readableRows.map((row) => memoryKey(row.entry)));
    budgetOmitted = tiered.omitted.filter((key) => selectedKeys.has(key));
  } else if (!bypassBudget) {
    const packed = packPayload(readableRows, maxBudget, { render: (rows) => renderCompactPayload(ctx, routed, rows, skippedRows) });
    payloadRows = packed.rows;
    used = packed.used;
    budgetOmitted = packed.omitted;
  }

  // Delivered rows keep the slots they won above; only their rendering is suppressed.
  const delivered = new Set(targetIds.length > 0 ? [] : options.deliveredKeys ?? []);
  const isDelivered = (row: PlannedLoadRow) => delivered.has(memoryKey(row.entry));
  const deliveredHits = new Set([...payloadRows, ...cardRows].filter(isDelivered).map((row) => memoryKey(row.entry)));
  if (deliveredHits.size) {
    payloadRows = payloadRows.filter((row) => !isDelivered(row));
    // With no fresh body the caller already saw these cards on the turn that delivered the rest.
    cardRows = payloadRows.length ? cardRows.filter((row) => !isDelivered(row)) : [];
    used = !payloadRows.length && !cardRows.length ? 0 : estimateTokens(disclosure === 'auto'
      ? renderTiered(ctx, routed, payloadRows, skippedRows, cardRows.map((row) => renderAgentCard(row.entry, isStale(row.entry))))
      : renderCompactPayload(ctx, routed, payloadRows, skippedRows));
  }
  const alreadyLoaded = entries.map(memoryKey).filter((key) => excluded.has(key) || deliveredHits.has(key));
  const staleKeys = [...payloadRows, ...cardRows].filter((row) => isStale(row.entry)).map((row) => memoryKey(row.entry));

  const projectedPayload = payloadRows.map(({ entry, content }) => {
    return {
      key: memoryKey(entry),
      entry,
      sections: ['identity', 'tags', 'content'] as ProjectionSection[],
      estimated_tokens: estimateTokens(content)
    };
  });

  const carded = new Set(cardRows.map((row) => memoryKey(row.entry)));
  const omitted = omittedEntries.filter((e) => !carded.has(memoryKey(e))).map((e) => ({
    key: memoryKey(e),
    reason: 'low-relevance' as LoadPlanOmissionReason
  }));

  const depAdditions = (routed.reasons ?? [])
    .filter((r) => r.kind === 'dependency')
    .map((r) => r.key);

  const fusedRank = entries.map((e, index) => {
    const keyStr = memoryKey(e);
    const reason = routed.reasons?.find((r) => r.key === keyStr);
    return {
      key: keyStr,
      rank: index + 1,
      score: reason?.score ?? (1 / (index + 1)),
      sources: reason ? [reason.kind] : ['direct']
    };
  });

  const reasons = routed.reasons ?? [];
  const hasSource = (entry: MemoryEntry, source: 'literal' | 'graph' | 'vector' | 'dependency') =>
    reasons.find((reason) => reason.key === memoryKey(entry))?.matchedBy.includes(source) ?? false;

  return {
    contract_version: 1,
    query: {
      original: queryStr,
      entities: [],
      intent: intent ? (intent as unknown as Record<string, unknown>) : null,
      negative: [],
      session: queryStr === 'current session' ? queryStr : undefined
    },
    candidates_by_source: {
      lexical: entries.filter((entry) => hasSource(entry, 'literal')),
      graph: entries.filter((entry) => hasSource(entry, 'graph') || hasSource(entry, 'dependency')),
      vector: entries.filter((entry) => hasSource(entry, 'vector')),
      feedback: []
    },
    fused_rank: fusedRank,
    dependency_additions: depAdditions,
    selected_ids: payloadRows.map((row) => row.entry.id),
    projected_payload: projectedPayload,
    token_budget: {
      max: maxBudget,
      used: used ?? estimateTokens(renderCompactPayload(ctx, routed, payloadRows, skippedRows)),
      dependency_reserve: Math.round(maxBudget * reserveRatio)
    },
    omitted: [
      ...omitted,
      ...(routed.lifecycleOmitted ?? []).map((e) => ({ key: memoryKey(e), reason: 'lifecycle' as LoadPlanOmissionReason })),
      ...budgetOmitted.map((key) => ({ key, reason: 'budget' as LoadPlanOmissionReason }))
    ],
    profile_scope: {
      profile: ctx.profile?.active ?? null,
      scope: ctx.config.scope
    },
    payload_rows: payloadRows,
    card_rows: cardRows,
    already_loaded: alreadyLoaded,
    ...(staleKeys.length ? { stale_keys: [...new Set(staleKeys)] } : {}),
    disclosure,
    skipped_rows: skippedRows,
    routeDetail: routed
  };
}

/** Render a plan exactly as agents receive it: tiered when disclosure is `auto`, otherwise every body. */
export function renderLoadPlan(ctx: EngramContext, plan: LoadPlan): string {
  if (!plan.routeDetail) return '';
  return renderCompactPayload(ctx, plan.routeDetail, plan.payload_rows, plan.skipped_rows, plan.disclosure === 'auto' ? plan.card_rows : undefined, plan.stale_keys);
}

/** Compact output; passing `cardRows` switches to the tiered layout (bodies, `related:` cards, fetch hint). `staleKeys` mark cards (D3). */
export function renderCompactPayload(ctx: EngramContext, routed: RouteDetail, rows: PlannedLoadRow[], skippedRows: PlannedLoadRow[] = [], cardRows?: PlannedLoadRow[], staleKeys: string[] = []): string {
  if (cardRows) return renderTiered(ctx, routed, rows, skippedRows, cardRows.map((row) => renderAgentCard(row.entry, staleKeys.includes(memoryKey(row.entry)))));
  const summary = loadSummary(rows.map((row) => row.entry), ctx.hiddenCount, routed.candidates);
  const content = rows.map((row) => row.content).join('\n---\n');
  const skipped = skippedRows.map((row) => `SKIPPED ${row.entry.file}: ${row.flagged ?? 'empty'}`).join('\n---\n');
  return [summary + routeHint(routed), content, skipped].filter(Boolean).join('\n\n').trim();
}

/** Summary line, bodies, skipped notes, then the `related:` cards and one fetch hint for them. */
function renderTiered(ctx: EngramContext, routed: RouteDetail, rows: PlannedLoadRow[], skippedRows: PlannedLoadRow[], cards: string[]): string {
  const summary = loadSummary(rows.map((row) => row.entry), ctx.hiddenCount, routed.candidates).split('\n')[0];
  const bodies = rows.map((row) => row.content).join('\n\n');
  const skipped = skippedRows.map((row) => `SKIPPED ${row.entry.file}: ${row.flagged ?? 'empty'}`).join('\n');
  // Card lines start `- <id> `; ids never contain whitespace.
  const ids = cards.map((card) => card.match(/^- (\S+)/)?.[1]).filter(Boolean);
  const related = cards.length ? `related:\n${cards.join('\n')}\n\nfetch: engram load --id ${ids.join(',')}` : '';
  // No refinement hint here: the cards already name what was left unexpanded.
  return [summary, bodies, skipped, related].filter(Boolean).join('\n\n').trim();
}

/** `load.expand_top`, falling back to the default when unset, non-finite, or not positive. */
function expandTopOf(config: EngramConfig): number {
  const value = config.load?.expand_top;
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.floor(value) : DEFAULT_EXPAND_TOP;
}

function routeHint(routed: RouteDetail): string {
  if (!routed.omitted) return '';
  const tags = routed.facets.map((facet) => facet.tag).join(', ');
  return `\nengram: refined ${routed.selected} of ${routed.candidates} related memories${tags ? `; narrow with tags: ${tags}` : ''}`;
}
