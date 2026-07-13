/** Memory Markdown frontmatter parser and validator. */
import type { MemoryDoc, MemoryEntry, MemoryType, Scope, Confidence, Lifecycle } from '../runtime/types.js';
import { meaningfulWordList, summarize, tagsFrom, today } from '../system/text.js';
import { canonicalRuleMemory } from './rule-variants.js';

const memoryTypes = new Set(['rule', 'skill', 'knowledge']);
const scopes = new Set(['workspace', 'global']);
const confidences = new Set(['high', 'medium', 'low']);
const lifecycles = new Set<Lifecycle>(['active', 'review_due', 'superseded', 'archived']);
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

/** Parse a Markdown memory file with simple YAML-like frontmatter. */
export function parseMemory(raw: string): MemoryDoc {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  const frontmatter: Record<string, any> = {};
  if (match) {
    for (const line of match[1].split(/\r?\n/)) {
      const i = line.indexOf(':');
      if (i < 0) continue;
      const key = line.slice(0, i).trim();
      frontmatter[key] = parseValue(line.slice(i + 1).trim());
    }
  }
  const body = match ? raw.slice(match[0].length) : raw;
  const title = body.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? String(frontmatter.id ?? 'Untitled');
  return { frontmatter, title, body, raw };
}

/** Convert a parsed memory to an index entry. */
export function entryFromMemory(raw: string, file: string, fallbackScope: Scope): MemoryEntry {
  const doc = parseMemory(raw);
  validateMemory(doc);
  const dependsOn = frontmatterStrings(doc.frontmatter.depends_on);
  const dependencyDepth = frontmatterDepth(doc.frontmatter.dependency_depth ?? doc.frontmatter.level ?? doc.frontmatter.depth);
  const summaryBody = doc.frontmatter.type === 'rule' ? parseMemory(canonicalRuleMemory(raw)).body : doc.body;
  const lifecycle = normalizeLifecycle(doc.frontmatter.lifecycle);
  const supersedes = frontmatterStrings(doc.frontmatter.supersedes);
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
    author: String(doc.frontmatter.author ?? 'unknown'),
    confidence: doc.frontmatter.confidence ?? 'medium',
    ignored: false,
    updated: String(doc.frontmatter.updated ?? doc.frontmatter.created ?? today()),
    ...(dependsOn.length ? { dependsOn } : {}),
    ...(dependencyDepth !== undefined ? { dependencyDepth } : {}),
    role: doc.frontmatter.role,
    ...(lifecycle ? { lifecycle } : {}),
    ...(typeof doc.frontmatter.review_after === 'string' && doc.frontmatter.review_after ? { reviewAfter: doc.frontmatter.review_after } : {}),
    ...(typeof doc.frontmatter.last_verified === 'string' && doc.frontmatter.last_verified ? { lastVerified: doc.frontmatter.last_verified } : {}),
    ...(supersedes.length ? { supersedes: supersedes[0] } : {}),
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
  if (!fm.author) throw new Error('Missing author');
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
  const lines = Object.entries(data).map(([k, v]) => `${k}: ${formatValue(v)}`);
  return `---\n${lines.join('\n')}\n---\n`;
}

function parseValue(value: string): any {
  if (value.startsWith('[')) return value.replace(/^\[|\]$/g, '').split(',').map((v) => v.trim()).filter(Boolean);
  return value;
}

function formatValue(value: any): string {
  return Array.isArray(value) ? `[${value.join(', ')}]` : String(value);
}

function frontmatterStrings(value: unknown): string[] {
  const raw = Array.isArray(value) ? value : typeof value === 'string' ? [value] : [];
  return raw.flatMap((item) => String(item).split(',')).map((item) => item.trim()).filter(Boolean);
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
