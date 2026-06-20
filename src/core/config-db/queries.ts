/** Typed CRUD for config-db tables, plus config flatten/unflatten utilities. */
import type { EngramConfig, ProfileRow, WorkspaceRow } from '../runtime/types.js';
import { defaultConfig } from '../runtime/config.js';

/** Normalize SQLite integer booleans back to JS booleans. */
function normWs(row: any): WorkspaceRow {
  if (!row) return row;
  return { ...row, is_linked: Boolean(row.is_linked) };
}

function normProfile(row: any): ProfileRow {
  if (!row) return row;
  return { ...row, is_active: Boolean(row.is_active) };
}

// ── Workspaces ──

export function upsertWorkspace(db: any, workspacePath: string, name = ''): WorkspaceRow {
  const now = isoNow();
  const existing = db.prepare('select id from workspaces where path = ?').get(workspacePath) as { id: number } | undefined;
  if (existing) {
    db.prepare('update workspaces set name = case when ? != \'\' then ? else name end, last_seen = ?, updated_at = ? where id = ?')
      .run(name, name, now, now, existing.id);
    return normWs(db.prepare('select * from workspaces where id = ?').get(existing.id) as WorkspaceRow);
  }
  db.prepare('insert into workspaces(path, name, last_seen, updated_at) values (?, ?, ?, ?)')
    .run(workspacePath, name, now, now);
  return normWs(db.prepare('select * from workspaces where path = ?').get(workspacePath) as WorkspaceRow);
}

export function listWorkspaces(db: any): WorkspaceRow[] {
  return ((db.prepare('select * from workspaces order by updated_at desc').all() ?? []) as WorkspaceRow[]).map(normWs);
}

export function getWorkspaceByPath(db: any, workspacePath: string): WorkspaceRow | undefined {
  return normWs(db.prepare('select * from workspaces where path = ?').get(workspacePath) as WorkspaceRow | undefined);
}

export function getWorkspaceById(db: any, id: number): WorkspaceRow | undefined {
  return normWs(db.prepare('select * from workspaces where id = ?').get(id) as WorkspaceRow | undefined);
}

export function deleteWorkspace(db: any, workspacePath: string): void {
  db.prepare('delete from workspaces where path = ?').run(workspacePath);
}

export function setWorkspaceLinked(db: any, workspacePath: string, linked: boolean): void {
  db.prepare('update workspaces set is_linked = ? where path = ?').run(linked ? 1 : 0, workspacePath);
}

// ── Workspace Config ──

export function getWorkspaceConfig(db: any, workspaceId: number): Record<string, string> {
  const rows = db.prepare('select key, value from workspace_config where workspace_id = ?').all(workspaceId) ?? [];
  return Object.fromEntries(rows.map((row: any) => [String(row.key), String(row.value)]));
}

export function setWorkspaceConfigKey(db: any, workspaceId: number, key: string, value: string): void {
  const now = isoNow();
  db.prepare('insert into workspace_config(workspace_id, key, value, updated_at) values (?, ?, ?, ?) on conflict(workspace_id, key) do update set value = excluded.value, updated_at = excluded.updated_at')
    .run(workspaceId, key, value, now);
}

export function deleteWorkspaceConfigKey(db: any, workspaceId: number, key: string): void {
  db.prepare('delete from workspace_config where workspace_id = ? and key = ?').run(workspaceId, key);
}

export function setWorkspaceConfig(db: any, workspaceId: number, entries: Record<string, string>): void {
  const now = isoNow();
  const stmt = db.prepare('insert into workspace_config(workspace_id, key, value, updated_at) values (?, ?, ?, ?) on conflict(workspace_id, key) do update set value = excluded.value, updated_at = excluded.updated_at');
  for (const [key, value] of Object.entries(entries)) stmt.run(workspaceId, key, value, now);
}

// ── User Config ──

export function getUserConfig(db: any): Record<string, string> {
  const rows = db.prepare('select key, value from user_config').all() ?? [];
  return Object.fromEntries(rows.map((row: any) => [String(row.key), String(row.value)]));
}

export function setUserConfigKey(db: any, key: string, value: string): void {
  const now = isoNow();
  db.prepare('insert into user_config(key, value, updated_at) values (?, ?, ?) on conflict(key) do update set value = excluded.value, updated_at = excluded.updated_at')
    .run(key, value, now);
}

export function setUserConfig(db: any, entries: Record<string, string>): void {
  const now = isoNow();
  const stmt = db.prepare('insert into user_config(key, value, updated_at) values (?, ?, ?) on conflict(key) do update set value = excluded.value, updated_at = excluded.updated_at');
  for (const [key, value] of Object.entries(entries)) stmt.run(key, value, now);
}

// ── Profiles ──

export function listProfiles(db: any): ProfileRow[] {
  return ((db.prepare('select * from profiles order by name').all() ?? []) as ProfileRow[]).map(normProfile);
}

export function getProfile(db: any, name: string): ProfileRow | undefined {
  return normProfile(db.prepare('select * from profiles where name = ?').get(name) as ProfileRow | undefined);
}

export function upsertProfile(db: any, name: string, globalPath: string, scope = 'global'): void {
  const now = isoNow();
  db.prepare('insert into profiles(name, global_path, scope, updated_at) values (?, ?, ?, ?) on conflict(name) do update set global_path = excluded.global_path, scope = excluded.scope, updated_at = excluded.updated_at')
    .run(name, globalPath, scope, now);
}

export function deleteProfile(db: any, name: string): void {
  db.prepare('delete from profiles where name = ?').run(name);
}

export function setActiveProfile(db: any, name: string): void {
  db.prepare('update profiles set is_active = 0').run();
  db.prepare('update profiles set is_active = 1 where name = ?').run(name);
}

export function getActiveProfile(db: any): ProfileRow | undefined {
  return normProfile(db.prepare('select * from profiles where is_active = 1').get() as ProfileRow | undefined);
}

// ── Config flatten/unflatten ──

/** Dotted keys that consumers are allowed to read/write through the generic set/get interface. */
const ALLOWED_KEYS = new Set([
  'scope', 'read', 'proof', 'enabled',
  'roles', 'version', 'default_profile',
  'theme',
  'load.limit',
  'graph.enabled', 'graph.max_related', 'graph.min_related_score',
  'vector.enabled', 'vector.provider', 'vector.auto_threshold', 'vector.candidate_pool', 'vector.dimensions',
  'rule_variants.enabled', 'rule_variants.active',
  'live_sync.enabled',
  'pattern_mining.enabled', 'pattern_mining.threshold', 'pattern_mining.lookback_sessions',
  'pr_workflow.enabled', 'pr_workflow.target_branch',
  'encryption.enabled', 'encryption.scope', 'encryption.key_source',
  'global_path',
  'global_git.enabled', 'global_git.remote', 'global_git.branch', 'global_git.auto_sync', 'global_git.auto_resolve',
]);

export function configKeyToColumn(key: string): string | undefined {
  const clean = key.trim().toLowerCase();
  return ALLOWED_KEYS.has(clean) ? clean : undefined;
}

/** Flatten EngramConfig into dotted key → string map for DB storage. */
export function flattenConfig(config: EngramConfig): Record<string, string> {
  const out: Record<string, string> = {};
  out['scope'] = config.scope;
  out['read'] = config.read;
  out['proof'] = config.proof;
  out['enabled'] = String(config.enabled);
  out['version'] = config.version;
  out['default_profile'] = config.default_profile ?? '';
  out['roles'] = JSON.stringify(config.roles);
  out['global_path'] = config.global_path;
  out['theme'] = config.theme ?? 'dark';
  out['load.limit'] = String(config.load.limit);
  out['graph.enabled'] = String(config.graph.enabled);
  out['graph.max_related'] = String(config.graph.max_related);
  out['graph.min_related_score'] = String(config.graph.min_related_score);
  out['vector.enabled'] = String(config.vector.enabled);
  out['vector.provider'] = config.vector.provider;
  out['vector.auto_threshold'] = String(config.vector.auto_threshold);
  out['vector.candidate_pool'] = String(config.vector.candidate_pool);
  out['vector.dimensions'] = String(config.vector.dimensions);
  out['rule_variants.enabled'] = String(config.rule_variants.enabled);
  out['rule_variants.active'] = config.rule_variants.active;
  out['live_sync.enabled'] = String(config.live_sync.enabled);
  out['pattern_mining.enabled'] = String(config.pattern_mining.enabled);
  out['pattern_mining.threshold'] = String(config.pattern_mining.threshold);
  out['pattern_mining.lookback_sessions'] = String(config.pattern_mining.lookback_sessions);
  out['pr_workflow.enabled'] = String(config.pr_workflow.enabled);
  out['pr_workflow.target_branch'] = config.pr_workflow.target_branch;
  out['encryption.enabled'] = String(config.encryption.enabled);
  out['encryption.scope'] = config.encryption.scope;
  out['encryption.key_source'] = config.encryption.key_source;
  out['global_git.enabled'] = String(config.global_git.enabled);
  out['global_git.remote'] = config.global_git.remote;
  out['global_git.branch'] = config.global_git.branch;
  out['global_git.auto_sync'] = String(config.global_git.auto_sync);
  out['global_git.auto_resolve'] = String(config.global_git.auto_resolve);
  return out;
}

/** Unflatten dotted key → string map back to Partial<EngramConfig>. */
export function unflattenConfig(kv: Record<string, string>): Partial<EngramConfig> {
  const out: Record<string, any> = {};
  const d = defaultConfig();
  for (const [key, value] of Object.entries(kv)) {
    if (value === undefined || value === null) continue;
    switch (key) {
      case 'scope': out.scope = ['both', 'workspace', 'global'].includes(value) ? value as any : d.scope; break;
      case 'read': out.read = ['startup', 'auto', 'manual', 'off', 'always'].includes(value) ? value as any : d.read; break;
      case 'proof': out.proof = ['off', 'compact'].includes(value) ? value as any : d.proof; break;
      case 'enabled': out.enabled = value === 'true'; break;
      case 'version': out.version = value; break;
      case 'default_profile': out.default_profile = value || undefined; break;
      case 'roles': try { out.roles = JSON.parse(value); } catch { out.roles = d.roles; } break;
      case 'global_path': out.global_path = value; break;
      case 'theme': out.theme = ['light', 'dark'].includes(value) ? value as any : d.theme; break;
      case 'load.limit': out.load = { ...(out.load ?? {}), limit: intOr(value, d.load.limit) }; break;
      case 'graph.enabled': out.graph = { ...(out.graph ?? {}), enabled: value === 'true' }; break;
      case 'graph.max_related': out.graph = { ...(out.graph ?? {}), max_related: intOr(value, d.graph.max_related) }; break;
      case 'graph.min_related_score': out.graph = { ...(out.graph ?? {}), min_related_score: floatOr(value, d.graph.min_related_score) }; break;
      case 'vector.enabled': out.vector = { ...(out.vector ?? {}), enabled: value === 'true' }; break;
      case 'vector.provider': out.vector = { ...(out.vector ?? {}), provider: value as any }; break;
      case 'vector.auto_threshold': out.vector = { ...(out.vector ?? {}), auto_threshold: intOr(value, d.vector.auto_threshold) }; break;
      case 'vector.candidate_pool': out.vector = { ...(out.vector ?? {}), candidate_pool: intOr(value, d.vector.candidate_pool) }; break;
      case 'vector.dimensions': out.vector = { ...(out.vector ?? {}), dimensions: intOr(value, d.vector.dimensions) }; break;
      case 'rule_variants.enabled': out.rule_variants = { ...(out.rule_variants ?? {}), enabled: value === 'true' }; break;
      case 'rule_variants.active': out.rule_variants = { ...(out.rule_variants ?? {}), active: value as any }; break;
      case 'live_sync.enabled': out.live_sync = { ...(out.live_sync ?? {}), enabled: value === 'true' }; break;
      case 'pattern_mining.enabled': out.pattern_mining = { ...(out.pattern_mining ?? {}), enabled: value === 'true' }; break;
      case 'pattern_mining.threshold': out.pattern_mining = { ...(out.pattern_mining ?? {}), threshold: intOr(value, d.pattern_mining.threshold) }; break;
      case 'pattern_mining.lookback_sessions': out.pattern_mining = { ...(out.pattern_mining ?? {}), lookback_sessions: intOr(value, d.pattern_mining.lookback_sessions) }; break;
      case 'pr_workflow.enabled': out.pr_workflow = { ...(out.pr_workflow ?? {}), enabled: value === 'true' }; break;
      case 'pr_workflow.target_branch': out.pr_workflow = { ...(out.pr_workflow ?? {}), target_branch: value }; break;
      case 'encryption.enabled': out.encryption = { ...(out.encryption ?? {}), enabled: value === 'true' }; break;
      case 'encryption.scope': out.encryption = { ...(out.encryption ?? {}), scope: value as any }; break;
      case 'encryption.key_source': out.encryption = { ...(out.encryption ?? {}), key_source: value }; break;
      case 'global_git.enabled': out.global_git = { ...(out.global_git ?? {}), enabled: value === 'true' }; break;
      case 'global_git.remote': out.global_git = { ...(out.global_git ?? {}), remote: value }; break;
      case 'global_git.branch': out.global_git = { ...(out.global_git ?? {}), branch: value }; break;
      case 'global_git.auto_sync': out.global_git = { ...(out.global_git ?? {}), auto_sync: value === 'true' }; break;
      case 'global_git.auto_resolve': out.global_git = { ...(out.global_git ?? {}), auto_resolve: value === 'true' }; break;
    }
  }
  return out;
}

function intOr(value: string, fallback: number): number {
  const n = Number(value);
  return Number.isSafeInteger(n) ? n : fallback;
}

function floatOr(value: string, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function isoNow(): string {
  return new Date().toISOString();
}