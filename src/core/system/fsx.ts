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

/**
 * Read JSON before a read-modify-write: a missing or unparseable file yields the fallback, but a transient read error
 * (a Windows rename in flight) is retried and then thrown, so the caller never overwrites rows it could not read.
 */
export async function readJsonForUpdate<T>(file: string, fallback: T): Promise<T> {
  let text = '';
  for (let attempt = 1; ; attempt++) {
    try {
      text = await fs.readFile(file, 'utf8');
      break;
    } catch (error) {
      const code = String((error as { code?: unknown }).code ?? '');
      if (code === 'ENOENT') return fallback;
      if (!RENAME_RETRY_CODES.has(code) || attempt >= RENAME_ATTEMPTS) throw error;
      await new Promise((resolve) => setTimeout(resolve, attempt * 10));
    }
  }
  try { return parseJsonLike<T>(text); } catch { return fallback; }
}

/** Write pretty JSON with a final newline. */
export async function writeJson(file: string, value: unknown): Promise<void> {
  await ensureDir(path.dirname(file));
  await fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`);
}

/** Pretty JSON written atomically (see `writeTextAtomic`), so a concurrent reader never sees a torn file. */
export async function writeJsonAtomic(file: string, value: unknown): Promise<void> {
  await writeTextAtomic(file, `${JSON.stringify(value, null, 2)}\n`);
}

const RENAME_RETRY_CODES = new Set(['EPERM', 'EBUSY', 'EACCES']);
const RENAME_ATTEMPTS = 6;

/**
 * Atomic replace: write a sibling temp file, then rename it over the target. A failed write or rename removes the
 * temp file and leaves the previous content intact. Windows rejects a rename while another process holds the target
 * open, so EPERM/EBUSY/EACCES are retried a few times with a short backoff.
 */
export async function writeTextAtomic(file: string, text: string): Promise<void> {
  await ensureDir(path.dirname(file));
  const temp = `${file}.${process.pid}.${Math.random().toString(16).slice(2, 10)}.tmp`;
  try {
    await fs.writeFile(temp, text);
    for (let attempt = 1; ; attempt++) {
      try {
        await fs.rename(temp, file);
        return;
      } catch (error) {
        const code = String((error as { code?: unknown }).code ?? '');
        if (!RENAME_RETRY_CODES.has(code) || attempt >= RENAME_ATTEMPTS) throw error;
        await new Promise((resolve) => setTimeout(resolve, attempt * 10 + Math.floor(Math.random() * 10)));
      }
    }
  } catch (error) {
    await fs.rm(temp, { force: true }).catch(() => undefined);
    throw error;
  }
}

/** Thrown when `withFileLock` cannot take the lock before its timeout. */
export class FileLockTimeoutError extends Error {
  constructor(lockFile: string) {
    super(`timed out waiting for lock ${lockFile}`);
    this.name = 'FileLockTimeoutError';
  }
}

export type FileLockOptions = { timeoutMs?: number; staleMs?: number };

const LOCK_RETRY_CODES = new Set(['EEXIST', 'EPERM', 'EBUSY', 'EACCES']);

/**
 * Cross-process mutex for a read-modify-write of `file`: `<file>.lock` is created with O_EXCL, retried with short
 * jittered backoff until `timeoutMs`, and always removed in `finally`. A lock older than `staleMs` (a crashed holder)
 * is broken. Release only removes the lock this call created, so a holder whose lock was broken never frees another's.
 */
export async function withFileLock<T>(file: string, fn: () => Promise<T>, options: FileLockOptions = {}): Promise<T> {
  const lockFile = `${file}.lock`;
  const timeoutMs = options.timeoutMs ?? 2000;
  const staleMs = options.staleMs ?? 10_000;
  const owner = `${process.pid}:${Math.random().toString(16).slice(2, 10)}`;
  await ensureDir(path.dirname(file));
  const deadline = Date.now() + timeoutMs;
  for (let attempt = 1; ; attempt++) {
    try {
      await fs.writeFile(lockFile, owner, { flag: 'wx' });
      break;
    } catch (error) {
      const code = String((error as { code?: unknown }).code ?? '');
      if (!LOCK_RETRY_CODES.has(code)) throw error;
      if (await breakStaleLock(lockFile, staleMs)) continue;
      if (Date.now() >= deadline) throw new FileLockTimeoutError(lockFile);
      await new Promise((resolve) => setTimeout(resolve, Math.min(attempt * 5, 40) + Math.floor(Math.random() * 10)));
    }
  }
  try {
    return await fn();
  } finally {
    if ((await readText(lockFile)) === owner) await fs.rm(lockFile, { force: true }).catch(() => undefined);
  }
}

async function breakStaleLock(lockFile: string, staleMs: number): Promise<boolean> {
  try {
    const { mtimeMs } = await fs.stat(lockFile);
    if (Date.now() - mtimeMs <= staleMs) return false;
    await fs.rm(lockFile, { force: true });
    return true;
  } catch {
    return false;
  }
}

/**
 * Write pretty JSON only when the content changes, ignoring `volatile` top-level keys (such as `last_updated`) in the
 * comparison, so an unchanged tracked sidecar is never rewritten. Returns true when the file was written.
 */
export async function writeJsonIfChanged(file: string, value: Record<string, unknown>, volatile: string[] = []): Promise<boolean> {
  const stable = (input: Record<string, unknown>) => JSON.stringify(Object.fromEntries(Object.entries(input).filter(([key]) => !volatile.includes(key))));
  const current = await readJson<Record<string, unknown> | undefined>(file, undefined);
  if (current && typeof current === 'object' && stable(current) === stable(JSON.parse(JSON.stringify(value)))) return false;
  await writeJson(file, value);
  return true;
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

/** Nearest ancestor directory (cwd included) that holds a `.git` entry, or undefined outside a repository. */
export async function nearestGitRoot(cwd: string): Promise<string | undefined> {
  let current = path.resolve(cwd);
  for (;;) {
    if (await exists(path.join(current, '.git'))) return current;
    const parent = path.dirname(current);
    if (parent === current) return undefined;
    current = parent;
  }
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

/** Parse JSON or JSONC-style text with comments and trailing commas; a leading UTF-8 BOM is ignored. */
export function parseJsonLike<T>(text: string): T {
  return JSON.parse(stripTrailingCommas(stripJsonComments(text.replace(/^﻿/u, '')))) as T;
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
