/** Deterministic memory quality and health scoring. */
import type { MemoryEntry } from './types.js';
import { parseMemory } from './schema.js';

/** Score one memory on specificity, completeness, and freshness. */
export function scoreMemory(raw: string): { score: number; issues: string[] } {
  const doc = parseMemory(raw);
  const issues: string[] = [];
  let score = 100;
  if (!doc.body.includes('## Example')) { score -= 25; issues.push('missing example'); }
  if (!doc.body.includes('## Context')) { score -= 20; issues.push('missing context'); }
  if (/usually|typically|maybe|might/i.test(doc.body)) { score -= 15; issues.push('vague wording'); }
  if (doc.raw.split(/\r?\n/).length > 45) { score -= 10; issues.push('long memory'); }
  const updated = Date.parse(String(doc.frontmatter.updated ?? ''));
  if (updated && Date.now() - updated > 180 * 864e5) { score -= 20; issues.push('stale'); }
  return { score: Math.max(0, score), issues };
}

/** Summarize index health. */
export function health(entries: MemoryEntry[]): string {
  const stale = entries.filter((e) => Date.now() - Date.parse(e.updated) > 180 * 864e5).length;
  const low = entries.filter((e) => e.confidence === 'low').length;
  const ignored = entries.filter((e) => e.ignored).length;
  const score = Math.max(0, 100 - stale * 5 - low * 8);
  return `Memory health: ${score}/100\nCoverage: ${entries.length} files\nStale: ${stale}\nLow confidence: ${low}\nHidden by ignore: ${ignored}`;
}
