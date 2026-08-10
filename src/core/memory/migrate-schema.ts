/** Safe, deterministic migration of active legacy memories to schema v3. */
import fs from 'node:fs/promises';
import path from 'node:path';
import type { EvidenceStatus, MemorySchemaVersion, MemoryType, Scope } from '../runtime/types.js';
import { exists, listFiles, readText } from '../system/fsx.js';
import { updateHash } from '../safety/hash.js';
import { isTraceExpired } from '../traces/codec.js';
import { readTrace } from '../traces/storage.js';
import { frontmatterStringList, updateFrontmatter } from './frontmatter.js';
import { defaultMemoryAuthority, memorySchemaVersion, parseMemory, validateMemory, validateMemoryRaw } from './schema.js';

export type MemorySchemaMigrationAction = 'migrate' | 'migrated' | 'current' | 'failed';

export type MemorySchemaMigrationFileResult = {
  file: string;
  action: MemorySchemaMigrationAction;
  fromVersion?: MemorySchemaVersion;
  toVersion?: 3;
  backup?: string;
  reason?: string;
};

export type MemorySchemaMigrationOptions = {
  files?: string[];
};

export type MemorySchemaMigrationResult = {
  scope: Scope;
  scanned: number;
  eligible: number;
  migrated: number;
  current: number;
  skipped: number;
  failed: number;
  files: MemorySchemaMigrationFileResult[];
};

/** Preview active legacy memory migration without writing files. */
export async function planMemorySchemaMigration(
  root: string,
  scope: Scope,
  options: MemorySchemaMigrationOptions = {}
): Promise<MemorySchemaMigrationResult> {
  return runMemorySchemaMigration(root, scope, false, options);
}

/** Migrate active legacy memories and refresh their integrity hashes. */
export async function migrateMemorySchema(
  root: string,
  scope: Scope,
  options: MemorySchemaMigrationOptions = {}
): Promise<MemorySchemaMigrationResult> {
  return runMemorySchemaMigration(root, scope, true, options);
}

async function runMemorySchemaMigration(
  root: string,
  scope: Scope,
  apply: boolean,
  options: MemorySchemaMigrationOptions = {}
): Promise<MemorySchemaMigrationResult> {
  const result: MemorySchemaMigrationResult = {
    scope,
    scanned: 0,
    eligible: 0,
    migrated: 0,
    current: 0,
    skipped: 0,
    failed: 0,
    files: []
  };
  if (!(await exists(root))) return result;
  const selected = options.files?.length
    ? new Set(options.files.map(normalizeRelativeMemoryPath))
    : undefined;
  const files = (await listFiles(root))
    .filter((file) => isActiveMemoryFile(root, file))
    .filter((file) => !selected || selected.has(normalizeRelativeMemoryPath(path.relative(root, file))))
    .sort();
  result.scanned = files.length;
  for (const file of files) {
    const rel = path.relative(root, file).replace(/\\/g, '/');
    try {
      const raw = await readText(file);
      const doc = parseMemory(raw);
      const version = memorySchemaVersion(doc);
      if (version === 3) {
        validateMemory(doc);
        result.current += 1;
        result.skipped += 1;
        result.files.push({ file: rel, action: 'current', fromVersion: 3, toVersion: 3 });
        continue;
      }
      validateMemory(doc);
      const migrated = await migratedDocument(raw, file, root, scope);
      result.eligible += 1;
      if (!apply) {
        result.files.push({ file: rel, action: 'migrate', fromVersion: version, toVersion: 3, backup: `${rel}.pre-v3.bak` });
        continue;
      }
      const backup = `${file}.pre-v3.bak`;
      const originalStat = await fs.stat(file);
      const mode = originalStat.mode & 0o777;
      await ensureBackup(backup, raw, mode);
      await writeAtomically(file, migrated, mode);
      try {
        await updateHash(root, rel, migrated);
      } catch (error) {
        await writeAtomically(file, raw, mode);
        await fs.utimes(file, originalStat.atime, originalStat.mtime);
        throw error;
      }
      result.migrated += 1;
      result.files.push({ file: rel, action: 'migrated', fromVersion: version, toVersion: 3, backup: `${rel}.pre-v3.bak` });
    } catch (error) {
      result.failed += 1;
      result.files.push({ file: rel, action: 'failed', reason: error instanceof Error ? error.message : String(error) });
    }
  }
  return result;
}

async function migratedDocument(raw: string, file: string, root: string, scope: Scope): Promise<string> {
  const doc = parseMemory(raw);
  const fm = doc.frontmatter;
  const type = fm.type as MemoryType;
  const fileModified = (await fs.stat(file)).mtime.toISOString();
  const validFrom = firstDate(fm.valid_from, fm.created, fm.updated) ?? fileModified;
  const lastConfirmed = firstDate(fm.last_confirmed, fm.last_verified, fm.updated, fm.created) ?? fileModified;
  const usedFileTime = validFrom === fileModified || lastConfirmed === fileModified;
  const evidenceStatus = await migratedEvidenceStatus(root, frontmatterStringList(fm.evidence_refs));
  const revision = positiveInteger(fm.revision) ?? 1;
  const next = updateFrontmatter(raw, {
    schema_version: 3,
    scope: fm.scope ?? scope,
    authority: fm.authority ?? defaultMemoryAuthority(type),
    revision,
    valid_from: validFrom,
    last_confirmed: lastConfirmed,
    evidence_status: evidenceStatus,
    migration_date_source: usedFileTime ? 'file_mtime' : undefined
  });
  validateMemoryRaw(next);
  return next;
}

async function migratedEvidenceStatus(root: string, refs: string[]): Promise<EvidenceStatus> {
  if (!refs.length) return 'unverified';
  for (const ref of refs) {
    try {
      const trace = await readTrace(root, ref);
      if (!trace || isTraceExpired(trace)) return 'unverified';
    } catch {
      return 'unverified';
    }
  }
  return 'verified';
}

function firstDate(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value !== 'string' || !value.trim()) continue;
    if (!Number.isNaN(Date.parse(value))) return value;
  }
  return undefined;
}

function positiveInteger(value: unknown): number | undefined {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

async function ensureBackup(backup: string, raw: string, mode: number): Promise<void> {
  try {
    await fs.writeFile(backup, raw, { flag: 'wx', mode });
    await fs.chmod(backup, mode);
  } catch (error: any) {
    if (error?.code !== 'EEXIST') throw error;
    const existing = await readText(backup);
    if (existing !== raw) throw new Error(`Existing migration backup does not match current legacy memory: ${path.basename(backup)}`);
  }
}

async function writeAtomically(file: string, content: string, mode: number): Promise<void> {
  const temporary = `${file}.engram-migrate-${process.pid}-${Date.now()}`;
  try {
    await fs.writeFile(temporary, content, { mode });
    await fs.chmod(temporary, mode);
    await fs.rename(temporary, file);
  } finally {
    await fs.rm(temporary, { force: true }).catch(() => undefined);
  }
}

function normalizeRelativeMemoryPath(file: string): string {
  return file.replace(/\\/g, '/').replace(/^\.\/+/, '');
}

function isActiveMemoryFile(root: string, file: string): boolean {
  const rel = path.relative(root, file).replace(/\\/g, '/');
  return file.endsWith('.md') && /^(rules|skills|knowledge)\//.test(rel);
}
