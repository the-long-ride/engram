/** Deterministic memory drafting for manual saves. */
import type { Confidence, MemoryAuthority, MemoryType, Scope } from '../runtime/types.js';
import { defaultMemoryAuthority, frontmatter, parseMemory } from './schema.js';
import { frontmatterStringList } from './frontmatter.js';
import { defaultRuleVariants, extractRuleVariants, ruleVariantsAreCustomized } from './rule-variants.js';
import { slugify, tagsFrom, today } from '../system/text.js';
import type { TaskType } from './task-classifier.js';

export type MemoryDraftOptions = { ruleVariants?: boolean };
export type MemorySourceMeta = {
  source?: string;
  sourceFiles?: string[];
  sourceHashes?: string[];
  evidenceRefs?: string[];
  derivedFrom?: string[];
  evidenceScope?: Scope;
};

/** Build a concise schema-compliant memory from user text. */
export function draftMemory(input: {
  text: string;
  type: MemoryType;
  scope: Scope;
  authorName: string;
  authorEmail: string;
  role?: string[];
  context?: string;
  dependsOn?: string[];
  level?: string;
  parent?: string[];
  source?: MemorySourceMeta;
  taskType?: TaskType;
  triggers?: string[];
  variants?: Partial<Record<'light' | 'balanced' | 'strict', string>>;
  confidence?: Confidence;
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
  authorName: string;
  authorEmail: string;
  role?: string[];
  context?: string;
  dependsOn?: string[];
  level?: string;
  parent?: string[];
  source?: MemorySourceMeta;
  taskType?: TaskType;
  triggers?: string[];
  variants?: Partial<Record<'light' | 'balanced' | 'strict', string>>;
  confidence?: Confidence;
}, options: MemoryDraftOptions = {}): string {
  const doc = parseMemory(raw);
  const tags = unique([...(doc.frontmatter.tags ?? []), ...taskTypeTags(input.taskType), ...tagsFrom(input.text)]);
  const bullets = unique([...contentBullets(doc.body), ...plainBullets(input.text)]).slice(0, 8);
  const text = bullets.map((line) => line.replace(/^-\s*/, '')).join(' ');
  const incomingVariants = input.variants && Object.keys(input.variants).length ? input.variants : undefined;
  const variants = incomingVariants ?? preservedRuleVariants(raw, input.type, options);
  const context = input.context?.trim() ? input.context : contextSection(doc.body);
  return renderMemory({
    ...input,
    id: String(doc.frontmatter.id),
    title: doc.title,
    tags,
    created: String(doc.frontmatter.created ?? today()),
    role: input.role?.length ? unique([...(doc.frontmatter.role ?? []), ...input.role]) : doc.frontmatter.role,
    context,
    dependsOn: unique([...frontmatterStringList(doc.frontmatter.depends_on), ...(input.dependsOn ?? [])]),
    parent: unique([...frontmatterStringList(doc.frontmatter.parent), ...(input.parent ?? [])]),
    level: input.level ?? String(doc.frontmatter.level ?? doc.frontmatter.dependency_depth ?? doc.frontmatter.depth ?? ''),
    source: mergeSourceMeta(doc.frontmatter, input.source),
    bodyText: bullets.join('\n'),
    variantText: text,
    variants,
    confidence: input.confidence ?? doc.frontmatter.confidence as Confidence | undefined,
    authority: (doc.frontmatter.authority ?? defaultMemoryAuthority(input.type)) as MemoryAuthority,
    revision: nextRevision(doc.frontmatter.revision),
    validFrom: String(doc.frontmatter.valid_from ?? doc.frontmatter.created ?? today()),
    validUntil: doc.frontmatter.valid_until === null ? null : doc.frontmatter.valid_until === undefined ? undefined : String(doc.frontmatter.valid_until),
    lastConfirmed: today()
  }, options);
}

function titleFor(text: string, type: MemoryType): string {
  const clean = text.replace(/\s+/g, ' ').trim().replace(/[.?!]+$/, '');
  if (clean.length <= 70) return clean[0]?.toUpperCase() + clean.slice(1);
  return `${type === 'rule' ? 'Rule' : type === 'skill' ? 'Skill' : 'Knowledge'}: ${clean.slice(0, 58)}`;
}

function renderMemory(input: {
  text: string; type: MemoryType; scope: Scope; authorName: string; authorEmail: string; id: string; title: string;
  tags: string[]; created: string; role?: string[]; context?: string; dependsOn?: string[]; parent?: string[]; level?: string; source?: MemorySourceMeta; bodyText?: string; variantText?: string; variants?: Partial<Record<'light' | 'balanced' | 'strict', string>>;
  triggers?: string[]; confidence?: Confidence; authority?: MemoryAuthority; revision?: number; validFrom?: string; validUntil?: string | null; lastConfirmed?: string;
}, options: MemoryDraftOptions): string {
  const now = today();
  const metadata: Record<string, any> = {
    schema_version: 3,
    id: input.id, type: input.type, scope: input.scope, tags: input.tags,
    created: input.created, updated: now,
    author_name: input.authorName, author_email: input.authorEmail,
    source: input.source?.source ?? 'manual', confidence: input.confidence ?? 'high',
    authority: input.authority ?? defaultMemoryAuthority(input.type),
    revision: input.revision ?? 1,
    valid_from: input.validFrom ?? now,
    last_confirmed: input.lastConfirmed ?? now
  };
  if (input.validUntil !== undefined) metadata.valid_until = input.validUntil;
  if (input.role?.length) metadata.role = input.role;
  if (input.dependsOn?.length) metadata.depends_on = unique(input.dependsOn);
  if (input.parent?.length) metadata.parent = unique(input.parent);
  if (input.level?.trim()) metadata.level = input.level.trim();
  if (input.source?.sourceFiles?.length) metadata.source_files = unique(input.source.sourceFiles);
  if (input.source?.sourceHashes?.length) metadata.source_hashes = uniqueAll(input.source.sourceHashes);
  if (input.source?.evidenceRefs?.length) metadata.evidence_refs = uniqueAll(input.source.evidenceRefs);
  if (input.source?.derivedFrom?.length) metadata.derived_from = uniqueAll(input.source.derivedFrom);
  if (input.triggers?.length) metadata.triggers = unique(input.triggers);
  const meta = frontmatter(metadata);
  const originSection = input.context?.trim()
    ? `\n## Origin\n\n${formatInlineMarkdown(input.context.slice(0, 600))}\n`
    : '';
  return `${meta}
# ${formatInlineMarkdown(input.title)}

## Content

${input.bodyText ?? bulletize(input.text)}
${variantSection(input, options)}${originSection}`;
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
  const existing: MemorySourceMeta = {
    source: String(frontmatter.source ?? 'manual'),
    sourceFiles: frontmatterStringList(frontmatter.source_files),
    sourceHashes: frontmatterStringList(frontmatter.source_hashes),
    evidenceRefs: frontmatterStringList(frontmatter.evidence_refs),
    derivedFrom: frontmatterStringList(frontmatter.derived_from)
  };
  if (!source) {
    return existing.sourceFiles?.length || existing.sourceHashes?.length || existing.evidenceRefs?.length || existing.derivedFrom?.length
      ? existing
      : undefined;
  }
  return {
    source: source.source ?? existing.source,
    sourceFiles: uniqueAll([...(existing.sourceFiles ?? []), ...(source.sourceFiles ?? [])]),
    sourceHashes: uniqueAll([...(existing.sourceHashes ?? []), ...(source.sourceHashes ?? [])]),
    evidenceRefs: uniqueAll([...(existing.evidenceRefs ?? []), ...(source.evidenceRefs ?? [])]),
    derivedFrom: uniqueAll([...(existing.derivedFrom ?? []), ...(source.derivedFrom ?? [])]),
    evidenceScope: source.evidenceScope
  };
}

function nextRevision(value: unknown): number {
  const revision = Number(value ?? 1);
  return Number.isInteger(revision) && revision >= 1 ? revision + 1 : 2;
}

function uniqueAll(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
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


