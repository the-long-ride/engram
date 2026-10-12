/** Gitignored migration backups under <scope>/backups/<kind>-<label>/ and stray .bak detection. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { ensureDir, exists, listFiles } from '../system/fsx.js';
import { ensureScopeGitignore } from './scope-gitignore.js';

export const BACKUPS_DIR = 'backups';

export type BackupKind = 'schema' | 'author' | 'author-strip-email' | 'upgrade' | 'legacy';

const MEMORY_DIRS = ['rules', 'skills', 'knowledge'];

const LEGACY_SUFFIXES: Array<[RegExp, BackupKind, (match: RegExpMatchArray) => string]> = [
  [/\.pre-v3\.bak$/, 'schema', () => 'v3'],
  [/\.pre-author-v3\.bak$/, 'author', () => 'v3'],
  [/\.engram-upgrade-([A-Za-z0-9._-]+)\.bak$/, 'upgrade', (match) => match[1]],
  [/\.bak$/, 'legacy', () => 'unknown']
];

/** `<root>/backups/<kind>-<label>/<relative><suffix>`; the relative path must stay inside the scope. */
export function backupPath(scopeRoot: string, kind: BackupKind, label: string, relative: string, suffix: string): string {
  const rel = path.posix.normalize(relative.replace(/\\/g, '/'));
  if (!rel || rel === '.' || rel === '..' || rel.startsWith('../') || path.posix.isAbsolute(rel) || path.win32.isAbsolute(rel)) {
    throw new Error(`backup path escapes the scope: ${relative}`);
  }
  const safeLabel = label.replace(/[^A-Za-z0-9._-]/g, '_');
  return path.join(scopeRoot, BACKUPS_DIR, `${kind}-${safeLabel}`, ...`${rel}${suffix}`.split('/'));
}

/** Scope-relative display path (forward slashes) for result rows. */
export function backupRelative(scopeRoot: string, file: string): string {
  return path.relative(scopeRoot, file).replace(/\\/g, '/');
}

/**
 * Write a backup once (`wx`). An existing backup must match byte-for-byte unless `strict` is false (upgrade backups keep
 * the first copy). Ensures the scope `.gitignore` covers `backups/` before the first write.
 */
export async function writeBackupOnce(
  scopeRoot: string,
  file: string,
  raw: string | Uint8Array,
  mode?: number,
  strict = true
): Promise<void> {
  const bytes = typeof raw === 'string' ? Buffer.from(raw, 'utf8') : Buffer.from(raw);
  await ensureScopeGitignore(scopeRoot);
  await ensureDir(path.dirname(file));
  try {
    await fs.writeFile(file, bytes, { flag: 'wx', ...(mode ? { mode } : {}) });
    if (mode) await fs.chmod(file, mode).catch(() => undefined);
  } catch (error: any) {
    if (error?.code !== 'EEXIST') throw error;
    if (strict && !bytes.equals(await fs.readFile(file))) {
      throw new Error(`Existing migration backup does not match current memory: ${path.basename(file)}`);
    }
  }
}

/** Stray `*.bak` files beside memories (rules|skills|knowledge, durable or working), scope-relative. */
export async function strayBackups(scopeRoot: string): Promise<string[]> {
  const dirs = [...MEMORY_DIRS, ...MEMORY_DIRS.map((dir) => `working/${dir}`)];
  const found: string[] = [];
  for (const dir of dirs) {
    for (const file of await listFiles(path.join(scopeRoot, ...dir.split('/')))) {
      const rel = backupRelative(scopeRoot, file);
      if (rel.endsWith('.bak')) found.push(rel);
    }
  }
  return found.sort();
}

export type BackupMove = { from: string; to: string; action: 'move' | 'moved' | 'conflict' | 'identical'; reason?: string };

/** Plan moving every stray backup into `backups/<kind>-<label>/`; never touches the disk. */
export async function planBackupMoves(scopeRoot: string): Promise<BackupMove[]> {
  const moves: BackupMove[] = [];
  for (const from of await strayBackups(scopeRoot)) {
    const [pattern, kind, label] = classify(from);
    const suffix = from.match(pattern)![0];
    const target = backupPath(scopeRoot, kind, label, from.slice(0, from.length - suffix.length), suffix);
    const to = backupRelative(scopeRoot, target);
    if (!(await exists(target))) {
      moves.push({ from, to, action: 'move' });
      continue;
    }
    const same = (await fs.readFile(target)).equals(await fs.readFile(path.join(scopeRoot, ...from.split('/'))));
    moves.push(same
      ? { from, to, action: 'identical', reason: 'identical backup already in backups/' }
      : { from, to, action: 'conflict', reason: 'different backup already exists at the destination' });
  }
  return moves;
}

/** Apply planned moves: rename within the scope root, drop identical duplicates, leave conflicts untouched. */
export async function applyBackupMoves(scopeRoot: string, moves: BackupMove[]): Promise<BackupMove[]> {
  const out: BackupMove[] = [];
  for (const move of moves) {
    if (move.action === 'conflict') { out.push(move); continue; }
    const from = path.join(scopeRoot, ...move.from.split('/'));
    const to = path.join(scopeRoot, ...move.to.split('/'));
    await ensureScopeGitignore(scopeRoot);
    if (move.action === 'identical') {
      await fs.rm(from, { force: true });
      out.push({ ...move, action: 'moved' });
      continue;
    }
    await ensureDir(path.dirname(to));
    await fs.rename(from, to);
    out.push({ ...move, action: 'moved' });
  }
  return out;
}

function classify(rel: string): [RegExp, BackupKind, string] {
  for (const [pattern, kind, label] of LEGACY_SUFFIXES) {
    const match = rel.match(pattern);
    if (match) return [pattern, kind, label(match)];
  }
  return [/\.bak$/, 'legacy', 'unknown'];
}
