/** Validate versioned benchmark case documents while preserving legacy fixtures. */
import type { Scope } from '../runtime/types.js';
import { parseMaxTokens } from '../runtime/load-limit.js';

export type BenchmarkCategory =
  | 'zero-match'
  | 'paraphrase'
  | 'negation'
  | 'dependency-chain'
  | 'profile-isolation'
  | 'duplicate'
  | 'mixed-intent'
  | 'disagreement'
  | 'security'
  | 'session-start'
  | 'path-trigger'
  | 'working-expired'
  | 'freshness-ordering'
  | 'multi-turn-session'
  | 'telemetry-loop';

export type BenchmarkCase = {
  id: string;
  query: string;
  expect: string[];
  forbid: string[];
  depends_on: string[];
  profile?: string;
  scope?: Scope | 'both';
  limit?: number;
  max_tokens?: number;
  category?: BenchmarkCategory;
  /** Ids that must be reported as omitted (lifecycle) and must not be routed. */
  expect_omitted?: string[];
  /** Ids expected to be expanded as full bodies (not just cards). */
  expect_expanded?: string[];
  /** Ids expected to appear as an in-order subsequence in expanded body order. */
  expect_body_order?: string[];
  /** Sequence of prompt queries for `multi-turn-session` or `telemetry-loop` cases. */
  turns?: string[];
  /** Ids credited as applied when selected during a `telemetry-loop` simulation. */
  applied_ids?: string[];
};

export type BenchmarkDocument = { version: 1 | 2; cases: BenchmarkCase[] };
export type BenchmarkDiagnostic = { path: string; message: string };
const BENCHMARK_CATEGORIES = new Set<BenchmarkCategory>([
  'zero-match', 'paraphrase', 'negation', 'dependency-chain', 'profile-isolation',
  'duplicate', 'mixed-intent', 'disagreement', 'security', 'session-start', 'path-trigger', 'working-expired',
  'freshness-ordering', 'multi-turn-session', 'telemetry-loop'
]);

export function parseBenchmarkDocument(value: unknown): { document?: BenchmarkDocument; diagnostics: BenchmarkDiagnostic[] } {
  const source = Array.isArray(value) ? { version: 1, cases: value } : value;
  const diagnostics: BenchmarkDiagnostic[] = [];
  if (!source || typeof source !== 'object') return { diagnostics: [{ path: '', message: 'benchmark document must be an object or array' }] };
  const input = source as Record<string, any>;
  if (input.version !== undefined && input.version !== 1 && input.version !== 2) {
    diagnostics.push({ path: 'version', message: 'version must be 1 or 2' });
  }
  if (!Array.isArray(input.cases)) diagnostics.push({ path: 'cases', message: 'cases must be an array' });
  const cases: BenchmarkCase[] = [];
  for (const [index, item] of (Array.isArray(input.cases) ? input.cases : []).entries()) {
    const path = `cases[${index}]`;
    if (!item || typeof item !== 'object') { diagnostics.push({ path, message: 'case must be an object' }); continue; }
    const id = String(item.id ?? `case-${index + 1}`).trim();
    const query = String(item.query ?? '').trim();
    const expect = strings(item.expect);
    const forbid = strings(item.forbid);
    const depends = strings(item.depends_on ?? item.dependsOn);
    const expectOmitted = strings(item.expect_omitted ?? item.expectOmitted);
    if (!query) diagnostics.push({ path: `${path}.query`, message: 'query is required' });
    if (item.expect !== undefined && !Array.isArray(item.expect) && typeof item.expect !== 'string') diagnostics.push({ path: `${path}.expect`, message: 'expect must be an array or string' });
    if (item.scope !== undefined && !['workspace', 'global', 'both'].includes(item.scope)) diagnostics.push({ path: `${path}.scope`, message: 'scope must be workspace, global, or both' });
    if (item.limit !== undefined && (!Number.isInteger(item.limit) || item.limit < 1)) diagnostics.push({ path: `${path}.limit`, message: 'limit must be a positive integer' });
    let maxTokens: number | undefined;
    if (item.max_tokens !== undefined) {
      try {
        maxTokens = parseMaxTokens(item.max_tokens, `${path}.max_tokens`);
      } catch (error) {
        diagnostics.push({ path: `${path}.max_tokens`, message: error instanceof Error ? error.message : 'max_tokens is invalid' });
      }
    }
    const category = typeof item.category === 'string' && BENCHMARK_CATEGORIES.has(item.category as BenchmarkCategory)
      ? item.category as BenchmarkCategory
      : undefined;
    if (item.category !== undefined && !category) diagnostics.push({ path: `${path}.category`, message: 'category must be a supported benchmark category' });
    if (category === 'path-trigger' && query && isAbsolutePath(query)) diagnostics.push({ path: `${path}.query`, message: 'path-trigger query must be a workspace-relative path' });
    const expectExpanded = validateStringArray(item.expect_expanded, `${path}.expect_expanded`, diagnostics);
    const expectBodyOrder = validateStringArray(item.expect_body_order, `${path}.expect_body_order`, diagnostics);
    const turns = validateStringArray(item.turns, `${path}.turns`, diagnostics, true);
    const appliedIds = validateStringArray(item.applied_ids, `${path}.applied_ids`, diagnostics);
    cases.push({
      id,
      query,
      expect,
      forbid,
      depends_on: depends,
      ...(typeof item.profile === 'string' && item.profile.trim() ? { profile: item.profile.trim() } : {}),
      ...(item.scope ? { scope: item.scope } : {}),
      ...(item.limit ? { limit: item.limit } : {}),
      ...(maxTokens !== undefined ? { max_tokens: maxTokens } : {}),
      ...(category ? { category } : {}),
      ...(expectOmitted.length ? { expect_omitted: expectOmitted } : {}),
      ...(expectExpanded?.length ? { expect_expanded: expectExpanded } : {}),
      ...(expectBodyOrder?.length ? { expect_body_order: expectBodyOrder } : {}),
      ...(turns?.length ? { turns } : {}),
      ...(appliedIds?.length ? { applied_ids: appliedIds } : {})
    });
  }
  const version = (input.version === 2 ? 2 : 1) as 1 | 2;
  return diagnostics.length ? { diagnostics } : { document: { version, cases }, diagnostics };
}

/** Validate an optional array of non-empty strings. */
function validateStringArray(value: unknown, fieldPath: string, diagnostics: BenchmarkDiagnostic[], requireNonEmpty = false): string[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || (requireNonEmpty && value.length === 0) || value.some((entry) => typeof entry !== 'string' || !entry.trim())) {
    diagnostics.push({ path: fieldPath, message: `${fieldPath.split('.').pop()} must be a${requireNonEmpty ? ' non-empty' : 'n'} array of non-empty strings` });
    return undefined;
  }
  return value.map((entry) => entry.trim());
}

/** POSIX, Windows drive, or UNC absolute path. */
function isAbsolutePath(value: string): boolean {
  return value.startsWith('/') || value.startsWith('\\') || /^[A-Za-z]:[\\/]/.test(value);
}

function strings(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  if (value === undefined || value === null || value === '') return [];
  return [String(value).trim()].filter(Boolean);
}
