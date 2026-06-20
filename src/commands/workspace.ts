/** Workspace registry commands: list, info, set, unregister, link, unlink. */
import path from 'node:path';
import { formatRecords } from '../core/cli/format.js';
import { openConfigDb, ensureSchema } from '../core/config-db/schema.js';
import { writeConfig } from '../core/runtime/config.js';
import { loadConfig } from '../core/runtime/config.js';
import { exists } from '../core/system/fsx.js';

export async function cmdWorkspace(args: string[], flags: Record<string, any> = {}): Promise<string> {
  const [rawAction = 'list', ...rest] = args;
  const action = rawAction.toLowerCase();
  if (action === 'list' || action === 'ls') return workspaceList();
  if (action === 'info' || action === 'show') return workspaceInfo(rest[0] || process.cwd());
  if (action === 'set') return workspaceSet(rest, flags);
  if (action === 'unregister' || action === 'rm' || action === 'delete') return workspaceUnregister(rest[0]);
  if (action === 'link') return workspaceLink(rest[0]);
  if (action === 'unlink') return workspaceUnlink(rest[0]);
  throw new Error('workspace expects list, info, set, unregister, link, or unlink');
}

const dynamicImport = new Function('specifier', 'return import(specifier);') as (specifier: string) => Promise<any>;
async function importQueries(): Promise<any> {
  const url = new URL('../core/config-db/queries.js', import.meta.url).href;
  return import(url);
}

async function workspaceList(): Promise<string> {
  const dbh = await openConfigDb();
  if (!dbh) return 'SQLite unavailable; install better-sqlite3 or use Node >=22.5';
  try {
    ensureSchema(dbh.db);
    const q = await importQueries();
    const rows = q.listWorkspaces(dbh.db);
    if (!rows.length) return 'No workspaces registered. Workspaces are auto-registered when running engram commands.';
    return formatRecords('Workspaces', rows.map((row: any) => ({
      title: `${row.name || path.basename(row.path)} ${row.is_linked ? '[linked]' : ''}`,
      fields: [
        ['Path', row.path],
        ['Last seen', row.last_seen],
        ['Created', row.created_at]
      ]
    })));
  } finally {
    dbh.close();
  }
}

async function workspaceInfo(targetPath: string): Promise<string> {
  const resolved = path.resolve(targetPath);
  const dbh = await openConfigDb();
  if (!dbh) return 'SQLite unavailable; install better-sqlite3 or use Node >=22.5';
  try {
    ensureSchema(dbh.db);
    const q = await importQueries();
    const ws = q.getWorkspaceByPath(dbh.db, resolved);
    if (!ws) return `Workspace not registered: ${resolved}\nWorkspaces are auto-registered when running engram commands.`;
    const cfg: Record<string, string> = q.getWorkspaceConfig(dbh.db, ws.id);
    const fields: [string, string][] = [
      ['ID', String(ws.id)],
      ['Path', ws.path],
      ['Name', ws.name],
      ['Linked', ws.is_linked ? 'yes' : 'no'],
      ['Last seen', ws.last_seen],
      ['Created', ws.created_at]
    ];
    for (const [key, value] of Object.entries(cfg).sort(([a], [b]) => a.localeCompare(b))) {
      fields.push([key, value]);
    }
    return formatRecords('Workspace info', [{ title: resolved, fields }]);
  } finally {
    dbh.close();
  }
}

async function workspaceSet(args: string[], flags: Record<string, any>): Promise<string> {
  const key = args[0]?.trim().toLowerCase();
  const value = args[1] ?? '';
  if (!key) throw new Error('workspace set requires <key> <value>');
  const resolved = path.resolve(flags.path || process.cwd());
  const dbh = await openConfigDb();
  if (!dbh) return 'SQLite unavailable; install better-sqlite3 or use Node >=22.5';
  try {
    ensureSchema(dbh.db);
    const q = await importQueries();
    if (!q.configKeyToColumn(key)) throw new Error(`unknown config key: ${key}`);
    const ws = q.getWorkspaceByPath(dbh.db, resolved) || q.upsertWorkspace(dbh.db, resolved, path.basename(resolved));
    q.setWorkspaceConfigKey(dbh.db, ws.id, key, value);
    // Also write JSON snapshot for backward compat
    const config = await loadConfig(resolved);
    (config as any)[key.replace('.', '_')] = value;
    await writeConfig(resolved, config);
    return `Workspace config set: ${key} = ${value}\nWorkspace: ${ws.path}`;
  } finally {
    dbh.close();
  }
}

async function workspaceUnregister(targetPath?: string): Promise<string> {
  const resolved = path.resolve(targetPath || process.cwd());
  const dbh = await openConfigDb();
  if (!dbh) return 'SQLite unavailable; install better-sqlite3 or use Node >=22.5';
  try {
    ensureSchema(dbh.db);
    const q = await importQueries();
    const ws = q.getWorkspaceByPath(dbh.db, resolved);
    if (!ws) return `Workspace not registered: ${resolved}`;
    q.deleteWorkspace(dbh.db, resolved);
    return `Workspace unregistered: ${resolved}`;
  } finally {
    dbh.close();
  }
}

async function workspaceLink(targetPath?: string): Promise<string> {
  const resolved = path.resolve(targetPath || process.cwd());
  const dbh = await openConfigDb();
  if (!dbh) return 'SQLite unavailable; install better-sqlite3 or use Node >=22.5';
  try {
    ensureSchema(dbh.db);
    const q = await importQueries();
    const ws = q.getWorkspaceByPath(dbh.db, resolved) || q.upsertWorkspace(dbh.db, resolved, path.basename(resolved));
    q.setWorkspaceLinked(dbh.db, resolved, true);
    return `Workspace linked: ${ws.path}`;
  } finally {
    dbh.close();
  }
}

async function workspaceUnlink(targetPath?: string): Promise<string> {
  const resolved = path.resolve(targetPath || process.cwd());
  const dbh = await openConfigDb();
  if (!dbh) return 'SQLite unavailable; install better-sqlite3 or use Node >=22.5';
  try {
    ensureSchema(dbh.db);
    const q = await importQueries();
    const ws = q.getWorkspaceByPath(dbh.db, resolved) || q.upsertWorkspace(dbh.db, resolved, path.basename(resolved));
    q.setWorkspaceLinked(dbh.db, resolved, false);
    return `Workspace unlinked: ${ws.path}`;
  } finally {
    dbh.close();
  }
}