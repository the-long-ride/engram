/** Deterministic memory quality and health scoring. */
import type { MemoryEntry } from '../runtime/types.js';
import { effectiveMemoryLines, parseMemory, RULE_EFFECTIVE_LINE_TARGET } from '../memory/schema.js';
import { style } from '../cli/format.js';

/** Score one memory on specificity, completeness, and freshness. */
export function scoreMemory(raw: string): { score: number; issues: string[] } {
  const doc = parseMemory(raw);
  const issues: string[] = [];
  let score = 100;
  if (!doc.body.includes('## Example')) { score -= 25; issues.push('missing example'); }
  if (!doc.body.includes('## Context')) { score -= 20; issues.push('missing context'); }
  if (/usually|typically|maybe|might/i.test(doc.body)) { score -= 15; issues.push('vague wording'); }
  if (doc.frontmatter.type === 'rule' && effectiveMemoryLines(doc.raw) > RULE_EFFECTIVE_LINE_TARGET) {
    score -= 10; issues.push(`rule exceeds ${RULE_EFFECTIVE_LINE_TARGET}-line target`);
  }
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
  return [
    style.heading('Memory health'),
    `${style.label('Score:')} ${style.number(`${score}/100`)}`,
    `${style.label('Coverage:')} ${style.number(String(entries.length))} files`,
    `${style.label('Stale:')} ${style.number(String(stale))}`,
    `${style.label('Low confidence:')} ${style.number(String(low))}`,
    `${style.label('Hidden by ignore:')} ${style.number(String(ignored))}`
  ].join('\n');
}
