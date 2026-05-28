/** Deterministic memory drafting for manual saves. */
import type { MemoryType, Scope } from '../runtime/types.js';
import { frontmatter, parseMemory } from './schema.js';
import { defaultRuleVariants, extractRuleVariants } from './rule-variants.js';
import { slugify, tagsFrom, today } from '../system/text.js';

export type MemoryDraftOptions = { ruleVariants?: boolean };

/** Build a concise schema-compliant memory from user text. */
export function draftMemory(input: {
  text: string;
  type: MemoryType;
  scope: Scope;
  author: string;
  role?: string[];
}, options: MemoryDraftOptions = {}): { file: string; id: string; content: string; tags: string[] } {
  const title = titleFor(input.text, input.type);
  const id = slugify(title);
  const tags = tagsFrom(input.text);
  const content = renderMemory({ ...input, id, title, tags, created: today() }, options);
  return { file: `${dirFor(input.type)}/${id}.md`, id, content, tags };
}

/** Merge approved save text into an existing memory without changing its file. */
export function updateMemory(raw: string, input: {
  text: string;
  type: MemoryType;
  scope: Scope;
  author: string;
  role?: string[];
}, options: MemoryDraftOptions = {}): string {
  const doc = parseMemory(raw);
  const tags = unique([...(doc.frontmatter.tags ?? []), ...tagsFrom(input.text)]);
  const bullets = unique([...contentBullets(doc.body), ...plainBullets(input.text)]).slice(0, 8);
  const text = bullets.map((line) => line.replace(/^-\s*/, '')).join(' ');
  const variants = input.type === 'rule' && !options.ruleVariants ? extractRuleVariants(raw) : undefined;
  return renderMemory({
    ...input,
    id: String(doc.frontmatter.id),
    title: doc.title,
    tags,
    created: String(doc.frontmatter.created ?? today()),
    role: input.role?.length ? unique([...(doc.frontmatter.role ?? []), ...input.role]) : doc.frontmatter.role,
    bodyText: bullets.join('\n'),
    variantText: text,
    variants
  }, options);
}

function titleFor(text: string, type: MemoryType): string {
  const clean = text.replace(/\s+/g, ' ').trim().replace(/[.?!]+$/, '');
  if (clean.length <= 70) return clean[0]?.toUpperCase() + clean.slice(1);
  return `${type === 'rule' ? 'Rule' : type === 'skill' ? 'Skill' : 'Knowledge'}: ${clean.slice(0, 58)}`;
}

function renderMemory(input: {
  text: string; type: MemoryType; scope: Scope; author: string; id: string; title: string;
  tags: string[]; created: string; role?: string[]; bodyText?: string; variantText?: string; variants?: Partial<Record<'light' | 'balanced' | 'strict', string>>;
}, options: MemoryDraftOptions): string {
  const now = today();
  const metadata: Record<string, any> = {
    id: input.id, type: input.type, scope: input.scope, tags: input.tags,
    created: input.created, updated: now, author: input.author,
    source: 'manual', confidence: 'high'
  };
  if (input.role?.length) metadata.role = input.role;
  const meta = frontmatter(metadata);
  return `${meta}
# ${formatInlineMarkdown(input.title)}

## Context

Approved from a human/agent conversation on ${now}; content is written as objective durable memory.

## Content

${input.bodyText ?? bulletize(input.text)}
${variantSection(input, options)}
## Example

Use this memory when a future task touches: ${input.tags.slice(0, 3).join(', ') || 'this topic'}.
`;
}

function bulletize(text: string): string {
  return plainBullets(text).join('\n');
}

function plainBullets(text: string): string[] {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length > 1 && lines.some((line) => /^([-*]|\d+[.)])\s+/.test(line))) {
    return lines.map((line) => `- ${formatInlineMarkdown(line.replace(/^([-*]|\d+[.)])\s+/, '').trim())}`).slice(0, 8);
  }
  const parts = text.split(/(?<=[.!?])\s+/).filter(Boolean).slice(0, 5);
  return parts.map((part) => `- ${formatInlineMarkdown(part.replace(/^\W+/, '').trim())}`);
}

function contentBullets(body: string): string[] {
  const section = body.match(/\n## Content\r?\n([\s\S]*?)(?=\n## |\s*$)/)?.[1] ?? '';
  return section.split(/\r?\n/).map((line) => line.trim()).filter((line) => line.startsWith('- '));
}

function variantSection(input: {
  type: MemoryType; text: string; variantText?: string; variants?: Partial<Record<'light' | 'balanced' | 'strict', string>>;
}, options: MemoryDraftOptions): string {
  if (input.type !== 'rule') return '\n';
  const variants = options.ruleVariants ? defaultRuleVariants(input.variantText ?? input.text) : input.variants;
  if (!variants?.balanced && !variants?.light && !variants?.strict) return '\n';
  const fallback = variants.balanced ?? variants.light ?? variants.strict ?? '';
  return `
## Rule Variants

### Light

${variants.light ?? fallback}

### Balanced

${variants.balanced ?? fallback}

### Strict

${variants.strict ?? fallback}

`;
}

function dirFor(type: MemoryType): string {
  return type === 'rule' ? 'rules' : type === 'skill' ? 'skills' : 'knowledge';
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].slice(0, 8);
}

function formatInlineMarkdown(text: string): string {
  return text.replace(/(^|\s)((?:https?:\/\/|www\.)[^\s<>)]+)/gi, (_, prefix: string, rawUrl: string) => {
    const trailing = rawUrl.match(/[.,!?;:]+$/)?.[0] ?? '';
    const cleanUrl = trailing ? rawUrl.slice(0, -trailing.length) : rawUrl;
    const href = cleanUrl.startsWith('www.') ? `https://${cleanUrl}` : cleanUrl;
    const label = cleanUrl.replace(/^https?:\/\//i, '');
    return `${prefix}[${label}](${href})${trailing}`;
  });
}
