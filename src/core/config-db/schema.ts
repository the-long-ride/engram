/** SQLite config DB open, schema, and versioning. Reuses patterns from vector-db.ts. */
import path from 'node:path';
import { userConfigDir } from '../runtime/config.js';
import { ensureDir } from '../system/fsx.js';

export type ConfigDb = {
  db: any;
  close(): void;
};

const DB_FILE = 'engram.db';
const SCHEMA_VERSION = 1;

const SCHEMA_DDL = `
pragma journal_mode = wal;

create table if not exists schema_version (
  key   text primary key,
  value text not null
);

create table if not exists workspaces (
  id         integer primary key autoincrement,
  path       text not null unique,
  name       text not null default '',
  is_linked  integer not null default 1,
  created_at text not null default (datetime('now')),
  updated_at text not null default (datetime('now')),
  last_seen  text not null default (datetime('now'))
);

create table if not exists workspace_config (
  workspace_id integer not null references workspaces(id) on delete cascade,
  key          text not null,
  value        text not null,
  updated_at   text not null default (datetime('now')),
  primary key (workspace_id, key)
);

create table if not exists user_config (
  key        text primary key,
  value      text not null,
  updated_at text not null default (datetime('now'))
);

create table if not exists profiles (
  name        text primary key,
  global_path text not null,
  scope       text not null default 'global',
  is_active   integer not null default 0,
  created_at  text not null default (datetime('now')),
  updated_at  text not null default (datetime('now'))
);
`;

/** Open (or create) the config DB at ~/.engram/engram.db. Returns undefined when no sqlite module is available. */
export async function openConfigDb(): Promise<ConfigDb | undefined> {
  const file = dbPath();
  await ensureDir(path.dirname(file));
  // Try node:sqlite first (Node >=22.5 built-in), then better-sqlite3.
  const nodeSqlite = await dynamicImport('node:sqlite');
  if (nodeSqlite?.DatabaseSync) {
    const db = new nodeSqlite.DatabaseSync(file, { allowExtension: true });
    // Load sqlite-vec if available (harmless if not needed for config DB).
    try {
      const sqliteVec = await dynamicImport('sqlite-vec');
      if (sqliteVec?.load) sqliteVec.load(db);
    } catch { /* sqlite-vec optional for config */ }
    return { db, close: () => tryClose(db) };
  }
  const betterSqlite = await dynamicImport('better-sqlite3');
  const Database = betterSqlite?.default ?? betterSqlite;
  if (Database) {
    const db = new Database(file);
    try {
      const sqliteVec = await dynamicImport('sqlite-vec');
      if (sqliteVec?.load) sqliteVec.load(db);
    } catch { /* optional */ }
    return { db, close: () => tryClose(db) };
  }
  return undefined;
}

function tryClose(db: any): void {
  try { db.close?.(); } catch { /* best-effort */ }
}

/** Idempotent schema creation. Returns true when the DB is usable. */
export function ensureSchema(db: any): boolean {
  try {
    db.exec(SCHEMA_DDL);
    const rows = db.prepare('select value from schema_version where key = ?').all('version') ?? [];
    const stored = rows.length ? Number((rows[0] as any).value) : 0;
    if (stored < SCHEMA_VERSION) {
      db.exec("delete from schema_version where key = 'version'");
      db.prepare("insert into schema_version(key, value) values ('version', ?)").run(String(SCHEMA_VERSION));
    }
    return true;
  } catch {
    return false;
  }
}

export function dbPath(): string {
  return path.join(userConfigDir(), DB_FILE);
}

const dynamicImport = new Function('specifier', 'return import(specifier);') as (specifier: string) => Promise<any>;