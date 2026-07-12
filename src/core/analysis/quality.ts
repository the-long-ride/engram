/** Deterministic memory quality and health scoring. */
import type { MemoryEntry } from '../runtime/types.js';
import { effectiveMemoryLines, parseMemory, resolveMemoryLimits, type MemoryLimits } from '../memory/schema.js';
import { style } from '../cli/format.js';

/** Score one memory on specificity, completeness, and freshness. */
export function scoreMemory(raw: string, limits?: MemoryLimits): { score: number; issues: string[] } {
  const doc = parseMemory(raw);
  const issues: string[] = [];
  let score = 100;
  if (!doc.body.includes('## Example')) { score -= 25; issues.push('missing example'); }
  if (!doc.body.includes('## Context')) { score -= 20; issues.push('missing context'); }
  if (/usually|typically|maybe|might/i.test(doc.body)) { score -= 15; issues.push('vague wording'); }
  const { ruleLineTarget } = resolveMemoryLimits(limits);
  if (doc.frontmatter.type === 'rule' && effectiveMemoryLines(doc.raw) > ruleLineTarget) {
    score -= 10; issues.push(`rule exceeds ${ruleLineTarget}-line target`);
  }
  const updated = Date.parse(String(doc.frontmatter.updated ?? ''));
  if (updated && Date.now() - updated > 180 * 864e5) { score -= 20; issues.push('stale'); }
  return { score: Math.max(0, score), issues };
}

/** Structured health summary for JSON output. */
export type HealthData = {
  score: number;
  coverage: number;
  stale: number;
  low_confidence: number;
  hidden_by_ignore: number;
};

/** Return structured health summary without styling.
 *  `entries` are visible (non-ignored) entries; `ignoredCount` comes from the
 *  full index so hidden memory is reported even after visibility filtering. */
export function healthData(entries: MemoryEntry[], ignoredCount = 0): HealthData {
  const stale = entries.filter((e) => Date.now() - Date.parse(e.updated) > 180 * 864e5).length;
  const low = entries.filter((e) => e.confidence === 'low').length;
  const score = Math.max(0, 100 - stale * 5 - low * 8);
  return { score, coverage: entries.length, stale, low_confidence: low, hidden_by_ignore: ignoredCount };
}

/** Summarize index health. */
export function health(entries: MemoryEntry[], ignoredCount = 0): string {
  const data = healthData(entries, ignoredCount);
  return [
    style.heading('Memory health'),
    `${style.label('Score:')} ${style.number(`${data.score}/100`)}`,
    `${style.label('Coverage:')} ${style.number(String(data.coverage))} files`,
    `${style.label('Stale:')} ${style.number(String(data.stale))}`,
    `${style.label('Low confidence:')} ${style.number(String(data.low_confidence))}`,
    `${style.label('Hidden by ignore:')} ${style.number(String(data.hidden_by_ignore))}`
  ].join('\n');
}
