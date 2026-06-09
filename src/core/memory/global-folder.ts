/** Global memory folder retargeting and migration helpers. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { CHANGELOG_FILE, GRAPH_FILE, HASH_FILE, HELP_FILE, INDEX_FILE, MEMORY_DIRS, README_FILE, VECTOR_DB_FILE } from '../runtime/constants.js';
import type { EngramConfig } from '../runtime/types.js';
import { defaultConfig, loadConfig, profileResolutionForConfig, readProfileStore, scopeRootsForConfig, workspaceRoot, writeConfig, writeProfileStore, writeUserConfig } from '../runtime/config.js';
import { ensureDir, exists, listFiles } from '../system/fsx.js';
import { ensureGlobalGit, gitCommitGlobal } from '../vcs/git.js';
import { resolveConflictsInRoot } from '../vcs/conflict.js';
import { createScope } from './storage.js';

type GlobalFolderUpdateOptions = { moveFromPath?: string };

/** Update the configured global root, optionally moving an existing root first. */
export async function updateGlobalFolder(cwd: string, newPath: string, options: GlobalFolderUpdateOptions = {}): Promise<string[]> {
  const target = normalizeRequiredPath(newPath, 'a new global path');
  const current = await loadConfig(cwd);
  const profile = profileResolutionForConfig(current);
  const previousRoot = scopeRootsForConfig(cwd, current).global;
  const lines: string[] = [];
  if (options.moveFromPath?.trim()) {
    lines.push(...await moveGlobalFolder(normalizeRequiredPath(options.moveFromPath, '--move-from-path'), target));
  } else {
    lines.push(`global path updated: ${previousRoot || '<none>'} -> ${target}`);
    if (previousRoot && path.resolve(previousRoot) !== target) {
      lines.push('global memory not moved (pass --move-from-path <old-path> to migrate files)');
    }
  }

  const config = { ...current, version: defaultConfig().version, global_path: target };
  const configFile = profile.active
    ? await writeProfileGlobalFolderConfig(profile.active, target, config)
    : await writeGlobalFolderConfig(cwd, config);
  const global = await createScope(target, config, 'global', false, { global_path: target });
  lines.push(...scopeRepairLines('global', global, false));
  const branch = await ensureGlobalGit(target, config.global_git.branch);
  await gitCommitGlobal(target, 'update global memory folder', config.global_git, () => resolveGlobalConflicts(target));
  lines.push(`config updated: ${configFile}`);
  lines.push(`engram global ready at ${target} (git branch: ${branch})`);
  const env = process.env.ENGRAM_GLOBAL_DIR?.trim();
  if (!profile.active && env && path.resolve(env) !== target) {
    lines.push(`warning: ENGRAM_GLOBAL_DIR still points at ${path.resolve(env)}; unset it to use the configured path`);
  }
  return lines;
}

async function writeProfileGlobalFolderConfig(name: string, target: string, config: EngramConfig): Promise<string> {
  const store = await readProfileStore();
  const profile = store.profiles[name];
  if (!profile) throw new Error(`active profile is not configured: ${name}`);
  store.profiles[name] = { ...profile, global_path: target, global_git: config.global_git };
  return writeProfileStore(store);
}

async function resolveGlobalConflicts(root: string): Promise<number> {
  const results = await resolveConflictsInRoot(root, 'global');
  return results.filter((row) => row.resolved).length;
}

async function writeGlobalFolderConfig(cwd: string, config: EngramConfig): Promise<string> {
  const root = workspaceRoot(cwd);
  if (await exists(root)) return writeConfig(cwd, config);
  const update: Partial<EngramConfig> = { global_path: config.global_path, global_git: config.global_git };
  if (config.scope === 'global') update.scope = 'global';
  return writeUserConfig(update);
}

async function moveGlobalFolder(source: string, target: string): Promise<string[]> {
  if (source === target) return [`global memory already at requested path: ${target}`];
  if (isInsidePath(source, target)) throw new Error('new global path cannot be inside --move-from-path');
  if (isInsidePath(target, source)) throw new Error('--move-from-path cannot be inside the new global path');
  if (!(await exists(source))) throw new Error(`move source does not exist: ${source}`);
  const stat = await fs.stat(source);
  if (!stat.isDirectory()) throw new Error(`move source is not a directory: ${source}`);
  if (await exists(target)) {
    const targetStat = await fs.stat(target);
    if (!targetStat.isDirectory()) throw new Error(`new global path exists and is not a directory: ${target}`);
    if (await hasPersistentGlobalContent(target)) {
      throw new Error(`new global path already contains memory or user files: ${target}`);
    }
    await fs.rm(target, { recursive: true, force: true });
  }
  return renameOrCopyRoot(source, target);
}

async function renameOrCopyRoot(source: string, target: string): Promise<string[]> {
  await ensureDir(path.dirname(target));
  try {
    await fs.rename(source, target);
    return [`global memory moved: ${source} -> ${target}`];
  } catch (error: any) {
    if (error?.code !== 'EXDEV') throw error;
    await fs.cp(source, target, { recursive: true });
    await fs.rm(source, { recursive: true, force: true });
    return [`global memory copied across devices and removed source: ${source} -> ${target}`];
  }
}

async function hasPersistentGlobalContent(root: string): Promise<boolean> {
  for (const entry of await fs.readdir(root, { withFileTypes: true }).catch(() => [])) {
    if (entry.name === '.git') continue;
    const full = path.join(root, entry.name);
    if (entry.isDirectory() && MEMORY_DIRS.includes(entry.name)) {
      if ((await listFiles(full)).length) return true;
      continue;
    }
    if (entry.isFile() && isGeneratedGlobalRootFile(entry.name)) continue;
    return true;
  }
  return false;
}

function isGeneratedGlobalRootFile(name: string): boolean {
  return [
    '.gitignore',
    'engram.config.json',
    CHANGELOG_FILE,
    GRAPH_FILE,
    HASH_FILE,
    HELP_FILE,
    INDEX_FILE,
    README_FILE
  ].includes(name) || name === VECTOR_DB_FILE || name.startsWith(`${VECTOR_DB_FILE}-`);
}

function normalizeRequiredPath(value: string, label: string): string {
  const trimmed = value.trim();
  if (!trimmed) throw new Error(`update-global-folder requires ${label}`);
  return path.resolve(trimmed);
}

function isInsidePath(root: string, child: string): boolean {
  const rel = path.relative(root, child);
  return Boolean(rel) && !rel.startsWith('..') && !path.isAbsolute(rel);
}

function scopeRepairLines(scope: string, result: { dirs: number; files: number; config: boolean; migrated: number; index: boolean }, ignoreUpdated: boolean): string[] {
  const parts = [];
  if (result.dirs) parts.push(`${result.dirs} dirs`);
  if (result.files) parts.push(`${result.files} files`);
  if (result.config) parts.push('config');
  if (result.migrated) parts.push(`${result.migrated} migrated`);
  if (result.index) parts.push('index');
  if (ignoreUpdated) parts.push('.engramignore');
  return parts.length ? [`engram ${scope} reconciled: ${parts.join(', ')}`] : [];
}
