/** File-system helpers with path containment checks for safer writes. */
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

/** Return true when a path exists. */
export async function exists(file: string): Promise<boolean> {
  try { await fs.access(file); return true; } catch { return false; }
}

/** Create a directory tree if it is missing. */
export async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

/** Read JSON, returning a fallback for missing or invalid files. */
export async function readJson<T>(file: string, fallback: T): Promise<T> {
  try { return parseJsonLike<T>(await fs.readFile(file, 'utf8')); } catch { return fallback; }
}

/** Write pretty JSON with a final newline. */
export async function writeJson(file: string, value: unknown): Promise<void> {
  await ensureDir(path.dirname(file));
  await fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`);
}

/** Write text, creating parent folders first. */
export async function writeText(file: string, text: string): Promise<void> {
  await ensureDir(path.dirname(file));
  await fs.writeFile(file, text.endsWith('\n') ? text : `${text}\n`);
}

/** Read text with an empty fallback. */
export async function readText(file: string): Promise<string> {
  try { return await fs.readFile(file, 'utf8'); } catch { return ''; }
}

/** Read text from standard input until EOF. */
export async function readTextFromStdin(): Promise<string> {
  try {
    const chunks: (typeof Buffer)[] = [];
    for await (const chunk of process.stdin) {
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks).toString('utf8');
  } catch {
    return '';
  }
}


/** Recursively list files under a directory, ignoring missing roots. */
export async function listFiles(dir: string): Promise<string[]> {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await listFiles(file));
    if (entry.isFile()) out.push(file);
  }
  return out;
}

/** Resolve a target and ensure it stays inside the root. */
export function inside(root: string, target: string): string {
  const base = path.resolve(root);
  const full = path.resolve(base, target);
  if (full !== base && !full.startsWith(base + path.sep)) {
    throw new Error(`Path escapes root: ${target}`);
  }
  return full;
}

/** Parse JSON or JSONC-style text with comments and trailing commas. */
export function parseJsonLike<T>(text: string): T {
  return JSON.parse(stripTrailingCommas(stripJsonComments(text))) as T;
}

function stripJsonComments(text: string): string {
  let out = '';
  let inString = false;
  let escaped = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];
    if (inString) {
      out += ch;
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
      out += ch;
      continue;
    }
    if (ch === '/' && next === '/') {
      i += 2;
      while (i < text.length && text[i] !== '\n' && text[i] !== '\r') i++;
      i--;
      continue;
    }
    if (ch === '/' && next === '*') {
      i += 2;
      while (i < text.length && !(text[i] === '*' && text[i + 1] === '/')) i++;
      i++;
      continue;
    }
    out += ch;
  }
  return out;
}

function stripTrailingCommas(text: string): string {
  let out = '';
  let inString = false;
  let escaped = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      out += ch;
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
      out += ch;
      continue;
    }
    if (ch === ',') {
      let j = i + 1;
      while (j < text.length && /\s/.test(text[j])) j++;
      if (text[j] === '}' || text[j] === ']') continue;
    }
    out += ch;
  }
  return out;
}
