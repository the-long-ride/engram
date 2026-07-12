/** Derive deterministic review findings (duplicate/contradiction/stale/invalid_dependency) from index+graph+quality signals; dismissals persist by fingerprint so rebuilds never resurrect them. */
import type { MemoryEntry, MemoryGraph } from '../runtime/types.js';
import { duplicatePairs, semanticDuplicatePairs, type DuplicatePair } from '../analysis/search.js';
import { contradictionEdges, dependencyEdges } from '../memory/graph.js';

export type FindingKind = 'duplicate' | 'contradiction' | 'stale' | 'invalid_dependency';
export type FindingStatus = 'pending' | 'dismissed' | 'resolved';

export type ReviewFinding = {
  id: string;
  fingerprint: string;
  kind: FindingKind;
  memory_ids: string[];
  status: FindingStatus;
  created_at: string;
  updated_at: string;
  safe_summary: string;
  scope: string;
};

export type FindingDeriveOptions = { staleDays?: number; now?: Date };

const DEFAULT_STALE_DAYS = 180;

/** Derive all review findings from visible entries and the derived graph. */
export function deriveFindings(entries: MemoryEntry[], graph: MemoryGraph, options: FindingDeriveOptions = {}): ReviewFinding[] {
  const now = (options.now ?? new Date()).toISOString();
  const staleDays = options.staleDays ?? DEFAULT_STALE_DAYS;
  const findings: ReviewFinding[] = [];
  findings.push(...duplicateFindings(entries, now));
  findings.push(...contradictionFindings(graph, entries, now));
  findings.push(...staleFindings(entries, staleDays, now));
  findings.push(...invalidDependencyFindings(entries, now));
  return findings.sort((a, b) => a.kind.localeCompare(b.kind) || a.id.localeCompare(b.id));
}

function duplicateFindings(entries: MemoryEntry[], now: string): ReviewFinding[] {
  const lexical = duplicatePairs(entries);
  const semantic = semanticDuplicatePairs(entries).filter((pair) => !pairAlreadyCovered(pair, lexical));
  return [...lexical, ...semantic].map((pair, index) => {
    const ids = [pair[0].id, pair[1].id].sort();
    return makeFinding('duplicate', ids, now, `Probable duplicate: ${ids.join(' and ')} (score ${pair[2].toFixed(2)})`, pair[0].scope);
  });
}

function pairAlreadyCovered(pair: DuplicatePair, covered: DuplicatePair[]): boolean {
  return covered.some((c) => (c[0].id === pair[0].id && c[1].id === pair[1].id) || (c[0].id === pair[1].id && c[1].id === pair[0].id));
}

function contradictionFindings(graph: MemoryGraph, entries: MemoryEntry[], now: string): ReviewFinding[] {
  const edges = contradictionEdges(graph);
  const byId = new Map(entries.map((e) => [e.id, e]));
  return edges.map((edge, index) => {
    const fromId = memoryIdFromNode(edge.from);
    const toId = memoryIdFromNode(edge.to);
    const ids = [fromId, toId].sort();
    const scope = byId.get(fromId)?.scope ?? byId.get(toId)?.scope ?? 'workspace';
    return makeFinding('contradiction', ids, now, `Contradiction candidate: ${fromId} vs ${toId}`, scope);
  });
}

function staleFindings(entries: MemoryEntry[], staleDays: number, now: string): ReviewFinding[] {
  const cutoff = Date.now() - staleDays * 864e5;
  const reviewDueByDate = entries.filter((e) => {
    if (!e.reviewAfter) return false;
    return Date.parse(e.reviewAfter) <= Date.now();
  });
  const staleByAge = entries.filter((e) => {
    if (e.lifecycle === 'archived' || e.lifecycle === 'superseded') return false;
    if (e.reviewAfter) return false;
    const updated = Date.parse(e.updated);
    return Number.isFinite(updated) && updated <= cutoff;
  });
  const seen = new Set<string>();
  const findings: ReviewFinding[] = [];
  for (const entry of [...reviewDueByDate, ...staleByAge]) {
    if (seen.has(entry.id)) continue;
    seen.add(entry.id);
    const reason = entry.reviewAfter
      ? `Review due (review_after ${entry.reviewAfter}): ${entry.id}`
      : `Stale by age (${staleDays}d): ${entry.id}`;
    findings.push(makeFinding('stale', [entry.id], now, reason, entry.scope));
  }
  return findings;
}

function invalidDependencyFindings(entries: MemoryEntry[], now: string): ReviewFinding[] {
  const ids = new Set(entries.map((e) => e.id));
  const findings: ReviewFinding[] = [];
  const seen = new Set<string>();
  for (const entry of entries) {
    if (!entry.dependsOn?.length) continue;
    for (const dep of entry.dependsOn) {
      if (ids.has(dep)) continue;
      const key = `${entry.id}->${dep}`;
      if (seen.has(key)) continue;
      seen.add(key);
      findings.push(makeFinding('invalid_dependency', [entry.id, dep].sort(), now, `${entry.id} depends_on missing '${dep}'`, entry.scope));
    }
  }
  return findings;
}

function makeFinding(kind: FindingKind, memoryIds: string[], now: string, summary: string, scope: string): ReviewFinding {
  const fingerprint = fingerprintOf(kind, memoryIds);
  return {
    id: fingerprint,
    fingerprint,
    kind,
    memory_ids: memoryIds,
    status: 'pending',
    created_at: now,
    updated_at: now,
    safe_summary: summary,
    scope
  };
}

/** Stable fingerprint for a finding: kind + sorted memory ids.
 *  This lets dismissals/resolve survive index rebuilds. */
export function fingerprintOf(kind: FindingKind, memoryIds: string[]): string {
  return `${kind}:${[...memoryIds].sort().join(',')}`;
}

function memoryIdFromNode(nodeId: string): string {
  const parts = nodeId.split(':');
  return parts[parts.length - 1];
}
