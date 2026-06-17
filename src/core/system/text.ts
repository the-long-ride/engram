/** Small deterministic text helpers for IDs, tags, and lexical scoring. */
export function slugify(input: string): string {
  const slug = input.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
  return slug || `memory-${shortHash(input)}`;
}

/** Split comma/list text into clean tags. */
export function tagsFrom(text: string): string[] {
  return meaningfulWordList(text).slice(0, 6);
}

/** Return today in YYYY-MM-DD form. */
export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Extract lowercase words for deterministic search and routing. */
export function words(text: string): Set<string> {
  return new Set((text.toLowerCase().match(/[a-z0-9][a-z0-9-]{1,}/g) ?? []).filter((w) => w.length > 2));
}

const ROUTING_STOPWORDS = new Set([
  'about', 'after', 'again', 'all', 'also', 'and', 'any', 'are', 'before', 'being',
  'both', 'but', 'can', 'come', 'current', 'does', 'done', 'each', 'else', 'ever',
  'for', 'from', 'had', 'has', 'have', 'here', 'into', 'its', 'just', 'keep',
  'made', 'make', 'more', 'most', 'much', 'must', 'new', 'not', 'off', 'only',
  'other', 'over', 'same', 'some', 'such', 'take', 'than', 'that', 'the', 'their',
  'them', 'then', 'they', 'this', 'very', 'was', 'well', 'when', 'where', 'which',
  'with', 'work', 'written', 'your'
]);

const ROUTING_GENERIC_WORDS = new Set([
  'agent', 'agents', 'approved', 'content', 'context', 'durable', 'engram',
  'example', 'future', 'knowledge', 'memories', 'memory', 'rule', 'rules',
  'skill', 'skills', 'task', 'touch', 'type', 'use', 'used', 'uses',
  'using'
]);

/** Return stable routing terms, excluding stopwords and generic memory terms. */
export function meaningfulWords(text: string): Set<string> {
  return new Set(meaningfulWordList(text));
}

/** Return stable routing terms in first-seen order. */
export function meaningfulWordList(text: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const token of words(text)) {
    for (const term of [token, ...token.split('-')]) {
      if (!isMeaningfulRoutingWord(term) || seen.has(term)) continue;
      seen.add(term);
      out.push(term);
    }
  }
  return out;
}

function isMeaningfulRoutingWord(word: string): boolean {
  if (word.length <= 2) return false;
  if (/^\d+(?:-\d+)*$/.test(word)) return false;
  return !ROUTING_STOPWORDS.has(word) && !ROUTING_GENERIC_WORDS.has(word);
}

/** Jaccard-ish score between a query and candidate text. */
export function lexicalScore(query: string, candidate: string): number {
  const q = words(query);
  const c = words(candidate);
  if (!q.size || !c.size) return 0;
  let hit = 0;
  for (const word of q) if (c.has(word)) hit += 1;
  return hit / Math.sqrt(q.size * c.size);
}

/** Deterministic local vector for routing indexes; no model or network required. */
export function routingVector(text: string, dimensions = 64): number[] {
  const vector = Array(Math.max(8, dimensions)).fill(0);
  for (const word of words(text)) {
    addVectorTerm(vector, word, 1);
    for (const part of word.split('-')) addVectorTerm(vector, part, 0.7);
    for (const gram of charGrams(word)) addVectorTerm(vector, gram, 0.25);
  }
  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  return norm ? vector.map((value) => Number((value / norm).toFixed(6))) : vector;
}

/** Keep a compact first-line summary. */
export function summarize(text: string, max = 140): string {
  const clean = text.replace(/^---[\s\S]*?---/, '').replace(/[#>*`-]/g, '').replace(/\s+/g, ' ').trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}...` : clean;
}

function addVectorTerm(vector: number[], term: string, weight: number): void {
  if (term.length <= 2) return;
  vector[hash(term) % vector.length] += weight;
}

function charGrams(word: string): string[] {
  if (word.length < 5) return [];
  const grams = [];
  for (let i = 0; i <= word.length - 3; i += 1) grams.push(`g:${word.slice(i, i + 3)}`);
  return grams;
}

function shortHash(input: string): string {
  return hash(input).toString(36).slice(0, 8);
}

function hash(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
