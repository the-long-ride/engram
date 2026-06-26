/** Workspace/global storage setup and approved memory writes. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { CHANGELOG_FILE, DEFAULT_IGNORE, GRAPH_FILE, HASH_FILE, HELP_FILE, INDEX_FILE, MEMORY_DIRS, README_FILE, VECTOR_DB_FILE, VERSION } from '../runtime/constants.js';
import type { EngramConfig, Scope } from '../runtime/types.js';
import { defaultConfig, legacyWorkspaceRoot, loadConfig, mergeConfig, profileResolutionForConfig, scopeRootsForConfig, workspaceRoot, writeConfig, writeUserConfig } from '../runtime/config.js';
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
type InitOptions = { globalOnly?: boolean; saveTarget?: EngramConfig['scope'] };
const SCOPE_GITIGNORE = `# Engram generated routing sidecars.
memory.vec.sqlite
memory.vec.sqlite-*
`;

/** Initialize a workspace .agents/.engram folder. */
export async function initWorkspace(cwd: string, force = false, branch = 'main', globalPath = '', options: InitOptions = {}): Promise<string[]> {
  const root = workspaceRoot(cwd);
  const existing = await loadConfig(cwd);
  const profile = profileResolutionForConfig(existing);
  const globalOnly = Boolean(options.globalOnly);
  const hadWorkspaceMemory = await exists(root) || await exists(legacyWorkspaceRoot(cwd));
  const scope = globalOnly ? 'global' : options.saveTarget ?? (hadWorkspaceMemory ? existing.scope : defaultConfig().scope);
  const config = { ...existing, version: defaultConfig().version, global_path: globalPath, scope, global_git: { ...existing.global_git, branch } };
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
  const workspaceConfigOverrides = profile.active && profile.global_path === path.resolve(globalPath || '')
    ? { global_path: '' }
    : {};
  const workspace = await createScope(root, config, 'workspace', force, workspaceConfigOverrides);
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
  if (force || result.migrated || !(await exists(path.join(root, INDEX_FILE))) || await needsIndexRefresh(root)) {
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

async function needsIndexRefresh(root: string): Promise<boolean> {
  const index = await readJson<{ version?: string; entries?: Array<{ routingTerms?: unknown }> }>(path.join(root, INDEX_FILE), {});
  if (index.version !== VERSION) return true;
  return (index.entries ?? []).some((entry) => !Array.isArray(entry.routingTerms));
}

/** Write a memory after all approval and safety checks have passed. */
export async function writeApprovedMemory(input: {
  cwd: string; scope: Scope; file: string; content: string; message: string;
}): Promise<string> {
  const config = await loadConfig(input.cwd);
  const roots = scopeRootsForConfig(input.cwd, config);
  const root = roots[input.scope];
  if (!root) throw new Error('global memory is not configured; set ENGRAM_GLOBAL_DIR or run engram inject --global-path <path>');
  const sensitive = scanSensitive(input.content);
  if (sensitive.length) throw new Error(`Sensitive data blocked on line ${sensitive[0].line}: ${sensitive[0].reason}`);
  const injection = scanInjection(input.content);
  if (injection.length) throw new Error(`Injection pattern blocked on line ${injection[0].line}`);
  const { memory } = config;
  validateMemoryRaw(input.content, { ruleLineTarget: memory?.rule_line_target, ruleLineHardLimit: memory?.rule_line_hard_limit });
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
