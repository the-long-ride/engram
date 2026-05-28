/** Configuration discovery, defaults, and scope path resolution. */
import path from 'node:path';
import { homedir } from 'node:os';
import { ENGRAM_DIR, VERSION } from './constants.js';
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
    global_path: defaultGlobalPath(),
    scope: 'both',
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
  const globalRoot = process.env.ENGRAM_GLOBAL_DIR || defaultGlobalPath();
  return { workspace: path.join(cwd, ENGRAM_DIR), global: globalRoot };
}

/** Resolve roots using a loaded config, with ENGRAM_GLOBAL_DIR as override. */
export function scopeRootsForConfig(cwd: string, config: EngramConfig): Record<Scope, string> {
  const globalRoot = process.env.ENGRAM_GLOBAL_DIR || config.global_path || defaultGlobalPath();
  return { workspace: path.join(cwd, ENGRAM_DIR), global: globalRoot };
}

/** Load workspace config with default fallback. */
export async function loadConfig(cwd = process.cwd()): Promise<EngramConfig> {
  const roots = scopeRoots(cwd);
  const file = path.join(roots.workspace, 'engram.config.json');
  const found = await readJson<Partial<EngramConfig>>(file, {});
  return mergeConfig(defaultConfig(), found);
}

/** Merge a partial config without losing nested defaults. */
export function mergeConfig(base: EngramConfig, found: Partial<EngramConfig>): EngramConfig {
  return {
    ...base,
    ...found,
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
export function writeScopes(scope: EngramConfig['scope']): Scope[] {
  if (scope === 'both') return ['workspace', 'global'];
  return [scope];
}
