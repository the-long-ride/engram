/** Safe explanation serializer for RouteDetail — no memory bodies or authors. */
import type { RouteDetail, RouteReason } from './routing.js';
import type { MemoryEntry } from '../runtime/types.js';
import type { Diagnostic } from '../contracts/result.js';

export type ExplainSource = 'direct-id' | 'lexical' | 'vector' | 'dependency' | 'graph';

export type ExplainSelected = {
  id: string;
  rank: number;
  scope: string;
  type: string;
  summary: string;
  source: ExplainSource;
  signals: string[];
};

export type ExplainOmitted = {
  id: string;
  scope: string;
  reason: 'load-limit' | 'ignored' | 'profile' | 'low-confidence' | 'no-anchor-overlap';
};

export type RouteExplanation = {
  query: string;
  fallback: boolean;
  selected: ExplainSelected[];
  omitted: ExplainOmitted[];
  diagnostics: Diagnostic[];
};

/** Build a safe explanation from a RouteDetail. Never includes memory body or author. */
export function explainRoute(
  routed: RouteDetail,
  entries: MemoryEntry[],
  options: { query?: string; fallback?: boolean; directId?: boolean; omittedEntries?: MemoryEntry[] } = {}
): RouteExplanation {
  const reasonMap = new Map<string, RouteReason>((routed.reasons ?? []).map((r) => [r.key, r]));
  const selected: ExplainSelected[] = routed.entries.map((entry, index) => {
    const reason = reasonMap.get(`${entry.scope}:${entry.file}`);
    const source = explainSource(entry, reason, options.directId);
    const signals = explainSignals(entry, reason);
    return {
      id: entry.id,
      rank: index + 1,
      scope: entry.scope,
      type: entry.type,
      summary: entry.summary,
      source,
      signals
    };
  });

  const omitted: ExplainOmitted[] = [];
  const omittedSource = options.omittedEntries ?? routed.candidateEntries ?? [];
  if (omittedSource.length) {
    const selectedKeys = new Set(routed.entries.map((e) => `${e.scope}:${e.file}`));
    for (const entry of omittedSource) {
      if (selectedKeys.has(`${entry.scope}:${entry.file}`)) continue;
      omitted.push({
        id: entry.id,
        scope: entry.scope,
        reason: omitReason(entry, routed)
      });
    }
  }

  const diagnostics: Diagnostic[] = [];
  if (routed.entries.length === 0) {
    diagnostics.push({
      id: 'route.empty',
      severity: 'info',
      message: options.query
        ? `No memories matched "${options.query}". Try broader terms, --all, or engram search.`
        : 'No memories matched. Try broader terms, --all, or engram search.',
      remediation: 'engram search "<topic>" or engram load --all "<query>"'
    });
  }
  if (options.fallback) {
    diagnostics.push({
      id: 'route.fallback',
      severity: 'info',
      message: 'Empty query fell back to "current session" routing.',
    });
  }

  return {
    query: options.query ?? '',
    fallback: Boolean(options.fallback),
    selected,
    omitted,
    diagnostics
  };
}

function explainSource(entry: MemoryEntry, reason: RouteReason | undefined, directId?: boolean): ExplainSource {
  if (directId) return 'direct-id';
  if (!reason) return 'lexical';
  if (reason.kind === 'dependency') return 'dependency';
  if (reason.matchedBy?.includes('vector')) return 'vector';
  if (reason.matchedBy?.includes('graph')) return 'graph';
  return 'lexical';
}

function explainSignals(entry: MemoryEntry, reason: RouteReason | undefined): string[] {
  const signals: string[] = [];
  if (!reason) return signals;
  if (reason.matchedBy?.length) signals.push(...reason.matchedBy);
  if (reason.terms?.length) signals.push(`terms: ${reason.terms.join(', ')}`);
  if (reason.score !== undefined) signals.push(`score: ${reason.score.toFixed(3)}`);
  if (reason.source) signals.push(`source: ${reason.source}`);
  return signals;
}

function omitReason(entry: MemoryEntry, routed: RouteDetail): ExplainOmitted['reason'] {
  if (entry.ignored) return 'ignored';
  if (entry.confidence === 'low') return 'low-confidence';
  if (routed.refined) return 'load-limit';
  return 'no-anchor-overlap';
}
