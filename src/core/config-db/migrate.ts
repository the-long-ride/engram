/** JSON-to-SQLite migration for engram upgrade --db-migrate. */
import path from 'node:path';
import fs from 'node:fs/promises';
import { dbPath, isConfigDbUsable, openConfigDb, type ConfigDb } from './schema.js';
import {
  setUserConfig, getUserConfig,
  upsertProfile, setActiveProfile, listProfiles,
  upsertWorkspace, setWorkspaceConfig, listWorkspaces, deleteWorkspace
} from './queries.js';
import {
  loadConfig, readProfileStore, userConfigPath, userProfilesPath,
  workspaceRoot, defaultConfig
} from '../runtime/config.js';
import { readJson, exists } from '../system/fsx.js';
import type { EngramConfig, ProfileStore, WorkspaceRow } from '../runtime/types.js';

export type MigrationResult = {
  workspaces_found: number;
  workspace_configs_migrated: number;
  user_config_keys_migrated: number;
  profiles_migrated: number;
  issues: string[];
};

export type MigrationOptions = {
  dryRun?: boolean;
  force?: boolean;
  workspacePaths?: string[];
};

/** Detect whether JSON configs exist that could be migrated. */
export async function needsMigration(): Promise<boolean> {
  const userCfg = await readJson<Partial<EngramConfig>>(userConfigPath(), {});
  const profiles = await readJson<Partial<ProfileStore>>(userProfilesPath(), {});
  return Object.keys(userCfg).length > 0 || Object.keys(profiles.profiles ?? {}).length > 0;
}

/** Run migration from JSON configs to SQLite DB. */
export async function runMigration(opts: MigrationOptions = {}): Promise<MigrationResult> {
  const result: MigrationResult = {
    workspaces_found: 0,
    workspace_configs_migrated: 0,
    user_config_keys_migrated: 0,
    profiles_migrated: 0,
    issues: []
  };

  // 1. Read JSON sources
  const userCfg = await readJson<Partial<EngramConfig>>(userConfigPath(), {});
  const profileStore = await readJson<Partial<ProfileStore>>(userProfilesPath(), {});

  // 2. Discover workspace paths
  const explicitPaths: string[] = (opts.workspacePaths ?? []).map((p) => path.resolve(p));
  // Also include current working directory if not already listed
  const cwd = process.cwd();
  const workspacePaths = unique([...explicitPaths, ...(explicitPaths.length === 0 ? [cwd] : [])]);

  // Keep only paths that have an .agents/.engram or .engram config
  const found: { cwd: string; config: EngramConfig }[] = [];
  for (const wp of workspacePaths) {
    try {
      const roots = { workspace: workspaceRoot(wp), legacy: path.join(wp, '.engram') };
      if (await exists(roots.workspace) || await exists(roots.legacy)) {
        const config = await loadConfig(wp).catch(() => undefined);
        if (config) {
          found.push({ cwd: wp, config });
          result.workspaces_found += 1;
        }
      }
    } catch (err: any) {
      result.issues.push(`workspace ${wp}: ${err.message}`);
    }
  }

  if (opts.dryRun) {
    result.user_config_keys_migrated = Object.keys(userCfg).filter((k) => k !== 'auto_upgrade' && k !== 'version').length;
    result.profiles_migrated = Object.keys(profileStore.profiles ?? {}).length;
    return result;
  }

  if (!opts.force) {
    return result; // preview only
  }

  // 3. Open DB and apply
  const db = await openConfigDb();
  if (!db) {
    result.issues.push('SQLite unavailable; install better-sqlite3 or use Node >=22.5');
    return result;
  }
  try {
    if (!isConfigDbUsable(db.db)) {
      result.issues.push('SQLite unavailable; schema could not be initialized');
      return result;
    }

    // 3a. User config → user_config table
    const flat: Record<string, string> = {};
    for (const [key, value] of Object.entries(userCfg)) {
      if (key === 'auto_upgrade' || key === 'version' || key === 'ignore' || key === 'live_sync' ||
          key === 'global_git' || key === 'graph' || key === 'vector' || key === 'pattern_mining' ||
          key === 'pr_workflow' || key === 'encryption' || key === 'rule_variants' || key === 'load' ||
          key === 'roles') continue;
      if (typeof value === 'string') flat[key] = value;
      else if (typeof value === 'boolean' || typeof value === 'number') flat[key] = String(value);
    }
    // Also read the nested ones we skipped above — flatten simple scalar config keys
    if (typeof userCfg.scope === 'string') flat['scope'] = userCfg.scope;
    if (typeof userCfg.read === 'string') flat['read'] = userCfg.read;
    if (typeof userCfg.proof === 'string') flat['proof'] = userCfg.proof;
    if (typeof userCfg.global_path === 'string') flat['global_path'] = userCfg.global_path;
    if (typeof userCfg.default_profile === 'string') flat['default_profile'] = userCfg.default_profile;
    if (typeof userCfg.enabled === 'boolean') flat['enabled'] = String(userCfg.enabled);

    setUserConfig(db.db, flat);
    result.user_config_keys_migrated = Object.keys(flat).length;

    // 3b. Profiles → profiles table
    const profiles = profileStore.profiles ?? {};
    for (const [name, profile] of Object.entries(profiles)) {
      if (!profile?.global_path) continue;
      upsertProfile(db.db, name, profile.global_path, profile.scope ?? 'global');
      result.profiles_migrated += 1;
    }
    if (profileStore.active_profile && profiles[profileStore.active_profile]) {
      setActiveProfile(db.db, profileStore.active_profile);
    }

    // 3c. Workspaces → workspaces + workspace_config tables
    for (const { cwd: wp, config } of found) {
      const ws = upsertWorkspace(db.db, wp, path.basename(wp));
      const cfgFlat: Record<string, string> = {};
      if (typeof config.scope === 'string') cfgFlat['scope'] = config.scope;
      if (typeof config.read === 'string') cfgFlat['read'] = config.read;
      if (typeof config.proof === 'string') cfgFlat['proof'] = config.proof;
      if (typeof config.default_profile === 'string') cfgFlat['default_profile'] = config.default_profile;
      if (typeof config.global_path === 'string') cfgFlat['global_path'] = config.global_path;
      if (config.load?.limit !== undefined) cfgFlat['load.limit'] = String(config.load.limit);
      if (config.rule_variants?.enabled !== undefined) {
        cfgFlat['rule_variants.enabled'] = String(config.rule_variants.enabled);
        cfgFlat['rule_variants.active'] = config.rule_variants.active;
      }
      setWorkspaceConfig(db.db, ws.id, cfgFlat);
      if (Object.keys(cfgFlat).length > 0) result.workspace_configs_migrated += 1;
    }
  } finally {
    db.close();
  }

  return result;
}

/** Render migration plan or result for terminal output. */
export function formatMigrationResult(result: MigrationResult, dryRun: boolean): string {
  const label = dryRun ? 'Migration dry-run' : 'Migration applied';
  const lines = [
    label,
    `Workspaces found: ${result.workspaces_found}`,
    `Workspace configs migrated: ${result.workspace_configs_migrated}`,
    `User config keys migrated: ${result.user_config_keys_migrated}`,
    `Profiles migrated: ${result.profiles_migrated}`,
    `Issues: ${result.issues.length}`,
    ...result.issues.map((issue) => `  - ${issue}`)
  ];
  if (dryRun) lines.push('Run with --force to apply.');
  return lines.join('\n');
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((v) => path.resolve(v)))];
}
