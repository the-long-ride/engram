/** LoadPlan orchestration contract and shared routing representation. */
import { loadSummary, type EngramContext } from './context.js';
import type { MemoryEntry, EngramConfig, MemoryGraph } from '../runtime/types.js';
import type { RouteDetail, RouteOptions } from './routing.js';
import { loadEntries, routeDetailed } from './routing.js';
import type { VectorRouteHit } from './vector-db.js';
import { vectorRouteHits } from './vector-db.js';
import type { ProjectionSection } from './payload-plan.js';
import { estimateTokens, packPayload } from './payload-plan.js';
import type { TaskIntent } from './task-intent.js';
import { inferTaskIntent, taskIntentQuery, intentIsActionable } from './task-intent.js';

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
  skipped_rows: PlannedLoadRow[];
  routeDetail?: RouteDetail;
};

export type PlannedLoadRow = { entry: MemoryEntry; content: string; flagged?: string };

export type PlanLoadOptions = RouteOptions & {
  full?: boolean;
  budgetTokens?: number;
  id?: string[];
  forAgents?: boolean;
};

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
        key: `${e.scope}:${e.file}`,
        kind: 'direct' as const,
        matchedBy: ['literal' as const],
        terms: [e.id]
      }))
    };
  } else {
    const rawQuery = queryStr || 'current session';
    const all = options.all === true;
    const forAgents = options.forAgents ?? !options.full;
    intent = options.intent ?? (forAgents ? inferTaskIntent(rawQuery) : undefined);
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
        candidatePool: options.candidatePool ?? ctx.config.vector.candidate_pool,
        intent,
        semanticRelaxed: forAgents
      },
      activeGraph
    );
    entries = routed.entries;
  }

  const maxBudget = options.budgetTokens ?? ctx.config.load?.max_tokens ?? 1600;
  const bypassBudget = options.full === true || options.all === true || targetIds.length > 0;
  const loaded = await loadEntries(ctx.cwd, entries, ctx.config, { forAgents: options.forAgents ?? !options.full });
  const skippedRows = loaded.filter((row) => !row.content || row.flagged);
  const readableRows = loaded.filter((row) => Boolean(row.content) && !row.flagged);
  const compactRender = (rows: PlannedLoadRow[]) => renderCompactPayload(ctx, routed, rows, skippedRows);
  const packed = bypassBudget ? undefined : packPayload(readableRows, maxBudget, { render: compactRender });
  const payloadRows = packed?.rows ?? readableRows;

  const projectedPayload = payloadRows.map(({ entry, content }) => {
    return {
      key: `${entry.scope}:${entry.file}`,
      entry,
      sections: ['identity', 'tags', 'content'] as ProjectionSection[],
      estimated_tokens: estimateTokens(content)
    };
  });

  const omittedEntries = (routed.candidateEntries ?? []).filter((e) => !entries.includes(e));
  const omitted = omittedEntries.map((e) => ({
    key: `${e.scope}:${e.file}`,
    reason: 'low-relevance' as LoadPlanOmissionReason
  }));

  const depAdditions = (routed.reasons ?? [])
    .filter((r) => r.kind === 'dependency')
    .map((r) => r.key);

  const fusedRank = entries.map((e, index) => {
    const keyStr = `${e.scope}:${e.file}`;
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
    reasons.find((reason) => reason.key === `${entry.scope}:${entry.file}`)?.matchedBy.includes(source) ?? false;

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
      used: bypassBudget ? estimateTokens(compactRender(payloadRows)) : packed?.used ?? 0,
      dependency_reserve: Math.round(maxBudget * (ctx.config.load?.dependency_reserve_ratio ?? 0.2))
    },
    omitted: [
      ...omitted,
      ...(packed?.omitted.map((key) => ({ key, reason: 'budget' as LoadPlanOmissionReason })) ?? [])
    ],
    profile_scope: {
      profile: ctx.profile?.active ?? null,
      scope: ctx.config.scope
    },
    payload_rows: payloadRows,
    skipped_rows: skippedRows,
    routeDetail: routed
  };
}

export function renderCompactPayload(ctx: EngramContext, routed: RouteDetail, rows: PlannedLoadRow[], skippedRows: PlannedLoadRow[] = []): string {
  const summary = loadSummary(rows.map((row) => row.entry), ctx.hiddenCount, routed.candidates);
  const content = rows.map((row) => row.content).join('\n---\n');
  const skipped = skippedRows.map((row) => `SKIPPED ${row.entry.file}: ${row.flagged ?? 'empty'}`).join('\n---\n');
  return [summary + routeHint(routed), content, skipped].filter(Boolean).join('\n\n').trim();
}

function routeHint(routed: RouteDetail): string {
  if (!routed.omitted) return '';
  const tags = routed.facets.map((facet) => facet.tag).join(', ');
  return `\nengram: refined ${routed.selected} of ${routed.candidates} related memories${tags ? `; narrow with tags: ${tags}` : ''}`;
}
