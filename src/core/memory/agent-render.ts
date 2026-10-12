/** Lean agent-facing memory rendering: one-line cards and header + Content bodies. */
import type { EngramConfig, MemoryEntry } from '../runtime/types.js';
import { parseFrontmatter } from './frontmatter.js';
import { extractContentSection, ruleVariantText } from './rule-variants.js';

// Sections that carry provenance or examples rather than guidance for the agent.
const DROPPED_SECTIONS = /^(Context|Example|Origin|Rule Variants)$/i;

/** One-line card: `- <id> [<type>] <directive-or-summary>`, marked when stale; working-tier memories say so. */
export function renderAgentCard(entry: MemoryEntry, stale = false): string {
  const text = (entry.directive || entry.summary).replace(/\s+/g, ' ').trim();
  return `- ${entry.id} [${entry.type}${entry.tier === 'working' ? ', working' : ''}] ${text}${stale ? ' (stale)' : ''}`;
}

/** Body block for agents: identity header, optional `requires:` line, then only the Content text. */
export function renderAgentBody(raw: string, entry: MemoryEntry, config: EngramConfig): string {
  const labels = [entry.type, entry.authority, workingLabel(entry)].filter(Boolean);
  const header = `### ${entry.id} [${labels.join(', ')}]`;
  const lines = [header];
  if (entry.dependsOn?.length) lines.push(`requires: ${entry.dependsOn.join(', ')}`);
  const text = bodyText(raw, entry, config);
  if (text) lines.push(text);
  return lines.join('\n');
}

/** D16: task-scoped memories are marked so agents do not treat them as durable project rules. */
function workingLabel(entry: MemoryEntry): string {
  if (entry.tier !== 'working') return '';
  return entry.validUntil ? `working until ${entry.validUntil}` : 'working';
}

function bodyText(raw: string, entry: MemoryEntry, config: EngramConfig): string {
  if (entry.type === 'rule') {
    const selected = config.rule_variants.enabled ? config.rule_variants.active : 'balanced';
    const rule = ruleVariantText(raw, selected);
    if (rule) return rule;
  } else {
    const content = extractContentSection(raw).trim();
    if (content) return content;
  }
  return fallbackBody(raw);
}

/** Parsed body minus the H1 and the Context/Example/Origin/Rule Variants sections. */
function fallbackBody(raw: string): string {
  const body = parseFrontmatter(raw).body.replace(/^\s*# [^\n]*\r?\n?/, '');
  const kept: string[] = [];
  let dropping = false;
  for (const line of body.split(/\r?\n/)) {
    const heading = line.match(/^## (.+?)\s*$/);
    if (heading) dropping = DROPPED_SECTIONS.test(heading[1]);
    if (!dropping) kept.push(line);
  }
  return kept.join('\n').trim();
}
