/** Workspace/global storage setup and approved memory writes. */
import path from 'node:path';
import { CHANGELOG_FILE, DEFAULT_IGNORE, ENGRAM_DIR, HASH_FILE, HELP_FILE, INDEX_FILE, MEMORY_DIRS, README_FILE } from './constants.js';
import type { EngramConfig, Scope } from './types.js';
import { defaultConfig, scopeRoots } from './config.js';
import { ensureDir, exists, inside, readText, writeJson, writeText } from './fsx.js';
import { renderHelp, renderMemoryReadme } from './help.js';
import { emptyIndex, rebuildIndex } from './index.js';
import { updateHash } from './hash.js';
import { scanInjection, scanSensitive } from './security.js';
import { gitCommitGlobal, gitUserEmail } from './git.js';

/** Initialize a workspace .engram folder. */
export async function initWorkspace(cwd: string, force = false): Promise<string[]> {
  const root = path.join(cwd, ENGRAM_DIR);
  if (await exists(root) && !force) return [`engram already initialized at ${root}`];
  await createScope(root, defaultConfig(), true);
  const ignoreFile = path.join(cwd, '.engramignore');
  if (!(await exists(ignoreFile)) || force) await writeText(ignoreFile, DEFAULT_IGNORE);
  return [`engram initialized at ${root}`];
}

/** Create the standard scope files and folders. */
export async function createScope(root: string, config: EngramConfig, workspace: boolean): Promise<void> {
  await ensureDir(root);
  for (const dir of MEMORY_DIRS) await ensureDir(path.join(root, dir));
  await writeJson(path.join(root, 'engram.config.json'), config);
  await writeJson(path.join(root, INDEX_FILE), emptyIndex());
  await writeJson(path.join(root, HASH_FILE), {});
  await writeText(path.join(root, HELP_FILE), renderHelp());
  await writeText(path.join(root, README_FILE), renderMemoryReadme());
  await writeText(path.join(root, CHANGELOG_FILE), `# Engram Changelog\n\n`);
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
  const full = inside(root, input.file);
  await writeText(full, input.content);
  await updateHash(root, input.file, input.content);
  await rebuildIndex(root, input.scope);
  await appendChangelog(root, input.file, input.message);
  if (input.scope === 'global') await gitCommitGlobal(root, input.message);
  return full;
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
