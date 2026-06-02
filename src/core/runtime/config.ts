/** Configuration discovery, defaults, and scope path resolution. */
import path from 'node:path';
import { homedir } from 'node:os';
import { ENGRAM_DIR, LEGACY_ENGRAM_DIR, VERSION } from './constants.js';
import type { EngramConfig, Scope } from './types.js';
import { exists, readJson, writeJson } from '../system/fsx.js';

/** Return the OS-specific default global memory path. */
export function defaultGlobalPath(): string {
  return path.join(homedir(), 'Documents', 'engram');
}

/** Return the user-level Engram config path used by global-only init. */
export function userConfigDir(): string {
  const configured = process.env.ENGRAM_CONFIG_DIR?.trim();
  return configured ? path.resolve(configured) : path.join(homedir(), '.engram');
}

/** Return the user-level Engram config path used by global-only init. */
export function userConfigPath(): string {
  return path.join(userConfigDir(), 'engram.config.json');
}

/** Return the default config written during init. */
export function defaultConfig(): EngramConfig {
  return {
    version: VERSION,
    enabled: true,
    global_path: '',
    scope: 'workspace',
    update: 'auto',
    read: 'auto',
    ignore: {
      source: 'engramignore',
      gitignore_path: '.gitignore',
      engramignore_path: '.engramignore',
      global_engramignore: true,
      also_ignore: ['*.secret', 'private/**']
    },
    roles: [],
    live_sync: { enabled: false, targets: ['agents-md', 'claude-md', 'cursorrules'] },
    global_git: { enabled: true, remote: 'origin', branch: 'main', auto_sync: true, auto_resolve: true },
    rule_variants: { enabled: false, active: 'balanced' },
    graph: { enabled: true, max_related: 4, min_related_score: 0.22 },
    pattern_mining: { enabled: false, threshold: 3, lookback_sessions: 20 },
    pr_workflow: { enabled: false, target_branch: 'main' },
    encryption: { enabled: false, scope: 'global', key_source: 'portable-file' }
  };
}

/** Resolve workspace and global memory roots. */
export function scopeRoots(cwd = process.cwd()): Record<Scope, string> {
  return { workspace: workspaceRoot(cwd), global: resolveGlobalRoot() };
}

/** Resolve roots using a loaded config, with ENGRAM_GLOBAL_DIR as override. */
export function scopeRootsForConfig(cwd: string, config: EngramConfig): Record<Scope, string> {
  return { workspace: workspaceRoot(cwd), global: resolveGlobalRoot(config.global_path) };
}

/** Load workspace config with default fallback. */
export async function loadConfig(cwd = process.cwd()): Promise<EngramConfig> {
  const roots = scopeRoots(cwd);
  const file = path.join(roots.workspace, 'engram.config.json');
  const legacyFile = path.join(cwd, LEGACY_ENGRAM_DIR, 'engram.config.json');
  const workspace = await readJson<Partial<EngramConfig>>(file, {});
  const legacy = await readJson<Partial<EngramConfig>>(legacyFile, {});
  const user = await readJson<Partial<EngramConfig>>(userConfigPath(), {});
  const globalPath = process.env.ENGRAM_GLOBAL_DIR?.trim()
    || stringValue(workspace.global_path)
    || stringValue(legacy.global_path)
    || stringValue(user.global_path);
  const global = globalPath ? await readJson<Partial<EngramConfig>>(path.join(path.resolve(globalPath), 'engram.config.json'), {}) : {};
  let config = defaultConfig();
  for (const found of [global, user, legacy, workspace]) config = mergeConfig(config, found);
  return config;
}

/** Merge a partial config without losing nested defaults. */
export function mergeConfig(base: EngramConfig, found: Partial<EngramConfig>): EngramConfig {
  return {
    ...base,
    ...found,
    global_path: typeof found.global_path === 'string' ? found.global_path : base.global_path,
    ignore: { ...base.ignore, ...(found.ignore ?? {}) },
    live_sync: { ...base.live_sync, ...(found.live_sync ?? {}) },
    global_git: { ...base.global_git, ...(found.global_git ?? {}) },
    rule_variants: { ...base.rule_variants, ...(found.rule_variants ?? {}) },
    graph: { ...base.graph, ...(found.graph ?? {}) },
    pattern_mining: { ...base.pattern_mining, ...(found.pattern_mining ?? {}) },
    pr_workflow: { ...base.pr_workflow, ...(found.pr_workflow ?? {}) },
    encryption: { ...base.encryption, ...(found.encryption ?? {}) }
  };
}

/** Persist global-only settings outside any workspace. */
export async function writeUserConfig(update: Partial<EngramConfig>): Promise<string> {
  const file = userConfigPath();
  const current = await readJson<Partial<EngramConfig>>(file, {});
  const merged = mergeConfig(mergeConfig(defaultConfig(), current), update);
  await writeJson(file, merged);
  return file;
}

/** Persist runtime config to the active workspace, or to user config for global-only sessions. */
export async function writeConfig(cwd: string, config: EngramConfig): Promise<string> {
  const file = path.join(workspaceRoot(cwd), 'engram.config.json');
  const root = workspaceRoot(cwd);
  if (await exists(file) || await exists(root) || config.scope !== 'global') {
    await writeJson(file, config);
    return file;
  }
  return writeUserConfig(config);
}

/** Expand a scope setting into concrete write scopes. */
export function writeScopes(scope: EngramConfig['scope'], config?: EngramConfig): Scope[] {
  const scopes: Scope[] = scope === 'both' ? ['workspace', 'global'] : [scope];
  if (!config || resolveGlobalRoot(config.global_path)) return scopes;
  return scopes.filter((current) => current !== 'global');
}

/** Return the configured workspace memory root. */
export function workspaceRoot(cwd = process.cwd()): string {
  return path.join(cwd, ENGRAM_DIR);
}

/** Return the legacy workspace memory root used before .agents/.engram. */
export function legacyWorkspaceRoot(cwd = process.cwd()): string {
  return path.join(cwd, LEGACY_ENGRAM_DIR);
}

/** Return the active global root, or an empty string when global memory is disabled. */
export function resolveGlobalRoot(configured = ''): string {
  const env = process.env.ENGRAM_GLOBAL_DIR?.trim();
  const configuredPath = typeof configured === 'string' ? configured.trim() : '';
  const chosen = env || configuredPath;
  return chosen ? path.resolve(chosen) : '';
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}
