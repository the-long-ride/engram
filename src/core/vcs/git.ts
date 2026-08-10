/** Small Git integration helpers. Workspace Git is intentionally untouched. */
import { execFile } from 'node:child_process';
import path from 'node:path';
import { CHANGELOG_FILE, GRAPH_FILE, HASH_FILE, HELP_FILE, INDEX_FILE, MEMORY_DIRS, README_FILE } from '../runtime/constants.js';
import { ensureDir, exists } from '../system/fsx.js';
import type { EngramConfig } from '../runtime/types.js';
import type { ResolvedAuthor } from '../author/types.js';

type GlobalGitConfig = EngramConfig['global_git'];
export type GitCommitContext = { cwd: string; author: ResolvedAuthor };
export type GlobalGitInfo = {
  repo: boolean; branch: string; remote: string; remoteUrl: string; dirty: boolean;
};

const defaultGlobalGit: GlobalGitConfig = {
  enabled: true, remote: 'origin', branch: 'main', auto_sync: true, auto_resolve: true
};

/** Read the configured Git user email. */
export function gitUserEmail(): Promise<string> {
  return gitConfigValue('user.email', { global: true }).then((out) => out || 'unknown');
}


/** Ensure the global memory folder is a Git repo on one branch. */
export async function ensureGlobalGit(root: string, branch = 'main'): Promise<string> {
  const preferred = normalizeBranchName(branch);
  await ensureDir(root);
  try {
    await git(['-C', root, 'rev-parse', '--is-inside-work-tree']);
  } catch {
    await git(['-C', root, 'init', '-b', preferred])
      .catch(async () => {
        await git(['-C', root, 'init']);
        await git(['-C', root, 'symbolic-ref', 'HEAD', `refs/heads/${preferred}`]).catch(() => undefined);
      });
  }
  return currentBranch(root, preferred);
}

/** Add or update the global origin remote after validating user input. */
export async function configureGlobalRemote(root: string, url: string, branch = 'main', remote = 'origin'): Promise<string[]> {
  if (!isValidGitRemoteUrl(url)) throw new Error('invalid global remote URL');
  const detected = await ensureGlobalGit(root, branch);
  const existing = await remoteUrl(root, remote);
  await git(['-C', root, 'remote', existing ? 'set-url' : 'add', remote, url]);
  return [`global git: ${remote} -> ${redactRemote(url)}`, `global git: branch ${detected}`];
}

/** Pull the configured global remote and resolve memory conflicts when possible. */
export async function pullGlobalGit(
  root: string,
  config: GlobalGitConfig = defaultGlobalGit,
  onResolve: () => Promise<number> = async () => 0,
  commitContext?: GitCommitContext
): Promise<string[]> {
  if (!config.enabled || !config.auto_sync) return ['global git: sync disabled'];
  const branch = await ensureGlobalGit(root, config.branch);
  const remote = config.remote || 'origin';
  if (!(await remoteUrl(root, remote))) return [`global git: no ${remote} remote configured`];
  await gitAddEngramOwned(root);
  if (commitContext) await commitGlobal(root, 'save pending global memory changes', commitContext).catch(() => undefined);
  try {
    await git(['-C', root, 'pull', '--no-rebase', '--no-edit', '--allow-unrelated-histories', remote, branch]);
    return [`global git: pulled ${remote}/${branch}`];
  } catch (error: any) {
    if (missingRemoteRef(error)) return [`global git: remote ${remote}/${branch} not ready`];
    const resolved = config.auto_resolve ? await onResolve() : 0;
    if (!resolved) throw error;
    await gitAddEngramOwned(root);
    if (!commitContext) throw new Error('Cannot commit resolved global memory conflicts without an author identity');
    if (!await commitGlobal(root, 'resolve global memory conflicts', commitContext)) {
      throw new Error('global git conflict resolution needs manual review');
    }
    return [`global git: auto-resolved ${resolved} conflict(s)`];
  }
}

/** Commit approved global changes and push when an origin remote exists. */
export async function gitCommitGlobal(
  root: string,
  message: string,
  config: GlobalGitConfig = defaultGlobalGit,
  onResolve: () => Promise<number> = async () => 0,
  commitContext?: GitCommitContext
): Promise<string[]> {
  if (!config.enabled) return ['global git: disabled'];
  const branch = await ensureGlobalGit(root, config.branch);
  await gitAddEngramOwned(root);
  if (!commitContext && (await git(['-C', root, 'status', '--porcelain'])).trim()) {
    throw new Error('Cannot create an Engram Git commit without a complete author identity');
  }
  const committed = commitContext ? await commitGlobal(root, message, commitContext) : false;
  if (!config.auto_sync) return [committed ? `global git: committed ${branch}` : 'global git: no local changes'];
  return pushGlobalGit(root, branch, config, onResolve, commitContext);
}

/** Return current global Git state without mutating the repository. */
export async function globalGitInfo(root: string, config: GlobalGitConfig = defaultGlobalGit): Promise<GlobalGitInfo> {
  const branch = normalizeBranchName(config.branch);
  const remote = config.remote || 'origin';
  try {
    await git(['-C', root, 'rev-parse', '--is-inside-work-tree']);
    return {
      repo: true,
      branch: await currentBranch(root, branch),
      remote,
      remoteUrl: await remoteUrl(root, remote),
      dirty: Boolean((await git(['-C', root, 'status', '--porcelain'])).trim())
    };
  } catch {
    return { repo: false, branch, remote, remoteUrl: '', dirty: false };
  }
}

/** Validate URLs accepted by Git remote origin. */
export function isValidGitRemoteUrl(value: string): boolean {
  const remote = value.trim();
  if (!remote || /\s/.test(remote)) return false;
  try {
    const parsed = new URL(remote);
    return ['https:', 'http:', 'ssh:', 'git:', 'file:'].includes(parsed.protocol) && Boolean(parsed.pathname);
  } catch {
    return /^(?:[\w.-]+@)?[\w.-]+:[^\s]+$/.test(remote);
  }
}

/** Normalize the single supported global branch name. */
export function normalizeBranchName(value = '', fallback = 'main'): string {
  const branch = (value || fallback).trim();
  if (!/^[A-Za-z0-9._/-]+$/.test(branch) || branch.includes('..') || branch.includes('@{')) {
    throw new Error(`invalid global branch name: ${value}`);
  }
  if (branch.startsWith('/') || branch.endsWith('/') || branch.endsWith('.')) {
    throw new Error(`invalid global branch name: ${value}`);
  }
  return branch;
}

export type GitRunOptions = { cwd?: string; env?: Record<string, string | undefined> };

export function gitIdentityEnv(author: ResolvedAuthor): Record<string, string> {
  if (!author.complete || !author.name || !author.email) {
    throw new Error('Cannot create an Engram Git commit without a complete author identity');
  }
  return {
    GIT_AUTHOR_NAME: author.name,
    GIT_AUTHOR_EMAIL: author.email,
    GIT_COMMITTER_NAME: author.name,
    GIT_COMMITTER_EMAIL: author.email
  };
}

/** Run a Git command and capture stdout. */
export function git(args: string[], options: GitRunOptions = {}): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile('git', args, { cwd: options.cwd, env: { ...process.env, ...(options.env ?? {}) } }, (error: any, stdout: string, stderr: string) => {
      if (error) reject(new Error(stderr || String(error)));
      else resolve(stdout);
    });
  });
}

export async function gitConfigValue(key: 'user.name' | 'user.email', options: { cwd?: string; global?: boolean } = {}): Promise<string> {
  const args = ['config', ...(options.global ? ['--global'] : []), '--get', key];
  return git(args, { cwd: options.cwd }).then((out) => out.trim()).catch(() => '');
}

async function pushGlobalGit(
  root: string,
  branch: string,
  config: GlobalGitConfig,
  onResolve: () => Promise<number>,
  commitContext?: GitCommitContext
): Promise<string[]> {
  const remote = config.remote || 'origin';
  if (!(await remoteUrl(root, remote))) return [`global git: no ${remote} remote configured`];
  if (!await hasCommit(root)) return ['global git: nothing to push'];
  try {
    await git(['-C', root, 'push', '-u', remote, branch]);
    return [`global git: pushed ${remote}/${branch}`];
  } catch (error: any) {
    if (!/rejected|fetch first|non-fast-forward/i.test(error.message)) throw error;
    await pullGlobalGit(root, config, onResolve, commitContext);
    await git(['-C', root, 'push', '-u', remote, branch]);
    return [`global git: merged and pushed ${remote}/${branch}`];
  }
}

async function commitGlobal(root: string, message: string, context: GitCommitContext): Promise<boolean> {
  if (!(await git(['-C', root, 'status', '--porcelain'])).trim()) return false;
  await git(['-C', root, 'commit', '-m', `[engram] ${message}`], {
    cwd: context.cwd,
    env: gitIdentityEnv(context.author)
  });
  return true;
}

async function gitAddEngramOwned(root: string): Promise<void> {
  const candidates = [
    ...MEMORY_DIRS,
    INDEX_FILE,
    GRAPH_FILE,
    HASH_FILE,
    CHANGELOG_FILE,
    HELP_FILE,
    README_FILE,
    '.gitignore',
    'engram.config.json'
  ];
  const owned = [];
  for (const item of candidates) if (await exists(path.join(root, item))) owned.push(item);
  if (owned.length) await git(['-C', root, 'add', '--all', '--', ...owned]);
}

async function currentBranch(root: string, fallback: string): Promise<string> {
  const branch = (await git(['-C', root, 'branch', '--show-current']).catch(() => '')).trim();
  return branch ? normalizeBranchName(branch, fallback) : normalizeBranchName(fallback);
}

async function remoteUrl(root: string, remote: string): Promise<string> {
  return git(['-C', root, 'remote', 'get-url', remote]).then((out) => out.trim()).catch(() => '');
}

async function hasCommit(root: string): Promise<boolean> {
  return git(['-C', root, 'rev-parse', '--verify', 'HEAD']).then(() => true).catch(() => false);
}

function missingRemoteRef(error: Error): boolean {
  return /couldn't find remote ref|could not find remote ref|no such ref/i.test(error.message);
}

function redactRemote(value: string): string {
  return value.replace(/:\/\/[^/@]+@/, '://<credentials>@');
}
