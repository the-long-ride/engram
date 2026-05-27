/** Small deterministic text helpers for IDs, tags, and lexical scoring. */
export function slugify(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || 'memory';
}

/** Split comma/list text into clean tags. */
export function tagsFrom(text: string): string[] {
  return [...new Set(text.toLowerCase().match(/[a-z0-9][a-z0-9-]{1,}/g) ?? [])].slice(0, 8);
}

/** Return today in YYYY-MM-DD form. */
export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Extract lowercase words for deterministic search and routing. */
export function words(text: string): Set<string> {
  return new Set((text.toLowerCase().match(/[a-z0-9][a-z0-9-]{1,}/g) ?? []).filter((w) => w.length > 2));
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

/** Keep a compact first-line summary. */
export function summarize(text: string, max = 140): string {
  const clean = text.replace(/^---[\s\S]*?---/, '').replace(/[#>*`-]/g, '').replace(/\s+/g, ' ').trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}...` : clean;
}
