/** Workspace/global storage setup and approved memory writes. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { CHANGELOG_FILE, DEFAULT_IGNORE, GRAPH_FILE, HASH_FILE, HELP_FILE, INDEX_FILE, MEMORY_DIRS, README_FILE, VECTOR_DB_FILE } from '../runtime/constants.js';
import type { EngramConfig, Scope } from '../runtime/types.js';
import { defaultConfig, legacyWorkspaceRoot, loadConfig, mergeConfig, scopeRootsForConfig, workspaceRoot, writeConfig, writeUserConfig } from '../runtime/config.js';
import { ensureDir, exists, inside, listFiles, readJson, readText, writeJson, writeText } from '../system/fsx.js';
import { renderHelp, renderMemoryReadme } from '../cli/help.js';
import { emptyIndex, rebuildIndex } from './index.js';
import { rebuildGraph } from './graph.js';
import { ensureVectorIndex } from './vector-db.js';
import { updateHash } from '../safety/hash.js';
import { scanInjection, scanSensitive } from '../safety/security.js';
import { validateMemoryRaw } from './schema.js';
import { ensureGlobalGit, gitCommitGlobal, gitUserEmail, pullGlobalGit } from '../vcs/git.js';
import { resolveConflictsInRoot } from '../vcs/conflict.js';

type ReconcileResult = { dirs: number; files: number; config: boolean; migrated: number; index: boolean };
type InitOptions = { globalOnly?: boolean };
type GlobalFolderUpdateOptions = { moveFromPath?: string };
const SCOPE_GITIGNORE = `# Engram generated routing sidecars.
memory.vec.sqlite
memory.vec.sqlite-*
`;

/** Initialize a workspace .agents/.engram folder. */
export async function initWorkspace(cwd: string, force = false, branch = 'main', globalPath = '', options: InitOptions = {}): Promise<string[]> {
  const root = workspaceRoot(cwd);
  const existing = await loadConfig(cwd);
  const globalOnly = Boolean(options.globalOnly);
  const config = { ...existing, version: defaultConfig().version, global_path: globalPath, scope: globalOnly ? 'global' as const : existing.scope, global_git: { ...existing.global_git, branch } };
  const roots = scopeRootsForConfig(cwd, config);
  const lines: string[] = [];
  if (globalOnly) return initGlobalOnly(roots.global, config, force, branch, lines);
  const migration = await migrateLegacyWorkspaceRoot(cwd);
  if (migration) lines.push(migration);
  const workspaceExisted = await exists(root);
  const globalExisted = roots.global ? await exists(roots.global) : false;
  if (workspaceExisted && !force) {
    lines.push(`engram already initialized at ${root}`);
  }
  else {
    lines.push(`engram initialized at ${root}`);
  }
  const workspace = await createScope(root, config, 'workspace', force);
  const ignoreUpdated = await reconcileIgnoreFile(cwd, force);
  if (workspaceExisted || force) lines.push(...scopeRepairLines('workspace', workspace, ignoreUpdated));
  if (roots.global) {
    const global = await createScope(roots.global, config, 'global', force);
    if (globalExisted || force) lines.push(...scopeRepairLines('global', global, false));
    const detected = await ensureGlobalGit(roots.global, branch);
    await gitCommitGlobal(roots.global, 'initialize global memory', config.global_git, () => resolveGlobalConflicts(roots.global));
    lines.push(`engram global ready at ${roots.global} (git branch: ${detected})`);
  } else {
    lines.push('engram global skipped (no global path configured)');
  }
  return lines;
}

async function initGlobalOnly(root: string, config: EngramConfig, force: boolean, branch: string, lines: string[]): Promise<string[]> {
  if (!root) throw new Error('global-only init requires ENGRAM_GLOBAL_DIR or --global-path <path>');
  const existed = await exists(root);
  const globalConfig = { ...config, global_path: root, scope: 'global' as const, global_git: { ...config.global_git, branch } };
  lines.push(existed && !force ? `engram global-only already initialized at ${root}` : `engram global-only initialized at ${root}`);
  const global = await createScope(root, globalConfig, 'global', force, { scope: 'global', global_path: root });
  if (existed || force) lines.push(...scopeRepairLines('global', global, false));
  const detected = await ensureGlobalGit(root, branch);
  await gitCommitGlobal(root, 'initialize global memory', globalConfig.global_git, () => resolveGlobalConflicts(root));
  const userConfig = await writeUserConfig({ global_path: root, scope: 'global', global_git: globalConfig.global_git });
  lines.push(`engram global ready at ${root} (git branch: ${detected})`);
  lines.push(`engram user config ready at ${userConfig}`);
  return lines;
}

/** Update the configured global root, optionally moving an existing root first. */
export async function updateGlobalFolder(cwd: string, newPath: string, options: GlobalFolderUpdateOptions = {}): Promise<string[]> {
  const target = normalizeRequiredPath(newPath, 'a new global path');
  const current = await loadConfig(cwd);
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
  const configFile = await writeGlobalFolderConfig(cwd, config);
  const global = await createScope(target, config, 'global', false, { global_path: target });
  lines.push(...scopeRepairLines('global', global, false));
  const branch = await ensureGlobalGit(target, config.global_git.branch);
  await gitCommitGlobal(target, 'update global memory folder', config.global_git, () => resolveGlobalConflicts(target));
  lines.push(`config updated: ${configFile}`);
  lines.push(`engram global ready at ${target} (git branch: ${branch})`);
  const env = process.env.ENGRAM_GLOBAL_DIR?.trim();
  if (env && path.resolve(env) !== target) {
    lines.push(`warning: ENGRAM_GLOBAL_DIR still points at ${path.resolve(env)}; unset it to use the configured path`);
  }
  return lines;
}

/** Create the standard scope files and folders. */
export async function createScope(root: string, config: EngramConfig, scope: Scope, force = true, configOverrides: Partial<EngramConfig> = {}): Promise<ReconcileResult> {
  const result: ReconcileResult = { dirs: 0, files: 0, config: false, migrated: 0, index: false };
  await ensureDir(root);
  result.migrated = await migrateLegacyDirs(root);
  for (const dir of MEMORY_DIRS) {
    const target = path.join(root, dir);
    if (!(await exists(target))) result.dirs += 1;
    await ensureDir(target);
  }
  result.config = await writeMergedConfig(path.join(root, 'engram.config.json'), config, force, configOverrides);
  result.files += await writeJsonIfNeeded(path.join(root, HASH_FILE), {}, false) ? 1 : 0;
  result.files += await writeTextIfNeeded(path.join(root, HELP_FILE), renderHelp(), true) ? 1 : 0;
  result.files += await writeTextIfNeeded(path.join(root, README_FILE), renderMemoryReadme(), true) ? 1 : 0;
  result.files += await writeTextIfNeeded(path.join(root, CHANGELOG_FILE), `# Engram Changelog\n\n`, false) ? 1 : 0;
  result.files += await reconcileScopeGitignore(root) ? 1 : 0;
  if (force || result.migrated || !(await exists(path.join(root, INDEX_FILE)))) {
    const index = await rebuildIndex(root, scope);
    await rebuildGraph(root, scope, index, config);
    await ensureVectorIndex(root, scope, index.entries, config, { force: true });
    result.index = true;
  }
  else {
    result.files += await writeJsonIfNeeded(path.join(root, INDEX_FILE), emptyIndex(), false) ? 1 : 0;
    if (!(await exists(path.join(root, GRAPH_FILE)))) {
      const index = await rebuildIndex(root, scope);
      await rebuildGraph(root, scope, index, config);
      await ensureVectorIndex(root, scope, index.entries, config);
    }
  }
  return result;
}

/** Write a memory after all approval and safety checks have passed. */
export async function writeApprovedMemory(input: {
  cwd: string; scope: Scope; file: string; content: string; message: string;
}): Promise<string> {
  const config = await loadConfig(input.cwd);
  const roots = scopeRootsForConfig(input.cwd, config);
  const root = roots[input.scope];
  if (!root) throw new Error('global memory is not configured; set ENGRAM_GLOBAL_DIR or run engram init --global-path <path>');
  const sensitive = scanSensitive(input.content);
  if (sensitive.length) throw new Error(`Sensitive data blocked on line ${sensitive[0].line}: ${sensitive[0].reason}`);
  const injection = scanInjection(input.content);
  if (injection.length) throw new Error(`Injection pattern blocked on line ${injection[0].line}`);
  validateMemoryRaw(input.content);
  const full = inside(root, input.file);
  const globalGit = input.scope === 'global' ? config.global_git : undefined;
  if (globalGit) await pullGlobalGit(root, globalGit, () => resolveGlobalConflicts(root));
  await writeText(full, input.content);
  await updateHash(root, input.file, input.content);
  const index = await rebuildIndex(root, input.scope);
  await rebuildGraph(root, input.scope, index, config);
  await ensureVectorIndex(root, input.scope, index.entries, config);
  await appendChangelog(root, input.file, input.message);
  if (globalGit) await gitCommitGlobal(root, input.message, globalGit, () => resolveGlobalConflicts(root));
  return full;
}

/** Pull, resolve, commit, and push the global memory Git repo. */
export async function syncGlobalMemoryGit(cwd: string): Promise<string[]> {
  const loaded = await loadConfig(cwd);
  const config = loaded.global_git;
  const roots = scopeRootsForConfig(cwd, loaded);
  if (!roots.global) return ['global memory: not configured'];
  const rows = [
    ...await pullGlobalGit(roots.global, config, () => resolveGlobalConflicts(roots.global)),
    ...await gitCommitGlobal(roots.global, 'sync global memory', config, () => resolveGlobalConflicts(roots.global))
  ];
  return [...new Set(rows)];
}

/** Append an audit-friendly changelog line. */
export async function appendChangelog(root: string, file: string, message: string): Promise<void> {
  const target = path.join(root, CHANGELOG_FILE);
  const current = await readText(target);
  const line = `- ${new Date().toISOString()} ${file}: ${message}`;
  await writeText(target, `${current.trimEnd()}\n${line}\n`);
}

/** Return the author email used in memory frontmatter. */
export async function resolveAuthor(): Promise<string> {
  return await gitUserEmail().catch(() => process.env.USER || 'unknown');
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

async function writeJsonIfNeeded(file: string, value: unknown, overwrite: boolean): Promise<boolean> {
  if (!overwrite && await exists(file)) return false;
  await writeJson(file, value);
  return true;
}

async function writeTextIfNeeded(file: string, value: string, overwrite: boolean): Promise<boolean> {
  const normalized = value.endsWith('\n') ? value : `${value}\n`;
  if (!overwrite && await exists(file)) return false;
  if (overwrite && await readText(file) === normalized) return false;
  await writeText(file, normalized);
  return true;
}

async function writeMergedConfig(file: string, config: EngramConfig, force: boolean, overrides: Partial<EngramConfig> = {}): Promise<boolean> {
  const current = force ? {} : await readJson<Partial<EngramConfig>>(file, {});
  const merged = mergeConfig(config, current);
  const next = {
    ...merged,
    ...overrides,
    version: config.version,
    global_git: { ...merged.global_git, ...(overrides.global_git ?? {}), branch: config.global_git.branch }
  };
  return writeJsonIfChanged(file, next);
}

async function writeJsonIfChanged(file: string, value: unknown): Promise<boolean> {
  const next = `${JSON.stringify(value, null, 2)}\n`;
  if (await readText(file) === next) return false;
  await writeJson(file, value);
  return true;
}

async function reconcileIgnoreFile(cwd: string, force: boolean): Promise<boolean> {
  const file = path.join(cwd, '.engramignore');
  if (force || !(await exists(file))) {
    await writeText(file, DEFAULT_IGNORE);
    return true;
  }
  const current = await readText(file);
  const existing = new Set(current.split(/\r?\n/u).map((line) => line.trim()).filter(Boolean));
  const missing = DEFAULT_IGNORE.split(/\r?\n/u).map((line) => line.trim()).filter(Boolean).filter((line) => !existing.has(line));
  if (!missing.length) return false;
  await writeText(file, `${current.trimEnd()}\n${missing.join('\n')}\n`);
  return true;
}

async function reconcileScopeGitignore(root: string): Promise<boolean> {
  const file = path.join(root, '.gitignore');
  const current = await readText(file);
  if (!current.trim()) {
    await writeText(file, SCOPE_GITIGNORE);
    return true;
  }
  const existing = new Set(current.split(/\r?\n/u).map((line) => line.trim()).filter(Boolean));
  const missing = SCOPE_GITIGNORE.split(/\r?\n/u).map((line) => line.trim()).filter(Boolean).filter((line) => !line.startsWith('#') && !existing.has(line));
  if (!missing.length) return false;
  await writeText(file, `${current.trimEnd()}\n${missing.join('\n')}\n`);
  return true;
}

async function migrateLegacyDirs(root: string): Promise<number> {
  const migrations = [['workflow', 'skills'], ['workflows', 'skills'], ['skill', 'skills'], ['rule', 'rules']] as const;
  let count = 0;
  for (const [from, to] of migrations) {
    const fromRoot = path.join(root, from);
    if (!(await exists(fromRoot))) continue;
    for (const file of await listFiles(fromRoot)) {
      const rel = path.relative(fromRoot, file);
      const target = path.join(root, to, rel);
      if (await exists(target)) continue;
      await ensureDir(path.dirname(target));
      await fs.rename(file, target);
      count += 1;
    }
    if (!(await listFiles(fromRoot)).length) await fs.rm(fromRoot, { recursive: true, force: true });
  }
  return count;
}

async function migrateLegacyWorkspaceRoot(cwd: string): Promise<string> {
  const current = workspaceRoot(cwd);
  const legacy = legacyWorkspaceRoot(cwd);
  if (await exists(current) || !(await exists(legacy))) return '';
  await ensureDir(path.dirname(current));
  await fs.rename(legacy, current);
  return `engram workspace migrated from ${legacy} to ${current}`;
}

function scopeRepairLines(scope: string, result: ReconcileResult, ignoreUpdated: boolean): string[] {
  const parts = [];
  if (result.dirs) parts.push(`${result.dirs} dirs`);
  if (result.files) parts.push(`${result.files} files`);
  if (result.config) parts.push('config');
  if (result.migrated) parts.push(`${result.migrated} migrated`);
  if (result.index) parts.push('index');
  if (ignoreUpdated) parts.push('.engramignore');
  return parts.length ? [`engram ${scope} reconciled: ${parts.join(', ')}`] : [];
}
