/** SQLite config DB open, schema, and versioning. Reuses patterns from vector-db.ts. */
import path from 'node:path';
import { userConfigDir } from '../runtime/config.js';
import { ensureDir } from '../system/fsx.js';
import { suppressSqliteExperimentalWarning } from '../system/warnings.js';

suppressSqliteExperimentalWarning();

let forceSchemaUnavailableForTests = false;

/** Test-only hook: simulate schema failure without changing production behavior. */
export function setConfigDbUnavailableForTests(value: boolean): void {
  forceSchemaUnavailableForTests = value;
}

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
  try {
    await ensureDir(path.dirname(file));
  } catch {
    return undefined;
  }
  // Try node:sqlite first (Node >=22.5 built-in), then better-sqlite3.
  const nodeSqlite = await dynamicImport('node:sqlite').catch(() => undefined);
  if (nodeSqlite?.DatabaseSync) {
    return openDbHandle(() => new nodeSqlite.DatabaseSync(file, { allowExtension: true }));
  }
  const betterSqlite = await dynamicImport('better-sqlite3').catch(() => undefined);
  const Database = betterSqlite?.default ?? betterSqlite;
  if (Database) return openDbHandle(() => new Database(file));
  return undefined;
}

async function openDbHandle(create: () => any): Promise<ConfigDb | undefined> {
  let db: any;
  try {
    db = create();
    try {
      const sqliteVec = await dynamicImport('sqlite-vec').catch(() => undefined);
      if (sqliteVec?.load) sqliteVec.load(db);
    } catch { /* sqlite-vec optional for config */ }
    if (!isConfigDbUsable(db)) {
      tryClose(db);
      return undefined;
    }
    return { db, close: () => tryClose(db) };
  } catch {
    tryClose(db);
    return undefined;
  }
}

function tryClose(db: any): void {
  try { db.close?.(); } catch { /* best-effort */ }
}

/** Idempotent schema creation. Returns true when the DB is usable. */
export function isConfigDbUsable(db: any): boolean {
  if (forceSchemaUnavailableForTests) return false;
  return ensureSchema(db);
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
