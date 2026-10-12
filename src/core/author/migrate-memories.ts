/** Preview and transactionally migrate legacy memory author metadata. */
import fs from 'node:fs/promises';
import path from 'node:path';
import type { AuthorMigrationFile, AuthorMigrationPlan, AuthorMigrationResult, AuthorMigrationScope, AuthorProfile, AuthorSource } from './types.js';
import { AuthorMigrationError } from './types.js';
import { readConfiguredAuthorLayers } from './config.js';
import { getAuthorState } from './resolve.js';
import { includeAuthorEmail, loadConfig, scopeRootsForConfig } from '../runtime/config.js';
import { today } from '../system/text.js';
import type { Scope } from '../runtime/types.js';
import { exists, listFiles, readText } from '../system/fsx.js';
import { updateHash } from '../safety/hash.js';
import { parseMemory, validateMemoryRaw } from '../memory/schema.js';
import { updateFrontmatter } from '../memory/frontmatter.js';
import { backupPath, backupRelative, writeBackupOnce } from '../memory/backups.js';
import { rebuildIndex } from '../memory/index.js';
import { rebuildGraph } from '../memory/graph.js';
import { ensureVectorIndex } from '../memory/vector-db.js';
import { GRAPH_FILE, HASH_FILE, INDEX_FILE, VECTOR_DB_FILE, WORKING_GRAPH_FILE, WORKING_HASH_FILE, WORKING_INDEX_FILE, isActiveMemoryPath } from '../runtime/constants.js';

type MigrationWriter = (file: string, content: string, mode: number) => Promise<void>;
let writerForTests: MigrationWriter | undefined;

export { AuthorMigrationError };
export function setAuthorMigrationWriterForTests(writer: MigrationWriter | undefined): void { writerForTests = writer; }

type RootPlan = {
  scope: Scope;
  root: string;
  profile: AuthorProfile | null;
  source: AuthorSource;
  files: Array<{ absolute: string; relative: string; raw: string; next: string; mode: number; atime: Date; mtime: Date }>;
  rows: AuthorMigrationFile[];
};

export async function planAuthorMemoryMigration(
  cwd: string,
  scope: AuthorMigrationScope,
  options: { stripEmail?: boolean } = {}
): Promise<AuthorMigrationPlan> {
  const rootPlans = await buildRootPlans(cwd, scope, options);
  return aggregatePlan(scope, rootPlans);
}

export async function migrateMemoryAuthors(
  cwd: string,
  scope: AuthorMigrationScope,
  options: { confirmed: boolean; stripEmail?: boolean }
): Promise<AuthorMigrationResult> {
  if (options.confirmed !== true) throw new Error('Author memory migration requires explicit confirmation (--confirm)');
  const rootPlans = await buildRootPlans(cwd, scope, options);
  const stripEmail = options.stripEmail === true;
  const migratedRows: AuthorMigrationFile[] = [];
  for (const plan of rootPlans) {
    if (!plan.files.length) {
      migratedRows.push(...plan.rows);
      continue;
    }
    try {
      await applyRootMigration(cwd, plan, stripEmail);
      const eligible = new Set(plan.files.map((file) => file.relative));
      migratedRows.push(...plan.rows.map((row) => eligible.has(row.file)
        ? { ...row, action: 'migrated' as const, backup: backupRelative(plan.root, authorBackupFile(plan.root, row.file, stripEmail)) }
        : row));
    } catch (error) {
      if (error instanceof AuthorMigrationError) throw error;
      throw new AuthorMigrationError(error instanceof Error ? error.message : String(error), 'failed', plan.rows);
    }
  }
  const base = aggregateRows(scope, migratedRows);
  return { ...base, migrated: migratedRows.filter((row) => row.action === 'migrated').length, failed: 0, rollback: 'not-needed' };
}

async function buildRootPlans(cwd: string, requested: AuthorMigrationScope, options: { stripEmail?: boolean }): Promise<RootPlan[]> {
  const config = await loadConfig(cwd);
  const stripEmail = options.stripEmail === true;
  const includeEmail = includeAuthorEmail(config);
  const roots = scopeRootsForConfig(cwd, config);
  const scopes: Scope[] = requested === 'both' ? ['workspace', 'global'] : [requested];
  const layers = await readConfiguredAuthorLayers(cwd);
  const state = await getAuthorState(cwd);
  const plans: RootPlan[] = [];
  for (const scope of scopes) {
    const root = roots[scope];
    if (!root || !(await exists(root))) {
      plans.push({ scope, root: root || '', profile: null, source: 'unresolved', files: [], rows: [] });
      continue;
    }
    const selected = scope === 'global'
      ? layers.global ? { profile: layers.global, source: 'global' as const } : { profile: null, source: 'unresolved' as const }
      : state.resolved.complete
        ? { profile: { name: state.resolved.name, email: state.resolved.email }, source: state.resolved.source }
        : { profile: null, source: 'unresolved' as const };
    const rows: AuthorMigrationFile[] = [];
    const migrations: RootPlan['files'] = [];
    const files = (await listFiles(root)).filter((file) => isActiveMemory(root, file)).sort();
    for (const absolute of files) {
      const relative = path.relative(root, absolute).replace(/\\/g, '/');
      try {
        const raw = await readText(absolute);
        const doc = parseMemory(raw);
        const fm = doc.frontmatter;
        // Throws for a missing author, an invalid name/email, or an email without a name; a name alone is valid.
        validateMemoryRaw(raw);
        const hasName = fm.author_name !== undefined;
        const carriesEmail = fm.author_email !== undefined || fm.author !== undefined;
        if (hasName && !(stripEmail && carriesEmail)) {
          rows.push({ scope, file: relative, action: 'current', source: selected.source });
          continue;
        }
        const keptName = hasName ? String(fm.author_name) : selected.profile?.name;
        if (stripEmail && !keptName) {
          rows.push({ scope, file: relative, action: 'skipped', source: selected.source, reason: 'No author name is available to keep after stripping the email' });
          continue;
        }
        if (!stripEmail && !selected.profile) {
          rows.push({
            scope,
            file: relative,
            action: 'skipped',
            source: 'unresolved',
            reason: scope === 'global'
              ? 'Configure a global Engram author; global migration never uses Git fallback'
              : 'No complete workspace, global, or Git author identity is available'
          });
          continue;
        }
        const next = stripEmail
          ? updateFrontmatter(raw, { author: undefined, author_email: undefined, author_name: keptName })
          : updateFrontmatter(raw, {
            author: undefined,
            author_name: selected.profile!.name,
            author_email: includeEmail ? selected.profile!.email : undefined
          });
        validateMemoryRaw(next);
        const stat = await fs.stat(absolute);
        migrations.push({ absolute, relative, raw, next, mode: stat.mode & 0o777, atime: stat.atime, mtime: stat.mtime });
        rows.push({ scope, file: relative, action: 'migrate', backup: backupRelative(root, authorBackupFile(root, relative, stripEmail)), source: selected.source });
      } catch (error) {
        rows.push({ scope, file: relative, action: 'invalid', reason: error instanceof Error ? error.message : String(error), source: selected.source });
      }
    }
    plans.push({ scope, root, profile: selected.profile, source: selected.source, files: migrations, rows });
  }
  return plans;
}

async function applyRootMigration(cwd: string, plan: RootPlan, stripEmail: boolean): Promise<void> {
  const sidecarPaths = [HASH_FILE, INDEX_FILE, GRAPH_FILE, WORKING_HASH_FILE, WORKING_INDEX_FILE, WORKING_GRAPH_FILE, VECTOR_DB_FILE, `${VECTOR_DB_FILE}-wal`, `${VECTOR_DB_FILE}-shm`]
    .map((file) => path.join(plan.root, file));
  const sidecars = await Promise.all(sidecarPaths.map(snapshotFile));
  const originals = await Promise.all(plan.files.map((file) => snapshotFile(file.absolute)));
  try {
    for (const file of plan.files) await writeBackupOnce(plan.root, authorBackupFile(plan.root, file.relative, stripEmail), file.raw, file.mode);
    for (const file of plan.files) await writeMemory(file.absolute, file.next, file.mode);
    for (const file of plan.files) await updateHash(plan.root, file.relative, file.next);
    const config = await loadConfig(cwd);
    const index = await rebuildIndex(plan.root, plan.scope);
    await rebuildGraph(plan.root, plan.scope, index, config);
    await ensureVectorIndex(plan.root, plan.scope, index.entries, config, { force: true });
  } catch (error) {
    let rollback: 'succeeded' | 'failed' = 'succeeded';
    try {
      for (let index = 0; index < plan.files.length; index++) {
        await restoreSnapshot(originals[index]);
      }
      for (const snapshot of sidecars) await restoreSnapshot(snapshot);
    } catch {
      rollback = 'failed';
    }
    throw new AuthorMigrationError(
      `${error instanceof Error ? error.message : String(error)} (rollback: ${rollback})`,
      rollback,
      plan.rows
    );
  }
}

async function writeMemory(file: string, content: string, mode: number): Promise<void> {
  if (writerForTests) return writerForTests(file, content, mode);
  const temp = `${file}.engram-author-${process.pid}-${Date.now()}`;
  try {
    await fs.writeFile(temp, content, { mode });
    await fs.chmod(temp, mode);
    await fs.rename(temp, file);
  } finally {
    await fs.rm(temp, { force: true }).catch(() => undefined);
  }
}

function authorBackupFile(root: string, relative: string, stripEmail: boolean): string {
  return stripEmail
    ? backupPath(root, 'author-strip-email', today(), relative, '.pre-strip-email.bak')
    : backupPath(root, 'author', 'v3', relative, '.pre-author-v3.bak');
}

type FileSnapshot = { file: string; exists: boolean; bytes?: Uint8Array; mode?: number; atime?: Date; mtime?: Date };
async function snapshotFile(file: string): Promise<FileSnapshot> {
  try {
    const stat = await fs.stat(file);
    return { file, exists: true, bytes: await fs.readFile(file), mode: stat.mode & 0o777, atime: stat.atime, mtime: stat.mtime };
  } catch {
    return { file, exists: false };
  }
}
async function restoreSnapshot(snapshot: FileSnapshot): Promise<void> {
  if (!snapshot.exists) {
    await fs.rm(snapshot.file, { force: true }).catch(() => undefined);
    return;
  }
  await fs.mkdir(path.dirname(snapshot.file), { recursive: true });
  await fs.writeFile(snapshot.file, snapshot.bytes!, { mode: snapshot.mode });
  await fs.chmod(snapshot.file, snapshot.mode!);
  if (snapshot.atime && snapshot.mtime) await fs.utimes(snapshot.file, snapshot.atime, snapshot.mtime);
}

function aggregatePlan(scope: AuthorMigrationScope, plans: RootPlan[]): AuthorMigrationPlan {
  return aggregateRows(scope, plans.flatMap((plan) => plan.rows));
}
function aggregateRows(scope: AuthorMigrationScope, files: AuthorMigrationFile[]): AuthorMigrationPlan {
  return {
    scope,
    scanned: files.length,
    eligible: files.filter((row) => row.action === 'migrate' || row.action === 'migrated').length,
    current: files.filter((row) => row.action === 'current').length,
    skipped: files.filter((row) => row.action === 'skipped').length,
    invalid: files.filter((row) => row.action === 'invalid').length,
    files
  };
}
function isActiveMemory(root: string, file: string): boolean {
  const relative = path.relative(root, file).replace(/\\/g, '/');
  return isActiveMemoryPath(relative);
}
