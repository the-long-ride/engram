/** Optional workspace .engram Git submodule setup. */
import path from 'node:path';
import { ENGRAM_DIR } from './constants.js';
import { ensureDir, exists } from './fsx.js';
import { git, isValidGitRemoteUrl, normalizeBranchName } from './git.js';

export type WorkspaceSubmoduleOptions = { branch?: string; remoteUrl?: string };

/** Initialize .engram as a local submodule and stage only submodule metadata. */
export async function configureWorkspaceSubmodule(cwd: string, options: WorkspaceSubmoduleOptions = {}): Promise<string[]> {
  const branch = normalizeBranchName(options.branch ?? 'main');
  const remoteUrl = options.remoteUrl?.trim() ?? '';
  if (remoteUrl && !isValidGitRemoteUrl(remoteUrl)) throw new Error('invalid submodule remote URL');
  if (!await isGitRepo(cwd)) return ['workspace submodule: skipped (workspace is not a Git repo)'];
  const root = path.join(cwd, ENGRAM_DIR);
  if (!await exists(root)) throw new Error('workspace memory must be initialized before submodule setup');
  await ensureLocalRepo(root, branch);
  const lines = [`workspace submodule: branch ${branch}`];
  if (remoteUrl) {
    await setRemote(root, remoteUrl);
    lines.push(`workspace submodule: origin -> ${redactRemote(remoteUrl)}`);
  }
  await commitSubmodule(root);
  await ensureGitmodules(cwd, remoteUrl || `./${ENGRAM_DIR}`, branch);
  await ensureNotTrackedAsFiles(cwd);
  await git(['-C', cwd, 'add', '-f', '.gitmodules', ENGRAM_DIR]);
  return [...lines, 'workspace submodule: staged .gitmodules and .engram gitlink'];
}

async function ensureLocalRepo(root: string, branch: string): Promise<void> {
  await ensureDir(root);
  const top = await git(['-C', root, 'rev-parse', '--show-toplevel']).then((out) => out.trim()).catch(() => '');
  if (path.resolve(top) !== path.resolve(root)) {
    await git(['-C', root, 'init', '-b', branch]).catch(async () => {
      await git(['-C', root, 'init']);
      await git(['-C', root, 'symbolic-ref', 'HEAD', `refs/heads/${branch}`]).catch(() => undefined);
    });
  }
}

async function commitSubmodule(root: string): Promise<void> {
  await git(['-C', root, 'add', '.']);
  if (!(await git(['-C', root, 'status', '--porcelain'])).trim()) return;
  await git([
    '-C', root, '-c', 'user.name=Engram', '-c', 'user.email=engram@example.local',
    'commit', '-m', 'Initialize engram'
  ]);
}

async function ensureGitmodules(cwd: string, url: string, branch: string): Promise<void> {
  await git(['-C', cwd, 'config', '-f', '.gitmodules', 'submodule.engram.path', ENGRAM_DIR]);
  await git(['-C', cwd, 'config', '-f', '.gitmodules', 'submodule.engram.url', url]);
  await git(['-C', cwd, 'config', '-f', '.gitmodules', 'submodule.engram.branch', branch]);
}

async function ensureNotTrackedAsFiles(cwd: string): Promise<void> {
  const tracked = (await git(['-C', cwd, 'ls-files', '-s', '--', ENGRAM_DIR]).catch(() => '')).trim();
  if (tracked && !tracked.split(/\r?\n/).every((line) => line.startsWith('160000 '))) {
    throw new Error('.engram is already tracked as normal files; remove it from the parent index before converting to a submodule');
  }
}

async function isGitRepo(cwd: string): Promise<boolean> {
  return git(['-C', cwd, 'rev-parse', '--is-inside-work-tree']).then(() => true).catch(() => false);
}

async function setRemote(root: string, url: string): Promise<void> {
  const existing = await git(['-C', root, 'remote', 'get-url', 'origin']).then((out) => out.trim()).catch(() => '');
  await git(['-C', root, 'remote', existing ? 'set-url' : 'add', 'origin', url]);
}

function redactRemote(value: string): string {
  return value.replace(/:\/\/[^/@]+@/, '://<credentials>@');
}
