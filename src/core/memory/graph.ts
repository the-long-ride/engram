/** Derived JSON knowledge graph for layered routing over approved memories. */
import path from 'node:path';
import { GRAPH_FILE, VERSION } from '../runtime/constants.js';
import type { EngramConfig, MemoryEntry, MemoryGraph, MemoryGraphEdge, MemoryGraphNode, MemoryIndex, Scope } from '../runtime/types.js';
import { lexicalScore, words } from '../system/text.js';
import { readJson, writeJson } from '../system/fsx.js';
import { formatRecords } from '../cli/format.js';

const VECTOR_SIZE = 48;

/** Return an empty graph with current schema version. */
export function emptyGraph(): MemoryGraph {
  return { version: VERSION, last_updated: new Date().toISOString(), nodes: [], edges: [] };
}

/** Read a graph file, returning an empty graph when it is missing. */
export async function loadGraph(root: string): Promise<MemoryGraph> {
  return readJson<MemoryGraph>(path.join(root, GRAPH_FILE), emptyGraph());
}

/** Persist a graph file. */
export async function writeGraph(root: string, graph: MemoryGraph): Promise<void> {
  graph.last_updated = new Date().toISOString();
  await writeJson(path.join(root, GRAPH_FILE), graph);
}

/** Rebuild the graph from an index. The graph is derived, never authoritative. */
export async function rebuildGraph(root: string, scope: Scope, index: MemoryIndex, config?: EngramConfig): Promise<MemoryGraph> {
  const graph = graphFromEntries(index.entries.filter((entry) => entry.scope === scope && !entry.ignored), scope, config);
  await writeGraph(root, graph);
  return graph;
}

/** Merge scope graphs into one agent-facing graph. */
export function mergeGraphs(workspace: MemoryGraph, global: MemoryGraph): MemoryGraph {
  const nodes = new Map<string, MemoryGraphNode>();
  const edges = new Map<string, MemoryGraphEdge>();
  for (const graph of [global, workspace]) {
    for (const node of graph.nodes) nodes.set(node.id, node);
    for (const edge of graph.edges) edges.set(edge.id, edge);
  }
  return { ...emptyGraph(), nodes: [...nodes.values()], edges: [...edges.values()] };
}

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

/** Return graph edges that probably indicate stale or wrong memory. */
export function contradictionEdges(graph: MemoryGraph): MemoryGraphEdge[] {
  return graph.edges.filter((edge) => edge.kind === 'contradicts');
}

/** Return explicit memory prerequisite edges. */
export function dependencyEdges(graph: MemoryGraph): MemoryGraphEdge[] {
  return graph.edges.filter((edge) => edge.kind === 'depends_on');
}

/** Add selected prerequisites and return memories in foundation-to-deep order. */
export function dependencyContextEntries(selected: MemoryEntry[], visible: MemoryEntry[], graph: MemoryGraph, max: number): MemoryEntry[] {
  if (!selected.length || !dependencyEdges(graph).length) return orderByDependencies(selected, graph);
  const visibleByNode = new Map(visible.map((entry) => [memoryNodeId(entry), entry]));
  const selectedNodeIds = selected.map(memoryNodeId);
  const dependencyNodeIds: string[] = [];
  for (const nodeId of selectedNodeIds) collectPrerequisites(nodeId, graph, dependencyNodeIds, new Set());
  const combined = uniqueStrings([...dependencyNodeIds, ...selectedNodeIds])
    .map((nodeId) => visibleByNode.get(nodeId))
    .filter((entry): entry is MemoryEntry => Boolean(entry));
  if (combined.length <= max) return orderByDependencies(combined, graph);
  const dependencySet = new Set(dependencyNodeIds);
  const primary = selected[0];
  const dependencyLimit = primary ? Math.max(0, max - 1) : max;
  const keep = combined.filter((entry) => dependencySet.has(memoryNodeId(entry))).slice(0, dependencyLimit);
  if (primary && keep.length < max && !keep.some((item) => entryKey(item) === entryKey(primary))) keep.push(primary);
  for (const entry of selected) {
    if (keep.length >= max) break;
    if (!keep.some((item) => entryKey(item) === entryKey(entry))) keep.push(entry);
  }
  return orderByDependencies(keep, graph);
}

/** Sort routed memories so foundations appear before dependent memories. */
export function orderByDependencies(entries: MemoryEntry[], graph: MemoryGraph): MemoryEntry[] {
  if (entries.length < 2 || !dependencyEdges(graph).length) return entries;
  const inputOrder = new Map(entries.map((entry, index) => [memoryNodeId(entry), index]));
  const byNode = new Map(entries.map((entry) => [memoryNodeId(entry), entry]));
  const nodeMap = new Map(graph.nodes.map((node) => [node.id, node]));
  const ordered: MemoryEntry[] = [];
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (nodeId: string) => {
    if (visited.has(nodeId) || !byNode.has(nodeId)) return;
    if (visiting.has(nodeId)) return;
    visiting.add(nodeId);
    for (const dep of prerequisiteNodeIds(nodeId, graph)) visit(dep);
    visiting.delete(nodeId);
    visited.add(nodeId);
    const entry = byNode.get(nodeId);
    if (entry) ordered.push(entry);
  };
  [...byNode.keys()]
    .sort((a, b) => dependencyDepth(nodeMap.get(a)) - dependencyDepth(nodeMap.get(b))
      || (inputOrder.get(a) ?? 0) - (inputOrder.get(b) ?? 0))
    .forEach(visit);
  return ordered;
}

/** Render a compact graph report for CLI output. */
export function renderGraphReport(graph: MemoryGraph, query = ''): string {
  const lines = [`engram graph: ${graph.nodes.length} nodes, ${graph.edges.length} edges`];
  const nodeMap = new Map(graph.nodes.map((node) => [node.id, node]));
  if (query) {
    const matches = graph.nodes
      .filter((node) => node.kind === 'memory')
      .map((node) => ({ node, score: lexicalScore(query, `${node.label} ${(node.tags ?? []).join(' ')} ${node.summary ?? ''}`) }))
      .filter((row) => row.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
    lines.push(`Query: ${query}`);
    if (matches.length) lines.push(formatRecords('Query matches', matches.map((row) => ({
      title: `${row.node.scope}:${row.node.file}`,
      fields: [
        ['Score', row.score.toFixed(2)],
        ['Depth', String(row.node.dependencyDepth ?? 0)],
        ['Depends on', (row.node.dependsOn ?? []).join(', ') || '-'],
        ['Summary', row.node.summary ?? '']
      ]
    }))));
  }
  const dependencies = dependencyEdges(graph).slice(0, 8);
  if (dependencies.length) lines.push(formatRecords('Dependency layers', dependencies.map((edge) => ({
    title: `${nodeLabel(nodeMap.get(edge.from))} depends on ${nodeLabel(nodeMap.get(edge.to))}`,
    fields: [['Reason', edge.reason]]
  }))));
  const contradictions = contradictionEdges(graph).slice(0, 8);
  if (contradictions.length) lines.push(formatRecords('Contradiction candidates', contradictions.map((edge) => ({
    title: `${edge.from} <-> ${edge.to}`,
    fields: [['Reason', edge.reason]]
  }))));
  return lines.join('\n');
}

function graphFromEntries(entries: MemoryEntry[], scope: Scope, config?: EngramConfig): MemoryGraph {
  const nodes = new Map<string, MemoryGraphNode>();
  const edges = new Map<string, MemoryGraphEdge>();
  const refs = memoryReferenceMap(entries);
  const depths = memoryDepths(entries, refs);
  const scopeId = `scope:${scope}`;
  nodes.set(scopeId, { id: scopeId, kind: 'scope', level: 0, label: scope, scope });
  for (const type of ['rule', 'skill', 'knowledge'] as const) {
    const typeId = `${scopeId}:type:${type}`;
    nodes.set(typeId, { id: typeId, kind: 'type', level: 1, label: type, scope, memoryType: type });
    addEdge(edges, scopeId, typeId, 'contains', 1, 'scope contains memory type');
  }
  for (const entry of entries) {
    const memoryId = memoryNodeId(entry);
    const dependencyDepth = depths.get(memoryId) ?? entry.dependencyDepth ?? 0;
    nodes.set(memoryId, {
      id: memoryId,
      kind: 'memory',
      level: 3 + dependencyDepth,
      label: entry.id,
      scope,
      memoryId: entry.id,
      memoryType: entry.type,
      file: entry.file,
      tags: entry.tags,
      summary: entry.summary,
      dependsOn: entry.dependsOn,
      dependencyDepth,
      embedding: embed(`${entry.id} ${entry.tags.join(' ')} ${(entry.dependsOn ?? []).join(' ')} ${entry.summary}`)
    });
    const typeId = `${scopeId}:type:${entry.type}`;
    for (const tag of entry.tags.length ? entry.tags : ['untagged']) {
      const topicId = `${scopeId}:topic:${tag}`;
      nodes.set(topicId, { id: topicId, kind: 'topic', level: 2, label: tag, scope, tags: [tag], embedding: embed(tag) });
      addEdge(edges, typeId, topicId, 'contains', 1, 'memory type contains topic');
      addEdge(edges, topicId, memoryId, 'contains', 1, 'topic contains memory');
      addEdge(edges, memoryId, topicId, 'tagged_as', 1, 'memory tagged by topic');
    }
  }
  addDependencyRelations(entries, edges, refs);
  addMemoryRelations(entries, edges, config);
  return { ...emptyGraph(), nodes: [...nodes.values()], edges: [...edges.values()] };
}

function addDependencyRelations(entries: MemoryEntry[], edges: Map<string, MemoryGraphEdge>, refs: Map<string, MemoryEntry>): void {
  for (const entry of entries) {
    for (const ref of entry.dependsOn ?? []) {
      const dependency = resolveDependency(entry, ref, refs);
      if (!dependency || dependency.id === entry.id) continue;
      addEdge(edges, memoryNodeId(entry), memoryNodeId(dependency), 'depends_on', 1, 'memory declares prerequisite dependency');
    }
  }
}

function addMemoryRelations(entries: MemoryEntry[], edges: Map<string, MemoryGraphEdge>, config?: EngramConfig): void {
  const maxRelated = Math.max(0, config?.graph.max_related ?? 4);
  const minScore = config?.graph.min_related_score ?? 0.22;
  const perNode = new Map<string, number>();
  for (let i = 0; i < entries.length; i += 1) {
    for (let j = i + 1; j < entries.length; j += 1) {
      const a = entries[i], b = entries[j];
      const relation = relationScore(a, b);
      if (relation >= minScore && canAddRelation(perNode, a, b, maxRelated)) {
        addEdge(edges, memoryNodeId(a), memoryNodeId(b), 'related_to', relation, 'shared tags or summary overlap');
      }
      const conflict = contradictionReason(a, b);
      if (conflict) addEdge(edges, memoryNodeId(a), memoryNodeId(b), 'contradicts', 0.8, conflict);
    }
  }
}

function canAddRelation(counts: Map<string, number>, a: MemoryEntry, b: MemoryEntry, max: number): boolean {
  const ak = memoryNodeId(a), bk = memoryNodeId(b);
  if ((counts.get(ak) ?? 0) >= max || (counts.get(bk) ?? 0) >= max) return false;
  counts.set(ak, (counts.get(ak) ?? 0) + 1);
  counts.set(bk, (counts.get(bk) ?? 0) + 1);
  return true;
}

function relationScore(a: MemoryEntry, b: MemoryEntry): number {
  const tagHits = a.tags.filter((tag) => b.tags.includes(tag)).length;
  const tagScore = tagHits / Math.sqrt(Math.max(1, a.tags.length * b.tags.length));
  return Math.max(tagScore, lexicalScore(a.summary, b.summary));
}

function contradictionReason(a: MemoryEntry, b: MemoryEntry): string {
  const shared = [...words(`${a.id} ${a.summary}`)].filter((word) => words(`${b.id} ${b.summary}`).has(word));
  if (shared.length < 2) return '';
  const pa = polarity(a.summary), pb = polarity(b.summary);
  if (pa * pb < 0) return `opposite guidance around ${shared.slice(0, 4).join(', ')}`;
  return '';
}

function polarity(text: string): number {
  const lower = text.toLowerCase();
  const positive = /\b(always|must|required|prefer|use|should)\b/.test(lower) ? 1 : 0;
  const negative = /\b(never|avoid|do not|don't|should not|deprecated|replaced|no longer)\b/.test(lower) ? -1 : 0;
  return positive + negative;
}

function lexicalRoute(entries: MemoryEntry[], query: string, max: number): MemoryEntry[] {
  return entries
    .map((entry) => ({ entry, score: lexicalScore(query, `${entry.id} ${entry.type} ${entry.tags.join(' ')} ${(entry.dependsOn ?? []).join(' ')} ${entry.summary}`) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || scopePriority(a.entry) - scopePriority(b.entry) || a.entry.file.localeCompare(b.entry.file))
    .slice(0, max)
    .map((row) => row.entry);
}

function addEdge(edges: Map<string, MemoryGraphEdge>, from: string, to: string, kind: MemoryGraphEdge['kind'], weight: number, reason: string): void {
  const id = `${kind}:${from}->${to}`;
  edges.set(id, { id, kind, from, to, weight: Number(weight.toFixed(3)), reason });
}

function memoryNodeId(entry: MemoryEntry): string {
  return `memory:${entry.scope}:${entry.id}`;
}

function memoryReferenceMap(entries: MemoryEntry[]): Map<string, MemoryEntry> {
  const refs = new Map<string, MemoryEntry>();
  for (const entry of entries) {
    for (const ref of [
      entry.id,
      entry.file,
      `${entry.scope}:${entry.id}`,
      `${entry.scope}:${entry.file}`,
      memoryNodeId(entry),
      path.basename(entry.file, '.md')
    ]) {
      refs.set(normalizeRef(ref), entry);
    }
  }
  return refs;
}

function resolveDependency(entry: MemoryEntry, ref: string, refs: Map<string, MemoryEntry>): MemoryEntry | undefined {
  return refs.get(normalizeRef(`${entry.scope}:${ref}`)) ?? refs.get(normalizeRef(ref));
}

function memoryDepths(entries: MemoryEntry[], refs: Map<string, MemoryEntry>): Map<string, number> {
  const depths = new Map<string, number>();
  const visiting = new Set<string>();
  const depthFor = (entry: MemoryEntry): number => {
    const id = memoryNodeId(entry);
    if (depths.has(id)) return depths.get(id) ?? 0;
    if (visiting.has(id)) return entry.dependencyDepth ?? 0;
    visiting.add(id);
    const dependencyDepths = (entry.dependsOn ?? [])
      .map((ref) => resolveDependency(entry, ref, refs))
      .filter((dependency): dependency is MemoryEntry => Boolean(dependency))
      .map((dependency) => depthFor(dependency) + 1);
    visiting.delete(id);
    const depth = Math.max(entry.dependencyDepth ?? 0, ...dependencyDepths, 0);
    depths.set(id, depth);
    return depth;
  };
  for (const entry of entries) depthFor(entry);
  return depths;
}

function prerequisiteNodeIds(nodeId: string, graph: MemoryGraph): string[] {
  return graph.edges
    .filter((edge) => edge.kind === 'depends_on' && edge.from === nodeId)
    .map((edge) => edge.to);
}

function collectPrerequisites(nodeId: string, graph: MemoryGraph, out: string[], visiting: Set<string>): void {
  if (visiting.has(nodeId)) return;
  visiting.add(nodeId);
  for (const dep of prerequisiteNodeIds(nodeId, graph)) {
    collectPrerequisites(dep, graph, out, visiting);
    if (!out.includes(dep)) out.push(dep);
  }
  visiting.delete(nodeId);
}

function normalizeRef(ref: string): string {
  return ref.trim().replace(/\\/g, '/').replace(/\.md$/i, '').toLowerCase();
}

function entryKey(entry: MemoryEntry): string {
  return `${entry.scope}:${entry.file}`;
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)];
}

function dependencyDepth(node: MemoryGraphNode | undefined): number {
  return node?.dependencyDepth ?? 0;
}

function nodeLabel(node: MemoryGraphNode | undefined): string {
  if (!node) return '<missing>';
  return node.file ? `${node.scope}:${node.file}` : node.label;
}

function bump(scores: Map<string, number>, key: string, amount: number): void {
  scores.set(key, (scores.get(key) ?? 0) + amount);
}

function nodeScopePriority(nodeId: string): number {
  return nodeId.startsWith('memory:workspace:') ? 0 : 1;
}

function scopePriority(entry: MemoryEntry): number {
  return entry.scope === 'workspace' ? 0 : 1;
}

function embed(text: string): number[] {
  const vector = Array(VECTOR_SIZE).fill(0);
  for (const word of words(text)) vector[hash(word) % VECTOR_SIZE] += 1;
  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  return norm ? vector.map((value) => Number((value / norm).toFixed(4))) : vector;
}

function cosine(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i += 1) sum += a[i] * b[i];
  return sum;
}

function hash(input: string): number {
  let value = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    value ^= input.charCodeAt(i);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}
