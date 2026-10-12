/** Dependency-free, never-throwing key readers for JSON(C), YAML, and TOML sources. */
import { tomlKeyPath } from '../integrations/mcp-config.js';

/** One key in document order. `value` is set only for scalars (raw text, unquoted where cheap). */
export type KeyEntry = { path: string[]; value?: string };

/** Parse JSON, retrying once with comments and trailing commas stripped; undefined when still invalid. */
export function parseJsonLoose(text: string): unknown {
  const source = text.replace(/^﻿/, '');
  try { return JSON.parse(source); } catch { /* retry as JSONC */ }
  try { return JSON.parse(stripJsonc(source)); } catch { return undefined; }
}

/** Object keys of a parsed JSON value down to `maxDepth` (arrays are leaves). */
export function jsonEntries(value: unknown, maxDepth = 2): KeyEntry[] {
  const entries: KeyEntry[] = [];
  const walk = (node: unknown, prefix: string[]) => {
    if (!isRecord(node)) return;
    for (const [key, child] of Object.entries(node)) {
      const path = [...prefix, key];
      const scalar = child === null || typeof child !== 'object';
      entries.push(scalar ? { path, value: String(child) } : { path });
      if (path.length < maxDepth) walk(child, path);
    }
  };
  walk(value, []);
  return entries;
}

/** Indentation-based YAML key reader; skips list items and block-scalar bodies. */
export function yamlEntries(text: string): KeyEntry[] {
  const entries: KeyEntry[] = [];
  const stack: Array<{ indent: number; key: string }> = [];
  let blockIndent = -1;
  for (const raw of text.split(/\r?\n/)) {
    const trimmed = raw.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed === '---' || trimmed === '...') continue;
    const indent = raw.length - raw.trimStart().length;
    if (blockIndent >= 0) {
      if (indent > blockIndent) continue;
      blockIndent = -1;
    }
    while (stack.length && stack[stack.length - 1].indent >= indent) stack.pop();
    if (trimmed.startsWith('-')) continue;
    const pair = yamlPair(trimmed);
    if (!pair) continue;
    const path = [...stack.map((item) => item.key), pair.key];
    if (!pair.value) {
      entries.push({ path });
      stack.push({ indent, key: pair.key });
    } else if (/^[|>][-+0-9]*$/.test(pair.value)) {
      entries.push({ path });
      blockIndent = indent;
    } else entries.push({ path, value: unquote(pair.value) });
  }
  return entries;
}

/** Line-based TOML key reader: tables, dotted keys, multi-line arrays and strings. */
export function tomlEntries(text: string): KeyEntry[] {
  const entries: KeyEntry[] = [];
  let table: string[] = [];
  let closeString = '';
  let array: { path: string[]; parts: string[]; depth: number } | undefined;
  for (const raw of text.split(/\r?\n/)) {
    const trimmed = raw.trim();
    if (closeString) {
      if (trimmed.includes(closeString)) closeString = '';
      continue;
    }
    if (array) {
      array.parts.push(trimmed);
      array.depth += bracketDelta(trimmed);
      if (array.depth <= 0) {
        entries.push({ path: array.path, value: array.parts.join(' ') });
        array = undefined;
      }
      continue;
    }
    if (!trimmed || trimmed.startsWith('#')) continue;
    if (trimmed.startsWith('[')) {
      const inner = trimmed.replace(/^\[+/, '');
      const end = inner.indexOf(']');
      table = tomlKeyPath(end >= 0 ? inner.slice(0, end) : inner).filter(Boolean);
      if (table.length) entries.push({ path: table });
      continue;
    }
    const eq = indexOutsideQuotes(trimmed, '=');
    if (eq <= 0) continue;
    const key = tomlKeyPath(trimmed.slice(0, eq)).filter(Boolean);
    if (!key.length) continue;
    const path = [...table, ...key];
    const value = trimmed.slice(eq + 1).trim();
    const fence = value.startsWith('"""') ? '"""' : value.startsWith("'''") ? "'''" : '';
    if (fence && !value.slice(3).includes(fence)) {
      closeString = fence;
      entries.push({ path });
    } else if (value.startsWith('[') && bracketDelta(value) > 0) {
      array = { path, parts: [value], depth: bracketDelta(value) };
    } else entries.push({ path, value: tomlScalar(value) });
  }
  if (array) entries.push({ path: array.path, value: array.parts.join(' ') });
  return entries;
}

/** Quoted strings inside a raw TOML/YAML array value, in order. */
export function quotedItems(value: string): string[] {
  return [...value.matchAll(/"([^"]*)"|'([^']*)'/g)].map((match) => match[1] ?? match[2] ?? '');
}

function yamlPair(trimmed: string): { key: string; value: string } | undefined {
  let key: string;
  let rest: string;
  if (trimmed.startsWith('"') || trimmed.startsWith("'")) {
    const close = trimmed.indexOf(trimmed[0], 1);
    if (close < 0 || trimmed[close + 1] !== ':') return undefined;
    key = trimmed.slice(1, close);
    rest = trimmed.slice(close + 2);
  } else {
    const colon = trimmed.endsWith(':') && !trimmed.includes(': ') ? trimmed.length - 1 : trimmed.indexOf(': ');
    if (colon <= 0) return undefined;
    key = trimmed.slice(0, colon).trim();
    rest = trimmed.slice(colon + 1);
  }
  if (rest && !/^\s/.test(rest)) return undefined;
  return key ? { key, value: stripYamlComment(rest.trim()) } : undefined;
}

function stripYamlComment(value: string): string {
  if (value.startsWith('"') || value.startsWith("'")) return value;
  const hash = value.indexOf(' #');
  return (hash >= 0 ? value.slice(0, hash) : value).trim();
}

function tomlScalar(value: string): string {
  if (value.startsWith('"') || value.startsWith("'")) {
    const close = value.indexOf(value[0], 1);
    return close > 0 ? value.slice(1, close) : value.slice(1);
  }
  const hash = value.indexOf('#');
  return (hash >= 0 ? value.slice(0, hash) : value).trim();
}

function unquote(value: string): string {
  const quote = value[0];
  if ((quote === '"' || quote === "'") && value.length > 1) {
    const close = value.indexOf(quote, 1);
    return close > 0 ? value.slice(1, close) : value.slice(1);
  }
  return value;
}

function bracketDelta(text: string): number {
  let depth = 0;
  let quote = '';
  for (const ch of text) {
    if (quote) { if (ch === quote) quote = ''; }
    else if (ch === '"' || ch === "'") quote = ch;
    else if (ch === '#') break;
    else if (ch === '[') depth += 1;
    else if (ch === ']') depth -= 1;
  }
  return depth;
}

function indexOutsideQuotes(text: string, target: string): number {
  let quote = '';
  for (let index = 0; index < text.length; index += 1) {
    const ch = text[index];
    if (quote) { if (ch === quote) quote = ''; }
    else if (ch === '"' || ch === "'") quote = ch;
    else if (ch === target) return index;
  }
  return -1;
}

function stripJsonc(text: string): string {
  const out: string[] = [];
  let index = 0;
  while (index < text.length) {
    const ch = text[index];
    if (ch === '"') {
      let end = index + 1;
      while (end < text.length && text[end] !== '"') end += text[end] === '\\' ? 2 : 1;
      out.push(text.slice(index, end + 1));
      index = end + 1;
    } else if (ch === '/' && text[index + 1] === '/') {
      const end = text.indexOf('\n', index);
      index = end < 0 ? text.length : end;
    } else if (ch === '/' && text[index + 1] === '*') {
      const end = text.indexOf('*/', index + 2);
      index = end < 0 ? text.length : end + 2;
    } else {
      if (ch !== ',' || !closesNext(text, index + 1)) out.push(ch);
      index += 1;
    }
  }
  return out.join('');
}

function closesNext(text: string, from: number): boolean {
  let index = from;
  while (index < text.length && /\s/.test(text[index])) index += 1;
  return text[index] === '}' || text[index] === ']';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
