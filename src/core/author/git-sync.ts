/** Preview and safely synchronize the global Engram author into Git config. */
import type { GitAuthorSyncPlan, GitAuthorSyncResult } from './types.js';
import { readConfiguredAuthorLayers } from './config.js';
import { tryNormalizeAuthorProfile } from './validate.js';
import { git, gitConfigValue } from '../vcs/git.js';

type GitAuthorKey = 'user.name' | 'user.email';
export type GitConfigAdapter = {
  getGlobal(key: GitAuthorKey): Promise<string>;
  setGlobal(key: GitAuthorKey, value: string): Promise<void>;
  unsetGlobal(key: GitAuthorKey): Promise<void>;
};

export const defaultGitConfigAdapter: GitConfigAdapter = {
  getGlobal: (key) => gitConfigValue(key, { global: true }),
  setGlobal: async (key, value) => { await git(['config', '--global', key, value]); },
  unsetGlobal: async (key) => { await git(['config', '--global', '--unset-all', key]).catch(() => undefined); }
};

export async function planGlobalGitAuthorSync(cwd: string, adapter: GitConfigAdapter = defaultGitConfigAdapter): Promise<GitAuthorSyncPlan> {
  const { global } = await readConfiguredAuthorLayers(cwd);
  if (!global) throw new Error('Configure a global Engram author before syncing Git');
  const previousName = (await adapter.getGlobal('user.name')).trim();
  const previousEmail = (await adapter.getGlobal('user.email')).trim();
  return {
    source: 'global',
    previous: tryNormalizeAuthorProfile({ name: previousName, email: previousEmail }),
    next: global,
    changes: [
      { key: 'user.name', from: previousName || null, to: global.name },
      { key: 'user.email', from: previousEmail || null, to: global.email }
    ]
  };
}

export async function syncGlobalGitAuthor(
  cwd: string,
  options: { confirmed: boolean },
  adapter: GitConfigAdapter = defaultGitConfigAdapter
): Promise<GitAuthorSyncResult> {
  if (options.confirmed !== true) throw new Error('Global Git author sync requires explicit confirmation (--confirm)');
  const plan = await planGlobalGitAuthorSync(cwd, adapter);
  try {
    await adapter.setGlobal('user.name', plan.next.name);
    await adapter.setGlobal('user.email', plan.next.email);
    const [name, email] = await Promise.all([adapter.getGlobal('user.name'), adapter.getGlobal('user.email')]);
    if (name.trim() !== plan.next.name || email.trim() !== plan.next.email) {
      throw new Error('Global Git author verification failed');
    }
    return { ...plan, verified: true, rollback: 'not-needed' };
  } catch (error) {
    let rollback: 'succeeded' | 'failed' = 'succeeded';
    try {
      for (const change of plan.changes) {
        if (change.from === null) await adapter.unsetGlobal(change.key);
        else await adapter.setGlobal(change.key, change.from);
      }
      for (const change of plan.changes) {
        const restored = (await adapter.getGlobal(change.key)).trim();
        if (restored !== (change.from ?? '')) throw new Error(`rollback verification failed for ${change.key}`);
      }
    } catch {
      rollback = 'failed';
    }
    throw new Error(`${error instanceof Error ? error.message : String(error)} (rollback: ${rollback})`);
  }
}
