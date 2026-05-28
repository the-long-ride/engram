/** Rule variant extraction and compact rendering helpers. */
import type { EngramConfig, MemoryEntry, RuleVariant } from './types.js';

const headings: Record<RuleVariant, string> = {
  light: 'Light',
  balanced: 'Balanced',
  strict: 'Strict'
};

/** Return all explicit rule variants found in a memory file. */
export function extractRuleVariants(raw: string): Partial<Record<RuleVariant, string>> {
  const section = raw.match(/\n## Rule Variants\r?\n([\s\S]*?)(?=\n## |\s*$)/)?.[1] ?? '';
  const variants: Partial<Record<RuleVariant, string>> = {};
  for (const variant of Object.keys(headings) as RuleVariant[]) {
    const heading = headings[variant];
    const match = section.match(new RegExp(`(?:^|\\n)### ${heading}\\r?\\n([\\s\\S]*?)(?=\\n### |\\s*$)`));
    if (match?.[1]?.trim()) variants[variant] = match[1].trim();
  }
  return variants;
}

/** Render a rule memory using one selected variant instead of all variants. */
export function renderMemoryForConfig(raw: string, entry: MemoryEntry, config: EngramConfig): string {
  if (entry.type !== 'rule') return raw;
  const variants = extractRuleVariants(raw);
  if (!variants.balanced && !variants.light && !variants.strict) return raw;
  const selected = config.rule_variants.enabled ? config.rule_variants.active : 'balanced';
  const content = variants[selected] ?? variants.balanced ?? variants.light ?? variants.strict;
  if (!content) return raw;
  return replaceContent(stripVariantSection(raw), content);
}

/** Build deterministic variants when an agent has not supplied richer wording. */
export function defaultRuleVariants(text: string): Record<RuleVariant, string> {
  const sentence = text.replace(/\s+/g, ' ').trim().replace(/[.?!]+$/, '.');
  return {
    light: `- Consider this rule when the task context matches: ${sentence}`,
    balanced: `- ${sentence}`,
    strict: `- Treat this rule as mandatory unless the human explicitly overrides it: ${sentence}`
  };
}

function stripVariantSection(raw: string): string {
  return raw.replace(/\n## Rule Variants\r?\n[\s\S]*?(?=\n## |\s*$)/, '').trimEnd() + '\n';
}

function replaceContent(raw: string, content: string): string {
  const replacement = `\n## Content\n${content.trim()}\n`;
  if (/\n## Content\r?\n/.test(raw)) {
    return raw.replace(/\n## Content\r?\n[\s\S]*?(?=\n## |\s*$)/, replacement);
  }
  return `${raw.trimEnd()}${replacement}`;
}
