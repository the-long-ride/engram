/** One-time profile migration for pre-profile Engram installs. */
import path from 'node:path';
import { hostname } from 'node:os';
import { LEGACY_ENGRAM_DIR } from './constants.js';
import type { EngramConfig, ProfileStore } from './types.js';
import {
  defaultConfig,
  mergeConfig,
  readProfileStore,
  scopeRoots,
  userConfigPath,
  writeProfileStore
} from './config.js';
import { exists, readJson } from '../system/fsx.js';

export type DefaultProfileMigration = {
  active_profile: string;
  global_path: string;
  profiles_path: string;
  created: boolean;
};

/** Ensure upgraded pre-profile installs have a user default profile. */
export async function ensureDefaultProfile(cwd = process.cwd()): Promise<DefaultProfileMigration | undefined> {
  if (stringValue(process.env.ENGRAM_PROFILE)) return undefined;
  const store = await readProfileStore();
  const active = stringValue(store.active_profile);
  if (active && store.profiles[active]) return undefined;
  const existingDefault = defaultProfileFromStore(store);
  if (existingDefault) {
    store.active_profile = existingDefault;
    return {
      active_profile: existingDefault,
      global_path: path.resolve(store.profiles[existingDefault].global_path),
      profiles_path: await writeProfileStore(store),
      created: false
    };
  }

  const found = await legacyGlobalProfileSeed(cwd);
  if (!found) return undefined;
  const name = uniqueProfileName(store, machineProfileName(), found.global_path);
  store.profiles[name] = {
    global_path: found.global_path,
    scope: found.config.scope,
    global_git: found.config.global_git
  };
  store.active_profile = name;
  return { active_profile: name, global_path: found.global_path, profiles_path: await writeProfileStore(store), created: true };
}

/** Return the machine-derived profile name used by upgrade migration. */
export function machineProfileName(): string {
  return sanitizeProfileName(process.env.COMPUTERNAME || process.env.HOSTNAME || hostname() || process.env.USERNAME || process.env.USER || 'default');
}

/** Format user-facing lines for default-profile creation or selection. */
export function defaultProfileLines(migration: DefaultProfileMigration | undefined): string[] {
  if (!migration) return [];
  return [
    `default profile ${migration.created ? 'created' : 'selected'}: ${migration.active_profile}`,
    `profile global path: ${migration.global_path}`,
    `profile registry: ${migration.profiles_path}`
  ];
}

async function legacyGlobalProfileSeed(cwd: string): Promise<{ global_path: string; config: EngramConfig } | undefined> {
  const roots = scopeRoots(cwd);
  const workspace = await readJson<Partial<EngramConfig>>(path.join(roots.workspace, 'engram.config.json'), {});
  const legacy = await readJson<Partial<EngramConfig>>(path.join(cwd, LEGACY_ENGRAM_DIR, 'engram.config.json'), {});
  const user = await readJson<Partial<EngramConfig>>(userConfigPath(), {});
  const configured = process.env.ENGRAM_GLOBAL_DIR?.trim()
    || stringValue(workspace.global_path)
    || stringValue(legacy.global_path)
    || stringValue(user.global_path);
  if (!configured) return undefined;
  const globalPath = path.resolve(configured);
  if (!(await exists(globalPath))) return undefined;
  const global = await readJson<Partial<EngramConfig>>(path.join(globalPath, 'engram.config.json'), {});
  let config = defaultConfig();
  for (const found of [global, user, legacy, workspace]) config = mergeConfig(config, found);
  config.global_path = globalPath;
  return { global_path: globalPath, config };
}

function defaultProfileFromStore(store: ProfileStore): string {
  const names = Object.keys(store.profiles).sort();
  if (names.length === 1) return names[0];
  const machine = machineProfileName();
  return store.profiles[machine] ? machine : '';
}

function uniqueProfileName(store: ProfileStore, preferred: string, globalPath: string): string {
  const resolved = path.resolve(globalPath);
  if (!store.profiles[preferred] || path.resolve(store.profiles[preferred].global_path) === resolved) return preferred;
  for (let index = 2; index <= 99; index += 1) {
    const candidate = `${preferred}-${index}`;
    if (!store.profiles[candidate] || path.resolve(store.profiles[candidate].global_path) === resolved) return candidate;
  }
  return preferred;
}

function sanitizeProfileName(value: string): string {
  const cleaned = value
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^[^a-zA-Z0-9]+/g, '')
    .replace(/[^a-zA-Z0-9]+$/g, '')
    .slice(0, 64);
  return cleaned || 'default';
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}
