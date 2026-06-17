/** Rule variant extraction and compact rendering helpers. */
import type { EngramConfig, MemoryEntry, RuleVariant } from '../runtime/types.js';

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

/** Return the preferred canonical rule text from a stored rule memory. */
export function canonicalRuleText(raw: string, preferred: RuleVariant = 'balanced'): string {
  const variants = extractRuleVariants(raw);
  const selected = variants[preferred] ?? variants.balanced ?? variants.light ?? variants.strict;
  if (selected?.trim()) return selected.trim();
  return extractContentSection(raw).trim();
}

/** Remove the stored rule-variant section while leaving the canonical memory intact. */
export function stripRuleVariantSection(raw: string): string {
  return raw.replace(/\n## Rule Variants\r?\n[\s\S]*?(?=\n## |\s*$)/, '').trimEnd() + '\n';
}

/** Render the full memory with the preferred canonical content and without stored variants. */
export function canonicalRuleMemory(raw: string, preferred: RuleVariant = 'balanced'): string {
  const variants = extractRuleVariants(raw);
  if (!variants.balanced && !variants.light && !variants.strict) return raw;
  const content = canonicalRuleText(raw, preferred);
  return content ? replaceContent(stripRuleVariantSection(raw), content) : stripRuleVariantSection(raw);
}

/** Return true when stored rule variants differ from Engram's deterministic defaults. */
export function ruleVariantsAreCustomized(raw: string): boolean {
  const variants = extractRuleVariants(raw);
  if (!variants.balanced && !variants.light && !variants.strict) return false;
  const defaults = defaultRuleVariants(contentSectionPlainText(raw));
  return (normalizeVariant(variants.light) || normalizeVariant(fallbackVariant(variants)))
    !== normalizeVariant(defaults.light)
    || (normalizeVariant(variants.balanced) || normalizeVariant(fallbackVariant(variants)))
      !== normalizeVariant(defaults.balanced)
    || (normalizeVariant(variants.strict) || normalizeVariant(fallbackVariant(variants)))
      !== normalizeVariant(defaults.strict);
}

/** Render a rule memory using one selected variant instead of all variants. */
export function renderMemoryForConfig(raw: string, entry: MemoryEntry, config: EngramConfig): string {
  if (entry.type !== 'rule') return raw;
  const variants = extractRuleVariants(raw);
  if (!variants.balanced && !variants.light && !variants.strict) return raw;
  const selected = config.rule_variants.enabled ? config.rule_variants.active : 'balanced';
  const content = canonicalRuleText(raw, selected);
  if (!content) return raw;
  return replaceContent(stripRuleVariantSection(raw), content);
}

/** Render one compact agent-facing rule variant and slim frontmatter metadata. */
export function renderMemoryForAgent(raw: string, entry: MemoryEntry, config: EngramConfig): string {
  const rendered = renderMemoryForConfig(raw, entry, config);
  const slim = slimFrontmatter(rendered);
  if (entry.type !== 'rule') return slim;
  const variants = extractRuleVariants(raw);
  const total = (variants.light ? 1 : 0) + (variants.balanced ? 1 : 0) + (variants.strict ? 1 : 0);
  return renameContentHeading(slim, config, total || 1);
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

function fallbackVariant(variants: Partial<Record<RuleVariant, string>>): string {
  return variants.balanced ?? variants.light ?? variants.strict ?? '';
}

function extractContentSection(raw: string): string {
  return raw.match(/\n## Content\r?\n([\s\S]*?)(?=\n## |\s*$)/)?.[1] ?? '';
}

function contentSectionPlainText(raw: string): string {
  const content = extractContentSection(raw).trim();
  if (!content) return '';
  const lines = content.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const bullets = lines
    .filter((line) => /^([-*]|\d+[.)])\s+/.test(line))
    .map((line) => line.replace(/^([-*]|\d+[.)])\s+/, '').trim());
  return (bullets.length ? bullets : [content]).join(' ').replace(/\s+/g, ' ').trim();
}

function normalizeVariant(text: string | undefined): string {
  return String(text ?? '').replace(/\s+/g, ' ').trim();
}

function replaceContent(raw: string, content: string): string {
  const replacement = `\n## Content\n${content.trim()}\n`;
  if (/\n## Content\r?\n/.test(raw)) {
    return raw.replace(/\n## Content\r?\n[\s\S]*?(?=\n## |\s*$)/, replacement);
  }
  return `${raw.trimEnd()}${replacement}`;
}

function slimFrontmatter(raw: string): string {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return raw;
  const keep = new Set(['id', 'type', 'tags', 'confidence', 'depends_on']);
  const lines = match[1].split(/\r?\n/).filter((line) => {
    const key = line.split(':')[0].trim();
    return keep.has(key);
  });
  return `---\n${lines.join('\n')}\n---\n${raw.slice(match[0].length)}`;
}

function renameContentHeading(raw: string, config: EngramConfig, total: number): string {
  const selected = config.rule_variants.enabled ? config.rule_variants.active : 'balanced';
  const label = headings[selected];
  return raw.replace(/\n## Content\r?\n/, `\n## Rule variants (1/${total} based on current: ${label})\n`);
}
