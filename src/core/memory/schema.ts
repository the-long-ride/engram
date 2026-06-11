/** Memory Markdown frontmatter parser and validator. */
import type { MemoryDoc, MemoryEntry, MemoryType, Scope, Confidence } from '../runtime/types.js';
import { summarize, tagsFrom, today } from '../system/text.js';

const memoryTypes = new Set(['rule', 'skill', 'knowledge']);
const scopes = new Set(['workspace', 'global']);
const confidences = new Set(['high', 'medium', 'low']);
export const RULE_EFFECTIVE_LINE_TARGET = 50;
export const RULE_EFFECTIVE_LINE_HARD_LIMIT = 75;

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
  return {
    id: String(doc.frontmatter.id),
    type: doc.frontmatter.type,
    scope: doc.frontmatter.scope ?? fallbackScope,
    tags: doc.frontmatter.tags ?? tagsFrom(doc.title),
    summary: summarize(doc.body),
    file,
    author: String(doc.frontmatter.author ?? 'unknown'),
    confidence: doc.frontmatter.confidence ?? 'medium',
    ignored: false,
    updated: String(doc.frontmatter.updated ?? doc.frontmatter.created ?? today()),
    ...(dependsOn.length ? { dependsOn } : {}),
    ...(dependencyDepth !== undefined ? { dependencyDepth } : {}),
    role: doc.frontmatter.role
  };
}

/** Validate required schema fields and memory size. */
export function validateMemory(doc: MemoryDoc): void {
  const fm = doc.frontmatter;
  requireText(fm.id, 'id');
  if (!memoryTypes.has(fm.type)) throw new Error('Invalid memory type');
  if (fm.scope && !scopes.has(fm.scope)) throw new Error('Invalid memory scope');
  if (fm.confidence && !confidences.has(fm.confidence)) throw new Error('Invalid confidence');
  if (!fm.author) throw new Error('Missing author');
  if (!doc.body.includes('## Context') || !doc.body.includes('## Content') || !doc.body.includes('## Example')) {
    throw new Error('Memory must include Context, Content, and Example sections');
  }
  validateMarkdownStyle(doc.body);
  if (fm.type === 'rule' && effectiveMemoryLines(doc.raw) > RULE_EFFECTIVE_LINE_HARD_LIMIT) {
    throw new Error(`Rule memory exceeds ${RULE_EFFECTIVE_LINE_HARD_LIMIT}-line hard limit`);
  }
}

/** Parse and validate a raw memory document. */
export function validateMemoryRaw(raw: string): void {
  validateMemory(parseMemory(raw));
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
  const context = body.indexOf('## Context');
  const content = body.indexOf('## Content');
  const example = body.indexOf('## Example');
  if (!(context < content && content < example)) throw new Error('Memory sections must be ordered: Context, Content, Example');
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

export type { MemoryType, Scope, Confidence };
