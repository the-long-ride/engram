/** Control panel data API and write handlers. */
import { openConfigDb, isConfigDbUsable } from '../config-db/schema.js';
import { loadConfig, writeUserConfig, readProfileStore, writeProfileStore, workspaceRoot, legacyWorkspaceRoot } from '../runtime/config.js';
import { exists } from '../system/fsx.js';

async function importQueries(): Promise<any> {
  const url = new URL('../config-db/queries.js', import.meta.url).href;
  return import(url);
}

export interface EntrySection {
  group: string;
  rows: Array<[string, string]>;
}

export interface PanelData {
  config: any;
  workspaces: any[];
  profiles: any[];
  entry: EntrySection[];
  sqliteAvailable: boolean;
  cwd: string;
  version: string;
  isInitialized: boolean;
}

export async function loadPanelData(cwd: string, entryText: string): Promise<PanelData> {
  const config = await loadConfig(cwd);
  const entry = parseEntryText(entryText);
  const version = (config as any).version ?? '';
  const isInitialized = await exists(workspaceRoot(cwd)) || await exists(legacyWorkspaceRoot(cwd));
  const dbh = await openConfigDb();
  if (!dbh) {
    return { config, workspaces: [], profiles: [], entry, sqliteAvailable: false, cwd, version, isInitialized };
  }
  try {
    if (!isConfigDbUsable(dbh.db)) {
      return { config, workspaces: [], profiles: [], entry, sqliteAvailable: false, cwd, version, isInitialized };
    }
    const q = await importQueries();
    return {
      config,
      workspaces: q.listWorkspaces(dbh.db),
      profiles: q.listProfiles(dbh.db),
      entry,
      sqliteAvailable: true,
      cwd,
      version,
      isInitialized
    };
  } finally {
    dbh.close();
  }
}

const ALLOWED = new Set([
  'scope', 'read', 'proof', 'enabled', 'roles', 'default_profile',
  'theme',
  'load.limit',
  'graph.enabled', 'graph.max_related', 'graph.min_related_score',
  'vector.enabled', 'vector.auto_threshold', 'vector.candidate_pool', 'vector.dimensions',
  'rule_variants.enabled', 'rule_variants.active',
  'live_sync.enabled',
  'pattern_mining.enabled', 'pattern_mining.threshold', 'pattern_mining.lookback_sessions',
  'pr_workflow.enabled', 'pr_workflow.target_branch',
  'encryption.enabled', 'encryption.scope', 'encryption.key_source',
  'global_path',
  'global_git.enabled', 'global_git.remote', 'global_git.branch',
  'global_git.auto_sync', 'global_git.auto_resolve',
]);

export async function apiConfigSet(key: string, value: string, cwd: string): Promise<string> {
  if (!ALLOWED.has(key)) throw new Error('unknown config key: ' + key);
  const dbh = await openConfigDb();
  if (dbh) {
    try {
    if (!isConfigDbUsable(dbh.db)) return 'Set ' + key + ' = ' + value + ' (SQLite unavailable; JSON only)';
    const q = await importQueries();
    q.setUserConfigKey(dbh.db, key, value);
    } finally {
      dbh.close();
    }
  }
  const config = await loadConfig(cwd);
  applyDotted(config as any, key, value);
  await writeUserConfig(config);
  return 'Set ' + key + ' = ' + value;
}

export async function apiWorkspaceAdd(wsPath: string, name: string): Promise<string> {
  const dbh = await openConfigDb();
  if (!dbh) throw new Error('SQLite unavailable');
  try {
    if (!isConfigDbUsable(dbh.db)) throw new Error('SQLite unavailable');
    const q = await importQueries();
    q.upsertWorkspace(dbh.db, wsPath, name || '');
    return 'Registered: ' + wsPath;
  } finally { dbh.close(); }
}

export async function apiWorkspaceRemove(wsPath: string): Promise<string> {
  const dbh = await openConfigDb();
  if (!dbh) throw new Error('SQLite unavailable');
  try {
    if (!isConfigDbUsable(dbh.db)) throw new Error('SQLite unavailable');
    const q = await importQueries();
    q.deleteWorkspace(dbh.db, wsPath);
    return 'Removed: ' + wsPath;
  } finally { dbh.close(); }
}

export async function apiWorkspaceLink(wsPath: string, linked: boolean): Promise<string> {
  const dbh = await openConfigDb();
  if (!dbh) throw new Error('SQLite unavailable');
  try {
    if (!isConfigDbUsable(dbh.db)) throw new Error('SQLite unavailable');
    const q = await importQueries();
    q.setWorkspaceLinked(dbh.db, wsPath, linked);
    return (linked ? 'Linked' : 'Unlinked') + ': ' + wsPath;
  } finally { dbh.close(); }
}

export async function apiProfileAdd(name: string, globalPath: string, scope: string): Promise<string> {
  if (!name.trim()) throw new Error('Profile name is required');
  if (!globalPath.trim()) throw new Error('Global path is required');
  const dbh = await openConfigDb();
  if (!dbh) throw new Error('SQLite unavailable');
  try {
    if (!isConfigDbUsable(dbh.db)) throw new Error('SQLite unavailable');
    const q = await importQueries();
    q.upsertProfile(dbh.db, name, globalPath, scope || 'global');
    const store = await readProfileStore();
    store.profiles[name] = { global_path: globalPath, scope: (scope || 'global') as any };
    await writeProfileStore(store);
    return 'Profile saved: ' + name;
  } finally { dbh.close(); }
}

export async function apiProfileRemove(name: string): Promise<string> {
  const dbh = await openConfigDb();
  if (!dbh) throw new Error('SQLite unavailable');
  try {
    if (!isConfigDbUsable(dbh.db)) throw new Error('SQLite unavailable');
    const q = await importQueries();
    q.deleteProfile(dbh.db, name);
    const store = await readProfileStore();
    delete store.profiles[name];
    if (store.active_profile === name) store.active_profile = undefined;
    await writeProfileStore(store);
    return 'Profile deleted: ' + name;
  } finally { dbh.close(); }
}

export async function apiProfileActivate(name: string): Promise<string> {
  const dbh = await openConfigDb();
  if (!dbh) throw new Error('SQLite unavailable');
  try {
    if (!isConfigDbUsable(dbh.db)) throw new Error('SQLite unavailable');
    const q = await importQueries();
    q.setActiveProfile(dbh.db, name);
    const store = await readProfileStore();
    store.active_profile = name;
    await writeProfileStore(store);
    return 'Active profile: ' + name;
  } finally { dbh.close(); }
}

function applyDotted(obj: Record<string, any>, key: string, value: string): void {
  const parts = key.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!cur[parts[i]]) cur[parts[i]] = {};
    cur = cur[parts[i]];
  }
  const last = parts[parts.length - 1];
  if (value === 'true') cur[last] = true;
  else if (value === 'false') cur[last] = false;
  else if (value !== '' && !isNaN(Number(value))) cur[last] = Number(value);
  else cur[last] = value;
}

export function parseEntryText(text: string): EntrySection[] {
  const sections: EntrySection[] = [];
  let cur: EntrySection | null = null;
  for (const line of text.split('\n')) {
    const s = line.replace(/\x1b\[[0-9;]*m/g, '').trim();
    if (!s) continue;
    if (s.startsWith('## ')) {
      const groupName = s.slice(3).trim();
      if (groupName.toLowerCase() === 'runtime') {
        cur = null;
        continue;
      }
      cur = { group: groupName, rows: [] };
      sections.push(cur);
    } else if (s.startsWith('- ') && cur) {
      const c = s.indexOf(': ');
      if (c === -1) continue;
      cur.rows.push([s.slice(2, c).trim(), s.slice(c + 2).trim()]);
    }
  }
  return sections;
}
