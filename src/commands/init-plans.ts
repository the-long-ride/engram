/** Init-time prompts and optional Git setup plans. */
import path from 'node:path';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { defaultConfig, defaultGlobalPath } from '../core/runtime/config.js';
import { syncGlobalMemoryGit } from '../core/memory/storage.js';
import { configureWorkspaceSubmodule } from '../core/vcs/submodule.js';
import { configureGlobalRemote, globalGitInfo, isValidGitRemoteUrl, normalizeBranchName } from '../core/vcs/git.js';

export type SubmodulePlan = { lines?: string[]; branch: string; remoteUrl: string; enabled: boolean };
export type GlobalRemotePlan = { lines?: string[]; branch: string; remoteUrl: string };

export async function resolveGlobalPath(flags: Record<string, any>, current = ''): Promise<string> {
  if (flags['no-global'] === true) return '';
  const flagged = typeof flags['global-path'] === 'string' ? flags['global-path'].trim() : '';
  if (flagged) return normalizeGlobalPath(flagged);
  if (current.trim()) return promptExistingGlobalPath(current);
  if (process.env.ENGRAM_GLOBAL_DIR?.trim() || !process.stdin.isTTY || !process.stdout.isTTY) return '';
  const rl = createInterface({ input, output });
  try {
    const yes = (await rl.question('Use a global Engram directory? [y/N] ')).trim();
    if (!/^y(es)?$/i.test(yes)) return '';
    const fallback = defaultGlobalPath();
    const answer = (await rl.question(`Global Engram path [${fallback}]: `)).trim();
    return normalizeGlobalPath(answer || fallback);
  } finally {
    rl.close();
  }
}

export async function planGlobalRemote(flags: Record<string, any>, root: string, branch: string, config: ReturnType<typeof defaultConfig>['global_git']): Promise<GlobalRemotePlan> {
  const remote = typeof flags['global-remote'] === 'string' ? flags['global-remote'].trim() : '';
  if (!root) {
    if (remote) throw new Error('global remote requires ENGRAM_GLOBAL_DIR or --global-path <path>');
    return { branch, remoteUrl: '', lines: ['global git: skipped (no global path configured)'] };
  }
  if (remote) {
    if (!isValidGitRemoteUrl(remote)) throw new Error('invalid global remote URL');
    return { branch, remoteUrl: remote };
  }
  const info = await globalGitInfo(root, { ...config, branch });
  if (info.remoteUrl) return { branch: info.branch || branch, remoteUrl: '' };
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    return { branch, remoteUrl: '', lines: [
      'global git: no origin remote configured',
      `To share global memory, run: engram inject --global-remote <git-url> --global-branch ${branch}`
    ] };
  }
  const rl = createInterface({ input, output });
  try {
    const yes = (await rl.question('Add a Git origin remote for shared global memory? [y/N] ')).trim();
    if (!/^y(es)?$/i.test(yes)) return { branch, remoteUrl: '', lines: ['global git: skipped origin remote setup'] };
    const remoteUrl = await promptRemoteUrl(rl);
    const chosen = (await rl.question(`Branch [${info.branch || branch}]: `)).trim() || info.branch || branch;
    return { branch: normalizeBranchName(chosen), remoteUrl };
  } finally {
    rl.close();
  }
}

export async function applyGlobalRemote(plan: GlobalRemotePlan, root: string, config: ReturnType<typeof defaultConfig>['global_git']): Promise<string[]> {
  if (!plan.remoteUrl) return plan.lines ?? [];
  const lines = await configureGlobalRemote(root, plan.remoteUrl, plan.branch, config.remote);
  return [...lines, ...await syncGlobalMemoryGit(process.cwd())];
}

export async function planWorkspaceSubmodule(flags: Record<string, any>): Promise<SubmodulePlan> {
  const branch = normalizeBranchName(typeof flags['submodule-branch'] === 'string' ? flags['submodule-branch'] : 'main');
  const remoteUrl = typeof flags['submodule-remote'] === 'string' ? flags['submodule-remote'].trim() : '';
  if (remoteUrl && !isValidGitRemoteUrl(remoteUrl)) throw new Error('invalid submodule remote URL');
  if (flags['no-submodule']) return { branch, remoteUrl: '', enabled: false, lines: ['workspace submodule: skipped'] };
  if (flags.submodule || remoteUrl) return { branch, remoteUrl, enabled: true };
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    return { branch, remoteUrl: '', enabled: false, lines: ['workspace submodule: skipped (run engram inject --submodule to enable)'] };
  }
  const rl = createInterface({ input, output });
  try {
    const yes = (await rl.question('Add ./.agents/.engram at this folder as a Git submodule? [y/N] ')).trim();
    if (!/^y(es)?$/i.test(yes)) return { branch, remoteUrl: '', enabled: false, lines: ['workspace submodule: skipped'] };
    const chosenRemote = await promptOptionalRemoteUrl(rl, 'Submodule origin URL (optional): ');
    return { branch, remoteUrl: chosenRemote, enabled: true };
  } finally {
    rl.close();
  }
}

export async function applyWorkspaceSubmodule(plan: SubmodulePlan): Promise<string[]> {
  if (!plan.enabled) return plan.lines ?? [];
  return configureWorkspaceSubmodule(process.cwd(), { branch: plan.branch, remoteUrl: plan.remoteUrl });
}

async function promptExistingGlobalPath(current: string): Promise<string> {
  const fallback = normalizeGlobalPath(current);
  if (!process.stdin.isTTY || !process.stdout.isTTY) return fallback;
  const rl = createInterface({ input, output });
  try {
    const answer = (await rl.question(`Global Engram path [${fallback}] (type "none" to disable): `)).trim();
    if (/^(none|off|no)$/i.test(answer)) return '';
    return normalizeGlobalPath(answer || fallback);
  } finally {
    rl.close();
  }
}

function normalizeGlobalPath(value: string): string {
  if (!value.trim()) return '';
  return path.resolve(value.trim());
}

async function promptRemoteUrl(rl: { question(query: string): Promise<string> }): Promise<string> {
  for (;;) {
    const remoteUrl = (await rl.question('Remote origin URL: ')).trim();
    if (isValidGitRemoteUrl(remoteUrl)) return remoteUrl;
    output.write('Invalid Git remote URL. Paste an https, ssh, git, file, or git@host:path URL.\n');
  }
}

async function promptOptionalRemoteUrl(rl: { question(query: string): Promise<string> }, question: string): Promise<string> {
  for (;;) {
    const remoteUrl = (await rl.question(question)).trim();
    if (!remoteUrl || isValidGitRemoteUrl(remoteUrl)) return remoteUrl;
    output.write('Invalid Git remote URL. Paste an https, ssh, git, file, or git@host:path URL, or leave blank.\n');
  }
}
