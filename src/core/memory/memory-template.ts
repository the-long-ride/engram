/** Deterministic memory drafting for manual saves. */
import type { Confidence, MemoryAuthority, MemoryTier, MemoryType, Scope } from '../runtime/types.js';
import { WORKING_DIR } from '../runtime/constants.js';
import { defaultMemoryAuthority, frontmatter, parseMemory } from './schema.js';
import { frontmatterStringList } from './frontmatter.js';
import { extractRuleVariants, plainContentText, ruleVariantsAreCustomized, variantsDifferFromDefaults } from './rule-variants.js';
import { slugify, tagsFrom, today } from '../system/text.js';
import type { TaskType } from './task-classifier.js';
import { sourceHashMode, type SourceHashMode } from './freshness.js';

/** `ruleVariants`: preserve customized stored variants on update (default variants are derived at render time and never stored, E17). */
export type MemoryDraftOptions = { ruleVariants?: boolean };
export type MemorySourceMeta = {
  source?: string;
  sourceFiles?: string[];
  sourceHashes?: string[];
  evidenceRefs?: string[];
  derivedFrom?: string[];
  evidenceScope?: Scope;
  /** D17: `digest` when code/config/manifest sources were hashed by digest text; omitted means raw hashes. */
  sourceHashMode?: SourceHashMode;
  /** D17 refresh: replace the memory's source lists instead of merging them (dropped or deleted sources go away). */
  replaceSources?: boolean;
  /** D17: workspace fingerprint (`workspaceOrigin`) of the sources; written as `source_origin` on global memories only, or the host store hash (`hostMemoryOrigin`) for `source: host-memory` in any scope. */
  sourceOrigin?: string;
};

/** Build a concise schema-compliant memory from user text. */
export function draftMemory(input: {
  text: string;
  type: MemoryType;
  scope: Scope;
  authorName: string;
  authorEmail?: string;
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
  directive?: string;
  appliesTo?: string[];
  /** D16 working tier: written under `working/` with `tier: working`, `objective`, and `valid_until`. */
  working?: WorkingTierMeta;
  /** E16 SUPERSEDE verdict: ids of the memories the new memory replaces (written as `supersedes:`). */
  supersedes?: string[];
}, options: MemoryDraftOptions = {}): { file: string; id: string; content: string; tags: string[] } {
  const title = titleFor(input.text, input.type);
  const id = slugify(title);
  const tags = unique([...taskTypeTags(input.taskType), ...tagsFrom(input.text)]);
  const working = input.working ? { tier: 'working' as const, objective: input.working.objective, validUntil: input.working.validUntil } : {};
  const content = renderMemory({ ...input, id, title, tags, created: today(), ...working }, options);
  return { file: `${input.working ? `${WORKING_DIR}/` : ''}${memoryDir(input.type)}/${id}.md`, id, content, tags };
}

/** D16 working-tier write metadata: TTL end date and the command's objective text (omitted when none). */
export type WorkingTierMeta = { validUntil: string; objective?: string };

/** Merge approved save text into an existing memory without changing its file. */
export function updateMemory(raw: string, input: {
  text: string;
  type: MemoryType;
  scope: Scope;
  authorName: string;
  authorEmail?: string;
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
  directive?: string;
  appliesTo?: string[];
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
    directive: input.directive?.trim() ? input.directive : typeof doc.frontmatter.directive === 'string' ? doc.frontmatter.directive : undefined,
    appliesTo: input.appliesTo?.length ? input.appliesTo : frontmatterStringList(doc.frontmatter.applies_to),
    // D16: an update keeps the memory's tier and objective; valid_until is preserved below.
    tier: typeof doc.frontmatter.tier === 'string' ? doc.frontmatter.tier as MemoryTier : undefined,
    objective: typeof doc.frontmatter.objective === 'string' && doc.frontmatter.objective.trim() ? doc.frontmatter.objective : undefined,
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
  text: string; type: MemoryType; scope: Scope; authorName: string; authorEmail?: string; id: string; title: string;
  tags: string[]; created: string; role?: string[]; context?: string; dependsOn?: string[]; parent?: string[]; level?: string; source?: MemorySourceMeta; bodyText?: string; variantText?: string; variants?: Partial<Record<'light' | 'balanced' | 'strict', string>>;
  triggers?: string[]; confidence?: Confidence; authority?: MemoryAuthority; revision?: number; validFrom?: string; validUntil?: string | null; lastConfirmed?: string;
  directive?: string; appliesTo?: string[]; tier?: MemoryTier; objective?: string; supersedes?: string[];
}, options: MemoryDraftOptions): string {
  const now = today();
  const metadata: Record<string, any> = {
    schema_version: 3,
    id: input.id, type: input.type, scope: input.scope, tags: input.tags,
    created: input.created, updated: now,
    author_name: input.authorName,
    ...(input.authorEmail ? { author_email: input.authorEmail } : {}),
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
  if (input.supersedes?.length) metadata.supersedes = uniqueAll(input.supersedes);
  if (input.level?.trim()) metadata.level = input.level.trim();
  if (input.source?.sourceFiles?.length) metadata.source_files = unique(input.source.sourceFiles);
  if (input.source?.sourceHashes?.length) metadata.source_hashes = uniqueAll(input.source.sourceHashes);
  if (input.source?.sourceHashes?.length && input.source.sourceHashMode) metadata.source_hash_mode = input.source.sourceHashMode;
  // A host-memory origin is a hash of the store path, so it is recorded for any scope (freshness checks only that machine).
  if ((input.scope === 'global' || input.source?.source === 'host-memory') && input.source?.sourceFiles?.length && input.source.sourceOrigin) metadata.source_origin = input.source.sourceOrigin;
  if (input.source?.evidenceRefs?.length) metadata.evidence_refs = uniqueAll(input.source.evidenceRefs);
  if (input.source?.derivedFrom?.length) metadata.derived_from = uniqueAll(input.source.derivedFrom);
  if (input.triggers?.length) metadata.triggers = unique(input.triggers);
  // D4 distilled fields; `tier`/`objective` come only from the working-tier path or an existing memory.
  if (input.directive?.trim()) metadata.directive = input.directive.trim();
  if (input.appliesTo?.length) metadata.applies_to = uniqueAll(input.appliesTo);
  if (input.tier) metadata.tier = input.tier;
  if (input.objective?.trim()) metadata.objective = input.objective.trim();
  const meta = frontmatter(metadata);
  const originSection = input.context?.trim()
    ? `\n## Origin\n\n${formatInlineMarkdown(input.context.slice(0, 600))}\n`
    : '';
  return `${meta}
# ${formatInlineMarkdown(input.title)}

## Content

${input.bodyText ?? bulletize(input.text)}
${variantSection(input)}${originSection}`;
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

/** E17: the `## Rule Variants` section is written only for custom wording; light and strict are otherwise derived from Content at render time. */
function variantSection(input: {
  type: MemoryType; text: string; bodyText?: string; variants?: Partial<Record<'light' | 'balanced' | 'strict', string>>;
}): string {
  if (input.type !== 'rule' || !input.variants) return '\n';
  const variants = input.variants;
  const content = input.bodyText ?? bulletize(input.text);
  if (!variantsDifferFromDefaults(variants, plainContentText(content))) return '\n';
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

/** Durable type directory for a memory type (`rules`, `skills`, `knowledge`). */
export function memoryDir(type: MemoryType): string {
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
    derivedFrom: frontmatterStringList(frontmatter.derived_from),
    sourceHashMode: sourceHashMode(frontmatter.source_hash_mode),
    ...(typeof frontmatter.source_origin === 'string' ? { sourceOrigin: frontmatter.source_origin } : {})
  };
  if (!source) {
    return existing.sourceFiles?.length || existing.sourceHashes?.length || existing.evidenceRefs?.length || existing.derivedFrom?.length
      ? existing
      : undefined;
  }
  const replace = source.replaceSources === true;
  // Digest-mode checks also accept raw hashes, so a merge that saw any digest hash stays `digest`.
  const mode = replace ? source.sourceHashMode : existing.sourceHashMode === 'digest' || source.sourceHashMode === 'digest' ? 'digest' : existing.sourceHashMode ?? source.sourceHashMode;
  const origin = mergedOrigin(existing, source, replace);
  return {
    source: source.source ?? existing.source,
    sourceFiles: uniqueAll([...(replace ? [] : existing.sourceFiles ?? []), ...(source.sourceFiles ?? [])]),
    sourceHashes: uniqueAll([...(replace ? [] : existing.sourceHashes ?? []), ...(source.sourceHashes ?? [])]),
    ...(mode ? { sourceHashMode: mode } : {}),
    ...(origin ? { sourceOrigin: origin } : {}),
    evidenceRefs: uniqueAll([...(existing.evidenceRefs ?? []), ...(source.evidenceRefs ?? [])]),
    derivedFrom: uniqueAll([...(existing.derivedFrom ?? []), ...(source.derivedFrom ?? [])]),
    evidenceScope: source.evidenceScope
  };
}

/** Sources merged from two workspaces (or onto older sources without an origin) have no single origin, so none is kept. */
function mergedOrigin(existing: MemorySourceMeta, source: MemorySourceMeta, replace: boolean): string | undefined {
  if (replace || !existing.sourceFiles?.length) return source.sourceOrigin;
  if (!source.sourceFiles?.length) return existing.sourceOrigin;
  return existing.sourceOrigin === source.sourceOrigin ? existing.sourceOrigin : undefined;
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


