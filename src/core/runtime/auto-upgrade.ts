/** Cheap, best-effort startup reconciliation after package upgrades. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { createScope } from '../memory/storage.js';
import { refreshGeneratedWorkspaceSkillsets } from '../integrations/skillset.js';
import { exists, readJson, writeJson } from '../system/fsx.js';
import { VERSION } from './constants.js';
import {
  legacyWorkspaceRoot,
  loadConfig,
  profileResolutionForConfig,
  scopeRootsForConfig,
  workspaceRoot
} from './config.js';
import type { EngramConfig, Scope } from './types.js';

const skipCommands = new Set(['', 'help', 'completion', 'init', 'upgrade', '--help', '-h', '--version', '-v', 'version']);

/** Reconcile already-initialized roots once per installed Engram version. */
export async function maybeAutoUpgrade(cwd = process.cwd(), command = '', flags: Record<string, any> = {}): Promise<void> {
  if (shouldSkipAutoUpgrade(command, flags)) return;
  try {
    const config = await loadConfig(cwd);
    if (config.update !== 'auto') return;
    const roots = scopeRootsForConfig(cwd, config);
    const profile = profileResolutionForConfig(config);
    if (profile.workspace_allowed) await maybeUpgradeWorkspace(cwd, config);
    if (roots.global) await maybeUpgradeRoot(roots.global, 'global', config);
  } catch (error) {
    if (process.env.ENGRAM_AUTO_UPGRADE_STRICT === '1') throw error;
  }
}

function shouldSkipAutoUpgrade(command: string, flags: Record<string, any>): boolean {
  if (flags['no-auto-upgrade'] === true) return true;
  if (process.env.ENGRAM_NO_AUTO_UPGRADE === '1') return true;
  return skipCommands.has(command);
}

async function maybeUpgradeWorkspace(cwd: string, config: EngramConfig): Promise<void> {
  const root = await existingWorkspaceRoot(cwd);
  if (!root || !(await needsAutoUpgrade(root))) return;
  await createScope(root, config, 'workspace', false);
  await refreshGeneratedWorkspaceSkillsets(cwd);
  await writeAutoUpgradeMarker(root);
}

async function maybeUpgradeRoot(root: string, scope: Scope, config: EngramConfig): Promise<void> {
  if (!(await exists(root)) || !(await needsAutoUpgrade(root))) return;
  await createScope(root, config, scope, false);
  await writeAutoUpgradeMarker(root);
}

async function existingWorkspaceRoot(cwd: string): Promise<string> {
  const current = workspaceRoot(cwd);
  if (await exists(current)) return current;
  const legacy = legacyWorkspaceRoot(cwd);
  if (!(await exists(legacy))) return '';
  await fs.mkdir(path.dirname(current), { recursive: true });
  await fs.rename(legacy, current);
  return current;
}

async function needsAutoUpgrade(root: string): Promise<boolean> {
  const config = await readJson<Partial<EngramConfig>>(path.join(root, 'engram.config.json'), {});
  return config.version !== VERSION || config.auto_upgrade?.version !== VERSION;
}

async function writeAutoUpgradeMarker(root: string): Promise<void> {
  const file = path.join(root, 'engram.config.json');
  const config = await readJson<Partial<EngramConfig>>(file, {});
  await writeJson(file, {
    ...config,
    version: VERSION,
    auto_upgrade: { version: VERSION, checked_at: new Date().toISOString() }
  });
}
