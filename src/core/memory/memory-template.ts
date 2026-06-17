/** Deterministic memory drafting for manual saves. */
import type { MemoryType, Scope } from '../runtime/types.js';
import { frontmatter, parseMemory } from './schema.js';
import { defaultRuleVariants, extractRuleVariants, ruleVariantsAreCustomized } from './rule-variants.js';
import { slugify, tagsFrom, today } from '../system/text.js';
import type { TaskType } from './task-classifier.js';

export type MemoryDraftOptions = { ruleVariants?: boolean };
export type MemorySourceMeta = { source?: string; sourceFiles?: string[]; sourceHashes?: string[] };

/** Build a concise schema-compliant memory from user text. */
export function draftMemory(input: {
  text: string;
  type: MemoryType;
  scope: Scope;
  author: string;
  role?: string[];
  context?: string;
  dependsOn?: string[];
  level?: string;
  source?: MemorySourceMeta;
  taskType?: TaskType;
}, options: MemoryDraftOptions = {}): { file: string; id: string; content: string; tags: string[] } {
  const title = titleFor(input.text, input.type);
  const id = slugify(title);
  const tags = unique([...taskTypeTags(input.taskType), ...tagsFrom(input.text)]);
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
  context?: string;
  dependsOn?: string[];
  level?: string;
  source?: MemorySourceMeta;
  taskType?: TaskType;
}, options: MemoryDraftOptions = {}): string {
  const doc = parseMemory(raw);
  const tags = unique([...(doc.frontmatter.tags ?? []), ...taskTypeTags(input.taskType), ...tagsFrom(input.text)]);
  const bullets = unique([...contentBullets(doc.body), ...plainBullets(input.text)]).slice(0, 8);
  const text = bullets.map((line) => line.replace(/^-\s*/, '')).join(' ');
  const variants = preservedRuleVariants(raw, input.type, options);
  const context = input.context?.trim() ? input.context : contextSection(doc.body);
  return renderMemory({
    ...input,
    id: String(doc.frontmatter.id),
    title: doc.title,
    tags,
    created: String(doc.frontmatter.created ?? today()),
    role: input.role?.length ? unique([...(doc.frontmatter.role ?? []), ...input.role]) : doc.frontmatter.role,
    context,
    dependsOn: unique([...arrayFrontmatter(doc.frontmatter.depends_on), ...(input.dependsOn ?? [])]),
    level: input.level ?? String(doc.frontmatter.level ?? doc.frontmatter.dependency_depth ?? doc.frontmatter.depth ?? ''),
    source: mergeSourceMeta(doc.frontmatter, input.source),
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
  tags: string[]; created: string; role?: string[]; context?: string; dependsOn?: string[]; level?: string; source?: MemorySourceMeta; bodyText?: string; variantText?: string; variants?: Partial<Record<'light' | 'balanced' | 'strict', string>>;
}, options: MemoryDraftOptions): string {
  const now = today();
  const metadata: Record<string, any> = {
    id: input.id, type: input.type, scope: input.scope, tags: input.tags,
    created: input.created, updated: now, author: input.author,
    source: input.source?.source ?? 'manual', confidence: 'high'
  };
  if (input.role?.length) metadata.role = input.role;
  if (input.dependsOn?.length) metadata.depends_on = unique(input.dependsOn);
  if (input.level?.trim()) metadata.level = input.level.trim();
  if (input.source?.sourceFiles?.length) metadata.source_files = unique(input.source.sourceFiles);
  if (input.source?.sourceHashes?.length) metadata.source_hashes = unique(input.source.sourceHashes);
  const meta = frontmatter(metadata);
  return `${meta}
# ${formatInlineMarkdown(input.title)}

## Context

${memoryContext(input.context, now)}

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

function contextSection(body: string): string {
  return body.match(/\n## Context\r?\n([\s\S]*?)(?=\n## |\s*$)/)?.[1]?.trim() ?? '';
}

function memoryContext(context: string | undefined, fallbackDate: string): string {
  const clean = context?.replace(/\s+/g, ' ').trim();
  if (!clean) return `Approved from a human/agent conversation on ${fallbackDate}; content is written as objective durable memory.`;
  return formatInlineMarkdown(clean.slice(0, 600));
}

function variantSection(input: {
  type: MemoryType; text: string; variantText?: string; variants?: Partial<Record<'light' | 'balanced' | 'strict', string>>;
}, options: MemoryDraftOptions): string {
  if (input.type !== 'rule') return '\n';
  const variants = input.variants ?? (options.ruleVariants ? defaultRuleVariants(input.variantText ?? input.text) : undefined);
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
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].slice(0, 6);
}

function taskTypeTags(taskType?: TaskType): string[] {
  return taskType ? [`task_type:${taskType}`] : [];
}

function preservedRuleVariants(raw: string, type: MemoryType, options: MemoryDraftOptions): Partial<Record<'light' | 'balanced' | 'strict', string>> | undefined {
  if (type !== 'rule') return undefined;
  const variants = extractRuleVariants(raw);
  if (!variants.balanced && !variants.light && !variants.strict) return undefined;
  if (!options.ruleVariants) return variants;
  return ruleVariantsAreCustomized(raw) ? variants : undefined;
}

function mergeSourceMeta(frontmatter: Record<string, any>, source?: MemorySourceMeta): MemorySourceMeta | undefined {
  if (!source) {
    const existingFiles = arrayFrontmatter(frontmatter.source_files);
    const existingHashes = arrayFrontmatter(frontmatter.source_hashes);
    return existingFiles.length || existingHashes.length ? { source: String(frontmatter.source ?? 'manual'), sourceFiles: existingFiles, sourceHashes: existingHashes } : undefined;
  }
  return {
    source: source.source ?? String(frontmatter.source ?? 'manual'),
    sourceFiles: unique([...arrayFrontmatter(frontmatter.source_files), ...(source.sourceFiles ?? [])]),
    sourceHashes: unique([...arrayFrontmatter(frontmatter.source_hashes), ...(source.sourceHashes ?? [])])
  };
}

function arrayFrontmatter(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string' && Boolean(item.trim()));
  return typeof value === 'string' && value.trim() ? [value] : [];
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
