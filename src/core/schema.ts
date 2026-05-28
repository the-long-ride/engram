/** Memory Markdown frontmatter parser and validator. */
import type { MemoryDoc, MemoryEntry, MemoryType, Scope, Confidence } from './types.js';
import { summarize, tagsFrom, today } from './text.js';

const memoryTypes = new Set(['rule', 'skill', 'knowledge']);
const scopes = new Set(['workspace', 'global']);
const confidences = new Set(['high', 'medium', 'low']);

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
  if (doc.raw.split(/\r?\n/).length > 60) throw new Error('Memory exceeds 60-line hard limit');
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

function requireText(value: unknown, field: string): void {
  if (!value || typeof value !== 'string') throw new Error(`Missing ${field}`);
}

export type { MemoryType, Scope, Confidence };
