/** Execute safe retrieval benchmark cases and calculate regression metrics. */
import { agentLoadResult } from '../../commands/read.js';
import { planHookTurn } from '../integrations/hook-turn.js';
import type { EngramContext } from '../memory/context.js';
import { planLoad, renderLoadPlan } from '../memory/load-plan.js';
import { estimateTokens } from '../memory/payload-plan.js';
import { loadForPaths } from '../memory/path-triggers.js';
import type { UsageMap } from '../memory/usage.js';
import { DEFAULT_MAX_TOKENS } from '../runtime/load-limit.js';
import type { MemoryEntry } from '../runtime/types.js';
import type { BenchmarkCase, BenchmarkCategory } from './schema.js';

export type BenchmarkCaseResult = {
  id: string; query: string; expected: string[]; routed: string[]; matched: string[]; forbidden_hits: string[];
  missing: string[]; dependencies_missing: string[]; isolation_failures: string[]; zero_result_correct: boolean; tokens: number;
  category?: BenchmarkCategory;
  /** Tokens a simulated hook session injects for this case's query (SessionStart plus prompt turns). */
  hook_tokens?: number;
  /** `working-expired` only: keys the plan reported as omitted with reason `lifecycle`. */
  omitted_lifecycle?: string[];
  /** `working-expired` only: every `expect_omitted` id was omitted and none was routed. */
  omitted_correct?: boolean;
  /** `freshness-ordering` only: ids expanded as full bodies in rendered order. */
  expanded?: string[];
  /** `freshness-ordering` only: every `expect_expanded` id was expanded as a full body. */
  expansion_correct?: boolean;
  /** `freshness-ordering` only: `expect_body_order` appeared as a strict in-order subsequence of expanded bodies. */
  order_correct?: boolean;
  /** `freshness-ordering` only: 1 / 1-based rank of the first `expect` match in expanded bodies or cards. */
  mrr?: number;
  /** `multi-turn-session` only: tokens if each non-start prompt loaded untiered (`full: true`) without delta reuse. */
  naive_tokens?: number;
  /** `telemetry-loop` only: rendered tokens on turn 1. */
  initial_tokens?: number;
  /** `telemetry-loop` only: rendered tokens on the final turn. */
  final_tokens?: number;
  /** `telemetry-loop` only: noisy `forbid` ids dropped in rank or exited `payload_rows` while `expect` stayed matched. */
  noisy_demoted?: boolean;
};
export type BenchmarkMetrics = {
  precision_at_k: number; recall_at_k: number; forbidden_hits: number; dependency_failures: number; isolation_failures: number;
  zero_result_correctness: number; tokens_mean: number; tokens_p95: number; hook_tokens_mean: number; hook_tokens_p95: number;
};
export type BenchmarkOrderingMetrics = {
  cases: number; expansion_accuracy: number; order_accuracy: number; mrr: number; tokens_mean: number;
};
export type BenchmarkMultiTurnMetrics = {
  cases: number; recall_across_turns: number; session_hook_tokens_mean: number; naive_tokens_mean: number; token_savings_ratio: number;
};
export type BenchmarkTelemetryLoopMetrics = {
  cases: number; noisy_demoted_rate: number; initial_tokens_mean: number; final_tokens_mean: number;
};
export type BenchmarkRun = {
  limit: number;
  cases: BenchmarkCaseResult[];
  metrics: BenchmarkMetrics;
  path_trigger?: { cases: number; precision_at_k: number; recall_at_k: number; forbidden_hits: number; tokens_mean: number };
  lifecycle?: { cases: number; omitted_correctness: number };
  ordering?: BenchmarkOrderingMetrics;
  multi_turn?: BenchmarkMultiTurnMetrics;
  telemetry_loop?: BenchmarkTelemetryLoopMetrics;
};

/** Categories measured outside the routed metrics, so adding them never moves `tokens_mean` or recall. */
const SEPARATE_CATEGORIES = new Set<BenchmarkCategory>(['path-trigger', 'working-expired', 'freshness-ordering', 'multi-turn-session', 'telemetry-loop']);
/** Simulated hook session per case: SessionStart, then the case prompt this many times (delta injection). */
export const HOOK_SIM_PROMPT_TURNS = 3;

export async function runBenchmark(ctx: EngramContext, cases: BenchmarkCase[]): Promise<BenchmarkRun> {
  const results: BenchmarkCaseResult[] = [];
  for (const item of cases) {
    if (item.category === 'path-trigger') { results.push(await pathTriggerResult(ctx, item)); continue; }
    if (item.category === 'multi-turn-session') { results.push(await multiTurnResult(ctx, item)); continue; }
    if (item.category === 'telemetry-loop') { results.push(await telemetryLoopResult(ctx, item)); continue; }
    const plan = await planLoad(ctx, item.query, {
      ignorePatterns: ctx.ignorePatterns,
      candidatePool: ctx.config.vector.candidate_pool,
      budgetTokens: item.max_tokens,
      ...(item.limit ? { limit: item.limit } : {})
    }, ctx.graph);
    const routed = plan.routeDetail?.entries ?? [];
    // Cards are routed too: the agent sees them and can fetch them by id.
    const selected = [...plan.payload_rows, ...plan.card_rows].map((row) => row.entry);
    const visible = item.scope && item.scope !== 'both' ? selected.filter((entry) => entry.scope === item.scope) : selected;
    const tokens = plan.routeDetail ? estimateTokens(renderLoadPlan(ctx, plan)) : 0;
    const result = caseResult(ctx, item, visible, routed, tokens);
    if (item.category === 'working-expired') {
      const omitted = plan.omitted.filter((entry) => entry.reason === 'lifecycle').map((entry) => entry.key);
      const omittedEntries = ctx.index.entries.filter((entry) => omitted.includes(key(entry)));
      results.push({
        ...result,
        category: item.category,
        omitted_lifecycle: omitted,
        omitted_correct: (item.expect_omitted ?? []).every((id) => omittedEntries.some((entry) => matches(id, entry)) && !visible.some((entry) => matches(id, entry)))
      });
      continue;
    }
    if (item.category === 'freshness-ordering') {
      const expandedEntries = plan.payload_rows.map((row) => row.entry);
      const expectedExpanded = item.expect_expanded?.length ? item.expect_expanded : item.expect;
      const expansionCorrect = expectedExpanded.every((id) => expandedEntries.some((entry) => matches(id, entry)));
      const orderCorrect = isInOrderSubsequence(item.expect_body_order ?? [], expandedEntries);
      const firstRank = selected.findIndex((entry) => item.expect.some((id) => matches(id, entry)));
      const mrr = item.expect.length === 0 ? 1 : (firstRank >= 0 ? round(1 / (firstRank + 1)) : 0);
      results.push({
        ...result,
        category: item.category,
        expanded: expandedEntries.map((entry) => entry.id),
        expansion_correct: expansionCorrect,
        order_correct: orderCorrect,
        mrr
      });
      continue;
    }
    results.push({ ...result, ...(item.category ? { category: item.category } : {}), hook_tokens: await hookTokens(ctx, item.query) });
  }
  const routedRows = results.filter((row) => !row.category || !SEPARATE_CATEGORIES.has(row.category));
  const pathRows = results.filter((row) => row.category === 'path-trigger');
  const lifecycleRows = results.filter((row) => row.category === 'working-expired');
  const orderingRows = results.filter((row) => row.category === 'freshness-ordering');
  const multiTurnRows = results.filter((row) => row.category === 'multi-turn-session');
  const telemetryLoopRows = results.filter((row) => row.category === 'telemetry-loop');
  const pathMetrics = routedMetrics(pathRows);
  return {
    limit: Math.max(1, ...cases.map((item) => item.limit ?? ctx.config.load.limit)),
    cases: results,
    metrics: routedMetrics(routedRows),
    ...(pathRows.length ? { path_trigger: { cases: pathRows.length, precision_at_k: pathMetrics.precision_at_k, recall_at_k: pathMetrics.recall_at_k, forbidden_hits: pathMetrics.forbidden_hits, tokens_mean: pathMetrics.tokens_mean } } : {}),
    ...(lifecycleRows.length ? { lifecycle: { cases: lifecycleRows.length, omitted_correctness: round(lifecycleRows.filter((row) => row.omitted_correct).length / lifecycleRows.length) } } : {}),
    ...(orderingRows.length ? { ordering: orderingMetrics(orderingRows) } : {}),
    ...(multiTurnRows.length ? { multi_turn: multiTurnMetrics(multiTurnRows) } : {}),
    ...(telemetryLoopRows.length ? { telemetry_loop: telemetryLoopMetrics(telemetryLoopRows) } : {})
  };
}

/** Shared matched/missing/forbidden builder for routed and path-trigger cases. */
function caseResult(ctx: EngramContext, item: BenchmarkCase, visible: MemoryEntry[], routed: MemoryEntry[], tokens: number): BenchmarkCaseResult {
  const keys = visible.map(key);
  const matched = item.expect.filter((expected) => keys.includes(expectedKey(expected, visible)) || visible.some((entry) => matches(expected, entry)));
  const missing = item.expect.filter((expected) => !visible.some((entry) => matches(expected, entry)));
  const forbidden_hits = visible.filter((entry) => item.forbid.some((forbidden) => matches(forbidden, entry))).map(key);
  const dependencies_missing = item.depends_on.filter((dependency) => !visible.some((entry) => matches(dependency, entry)));
  const isolation_failures = [
    ...(item.scope && item.scope !== 'both' ? routed.filter((entry) => entry.scope !== item.scope).map(key) : []),
    ...(item.profile && item.profile !== ctx.profile.active ? [`profile:${ctx.profile.active || 'none'}`] : [])
  ];
  return { id: item.id, query: item.query, expected: item.expect, routed: keys, matched, forbidden_hits, missing, dependencies_missing, isolation_failures, zero_result_correct: item.expect.length === 0 ? visible.length === 0 : true, tokens };
}

/** A `path-trigger` case: the query is a workspace-relative file path run through the PreToolUse path trigger. */
async function pathTriggerResult(ctx: EngramContext, item: BenchmarkCase): Promise<BenchmarkCaseResult> {
  const load = await loadForPaths(ctx, [item.query]);
  const selected = ctx.index.entries.filter((entry) => load.bodyKeys.includes(key(entry)));
  const visible = item.scope && item.scope !== 'both' ? selected.filter((entry) => entry.scope === item.scope) : selected;
  return { ...caseResult(ctx, item, visible, [], estimateTokens(load.text)), category: 'path-trigger' };
}

/** A `multi-turn-session` case: simulate delta hook turns and compare against naive untiered reloads. */
async function multiTurnResult(ctx: EngramContext, item: BenchmarkCase): Promise<BenchmarkCaseResult> {
  const rawTurns = item.turns?.length ? item.turns : ['current session', item.query, item.query];
  const turns = rawTurns.map((text, index) => ({
    event: index === 0 && text.trim().toLowerCase() === 'current session' ? 'SessionStart' : 'UserPromptSubmit',
    text
  }));
  const sim = await simulateHookTurns(ctx, turns, {
    budgetTokens: item.max_tokens,
    limit: item.limit,
    measureNaive: true
  });
  const allSeen = [...sim.seen.values()];
  const visible = item.scope && item.scope !== 'both' ? allSeen.filter((entry) => entry.scope === item.scope) : allSeen;
  return {
    ...caseResult(ctx, item, visible, allSeen, sim.hookTotal),
    category: 'multi-turn-session',
    hook_tokens: sim.hookTotal,
    naive_tokens: sim.naiveTotal
  };
}

/** A `telemetry-loop` case: simulate repeated turns against a local mutable UsageMap to verify noise decay. */
async function telemetryLoopResult(ctx: EngramContext, item: BenchmarkCase): Promise<BenchmarkCaseResult> {
  const turns = item.turns?.length ? item.turns : Array.from({ length: 22 }, () => item.query);
  const usage: UsageMap = {};
  const appliedIds = item.applied_ids?.length ? item.applied_ids : item.expect;
  let initialTokens = 0;
  let finalTokens = 0;
  let initialSelected: MemoryEntry[] = [];
  let finalSelected: MemoryEntry[] = [];
  let initialRouted: MemoryEntry[] = [];
  let finalRouted: MemoryEntry[] = [];
  let initialPayload: MemoryEntry[] = [];
  let finalPayload: MemoryEntry[] = [];

  for (let i = 0; i < turns.length; i += 1) {
    const turnQuery = turns[i]!;
    const plan = await planLoad(ctx, turnQuery, {
      ignorePatterns: ctx.ignorePatterns,
      candidatePool: ctx.config.vector.candidate_pool,
      budgetTokens: item.max_tokens,
      usage,
      ...(item.limit ? { limit: item.limit } : {})
    }, ctx.graph);
    const routed = plan.routeDetail?.entries ?? [];
    const payload = plan.payload_rows.map((row) => row.entry);
    const selected = [...payload, ...plan.card_rows.map((row) => row.entry)];
    const tokens = plan.routeDetail ? estimateTokens(renderLoadPlan(ctx, plan)) : 0;
    if (i === 0) {
      initialTokens = tokens;
      initialSelected = selected;
      initialRouted = routed;
      initialPayload = payload;
    }
    if (i === turns.length - 1) {
      finalTokens = tokens;
      finalSelected = selected;
      finalRouted = routed;
      finalPayload = payload;
    }
    const seenKeys = new Set<string>();
    for (const entry of selected) {
      const k = key(entry);
      if (seenKeys.has(k)) continue;
      seenKeys.add(k);
      const current = usage[k] ?? { injected: 0, fetched: 0, last: '2026-01-01T00:00:00.000Z' };
      current.injected += 1;
      if (appliedIds.some((id) => matches(id, entry))) current.applied = (current.applied ?? 0) + 1;
      usage[k] = current;
    }
  }

  const visible = item.scope && item.scope !== 'both' ? finalSelected.filter((entry) => entry.scope === item.scope) : finalSelected;
  const expectStillMatched = item.expect.every((id) => visible.some((entry) => matches(id, entry)));
  const noisyDemoted = expectStillMatched && item.forbid.every((noisyId) => {
    const initPayloadRank = initialPayload.findIndex((entry) => matches(noisyId, entry));
    const finalPayloadRank = finalPayload.findIndex((entry) => matches(noisyId, entry));
    if (initPayloadRank >= 0 && (finalPayloadRank < 0 || finalPayloadRank > initPayloadRank)) return true;
    const initRouteRank = initialRouted.findIndex((entry) => matches(noisyId, entry));
    const finalRouteRank = finalRouted.findIndex((entry) => matches(noisyId, entry));
    if (initRouteRank >= 0 && (finalRouteRank < 0 || finalRouteRank > initRouteRank)) return true;
    const initRank = initialSelected.findIndex((entry) => matches(noisyId, entry));
    const finalRank = finalSelected.findIndex((entry) => matches(noisyId, entry));
    return initRank >= 0 && (finalRank < 0 || finalRank > initRank);
  });

  return {
    ...caseResult(ctx, { ...item, forbid: [] }, visible, finalRouted, finalTokens),
    category: 'telemetry-loop',
    initial_tokens: initialTokens,
    final_tokens: finalTokens,
    noisy_demoted: noisyDemoted
  };
}

/** Tokens injected by a simulated hook session: SessionStart, then the query for `HOOK_SIM_PROMPT_TURNS` prompts. */
async function hookTokens(ctx: EngramContext, query: string): Promise<number> {
  const turns = [
    { event: 'SessionStart', text: 'current session' },
    ...Array.from({ length: HOOK_SIM_PROMPT_TURNS }, () => ({ event: 'UserPromptSubmit', text: query }))
  ];
  return (await simulateHookTurns(ctx, turns)).hookTotal;
}

/** Simulate delta hook turns across a session, tracking delivered/carded state, hook tokens, and optional naive reloads. */
async function simulateHookTurns(
  ctx: EngramContext,
  turns: Array<{ event: string; text: string }>,
  opts: { budgetTokens?: number; limit?: number; measureNaive?: boolean } = {}
): Promise<{ hookTotal: number; naiveTotal: number; seen: Map<string, MemoryEntry> }> {
  let delivered: string[] = [];
  let carded: string[] = [];
  let hookTotal = 0;
  let naiveTotal = 0;
  const seen = new Map<string, MemoryEntry>();
  for (const { event, text } of turns) {
    const isStart = event === 'SessionStart';
    const previous = ctx.config.read === 'always' ? [] : delivered;
    const prevCarded = ctx.config.read === 'always' ? [] : carded;
    const plan = await planLoad(ctx, text || 'current session', {
      budgetTokens: opts.budgetTokens ?? ctx.config.load.max_tokens ?? DEFAULT_MAX_TOKENS,
      forAgents: true,
      ignorePatterns: ctx.ignorePatterns,
      candidatePool: ctx.config.vector.candidate_pool,
      ...(opts.limit ? { limit: opts.limit } : {}),
      ...(previous.length ? { deliveredKeys: previous } : {}),
      ...(prevCarded.length ? { cardedKeys: prevCarded } : {}),
      ...(isStart && ctx.config.read === 'auto' ? { hookStartupAuto: true } : {})
    }, ctx.graph);
    const turn = planHookTurn(event, agentLoadResult(ctx, plan), previous, { proofMode: ctx.config.proof, readMode: ctx.config.read });
    hookTotal += estimateTokens(turn.additionalContext);
    delivered = [...new Set([...delivered, ...turn.fresh])];
    carded = [...new Set([...carded, ...plan.card_rows.map(({ entry }) => key(entry))])];
    for (const row of [...plan.payload_rows, ...plan.card_rows]) seen.set(key(row.entry), row.entry);
    if (opts.measureNaive && !isStart) {
      const naivePlan = await planLoad(ctx, text || 'current session', {
        full: true,
        forAgents: false,
        ignorePatterns: ctx.ignorePatterns,
        candidatePool: ctx.config.vector.candidate_pool,
        ...(opts.limit ? { limit: opts.limit } : {})
      }, ctx.graph);
      naiveTotal += naivePlan.routeDetail ? estimateTokens(renderLoadPlan(ctx, naivePlan)) : 0;
    }
  }
  return { hookTotal, naiveTotal, seen };
}

/** Aggregate precision, recall, and token metrics over a set of case results. */
function routedMetrics(rows: BenchmarkCaseResult[]): BenchmarkMetrics {
  const retrieved = rows.reduce((sum, item) => sum + item.matched.length, 0);
  const relevant = rows.reduce((sum, item) => sum + item.expected.length, 0);
  const returned = rows.reduce((sum, item) => sum + item.routed.length, 0);
  const tokenCounts = rows.map((item) => item.tokens);
  const hookCounts = rows.map((item) => item.hook_tokens ?? 0);
  const zeroCases = rows.filter((item) => item.expected.length === 0);
  return {
    precision_at_k: round(returned ? retrieved / returned : 0),
    recall_at_k: round(relevant ? retrieved / relevant : 1),
    forbidden_hits: rows.reduce((sum, item) => sum + item.forbidden_hits.length, 0),
    dependency_failures: rows.reduce((sum, item) => sum + item.dependencies_missing.length, 0),
    isolation_failures: rows.reduce((sum, item) => sum + item.isolation_failures.length, 0),
    zero_result_correctness: zeroCases.length ? round(zeroCases.filter((item) => item.zero_result_correct).length / zeroCases.length) : 1,
    tokens_mean: round(mean(tokenCounts)),
    tokens_p95: round(nearestRank(tokenCounts, 0.95)),
    hook_tokens_mean: round(mean(hookCounts)),
    hook_tokens_p95: round(nearestRank(hookCounts, 0.95))
  };
}

/** Aggregate expansion, ordering, and MRR metrics over `freshness-ordering` cases. */
function orderingMetrics(rows: BenchmarkCaseResult[]): BenchmarkOrderingMetrics {
  return {
    cases: rows.length,
    expansion_accuracy: round(rows.filter((row) => row.expansion_correct).length / rows.length),
    order_accuracy: round(rows.filter((row) => row.order_correct).length / rows.length),
    mrr: round(mean(rows.map((row) => row.mrr ?? 0))),
    tokens_mean: round(mean(rows.map((row) => row.tokens)))
  };
}

/** Aggregate multi-turn recall and token savings over `multi-turn-session` cases. */
function multiTurnMetrics(rows: BenchmarkCaseResult[]): BenchmarkMultiTurnMetrics {
  const retrieved = rows.reduce((sum, item) => sum + item.matched.length, 0);
  const relevant = rows.reduce((sum, item) => sum + item.expected.length, 0);
  const hookMean = mean(rows.map((item) => item.hook_tokens ?? 0));
  const naiveMean = mean(rows.map((item) => item.naive_tokens ?? 0));
  return {
    cases: rows.length,
    recall_across_turns: round(relevant ? retrieved / relevant : 1),
    session_hook_tokens_mean: round(hookMean),
    naive_tokens_mean: round(naiveMean),
    token_savings_ratio: naiveMean > 0 ? round((naiveMean - hookMean) / naiveMean) : 0
  };
}

/** Aggregate noise-demotion rate and token deltas over `telemetry-loop` cases. */
function telemetryLoopMetrics(rows: BenchmarkCaseResult[]): BenchmarkTelemetryLoopMetrics {
  return {
    cases: rows.length,
    noisy_demoted_rate: round(rows.filter((row) => row.noisy_demoted).length / rows.length),
    initial_tokens_mean: round(mean(rows.map((row) => row.initial_tokens ?? 0))),
    final_tokens_mean: round(mean(rows.map((row) => row.final_tokens ?? 0)))
  };
}

/** True when `expectedOrder` appears as an in-order subsequence of `actualEntries`. */
function isInOrderSubsequence(expectedOrder: string[], actualEntries: MemoryEntry[]): boolean {
  let cursor = 0;
  for (const expected of expectedOrder) {
    const found = actualEntries.findIndex((entry, index) => index >= cursor && matches(expected, entry));
    if (found < 0) return false;
    cursor = found + 1;
  }
  return true;
}

function mean(values: number[]): number { return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0; }
function key(entry: MemoryEntry): string { return `${entry.scope}:${entry.file}`; }
function expectedKey(value: string, entries: MemoryEntry[]): string { return entries.find((entry) => matches(value, entry)) ? key(entries.find((entry) => matches(value, entry))!) : value; }
function matches(value: string, entry: MemoryEntry): boolean { const normalized = value.replace(/\\/g, '/'); return normalized === entry.id || normalized === entry.file || normalized === `${entry.scope}:${entry.file}`; }
/** Nearest-rank percentile over unsorted samples; 0 for an empty set. */
function nearestRank(values: number[], percentile: number): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(percentile * sorted.length) - 1))];
}
function round(value: number): number { return Math.round(value * 1000) / 1000; }
