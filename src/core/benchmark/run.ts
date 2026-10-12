/** Execute safe retrieval benchmark cases and calculate regression metrics. */
import { loadForAgentWithContext } from '../../commands/read.js';
import { planHookTurn } from '../integrations/hook-turn.js';
import type { EngramContext } from '../memory/context.js';
import { planLoad, renderLoadPlan } from '../memory/load-plan.js';
import { estimateTokens } from '../memory/payload-plan.js';
import { loadForPaths } from '../memory/path-triggers.js';
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
};
export type BenchmarkMetrics = {
  precision_at_k: number; recall_at_k: number; forbidden_hits: number; dependency_failures: number; isolation_failures: number;
  zero_result_correctness: number; tokens_mean: number; tokens_p95: number; hook_tokens_mean: number; hook_tokens_p95: number;
};
export type BenchmarkRun = {
  limit: number;
  cases: BenchmarkCaseResult[];
  metrics: BenchmarkMetrics;
  path_trigger?: { cases: number; precision_at_k: number; recall_at_k: number; forbidden_hits: number; tokens_mean: number };
  lifecycle?: { cases: number; omitted_correctness: number };
};

/** Categories measured outside the routed metrics, so adding them never moves `tokens_mean` or recall. */
const SEPARATE_CATEGORIES = new Set<BenchmarkCategory>(['path-trigger', 'working-expired']);
/** Simulated hook session per case: SessionStart, then the case prompt this many times (delta injection). */
export const HOOK_SIM_PROMPT_TURNS = 3;

export async function runBenchmark(ctx: EngramContext, cases: BenchmarkCase[]): Promise<BenchmarkRun> {
  const results: BenchmarkCaseResult[] = [];
  for (const item of cases) {
    if (item.category === 'path-trigger') { results.push(await pathTriggerResult(ctx, item)); continue; }
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
    results.push({ ...result, ...(item.category ? { category: item.category } : {}), hook_tokens: await hookTokens(ctx, item.query) });
  }
  const routedRows = results.filter((row) => !row.category || !SEPARATE_CATEGORIES.has(row.category));
  const pathRows = results.filter((row) => row.category === 'path-trigger');
  const lifecycleRows = results.filter((row) => row.category === 'working-expired');
  const pathMetrics = routedMetrics(pathRows);
  return {
    limit: Math.max(1, ...cases.map((item) => item.limit ?? ctx.config.load.limit)),
    cases: results,
    metrics: routedMetrics(routedRows),
    ...(pathRows.length ? { path_trigger: { cases: pathRows.length, precision_at_k: pathMetrics.precision_at_k, recall_at_k: pathMetrics.recall_at_k, forbidden_hits: pathMetrics.forbidden_hits, tokens_mean: pathMetrics.tokens_mean } } : {}),
    ...(lifecycleRows.length ? { lifecycle: { cases: lifecycleRows.length, omitted_correctness: round(lifecycleRows.filter((row) => row.omitted_correct).length / lifecycleRows.length) } } : {})
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

/** Tokens injected by a simulated hook session: SessionStart, then the query for `HOOK_SIM_PROMPT_TURNS` prompts. */
async function hookTokens(ctx: EngramContext, query: string): Promise<number> {
  let delivered: string[] = [];
  let total = 0;
  const turns: Array<[string, string]> = [['SessionStart', 'current session'], ...Array.from({ length: HOOK_SIM_PROMPT_TURNS }, (): [string, string] => ['UserPromptSubmit', query])];
  for (const [event, text] of turns) {
    const previous = ctx.config.read === 'always' ? [] : delivered;
    const load = await loadForAgentWithContext(ctx, text, previous.length ? { deliveredKeys: previous } : {});
    const turn = planHookTurn(event, load, previous, { proofMode: ctx.config.proof, readMode: ctx.config.read });
    total += estimateTokens(turn.additionalContext);
    delivered = [...delivered, ...turn.fresh];
  }
  return total;
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
