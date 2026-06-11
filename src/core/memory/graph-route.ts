/** Graph-aware memory routing helpers. */
import type { MemoryEntry, MemoryGraph, MemoryGraphNode } from '../runtime/types.js';
import { lexicalScore } from '../system/text.js';
import { cosine, embed } from './graph-vector.js';

/** Route memories by lexical score, local vectors, topic nodes, and related edges. */
export function routeWithGraph(entries: MemoryEntry[], graph: MemoryGraph, query: string, max = 8): MemoryEntry[] {
  if (!graph.nodes.length) return lexicalRoute(entries, query, max);
  const entryMap = new Map(entries.map((entry) => [`memory:${entry.scope}:${entry.id}`, entry]));
  const nodeMap = new Map(graph.nodes.map((node) => [node.id, node]));
  const scores = new Map<string, number>();
  const queryVector = embed(query);
  const memoryNodes = graph.nodes.filter((node) => node.kind === 'memory' && entryMap.has(node.id));
  for (const node of memoryNodes) {
    const text = `${node.memoryId} ${node.memoryType} ${(node.tags ?? []).join(' ')} ${(node.dependsOn ?? []).join(' ')} ${node.summary ?? ''}`;
    bump(scores, node.id, lexicalScore(query, text) + cosine(queryVector, node.embedding ?? []) * 0.35);
  }
  for (const topic of graph.nodes.filter((node) => node.kind === 'topic')) {
    const score = lexicalScore(query, `${topic.label} ${(topic.tags ?? []).join(' ')}`);
    if (score <= 0) continue;
    for (const edge of graph.edges.filter((edge) => edge.kind === 'contains' && edge.from === topic.id)) {
      if (entryMap.has(edge.to)) bump(scores, edge.to, score * 0.55);
    }
  }
  for (const edge of graph.edges.filter((edge) => edge.kind === 'depends_on')) {
    const from = scores.get(edge.from) ?? 0;
    if (from > 0 && entryMap.has(edge.to)) bump(scores, edge.to, from * edge.weight * 0.5);
  }
  for (const edge of graph.edges.filter((edge) => edge.kind === 'related_to')) {
    const from = scores.get(edge.from) ?? 0;
    const to = scores.get(edge.to) ?? 0;
    if (from > 0 && entryMap.has(edge.to)) bump(scores, edge.to, from * edge.weight * 0.25);
    if (to > 0 && entryMap.has(edge.from)) bump(scores, edge.from, to * edge.weight * 0.25);
  }
  return [...scores.entries()]
    .filter(([, score]) => score > 0)
    .sort((a, b) => b[1] - a[1]
      || dependencyDepth(nodeMap.get(a[0])) - dependencyDepth(nodeMap.get(b[0]))
      || nodeScopePriority(a[0]) - nodeScopePriority(b[0])
      || a[0].localeCompare(b[0]))
    .slice(0, max)
    .map(([id]) => entryMap.get(id))
    .filter((entry): entry is MemoryEntry => Boolean(entry));
}

function lexicalRoute(entries: MemoryEntry[], query: string, max: number): MemoryEntry[] {
  return entries
    .map((entry) => ({ entry, score: lexicalScore(query, `${entry.id} ${entry.type} ${entry.tags.join(' ')} ${(entry.dependsOn ?? []).join(' ')} ${entry.summary}`) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || scopePriority(a.entry) - scopePriority(b.entry) || a.entry.file.localeCompare(b.entry.file))
    .slice(0, max)
    .map((row) => row.entry);
}

function bump(scores: Map<string, number>, key: string, amount: number): void {
  scores.set(key, (scores.get(key) ?? 0) + amount);
}

function dependencyDepth(node: MemoryGraphNode | undefined): number {
  return node?.dependencyDepth ?? 0;
}

function nodeScopePriority(nodeId: string): number {
  return nodeId.startsWith('memory:workspace:') ? 0 : 1;
}

function scopePriority(entry: MemoryEntry): number {
  return entry.scope === 'workspace' ? 0 : 1;
}
