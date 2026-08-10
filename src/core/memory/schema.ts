/** Memory Markdown frontmatter parser and validator. */
import type { EvidenceStatus, MemoryAuthority, MemoryDoc, MemoryEntry, MemorySchemaVersion, MemoryType, Scope, Confidence, Lifecycle } from '../runtime/types.js';
import { meaningfulWordList, summarize, tagsFrom, today } from '../system/text.js';
import { canonicalRuleMemory } from './rule-variants.js';
import { frontmatterStringList, parseFrontmatter, renderFrontmatter } from './frontmatter.js';
import { normalizeAuthorProfile } from '../author/validate.js';

const memoryTypes = new Set(['rule', 'skill', 'knowledge']);
const scopes = new Set(['workspace', 'global']);
const confidences = new Set(['high', 'medium', 'low']);
const lifecycles = new Set<Lifecycle>(['active', 'review_due', 'superseded', 'archived']);
const memoryAuthorities = new Set<MemoryAuthority>(['instruction', 'reference']);
const evidenceStatuses = new Set<EvidenceStatus>(['verified', 'unverified']);
export const RULE_EFFECTIVE_LINE_TARGET = 70;
export const RULE_EFFECTIVE_LINE_HARD_LIMIT = 100;
export const RULE_LINE_MIN = 50;
export const RULE_LINE_MAX = 200;

export type MemoryLimits = { ruleLineTarget?: number; ruleLineHardLimit?: number };

export function resolveMemoryLimits(limits?: MemoryLimits): { ruleLineTarget: number; ruleLineHardLimit: number } {
  const target = limits?.ruleLineTarget ?? RULE_EFFECTIVE_LINE_TARGET;
  const hardLimit = limits?.ruleLineHardLimit ?? RULE_EFFECTIVE_LINE_HARD_LIMIT;
  return {
    ruleLineTarget: Math.max(RULE_LINE_MIN, Math.min(RULE_LINE_MAX, target)),
    ruleLineHardLimit: Math.max(RULE_LINE_MIN, Math.min(RULE_LINE_MAX, hardLimit))
  };
}

/** Parse a Markdown memory file with safe canonical YAML frontmatter. */
export function parseMemory(raw: string): MemoryDoc {
  const parsed = parseFrontmatter(raw);
  const title = parsed.body.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? String(parsed.data.id ?? 'Untitled');
  return { frontmatter: parsed.data, title, body: parsed.body, raw };
}


export function defaultMemoryAuthority(type: MemoryType): MemoryAuthority {
  return type === 'knowledge' ? 'reference' : 'instruction';
}

export function memorySchemaVersion(doc: MemoryDoc): MemorySchemaVersion {
  const explicit = Number(doc.frontmatter.schema_version);
  if (explicit === 3) return 3;
  if (doc.body.includes('## Context') || doc.body.includes('## Example')) return 1;
  return 2;
}

/** Convert a parsed memory to an index entry. */
export function entryFromMemory(raw: string, file: string, fallbackScope: Scope): MemoryEntry {
  const doc = parseMemory(raw);
  validateMemory(doc);
  const dependsOn = frontmatterStringList(doc.frontmatter.depends_on);
  const dependencyDepth = frontmatterDepth(doc.frontmatter.dependency_depth ?? doc.frontmatter.level ?? doc.frontmatter.depth);
  const summaryBody = doc.frontmatter.type === 'rule' ? parseMemory(canonicalRuleMemory(raw)).body : doc.body;
  const lifecycle = normalizeLifecycle(doc.frontmatter.lifecycle);
  const supersedes = frontmatterStringList(doc.frontmatter.supersedes);
  const authorName = typeof doc.frontmatter.author_name === 'string' ? doc.frontmatter.author_name.trim() : undefined;
  const explicitAuthorEmail = typeof doc.frontmatter.author_email === 'string' ? doc.frontmatter.author_email.trim() : undefined;
  const legacyAuthorEmail = typeof doc.frontmatter.author === 'string' ? doc.frontmatter.author.trim() : undefined;
  const authorEmail = explicitAuthorEmail || legacyAuthorEmail;
  return {
    id: String(doc.frontmatter.id),
    type: doc.frontmatter.type,
    scope: doc.frontmatter.scope ?? fallbackScope,
    tags: doc.frontmatter.tags ?? tagsFrom(doc.title),
    summary: summarize(summaryBody),
    routingTerms: [
      ...meaningfulWordList(summaryBody),
      ...(Array.isArray(doc.frontmatter.triggers) ? doc.frontmatter.triggers : []),
      ...(Array.isArray(doc.frontmatter.task_types) ? doc.frontmatter.task_types : [])
    ].slice(0, 256),
    file,
    author: authorEmail || 'unknown',
    ...(authorName ? { authorName } : {}),
    ...(authorEmail ? { authorEmail } : {}),
    ...(!explicitAuthorEmail && legacyAuthorEmail ? { legacyAuthorEmail } : {}),
    confidence: doc.frontmatter.confidence ?? 'medium',
    authority: doc.frontmatter.authority ?? defaultMemoryAuthority(doc.frontmatter.type),
    ...(typeof doc.frontmatter.evidence_status === 'string' ? { evidenceStatus: doc.frontmatter.evidence_status as EvidenceStatus } : {}),
    ignored: false,
    updated: String(doc.frontmatter.updated ?? doc.frontmatter.created ?? today()),
    ...(dependsOn.length ? { dependsOn } : {}),
    ...(dependencyDepth !== undefined ? { dependencyDepth } : {}),
    role: doc.frontmatter.role,
    ...(lifecycle ? { lifecycle } : {}),
    ...(typeof doc.frontmatter.review_after === 'string' && doc.frontmatter.review_after ? { reviewAfter: doc.frontmatter.review_after } : {}),
    ...(typeof doc.frontmatter.last_verified === 'string' && doc.frontmatter.last_verified ? { lastVerified: doc.frontmatter.last_verified } : {}),
    ...(frontmatterStringList(doc.frontmatter.evidence_refs).length ? { evidenceRefs: frontmatterStringList(doc.frontmatter.evidence_refs) } : {}),
    ...(frontmatterStringList(doc.frontmatter.derived_from).length ? { derivedFrom: frontmatterStringList(doc.frontmatter.derived_from) } : {}),
    ...(doc.frontmatter.revision !== undefined ? { revision: Number(doc.frontmatter.revision) } : {}),
    ...(supersedes.length ? { supersedes } : {}),
    ...(typeof doc.frontmatter.superseded_by === 'string' && doc.frontmatter.superseded_by ? { supersededBy: doc.frontmatter.superseded_by } : {}),
    ...(typeof doc.frontmatter.valid_from === 'string' && doc.frontmatter.valid_from ? { validFrom: doc.frontmatter.valid_from } : {}),
    ...(typeof doc.frontmatter.valid_until === 'string' && doc.frontmatter.valid_until ? { validUntil: doc.frontmatter.valid_until } : {}),
    ...(typeof doc.frontmatter.last_confirmed === 'string' && doc.frontmatter.last_confirmed ? { lastConfirmed: doc.frontmatter.last_confirmed } : {}),
    ...(typeof doc.frontmatter.archived_at === 'string' && doc.frontmatter.archived_at ? { archivedAt: doc.frontmatter.archived_at } : {})
  };
}

/** Validate required schema fields and memory size. */
export function validateMemory(doc: MemoryDoc, limits?: MemoryLimits): void {
  const fm = doc.frontmatter;
  requireText(fm.id, 'id');
  if (!memoryTypes.has(fm.type)) throw new Error('Invalid memory type');
  if (fm.scope && !scopes.has(fm.scope)) throw new Error('Invalid memory scope');
  if (fm.confidence && !confidences.has(fm.confidence)) throw new Error('Invalid confidence');
  const hasNewAuthor = fm.author_name !== undefined || fm.author_email !== undefined;
  if (hasNewAuthor) normalizeAuthorProfile({ name: fm.author_name, email: fm.author_email });
  else if (!fm.author) throw new Error('Missing author metadata');
  const version = memorySchemaVersion(doc);
  if (version === 3 && Number(fm.schema_version) !== 3) throw new Error('Invalid schema_version');
  if (version === 3 && fm.authority === undefined) throw new Error('vNext memory requires authority');
  const authority = fm.authority ?? defaultMemoryAuthority(fm.type);
  if (!memoryAuthorities.has(authority)) throw new Error('Invalid memory authority');
  if (fm.evidence_status !== undefined && !evidenceStatuses.has(fm.evidence_status)) throw new Error('Invalid evidence_status');
  if (fm.migration_date_source !== undefined && fm.migration_date_source !== 'file_mtime') throw new Error('Invalid migration_date_source');
  if (version === 3 && fm.revision === undefined) throw new Error('vNext memory requires revision');
  if (fm.revision !== undefined && (!Number.isInteger(Number(fm.revision)) || Number(fm.revision) < 1)) {
    throw new Error('revision must be a positive integer');
  }
  for (const field of ['valid_from', 'last_confirmed'] as const) {
    const value = fm[field];
    if (version === 3 && value === undefined) throw new Error(`vNext memory requires ${field}`);
    if (value !== undefined && value !== null && Number.isNaN(Date.parse(String(value)))) {
      throw new Error(`${field} must be a valid date`);
    }
  }
  if (fm.valid_until !== undefined && fm.valid_until !== null && Number.isNaN(Date.parse(String(fm.valid_until)))) {
    throw new Error('valid_until must be a valid date or null');
  }
  for (const ref of frontmatterStringList(fm.evidence_refs)) {
    if (!/^tr_[A-Za-z0-9_-]+$/.test(ref)) throw new Error(`Invalid evidence_ref: ${ref}`);
  }
  const hasLegacyContext = doc.body.includes('## Context');
  const hasContent = doc.body.includes('## Content');
  const hasLegacyExample = doc.body.includes('## Example');
    // v1: Context + Content + Example required; v2: Content required, Origin optional
  if (!hasContent) {
    throw new Error('Memory must include a Content section');
  }
  // Legacy memories still need Context and Example
  if (hasLegacyContext && !hasLegacyExample) {
    throw new Error('Legacy memory with Context section must also include Example section; or migrate to v2 template (Content + optional Origin)');
  }
  validateMarkdownStyle(doc.body);
  const { ruleLineHardLimit } = resolveMemoryLimits(limits);
  if (fm.type === 'rule' && effectiveMemoryLines(doc.raw) > ruleLineHardLimit) {
    throw new Error(`Rule memory exceeds ${ruleLineHardLimit}-line hard limit`);
  }
}

/** Parse and validate a raw memory document. */
export function validateMemoryRaw(raw: string, limits?: MemoryLimits): void {
  validateMemory(parseMemory(raw), limits);
}

/** Render frontmatter in the package-supported subset. */
export function frontmatter(data: Record<string, any>): string {
  return renderFrontmatter(data);
}

function frontmatterDepth(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const text = String(value).trim().toLowerCase();
  const named: Record<string, number> = {
    base: 0,
    basic: 0,
    core: 0,
    foundation: 0,
    foundational: 0,
    fundamental: 0,
    intermediate: 1,
    mid: 1,
    advanced: 2,
    deep: 2
  };
  if (text in named) return named[text];
  const parsed = Number(text);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : undefined;
}

function normalizeLifecycle(value: unknown): Lifecycle | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const text = String(value).trim().toLowerCase();
  return lifecycles.has(text as Lifecycle) ? text as Lifecycle : undefined;
}

function requireText(value: unknown, field: string): void {
  if (!value || typeof value !== 'string') throw new Error(`Missing ${field}`);
}

function validateMarkdownStyle(body: string): void {
  const lines = body.split(/\r?\n/);
  validateHeadingSpacing(lines);
  validateSectionOrder(body);
  validateMarkdownLinks(lines);
}

function validateHeadingSpacing(lines: string[]): void {
  for (let index = 0; index < lines.length; index += 1) {
    if (!/^#{1,6}\s+\S/.test(lines[index])) continue;
    const next = lines[index + 1];
    if (next !== undefined && next.trim() !== '') throw new Error('Markdown heading must be followed by a blank line');
  }
}

function validateSectionOrder(body: string): void {
  // Only enforce strict order for legacy v1 templates (Context + Content + Example)
  const hasLegacyContext = body.includes('## Context');
  const hasLegacyExample = body.includes('## Example');
  if (hasLegacyContext && hasLegacyExample) {
    const contextIdx = body.indexOf('## Context');
    const contentIdx = body.indexOf('## Content');
    const exampleIdx = body.indexOf('## Example');
    if (!(contextIdx < contentIdx && contentIdx < exampleIdx)) throw new Error('Memory sections must be ordered: Context, Content, Example');
  }
  // v2 templates: Content section must exist, Origin is optional, no strict order beyond that
}

function validateMarkdownLinks(lines: string[]): void {
  let fenced = false;
  for (const line of lines) {
    if (/^\s*```/.test(line)) {
      fenced = !fenced;
      continue;
    }
    if (fenced) continue;
    const withoutLinks = line.replace(/\[[^\]]+\]\((?:https?:\/\/|www\.)[^)]+\)/gi, '');
    if (/(^|[\s(])(?:https?:\/\/|www\.)[^\s<>)]+/i.test(withoutLinks)) {
      throw new Error('Links must use Markdown link syntax');
    }
  }
}

/** Count meaningful memory lines, excluding empty and frontmatter property lines. */
export function effectiveMemoryLines(raw: string): number {
  const match = raw.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/);
  const body = match ? raw.slice(match[0].length) : raw;
  return body.split(/\r?\n/).filter((line) => line.trim()).length;
}

export type { MemoryType, Scope, Confidence, Lifecycle };
