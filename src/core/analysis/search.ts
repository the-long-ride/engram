/** Search, stats, and duplicate detection helpers. */
import type { MemoryEntry } from '../runtime/types.js';
import { lexicalScore, words } from '../system/text.js';
import { style } from '../cli/format.js';

export type DuplicatePair = [MemoryEntry, MemoryEntry, number];

/** Return entries ranked by lexical match. */
export function searchEntries(entries: MemoryEntry[], query: string): MemoryEntry[] {
  return entries
    .map((entry) => ({ entry, score: lexicalScore(query, `${entry.id} ${entry.tags.join(' ')} ${entry.summary}`) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || scopePriority(a.entry) - scopePriority(b.entry) || a.entry.file.localeCompare(b.entry.file))
    .map((row) => row.entry);
}
// ... [keeping semanticSearchEntries, duplicatePairs, semanticDuplicatePairs unchanged]
/** Return entries ranked by local normalized-term similarity. */
export function semanticSearchEntries(entries: MemoryEntry[], query: string): MemoryEntry[] {
  const queryTerms = semanticTerms(query);
  return entries
    .map((entry) => ({ entry, score: semanticSearchScore(query, queryTerms, entry) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || scopePriority(a.entry) - scopePriority(b.entry) || a.entry.file.localeCompare(b.entry.file))
    .map((row) => row.entry);
}

/** Find likely duplicates with deterministic token overlap. */
export function duplicatePairs(entries: MemoryEntry[]): DuplicatePair[] {
  return matchingPairs(entries, (a, b) => overlap(`${a.id} ${a.summary}`, `${b.id} ${b.summary}`), 0.75);
}

/** Find likely duplicates with local normalized-term similarity. */
export function semanticDuplicatePairs(entries: MemoryEntry[]): DuplicatePair[] {
  return matchingPairs(entries, semanticDuplicateScore, 0.58);
}

/** Summarize memory counts by type and scope. */
export function stats(entries: MemoryEntry[]): string {
  const by = (key: 'type' | 'scope') => entries.reduce<Record<string, number>>((acc, e) => {
    acc[e[key]] = (acc[e[key]] ?? 0) + 1;
    return acc;
  }, {});
  return [
    style.heading('Memory stats'),
    `${style.label('Total:')} ${style.number(String(entries.length))}`,
    '',
    style.title('By type:'),
    ...countRows(by('type')),
    '',
    style.title('By scope:'),
    ...countRows(by('scope'))
  ].join('\n');
}

function countRows(counts: Record<string, number>): string[] {
  const rows = Object.entries(counts).sort(([a], [b]) => a.localeCompare(b));
  return rows.length ? rows.map(([key, count]) => `  ${style.label(key)}: ${style.number(String(count))}`) : [`  ${style.muted('none')}`];
}

function matchingPairs(entries: MemoryEntry[], scorePair: (a: MemoryEntry, b: MemoryEntry) => number, threshold: number): DuplicatePair[] {
  const pairs: DuplicatePair[] = [];
  for (let i = 0; i < entries.length; i += 1) {
    for (let j = i + 1; j < entries.length; j += 1) {
      const score = scorePair(entries[i], entries[j]);
      if (score >= threshold) pairs.push([entries[i], entries[j], score]);
    }
  }
  return pairs.sort((a, b) => b[2] - a[2] || a[0].file.localeCompare(b[0].file) || a[1].file.localeCompare(b[1].file));
}

function overlap(a: string, b: string): number {
  const aw = words(a);
  const bw = words(b);
  return setContainment(aw, bw);
}

function semanticDuplicateScore(a: MemoryEntry, b: MemoryEntry): number {
  if (a.id === b.id) return 1;
  const aw = semanticTerms(entryText(a));
  const bw = semanticTerms(entryText(b));
  const tagScore = setContainment(semanticTerms(a.tags.join(' ')), semanticTerms(b.tags.join(' ')));
  const containment = setContainment(aw, bw);
  const union = new Set([...aw, ...bw]);
  const jaccard = intersectionSize(aw, bw) / Math.max(1, union.size);
  const vectorScore = cosine(termVector(aw), termVector(bw));
  const lexical = lexicalScore([...aw].join(' '), [...bw].join(' '));
  const typeBonus = a.type === b.type ? 0.06 : 0;
  const semantic = Math.max(
    lexical,
    containment * 0.72 + jaccard * 0.18 + tagScore * 0.1,
    vectorScore * 0.82 + tagScore * 0.12
  );
  return Math.min(1, semantic + typeBonus);
}

function semanticSearchScore(query: string, queryTerms: Set<string>, entry: MemoryEntry): number {
  const candidate = entryText(entry);
  const entryTerms = semanticTerms(candidate);
  if (!queryTerms.size || !entryTerms.size) return lexicalScore(query, candidate);
  const tagScore = setContainment(queryTerms, semanticTerms(entry.tags.join(' ')));
  const queryCoverage = intersectionSize(queryTerms, entryTerms) / Math.max(1, queryTerms.size);
  const normalizedLexical = lexicalScore([...queryTerms].join(' '), [...entryTerms].join(' '));
  const vectorScore = cosine(termVector(queryTerms), termVector(entryTerms));
  return Math.min(1, Math.max(
    lexicalScore(query, candidate),
    normalizedLexical,
    queryCoverage * 0.78 + tagScore * 0.12,
    vectorScore * 0.82 + tagScore * 0.08
  ));
}

function entryText(entry: MemoryEntry): string {
  return `${entry.id} ${entry.tags.join(' ')} ${entry.summary}`;
}

function setContainment(aw: Set<string>, bw: Set<string>): number {
  let hit = 0;
  for (const word of aw) if (bw.has(word)) hit += 1;
  return hit / Math.max(1, Math.min(aw.size, bw.size));
}

function scopePriority(entry: MemoryEntry): number {
  return entry.scope === 'workspace' ? 0 : 1;
}

function intersectionSize(a: Set<string>, b: Set<string>): number {
  let hit = 0;
  for (const word of a) if (b.has(word)) hit += 1;
  return hit;
}

const semanticStopwords = new Set([
  'about', 'after', 'again', 'agent', 'agents', 'all', 'always', 'and', 'any', 'approved', 'are', 'before',
  'between', 'but', 'can', 'content', 'context', 'conversation', 'current', 'do', 'does', 'done', 'durable',
  'example', 'for', 'from', 'future', 'had', 'has', 'have', 'human', 'into', 'keep', 'knowledge',
  'manual', 'memory', 'must', 'never', 'not', 'objective', 'only', 'prefer', 'rule', 'should', 'skill',
  'than', 'that', 'the', 'then', 'this', 'touch', 'under', 'use', 'when', 'where',
  'which', 'with', 'without', 'workspace', 'written'
]);

const semanticAliases: Record<string, string> = {
  authentication: 'auth',
  authorization: 'auth',
  authorize: 'auth',
  backend: 'backend',
  config: 'config',
  configuration: 'config',
  configured: 'config',
  deploy: 'deploy',
  deployed: 'deploy',
  deployment: 'deploy',
  documentation: 'docs',
  document: 'docs',
  frontend: 'frontend',
  prefer: 'prefer',
  prefers: 'prefer',
  package: 'package',
  packages: 'package',
  pkg: 'package',
  scripts: 'script',
  synchronization: 'sync',
  synchronized: 'sync',
  testing: 'test',
  tests: 'test',
  used: 'use',
  uses: 'use',
  using: 'use',
  workflow: 'workflow',
  workflows: 'workflow'
};

const semanticConcepts: Record<string, string[]> = {
  npm: ['package-manager', 'javascript'],
  package: ['package-manager'],
  pnpm: ['package-manager', 'javascript'],
  yarn: ['package-manager', 'javascript']
};

function semanticTerms(text: string): Set<string> {
  const terms = new Set<string>();
  for (const token of words(text)) {
    for (const part of [token, ...token.split('-')]) addSemanticTerm(terms, part);
  }
  return terms;
}

function addSemanticTerm(terms: Set<string>, raw: string): void {
  const normalized = normalizeSemanticTerm(raw);
  if (!normalized || semanticStopwords.has(normalized)) return;
  terms.add(normalized);
  for (const concept of semanticConcepts[normalized] ?? []) terms.add(concept);
}

function normalizeSemanticTerm(raw: string): string {
  const lower = raw.toLowerCase().replace(/[^a-z0-9-]/g, '');
  if (/^\d+(?:-\d+)*$/.test(lower)) return '';
  const aliased = semanticAliases[lower] ?? lower;
  const normalized = semanticAliases[stem(aliased)] ?? stem(aliased);
  return normalized.length > 2 ? normalized : '';
}

function stem(term: string): string {
  if (term.length > 5 && term.endsWith('ies')) return `${term.slice(0, -3)}y`;
  for (const suffix of ['ing', 'ed', 'es', 's']) {
    if (term.length <= suffix.length + 3 || !term.endsWith(suffix)) continue;
    const stripped = term.slice(0, -suffix.length);
    return /(.)\1$/.test(stripped) ? stripped.slice(0, -1) : stripped;
  }
  return term;
}

function termVector(terms: Set<string>): number[] {
  const vector = Array(64).fill(0);
  for (const term of terms) vector[hash(term) % vector.length] += 1;
  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  return norm ? vector.map((value) => value / norm) : vector;
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
