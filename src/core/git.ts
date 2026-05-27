/** Small Git integration helpers. Workspace Git is intentionally untouched. */
import { execFile } from 'node:child_process';

/** Read the configured Git user email. */
export function gitUserEmail(): Promise<string> {
  return git(['config', '--global', 'user.email']).then((out) => out.trim() || 'unknown');
}

/** Commit approved global-scope changes when the folder is a Git repo. */
export async function gitCommitGlobal(root: string, message: string): Promise<void> {
  try {
    await git(['-C', root, 'rev-parse', '--is-inside-work-tree']);
  } catch {
    await git(['-C', root, 'init']);
  }
  await git(['-C', root, 'add', '.']);
  const status = await git(['-C', root, 'status', '--porcelain']);
  if (!status.trim()) return;
  await git(['-C', root, 'commit', '-m', `[engram] ${message}`]).catch(() => undefined);
}

/** Run a Git command and capture stdout. */
export function git(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile('git', args, (error: any, stdout: string, stderr: string) => {
      if (error) reject(new Error(stderr || String(error)));
      else resolve(stdout);
    });
  });
}
