/** Rule variant extraction and compact rendering helpers. */
import type { EngramConfig, MemoryEntry, RuleVariant } from '../runtime/types.js';
import { renderAgentBody } from './agent-render.js';

const headings: Record<RuleVariant, string> = {
  light: 'Light',
  balanced: 'Balanced',
  strict: 'Strict'
};
const VARIANT_ORDER: RuleVariant[] = ['light', 'balanced', 'strict'];

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

/** E17: a stored variant when the file has one, else derived from `## Content` (balanced = Content verbatim). */
export function ruleVariantText(raw: string, selected: RuleVariant = 'balanced'): string {
  if (hasStoredVariants(extractRuleVariants(raw))) return canonicalRuleText(raw, selected);
  const content = extractContentSection(raw).trim();
  if (!content || selected === 'balanced') return content;
  return defaultRuleVariants(contentSectionPlainText(raw))[selected];
}

/** All three variants for previews (`--show-rule-variants`). */
export function ruleVariantsFor(raw: string): Record<RuleVariant, string> {
  return { light: ruleVariantText(raw, 'light'), balanced: ruleVariantText(raw, 'balanced'), strict: ruleVariantText(raw, 'strict') };
}

/** Remove the stored rule-variant section while leaving the canonical memory intact. */
export function stripRuleVariantSection(raw: string): string {
  return raw.replace(/\n## Rule Variants\r?\n[\s\S]*?(?=\n## |\s*$)/, '').trimEnd() + '\n';
}

/** Render the full memory with the preferred canonical content and without stored variants. */
export function canonicalRuleMemory(raw: string, preferred: RuleVariant = 'balanced'): string {
  const variants = extractRuleVariants(raw);
  if (!hasStoredVariants(variants)) return raw;
  const content = canonicalRuleText(raw, preferred);
  return content ? replaceContent(stripRuleVariantSection(raw), content) : stripRuleVariantSection(raw);
}

/** Return true when stored rule variants differ from Engram's deterministic defaults. */
export function ruleVariantsAreCustomized(raw: string): boolean {
  return variantsDifferFromDefaults(extractRuleVariants(raw), contentSectionPlainText(raw));
}

/** True when supplied variants differ from the defaults derived from `contentText`. Missing variants fall back to the first supplied one. */
export function variantsDifferFromDefaults(variants: Partial<Record<RuleVariant, string>>, contentText: string): boolean {
  if (!hasStoredVariants(variants)) return false;
  const defaults = defaultRuleVariants(contentText);
  const fallback = normalizeVariant(fallbackVariant(variants));
  return VARIANT_ORDER.some((variant) => (normalizeVariant(variants[variant]) || fallback) !== normalizeVariant(defaults[variant]));
}

/** Render a rule memory using one selected variant instead of all variants. */
export function renderMemoryForConfig(raw: string, entry: MemoryEntry, config: EngramConfig): string {
  if (entry.type !== 'rule') return raw;
  const stored = hasStoredVariants(extractRuleVariants(raw));
  const selected = config.rule_variants.enabled ? config.rule_variants.active : 'balanced';
  // A section-less file already holds the balanced text (Content): leave it byte-for-byte.
  if (!stored && selected === 'balanced') return raw;
  const content = ruleVariantText(raw, selected);
  if (!content) return raw;
  return replaceContent(stored ? stripRuleVariantSection(raw) : raw, content);
}

/** Render the lean agent-facing body (identity header + Content, no frontmatter or provenance). */
export function renderMemoryForAgent(raw: string, entry: MemoryEntry, config: EngramConfig): string {
  return renderAgentBody(raw, entry, config);
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

function hasStoredVariants(variants: Partial<Record<RuleVariant, string>>): boolean {
  return Boolean(variants.balanced || variants.light || variants.strict);
}

function fallbackVariant(variants: Partial<Record<RuleVariant, string>>): string {
  return variants.balanced ?? variants.light ?? variants.strict ?? '';
}

export function extractContentSection(raw: string): string {
  return raw.match(/\n## Content\r?\n([\s\S]*?)(?=\n## |\s*$)/)?.[1] ?? '';
}

/** Content bullets (or the whole text when it has none) joined into one plain sentence; the input of the derived defaults. */
export function plainContentText(content: string): string {
  const trimmed = content.trim();
  if (!trimmed) return '';
  const lines = trimmed.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const bullets = lines
    .filter((line) => /^([-*]|\d+[.)])\s+/.test(line))
    .map((line) => line.replace(/^([-*]|\d+[.)])\s+/, '').trim());
  return (bullets.length ? bullets : [trimmed]).join(' ').replace(/\s+/g, ' ').trim();
}

function contentSectionPlainText(raw: string): string {
  return plainContentText(extractContentSection(raw));
}

/** Whitespace-collapsed text without a leading list marker: agents supply variant wording with or without the `- `. */
function normalizeVariant(text: string | undefined): string {
  return String(text ?? '').replace(/\s+/g, ' ').trim().replace(/^([-*]|\d+[.)])\s+/, '');
}

function replaceContent(raw: string, content: string): string {
  const replacement = `\n## Content\n${content.trim()}\n`;
  if (/\n## Content\r?\n/.test(raw)) {
    return raw.replace(/\n## Content\r?\n[\s\S]*?(?=\n## |\s*$)/, replacement);
  }
  return `${raw.trimEnd()}${replacement}`;
}
