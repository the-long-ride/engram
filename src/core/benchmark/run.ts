/** Execute safe retrieval benchmark cases and calculate regression metrics. */
import type { EngramContext } from '../memory/context.js';
import { planLoad } from '../memory/load-plan.js';
import type { MemoryEntry } from '../runtime/types.js';
import type { BenchmarkCase } from './schema.js';

export type BenchmarkCaseResult = {
  id: string; query: string; expected: string[]; routed: string[]; matched: string[]; forbidden_hits: string[];
  missing: string[]; dependencies_missing: string[]; isolation_failures: string[]; zero_result_correct: boolean;
};
export type BenchmarkMetrics = { precision_at_k: number; recall_at_k: number; forbidden_hits: number; dependency_failures: number; isolation_failures: number; zero_result_correctness: number };
export type BenchmarkRun = { limit: number; cases: BenchmarkCaseResult[]; metrics: BenchmarkMetrics };

export async function runBenchmark(ctx: EngramContext, cases: BenchmarkCase[]): Promise<BenchmarkRun> {
  const results: BenchmarkCaseResult[] = [];
  for (const item of cases) {
    const plan = await planLoad(ctx, item.query, {
      ignorePatterns: ctx.ignorePatterns,
      candidatePool: ctx.config.vector.candidate_pool,
      budgetTokens: item.max_tokens,
      ...(item.limit ? { limit: item.limit } : {})
    }, ctx.graph);
    const routed = plan.routeDetail?.entries ?? [];
    const selected = plan.payload_rows.map((row) => row.entry);
    const visible = item.scope && item.scope !== 'both' ? selected.filter((entry) => entry.scope === item.scope) : selected;
    const keys = visible.map(key);
    const matched = item.expect.filter((expected) => keys.includes(expectedKey(expected, visible)) || visible.some((entry) => matches(expected, entry)));
    const missing = item.expect.filter((expected) => !visible.some((entry) => matches(expected, entry)));
    const forbidden_hits = visible.filter((entry) => item.forbid.some((forbidden) => matches(forbidden, entry))).map(key);
    const dependencies_missing = item.depends_on.filter((dependency) => !visible.some((entry) => matches(dependency, entry)));
    const isolation_failures = [
      ...(item.scope && item.scope !== 'both' ? routed.filter((entry) => entry.scope !== item.scope).map(key) : []),
      ...(item.profile && item.profile !== ctx.profile.active ? [`profile:${ctx.profile.active || 'none'}`] : [])
    ];
    results.push({ id: item.id, query: item.query, expected: item.expect, routed: visible.map(key), matched, forbidden_hits, missing, dependencies_missing, isolation_failures, zero_result_correct: item.expect.length === 0 ? visible.length === 0 : true });
  }
  const retrieved = results.reduce((sum, item) => sum + item.matched.length, 0);
  const relevant = results.reduce((sum, item) => sum + item.expected.length, 0);
  const returned = results.reduce((sum, item) => sum + item.routed.length, 0);
  const zeroCases = results.filter((item) => item.expected.length === 0);
  return {
    limit: Math.max(1, ...cases.map((item) => item.limit ?? ctx.config.load.limit)),
    cases: results,
    metrics: {
      precision_at_k: round(returned ? retrieved / returned : 0),
      recall_at_k: round(relevant ? retrieved / relevant : 1),
      forbidden_hits: results.reduce((sum, item) => sum + item.forbidden_hits.length, 0),
      dependency_failures: results.reduce((sum, item) => sum + item.dependencies_missing.length, 0),
      isolation_failures: results.reduce((sum, item) => sum + item.isolation_failures.length, 0),
      zero_result_correctness: zeroCases.length ? round(zeroCases.filter((item) => item.zero_result_correct).length / zeroCases.length) : 1
    }
  };
}

function key(entry: MemoryEntry): string { return `${entry.scope}:${entry.file}`; }
function expectedKey(value: string, entries: MemoryEntry[]): string { return entries.find((entry) => matches(value, entry)) ? key(entries.find((entry) => matches(value, entry))!) : value; }
function matches(value: string, entry: MemoryEntry): boolean { const normalized = value.replace(/\\/g, '/'); return normalized === entry.id || normalized === entry.file || normalized === `${entry.scope}:${entry.file}`; }
function round(value: number): number { return Math.round(value * 1000) / 1000; }
