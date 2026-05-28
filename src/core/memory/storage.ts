/** Workspace/global storage setup and approved memory writes. */
import path from 'node:path';
import { CHANGELOG_FILE, DEFAULT_IGNORE, ENGRAM_DIR, HASH_FILE, HELP_FILE, INDEX_FILE, MEMORY_DIRS, README_FILE } from '../runtime/constants.js';
import type { EngramConfig, Scope } from '../runtime/types.js';
import { defaultConfig, loadConfig, scopeRoots } from '../runtime/config.js';
import { ensureDir, exists, inside, readText, writeJson, writeText } from '../system/fsx.js';
import { renderHelp, renderMemoryReadme } from '../cli/help.js';
import { emptyIndex, rebuildIndex } from './index.js';
import { updateHash } from '../safety/hash.js';
import { scanInjection, scanSensitive } from '../safety/security.js';
import { validateMemoryRaw } from './schema.js';
import { ensureGlobalGit, gitCommitGlobal, gitUserEmail, pullGlobalGit } from '../vcs/git.js';
import { resolveConflictsInRoot } from '../vcs/conflict.js';

/** Initialize a workspace .engram folder. */
export async function initWorkspace(cwd: string, force = false, branch = 'main'): Promise<string[]> {
  const root = path.join(cwd, ENGRAM_DIR);
  const roots = scopeRoots(cwd);
  const config = { ...defaultConfig(), global_git: { ...defaultConfig().global_git, branch } };
  const lines: string[] = [];
  if (await exists(root) && !force) {
    lines.push(`engram already initialized at ${root}`);
    const existing = await loadConfig(cwd);
    await writeJson(path.join(root, 'engram.config.json'), { ...existing, global_git: { ...existing.global_git, branch } });
  }
  else {
    await createScope(root, config, true, true);
    lines.push(`engram initialized at ${root}`);
  }
  const ignoreFile = path.join(cwd, '.engramignore');
  if (!(await exists(ignoreFile)) || force) await writeText(ignoreFile, DEFAULT_IGNORE);
  await createScope(roots.global, config, false, false);
  const detected = await ensureGlobalGit(roots.global, branch);
  await gitCommitGlobal(roots.global, 'initialize global memory', config.global_git, () => resolveGlobalConflicts(roots.global));
  lines.push(`engram global ready at ${roots.global} (git branch: ${detected})`);
  return lines;
}

/** Create the standard scope files and folders. */
export async function createScope(root: string, config: EngramConfig, workspace: boolean, force = true): Promise<void> {
  await ensureDir(root);
  for (const dir of MEMORY_DIRS) await ensureDir(path.join(root, dir));
  await writeJsonIfNeeded(path.join(root, 'engram.config.json'), config, force);
  await writeJsonIfNeeded(path.join(root, INDEX_FILE), emptyIndex(), force);
  await writeJsonIfNeeded(path.join(root, HASH_FILE), {}, force);
  await writeTextIfNeeded(path.join(root, HELP_FILE), renderHelp(), force);
  await writeTextIfNeeded(path.join(root, README_FILE), renderMemoryReadme(), force);
  await writeTextIfNeeded(path.join(root, CHANGELOG_FILE), `# Engram Changelog\n\n`, force);
  void workspace;
}

/** Write a memory after all approval and safety checks have passed. */
export async function writeApprovedMemory(input: {
  cwd: string; scope: Scope; file: string; content: string; message: string;
}): Promise<string> {
  const roots = scopeRoots(input.cwd);
  const root = roots[input.scope];
  const sensitive = scanSensitive(input.content);
  if (sensitive.length) throw new Error(`Sensitive data blocked on line ${sensitive[0].line}: ${sensitive[0].reason}`);
  const injection = scanInjection(input.content);
  if (injection.length) throw new Error(`Injection pattern blocked on line ${injection[0].line}`);
  validateMemoryRaw(input.content);
  const full = inside(root, input.file);
  const globalGit = input.scope === 'global' ? (await loadConfig(input.cwd)).global_git : undefined;
  if (globalGit) await pullGlobalGit(root, globalGit, () => resolveGlobalConflicts(root));
  await writeText(full, input.content);
  await updateHash(root, input.file, input.content);
  await rebuildIndex(root, input.scope);
  await appendChangelog(root, input.file, input.message);
  if (globalGit) await gitCommitGlobal(root, input.message, globalGit, () => resolveGlobalConflicts(root));
  return full;
}

/** Pull, resolve, commit, and push the global memory Git repo. */
export async function syncGlobalMemoryGit(cwd: string): Promise<string[]> {
  const roots = scopeRoots(cwd);
  const config = (await loadConfig(cwd)).global_git;
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

async function writeJsonIfNeeded(file: string, value: unknown, force: boolean): Promise<void> {
  if (force || !(await exists(file))) await writeJson(file, value);
}

async function writeTextIfNeeded(file: string, value: string, force: boolean): Promise<void> {
  if (force || !(await exists(file))) await writeText(file, value);
}
