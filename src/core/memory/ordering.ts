/** Attention-aware prerequisite ordering for agent memory consumption. */
import path from 'node:path';
import type { MemoryEntry, MemoryGraph } from '../runtime/types.js';
import { memoryKey, normalizeRef } from './memory-ref.js';
import { freshestTimestamp } from './routing.js';
import { today } from '../system/text.js';

const FRESH_LEAF_MAX_AGE_DAYS = 14;

/**
 * Order memory rows for agent consumption using Kahn's priority topological sort:
 * - Bucket 0 (primacy): rules, instruction-authority memories, and prerequisites of other rows
 * - Bucket 1 (middle): older durable skills and knowledge
 * - Bucket 2 (recency): fresh leaf knowledge (<= 14 days) and working-tier leaves
 */
export function orderForAgentConsumption<T extends { entry: MemoryEntry }>(
  rows: T[],
  graph: MemoryGraph | undefined,
  scores: Map<string, number>,
  day?: string
): T[] {
  if (rows.length < 2) return [...rows];

  const rowByKey = new Map<string, T>();
  const nodeIdToKey = new Map<string, string>();
  const refs = new Map<string, string>();
  for (const row of rows) {
    const key = memoryKey(row.entry);
    if (rowByKey.has(key)) continue;
    rowByKey.set(key, row);
    const nodeId = `memory:${row.entry.scope}:${row.entry.id}`;
    nodeIdToKey.set(nodeId, key);
    for (const ref of [
      row.entry.id,
      row.entry.file,
      `${row.entry.scope}:${row.entry.id}`,
      `${row.entry.scope}:${row.entry.file}`,
      nodeId,
      path.basename(row.entry.file, '.md')
    ]) {
      refs.set(normalizeRef(ref), key);
    }
  }

  const keys = [...rowByKey.keys()];
  const indegree = new Map<string, number>(keys.map((k) => [k, 0]));
  const dependents = new Map<string, Set<string>>(keys.map((k) => [k, new Set()]));
  const addPrereqEdge = (prereqKey: string, dependentKey: string) => {
    if (prereqKey === dependentKey || !rowByKey.has(prereqKey) || !rowByKey.has(dependentKey)) return;
    const deps = dependents.get(prereqKey)!;
    if (deps.has(dependentKey)) return;
    deps.add(dependentKey);
    indegree.set(dependentKey, (indegree.get(dependentKey) ?? 0) + 1);
  };

  for (const key of keys) {
    const entry = rowByKey.get(key)!.entry;
    for (const ref of entry.dependsOn ?? []) {
      const prereqKey = refs.get(normalizeRef(`${entry.scope}:${ref}`)) ?? refs.get(normalizeRef(ref));
      if (prereqKey) addPrereqEdge(prereqKey, key);
    }
  }

  for (const edge of graph?.edges ?? []) {
    if (edge.kind !== 'depends_on') continue;
    const dependentKey = nodeIdToKey.get(edge.from);
    const prereqKey = nodeIdToKey.get(edge.to);
    if (prereqKey && dependentKey) addPrereqEdge(prereqKey, dependentKey);
  }

  const refTime = Date.parse(day ?? today());
  const bucketOf = (key: string): number => {
    const entry = rowByKey.get(key)!.entry;
    if (entry.type === 'rule' || entry.authority === 'instruction' || (dependents.get(key)?.size ?? 0) > 0) {
      return 0;
    }
    if (entry.tier === 'working' || isFreshLeaf(entry, refTime)) {
      return 2;
    }
    return 1;
  };

  const buckets = new Map<string, number>(keys.map((k) => [k, bucketOf(k)]));
  const compareReady = (a: string, b: string): number => {
    const ba = buckets.get(a) ?? 1;
    const bb = buckets.get(b) ?? 1;
    if (ba !== bb) return ba - bb;
    return compareScoreAndFile(a, b, rowByKey, scores);
  };

  const ready = keys.filter((k) => (indegree.get(k) ?? 0) === 0);
  const orderedKeys: string[] = [];
  const emitted = new Set<string>();

  while (ready.length > 0) {
    ready.sort(compareReady);
    const current = ready.shift()!;
    orderedKeys.push(current);
    emitted.add(current);
    for (const dep of dependents.get(current) ?? []) {
      const nextDeg = (indegree.get(dep) ?? 1) - 1;
      indegree.set(dep, nextDeg);
      if (nextDeg === 0) ready.push(dep);
    }
  }

  // Cycle safety: append any remaining nodes in deterministic score/scope/file order.
  if (orderedKeys.length < keys.length) {
    const remaining = keys
      .filter((k) => !emitted.has(k))
      .sort((a, b) => compareScoreAndFile(a, b, rowByKey, scores));
    orderedKeys.push(...remaining);
  }

  return orderedKeys.map((k) => rowByKey.get(k)!);
}

function isFreshLeaf(entry: MemoryEntry, refTime: number): boolean {
  if (!Number.isFinite(refTime)) return false;
  const latestTime = freshestTimestamp(entry);
  if (latestTime === undefined) return false;
  const ageDays = Math.max(0, (refTime - latestTime) / 864e5);
  return ageDays <= FRESH_LEAF_MAX_AGE_DAYS;
}

function compareScoreAndFile<T extends { entry: MemoryEntry }>(
  a: string,
  b: string,
  rowByKey: Map<string, T>,
  scores: Map<string, number>
): number {
  const sa = scores.get(a) ?? 0;
  const sb = scores.get(b) ?? 0;
  if (sb !== sa) return sb - sa;
  const ea = rowByKey.get(a)!.entry;
  const eb = rowByKey.get(b)!.entry;
  const scopeDiff = (ea.scope === 'workspace' ? 0 : 1) - (eb.scope === 'workspace' ? 0 : 1);
  if (scopeDiff !== 0) return scopeDiff;
  return ea.file.localeCompare(eb.file);
}
