/** Configuration discovery, defaults, and scope path resolution. */
import path from 'node:path';
import { homedir } from 'node:os';
import { ENGRAM_DIR, LEGACY_ENGRAM_DIR, VERSION } from './constants.js';
import type { EngramConfig, Scope } from './types.js';
import { readJson } from '../system/fsx.js';

/** Return the OS-specific default global memory path. */
export function defaultGlobalPath(): string {
  return path.join(homedir(), 'Documents', 'engram');
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
  const found = await readJson<Partial<EngramConfig>>(file, await readJson<Partial<EngramConfig>>(legacyFile, {}));
  return mergeConfig(defaultConfig(), found);
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
    pattern_mining: { ...base.pattern_mining, ...(found.pattern_mining ?? {}) },
    pr_workflow: { ...base.pr_workflow, ...(found.pr_workflow ?? {}) },
    encryption: { ...base.encryption, ...(found.encryption ?? {}) }
  };
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
