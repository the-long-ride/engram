/** Configuration discovery, defaults, and scope path resolution. */
import path from 'node:path';
import { homedir } from 'node:os';
import { ENGRAM_DIR, LEGACY_ENGRAM_DIR, VERSION } from './constants.js';
import type { EngramConfig, EngramProfile, ProfileResolution, ProfileStore, ProfileSource, Scope } from './types.js';
import { DEFAULT_LOAD_LIMIT } from './load-limit.js';
import { exists, readJson, writeJson } from '../system/fsx.js';
import { openConfigDb, ensureSchema } from '../config-db/schema.js';

const PROFILE_STORE_FILE = 'profiles.json';
const PROFILE_RESOLUTION = '__engram_profile_resolution';

async function importQueries(): Promise<any> {
  const url = new URL('../config-db/queries.js', import.meta.url).href;
  return import(url);
}

/** Load EngramConfig from SQLite DB (DB-first). Returns undefined when DB unavailable or empty → fall through to JSON. */
export async function configFromDb(cwd: string, options: { profile?: string } = {}): Promise<EngramConfig | undefined> {
  const dbh = await openConfigDb();
  if (!dbh) return undefined;
  try {
    ensureSchema(dbh.db);
    const q = await importQueries();

    // Layer 1: user_config (lowest priority)
    const userKv = q.getUserConfig(dbh.db);
    const profileRows = q.listProfiles(dbh.db);
    const ws = q.getWorkspaceByPath(dbh.db, cwd);
    const wsKv = ws ? q.getWorkspaceConfig(dbh.db, ws.id) : {};

    // Nothing in DB → return undefined so JSON fallback kicks in
    if (Object.keys(userKv).length === 0 && profileRows.length === 0 && Object.keys(wsKv).length === 0) {
      return undefined;
    }

    const loaded = defaultConfig();

    if (Object.keys(userKv).length > 0) {
      const partial = q.unflattenConfig(userKv);
      mergeConfigInto(loaded, partial);
    }

    // Layer 2: active profile (middle priority)
    const activeProfile = q.getActiveProfile(dbh.db);
    const explicitProfile = options.profile?.trim() || process.env.ENGRAM_PROFILE?.trim();
    if (explicitProfile) {
      const profile = q.getProfile(dbh.db, explicitProfile);
      if (profile) {
        loaded.global_path = profile.global_path;
        if (profile.scope && ['workspace', 'global', 'both'].includes(profile.scope)) {
          loaded.scope = profile.scope as EngramConfig['scope'];
        }
      }
    } else if (activeProfile) {
      loaded.global_path = activeProfile.global_path;
      if (activeProfile.scope && ['workspace', 'global', 'both'].includes(activeProfile.scope)) {
        loaded.scope = activeProfile.scope as EngramConfig['scope'];
      }
    }

    // Layer 3: workspace_config (highest priority)
    if (Object.keys(wsKv).length > 0) {
      const wsPartial = q.unflattenConfig(wsKv);
      delete wsPartial.theme;
      // Profile global_path still wins over workspace DB config.
      const profileGlobalPath = (explicitProfile || activeProfile) ? loaded.global_path : undefined;
      mergeConfigInto(loaded, wsPartial);
      if (profileGlobalPath) loaded.global_path = profileGlobalPath;
    }

    // JSON overlay fills gaps only — DB keys already set win over JSON for the same key.
    // Profile global_path still wins over workspace JSON.
    const dbKeys = new Set([
      ...Object.keys(userKv).map((k) => k.trim().toLowerCase()),
      ...Object.keys(wsKv).map((k) => k.trim().toLowerCase())
    ]);
    const workspaceJson = await readJson<Partial<EngramConfig>>(path.join(workspaceRoot(cwd), 'engram.config.json'), {});
    const legacyJson = await readJson<Partial<EngramConfig>>(path.join(cwd, LEGACY_ENGRAM_DIR, 'engram.config.json'), {});
    const hasActiveProfile = Boolean(activeProfile || explicitProfile);
    if (Object.keys(workspaceJson).length > 0) {
      const gapFiller = jsonGapFiller(workspaceJson, dbKeys);
      if (hasActiveProfile) delete gapFiller.global_path; // profile global_path wins
      mergeConfigInto(loaded, gapFiller);
    }
    if (Object.keys(legacyJson).length > 0) {
      const gapFiller = jsonGapFiller(legacyJson, dbKeys);
      if (hasActiveProfile) delete gapFiller.global_path;
      mergeConfigInto(loaded, gapFiller);
    }

    // Resolve global_path from env override if profile not active
    const envGlobal = process.env.ENGRAM_GLOBAL_DIR?.trim();
    if (envGlobal && !activeProfile && !explicitProfile) {
      loaded.global_path = envGlobal;
    }

    return loaded;
  } finally {
    dbh.close();
  }
}

/** Return only keys from a JSON partial that are NOT already set in the DB. Nested keys are checked as "parent.child" dotted form. */
function jsonGapFiller(json: Partial<EngramConfig>, dbKeys: Set<string>): Partial<EngramConfig> {
  const out: Record<string, any> = {};
  for (const [key, value] of Object.entries(json)) {
    if (value === undefined || value === null) continue;
    if (typeof value === 'object' && !Array.isArray(value)) {
      const filtered: Record<string, any> = {};
      for (const [subKey, subValue] of Object.entries(value as Record<string, any>)) {
        if (!dbKeys.has(`${key}.${subKey}`)) filtered[subKey] = subValue;
      }
      if (Object.keys(filtered).length > 0) out[key] = filtered;
    } else {
      if (!dbKeys.has(key)) out[key] = value;
    }
  }
  return out as Partial<EngramConfig>;
}

/** Mutate base with partial using the same merge logic as mergeConfig. */
function mergeConfigInto(base: EngramConfig, partial: Partial<EngramConfig>): void {
  if (typeof partial.global_path === 'string' && partial.global_path) base.global_path = partial.global_path;
  if (typeof partial.scope === 'string') base.scope = partial.scope;
  if (typeof partial.read === 'string') base.read = partial.read;
  if (typeof partial.proof === 'string') base.proof = partial.proof;
  if (typeof partial.enabled === 'boolean') base.enabled = partial.enabled;
  if (typeof partial.version === 'string') base.version = partial.version;
  if (typeof partial.default_profile === 'string') base.default_profile = partial.default_profile;
  if (typeof partial.theme === 'string') base.theme = partial.theme as any;
  if (partial.roles) base.roles = partial.roles;
  if (partial.ignore) Object.assign(base.ignore, partial.ignore);
  if (partial.live_sync) Object.assign(base.live_sync, partial.live_sync);
  if (partial.global_git) Object.assign(base.global_git, partial.global_git);
  if (partial.rule_variants) Object.assign(base.rule_variants, partial.rule_variants);
  if (partial.load) Object.assign(base.load, partial.load);
  if (partial.graph) Object.assign(base.graph, partial.graph);
  if (partial.vector) Object.assign(base.vector, partial.vector);
  if (partial.pattern_mining) Object.assign(base.pattern_mining, partial.pattern_mining);
  if (partial.pr_workflow) Object.assign(base.pr_workflow, partial.pr_workflow);
  if (partial.encryption) Object.assign(base.encryption, partial.encryption);
}

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

/** Return the user-level profile registry path. */
export function userProfilesPath(): string {
  return path.join(userConfigDir(), PROFILE_STORE_FILE);
}

/** Return the default config written during init. */
export function defaultConfig(): EngramConfig {
  return {
    version: VERSION,
    enabled: true,
    theme: 'dark',
    global_path: '',
    scope: 'both',
    update: 'auto',
    read: 'auto',
    proof: 'off',
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
    load: { limit: DEFAULT_LOAD_LIMIT },
    graph: { enabled: true, max_related: 4, min_related_score: 0.22 },
    vector: { enabled: true, provider: 'sqlite-vec', auto_threshold: 100, candidate_pool: 24, dimensions: 64 },
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
  const profile = profileResolutionForConfig(config);
  return { workspace: workspaceRoot(cwd), global: resolveGlobalRoot(config.global_path, { ignoreEnv: Boolean(profile.active) }) };
}

/** Load workspace config (DB-first with JSON fallback). */
export async function loadConfig(cwd = process.cwd(), options: { profile?: string } = {}): Promise<EngramConfig> {
  // Try DB first
  const dbConfig = await configFromDb(cwd, options);
  if (dbConfig) {
    const profile = await resolveProfile(cwd, options.profile);
    attachProfileResolution(dbConfig, profile);
    return dbConfig;
  }

  // JSON fallback — existing logic unchanged
  const roots = scopeRoots(cwd);
  const file = path.join(roots.workspace, 'engram.config.json');
  const legacyFile = path.join(cwd, LEGACY_ENGRAM_DIR, 'engram.config.json');
  const workspace = await readJson<Partial<EngramConfig>>(file, {});
  delete workspace.theme;
  const legacy = await readJson<Partial<EngramConfig>>(legacyFile, {});
  delete legacy.theme;
  const user = await readJson<Partial<EngramConfig>>(userConfigPath(), {});
  const profile = await resolveProfileForConfigs(cwd, workspace, legacy, user, options.profile);
  const globalPath = profile.active
    ? profile.global_path
    : process.env.ENGRAM_GLOBAL_DIR?.trim()
      || stringValue(workspace.global_path)
      || stringValue(legacy.global_path)
      || stringValue(user.global_path);
  const global = globalPath ? await readJson<Partial<EngramConfig>>(path.join(path.resolve(globalPath), 'engram.config.json'), {}) : {};
  let config = defaultConfig();
  for (const found of [global, user, profileConfig(profile), legacy, workspace]) config = mergeConfig(config, found);
  config.global_path = globalPath ? path.resolve(globalPath) : '';
  attachProfileResolution(config, profile);
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
    load: { ...base.load, ...(found.load ?? {}) },
    graph: { ...base.graph, ...(found.graph ?? {}) },
    vector: { ...base.vector, ...(found.vector ?? {}) },
    pattern_mining: { ...base.pattern_mining, ...(found.pattern_mining ?? {}) },
    pr_workflow: { ...base.pr_workflow, ...(found.pr_workflow ?? {}) },
    encryption: { ...base.encryption, ...(found.encryption ?? {}) }
  };
}

/** Persist global-only settings outside any workspace (DB-first, JSON snapshot). */
export async function writeUserConfig(update: Partial<EngramConfig>): Promise<string> {
  const file = userConfigPath();
  const current = await readJson<Partial<EngramConfig>>(file, {});
  const merged = persistedConfig(mergeConfig(mergeConfig(defaultConfig(), current), update), current);

  // Write to DB first
  const dbh = await openConfigDb();
  if (dbh) {
    try {
      ensureSchema(dbh.db);
      const q = await importQueries();
      q.setUserConfig(dbh.db, q.flattenConfig(merged));
    } finally {
      dbh.close();
    }
  }

  // Always export JSON snapshot for backward compat
  await writeJson(file, merged);
  return file;
}

/** Persist runtime config to the active workspace, or to user config for global-only sessions (DB-first, JSON snapshot). */
export async function writeConfig(cwd: string, config: EngramConfig): Promise<string> {
  const file = path.join(workspaceRoot(cwd), 'engram.config.json');
  const root = workspaceRoot(cwd);
  const profile = profileResolutionForConfig(config);

  // Determine if workspace write or user-config write
  const isWorkspace = await exists(file) || await exists(root) || config.scope !== 'global';

  // Write to DB first
  const dbh = await openConfigDb();
  if (dbh) {
    try {
      ensureSchema(dbh.db);
      const q = await importQueries();
      if (isWorkspace) {
        // Auto-register workspace in DB
        const ws = q.upsertWorkspace(dbh.db, cwd, path.basename(cwd));
        q.setWorkspaceConfig(dbh.db, ws.id, q.flattenConfig(config));
      } else {
        q.setUserConfig(dbh.db, q.flattenConfig(config));
      }
    } finally {
      dbh.close();
    }
  }

  // Always export JSON snapshot for backward compat
  if (isWorkspace) {
    const current = await readJson<Partial<EngramConfig>>(file, {});
    const persisted = persistedConfig(config, current, profile);
    delete persisted.theme;
    await writeJson(file, persisted);
    return file;
  }
  const current = await readJson<Partial<EngramConfig>>(userConfigPath(), {});
  return writeUserConfig(persistedConfig(config, current, profile));
}

/** Read the user-level profile registry (JSON only for source of truth). */
export async function readProfileStore(): Promise<ProfileStore> {
  const found = await readJson<Partial<ProfileStore>>(userProfilesPath(), {});
  return {
    active_profile: stringValue(found.active_profile) || undefined,
    profiles: profileMap(found.profiles)
  };
}

/** Persist the full user-level profile registry (DB-first, JSON snapshot). */
export async function writeProfileStore(store: ProfileStore): Promise<string> {
  // Write to DB first
  const dbh = await openConfigDb();
  if (dbh) {
    try {
      ensureSchema(dbh.db);
      const q = await importQueries();
      for (const [name, profile] of Object.entries(store.profiles)) {
        q.upsertProfile(dbh.db, name, profile.global_path, profile.scope ?? 'global');
      }
      if (store.active_profile) q.setActiveProfile(dbh.db, store.active_profile);
    } finally {
      dbh.close();
    }
  }
  // Always export JSON snapshot for backward compat
  await writeJson(userProfilesPath(), {
    active_profile: store.active_profile || undefined,
    profiles: store.profiles
  });
  return userProfilesPath();
}

/** Resolve the selected profile and its global memory root. */
export async function resolveProfile(cwd = process.cwd(), explicitProfile?: string): Promise<ProfileResolution> {
  const roots = scopeRoots(cwd);
  const workspace = await readJson<Partial<EngramConfig>>(path.join(roots.workspace, 'engram.config.json'), {});
  const legacy = await readJson<Partial<EngramConfig>>(path.join(cwd, LEGACY_ENGRAM_DIR, 'engram.config.json'), {});
  const user = await readJson<Partial<EngramConfig>>(userConfigPath(), {});
  return resolveProfileForConfigs(cwd, workspace, legacy, user, explicitProfile);
}

/** Return runtime profile metadata attached by loadConfig. */
export function profileResolutionForConfig(config: EngramConfig): ProfileResolution {
  return (config as any)[PROFILE_RESOLUTION] ?? emptyProfileResolution();
}

/** Expand a scope setting into concrete write scopes. */
export function writeScopes(scope: EngramConfig['scope'], config?: EngramConfig): Scope[] {
  const scopes: Scope[] = scope === 'both' ? ['workspace', 'global'] : [scope];
  if (!config || resolveGlobalRoot(config.global_path, { ignoreEnv: Boolean(profileResolutionForConfig(config).active) })) return scopes;
  return scopes.filter((current) => current !== 'global');
}

/** Return true when a value can be used as the default save target. */
export function isSaveTarget(value: string): value is EngramConfig['scope'] {
  return ['workspace', 'global', 'both'].includes(value);
}

/** Parse a user-provided save target with a command-specific label. */
export function parseSaveTarget(value: unknown, label = 'save target'): EngramConfig['scope'] {
  const target = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (isSaveTarget(target)) return target;
  throw new Error(`${label} must be workspace, global, or both`);
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
export function resolveGlobalRoot(configured = '', options: { ignoreEnv?: boolean } = {}): string {
  const env = options.ignoreEnv ? '' : process.env.ENGRAM_GLOBAL_DIR?.trim();
  const configuredPath = typeof configured === 'string' ? configured.trim() : '';
  const chosen = env || configuredPath;
  return chosen ? path.resolve(chosen) : '';
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

async function resolveProfileForConfigs(
  cwd: string,
  workspace: Partial<EngramConfig>,
  legacy: Partial<EngramConfig>,
  user: Partial<EngramConfig>,
  explicitProfile?: string
): Promise<ProfileResolution & { profile?: EngramProfile }> {
  const store = await readProfileStore();
  const workspaceDefault = stringValue(workspace.default_profile) || stringValue(legacy.default_profile);
  const userDefault = stringValue(store.active_profile) || stringValue(user.default_profile);
  const envProfile = stringValue(explicitProfile) || stringValue(process.env.ENGRAM_PROFILE);
  const source: ProfileSource = envProfile ? 'env' : workspaceDefault ? 'workspace' : userDefault ? 'user' : 'none';
  const active = envProfile || workspaceDefault || userDefault;
  const profile = active ? store.profiles[active] : undefined;
  const globalPath = profile?.global_path ? path.resolve(profile.global_path) : '';
  const workspaceAllowed = !active || !workspaceDefault || active === workspaceDefault || source === 'workspace';
  return {
    active,
    source,
    configured: !active || Boolean(profile),
    global_path: globalPath,
    workspace_default: workspaceDefault,
    user_default: userDefault,
    workspace_allowed: workspaceAllowed,
    profiles_path: userProfilesPath(),
    profile
  };
}

function profileConfig(profile: ProfileResolution & { profile?: EngramProfile }): Partial<EngramConfig> {
  if (!profile.active || !profile.profile) return {};
  return {
    global_path: profile.global_path,
    ...(profile.profile.scope ? { scope: profile.profile.scope } : {}),
    ...(profile.profile.global_git ? { global_git: profile.profile.global_git as EngramConfig['global_git'] } : {})
  };
}

function attachProfileResolution(config: EngramConfig, profile: ProfileResolution): void {
  Object.defineProperty(config, PROFILE_RESOLUTION, {
    value: withoutProfileObject(profile),
    enumerable: false,
    configurable: true
  });
}

function withoutProfileObject(profile: ProfileResolution & { profile?: EngramProfile }): ProfileResolution {
  const { profile: _profile, ...resolution } = profile;
  return resolution;
}

function emptyProfileResolution(): ProfileResolution {
  return {
    active: '',
    source: 'none',
    configured: true,
    global_path: '',
    workspace_default: '',
    user_default: '',
    workspace_allowed: true,
    profiles_path: userProfilesPath()
  };
}

function profileMap(value: unknown): Record<string, EngramProfile> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const out: Record<string, EngramProfile> = {};
  for (const [name, profile] of Object.entries(value as Record<string, Partial<EngramProfile>>)) {
    if (!isProfileName(name) || !profile || typeof profile !== 'object') continue;
    const globalPath = stringValue(profile.global_path);
    if (!globalPath) continue;
    const scope = profile.scope === 'workspace' || profile.scope === 'global' || profile.scope === 'both' ? profile.scope : undefined;
    out[name] = {
      global_path: path.resolve(globalPath),
      ...(scope ? { scope } : {}),
      ...(profile.global_git && typeof profile.global_git === 'object' ? { global_git: profile.global_git } : {})
    };
  }
  return out;
}

function isProfileName(value: string): boolean {
  return /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/.test(value);
}

function persistedConfig(config: EngramConfig, current: Partial<EngramConfig>, profile = profileResolutionForConfig(config)): EngramConfig {
  const persisted = { ...config };
  if (profile.active && profile.global_path && path.resolve(persisted.global_path || '.') === profile.global_path) {
    persisted.global_path = stringValue(current.global_path);
  }
  return persisted;
}
