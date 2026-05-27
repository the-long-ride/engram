/** Deterministic memory drafting for manual saves. */
import type { MemoryType, Scope } from './types.js';
import { frontmatter } from './schema.js';
import { slugify, tagsFrom, today } from './text.js';

/** Build a concise schema-compliant memory from user text. */
export function draftMemory(input: {
  text: string;
  type: MemoryType;
  scope: Scope;
  author: string;
}): { file: string; id: string; content: string; tags: string[] } {
  const title = titleFor(input.text, input.type);
  const id = slugify(title);
  const tags = tagsFrom(input.text);
  const now = today();
  const meta = frontmatter({
    id, type: input.type, scope: input.scope, tags,
    created: now, updated: now, author: input.author,
    source: 'manual', confidence: 'high'
  });
  const content = `${meta}
# ${title}

## Context
Captured from an explicit manual Engram save request.

## Content
${bulletize(input.text)}

## Example
Use this memory when a future task touches: ${tags.slice(0, 3).join(', ') || 'this topic'}.
`;
  return { file: `${dirFor(input.type)}/${id}.md`, id, content, tags };
}

function titleFor(text: string, type: MemoryType): string {
  const clean = text.replace(/\s+/g, ' ').trim().replace(/[.?!]+$/, '');
  if (clean.length <= 70) return clean[0]?.toUpperCase() + clean.slice(1);
  return `${type === 'rule' ? 'Rule' : type === 'skill' ? 'Skill' : 'Knowledge'}: ${clean.slice(0, 58)}`;
}

function bulletize(text: string): string {
  const parts = text.split(/(?<=[.!?])\s+/).filter(Boolean).slice(0, 5);
  return parts.map((part) => `- ${part.replace(/^\W+/, '').trim()}`).join('\n');
}

function dirFor(type: MemoryType): string {
  return type === 'rule' ? 'rules' : type === 'skill' ? 'skills' : 'knowledge';
}
