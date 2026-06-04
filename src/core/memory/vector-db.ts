/** Optional sqlite-vec routing index for large memory scopes. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { VECTOR_DB_FILE, VECTOR_DB_SCHEMA_VERSION, VERSION } from '../runtime/constants.js';
import type { EngramConfig, MemoryEntry, MemoryIndex, Scope } from '../runtime/types.js';
import { ensureDir, exists, inside } from '../system/fsx.js';
import { routingVector } from '../system/text.js';
import { sha256 } from '../safety/hash.js';
import { visibleEntries } from './routing.js';

type VectorDb = {
  db: any;
  bindVector(vector: number[]): any;
};

export type VectorIndexStatus = {
  scope: Scope;
  file: string;
  action: 'ready' | 'rebuilt' | 'skipped';
  entries: number;
  reason?: string;
};

export type VectorRouteHit = { entry: MemoryEntry; score: number };

type ScopeRoots = Record<Scope, string>;
type ScopeIndexes = Record<Scope, MemoryIndex>;

/** Return vector hits from any scope large enough to maintain a vector DB. */
export async function vectorRouteHits(
  roots: ScopeRoots,
  indexes: ScopeIndexes,
  config: EngramConfig,
  query: string,
  ignorePatterns: string[],
  manual = false
): Promise<VectorRouteHit[]> {
  if (!config.vector.enabled) return [];
  const hits: VectorRouteHit[] = [];
  for (const scope of ['workspace', 'global'] as Scope[]) {
    const root = roots[scope];
    if (!root || !(await exists(root))) continue;
    const entries = visibleEntries(indexes[scope].entries, config, manual, ignorePatterns).filter((entry) => entry.scope === scope);
    if (entries.length < config.vector.auto_threshold) continue;
    const status = await ensureVectorIndex(root, scope, entries, config);
    if (status.action === 'skipped') continue;
    hits.push(...await queryVectorIndex(root, scope, entries, config, query));
  }
  return hits;
}

/** Build or migrate one scope vector DB when the scope has enough memories. */
export async function ensureVectorIndex(
  root: string,
  scope: Scope,
  entries: MemoryEntry[],
  config: EngramConfig,
  options: { force?: boolean } = {}
): Promise<VectorIndexStatus> {
  const file = vectorDbPath(root);
  const eligible = entries.filter((entry) => !entry.ignored);
  if (!config.vector.enabled) return skipped(scope, file, eligible.length, 'vector routing disabled');
  if (eligible.length < config.vector.auto_threshold) return skipped(scope, file, eligible.length, `below threshold ${config.vector.auto_threshold}`);
  const runtime = await openVectorDb(file);
  if (!runtime) return skipped(scope, file, eligible.length, 'sqlite-vec runtime unavailable');
  const fingerprint = indexFingerprint(scope, eligible, config.vector.dimensions);
  try {
    const meta = readMeta(runtime.db);
    const schemaMatches = Number(meta.schema_version ?? 0) === VECTOR_DB_SCHEMA_VERSION;
    const dimensionsMatch = Number(meta.dimensions ?? 0) === config.vector.dimensions;
    const fingerprintMatches = meta.fingerprint === fingerprint;
    closeDb(runtime.db);
    if (!options.force && schemaMatches && dimensionsMatch && fingerprintMatches) {
      return { scope, file, action: 'ready', entries: eligible.length };
    }
  } catch {
    closeDb(runtime.db);
  }
  await fs.rm(file, { force: true });
  const rebuilt = await openVectorDb(file);
  if (!rebuilt) return skipped(scope, file, eligible.length, 'sqlite-vec runtime unavailable');
  try {
    createSchema(rebuilt.db, config.vector.dimensions);
    insertEntries(rebuilt, scope, eligible, config.vector.dimensions);
    writeMeta(rebuilt.db, {
      schema_version: String(VECTOR_DB_SCHEMA_VERSION),
      provider: config.vector.provider,
      dimensions: String(config.vector.dimensions),
      fingerprint,
      entry_count: String(eligible.length),
      engram_version: VERSION,
      updated: new Date().toISOString()
    });
    return { scope, file, action: 'rebuilt', entries: eligible.length };
  } finally {
    closeDb(rebuilt.db);
  }
}

async function queryVectorIndex(root: string, scope: Scope, entries: MemoryEntry[], config: EngramConfig, query: string): Promise<VectorRouteHit[]> {
  const file = vectorDbPath(root);
  const runtime = await openVectorDb(file);
  if (!runtime) return [];
  const byFile = new Map(entries.map((entry) => [entry.file, entry]));
  try {
    const stmt = runtime.db.prepare(`
      select e.file as file, v.distance as distance
      from memory_vectors v
      join memory_entries e on e.rowid = v.rowid
      where v.embedding match ?
      order by v.distance
      limit ?
    `);
    const rows = stmt.all(runtime.bindVector(routingVector(query, config.vector.dimensions)), config.vector.candidate_pool) ?? [];
    return rows
      .map((row: any) => {
        const entry = byFile.get(String(row.file ?? ''));
        const distance = Number(row.distance ?? 0);
        return entry ? { entry, score: 1 / (1 + Math.max(0, distance)) } : undefined;
      })
      .filter((hit: VectorRouteHit | undefined): hit is VectorRouteHit => Boolean(hit));
  } catch {
    return [];
  } finally {
    closeDb(runtime.db);
  }
}

function vectorDbPath(root: string): string {
  return inside(root, VECTOR_DB_FILE);
}

async function openVectorDb(file: string): Promise<VectorDb | undefined> {
  await ensureDir(path.dirname(file));
  const sqliteVec = await dynamicImport('sqlite-vec').catch(() => undefined);
  if (!sqliteVec?.load) return undefined;
  const nodeSqlite = await dynamicImport('node:sqlite').catch(() => undefined);
  if (nodeSqlite?.DatabaseSync) {
    const db = new nodeSqlite.DatabaseSync(file, { allowExtension: true });
    sqliteVec.load(db);
    return { db, bindVector: (vector) => new Uint8Array(new Float32Array(vector).buffer) };
  }
  const betterSqlite = await dynamicImport('better-sqlite3').catch(() => undefined);
  const Database = betterSqlite?.default ?? betterSqlite;
  if (Database) {
    const db = new Database(file);
    sqliteVec.load(db);
    return { db, bindVector: (vector) => new Float32Array(vector) };
  }
  return undefined;
}

const dynamicImport = new Function('specifier', 'return import(specifier);') as (specifier: string) => Promise<any>;

function createSchema(db: any, dimensions: number): void {
  db.exec(`
    pragma journal_mode = wal;
    create table vector_meta(key text primary key, value text not null);
    create table memory_entries(
      rowid integer primary key,
      scope text not null,
      id text not null,
      type text not null,
      file text not null,
      updated text not null,
      signature text not null
    );
    create unique index memory_entries_file on memory_entries(file);
    create virtual table memory_vectors using vec0(embedding float[${dimensions}]);
  `);
}

function insertEntries(runtime: VectorDb, scope: Scope, entries: MemoryEntry[], dimensions: number): void {
  runtime.db.exec('begin');
  try {
    const entryStmt = runtime.db.prepare(`
      insert into memory_entries(rowid, scope, id, type, file, updated, signature)
      values (?, ?, ?, ?, ?, ?, ?)
    `);
    const vectorStmt = runtime.db.prepare('insert into memory_vectors(rowid, embedding) values (?, ?)');
    for (let i = 0; i < entries.length; i += 1) {
      const entry = entries[i];
      const rowid = i + 1;
      entryStmt.run(rowid, scope, entry.id, entry.type, entry.file, entry.updated, entrySignature(entry));
      vectorStmt.run(rowid, runtime.bindVector(routingVector(entryText(entry), dimensions)));
    }
    runtime.db.exec('commit');
  } catch (error) {
    runtime.db.exec('rollback');
    throw error;
  }
}

function readMeta(db: any): Record<string, string> {
  try {
    const rows = db.prepare('select key, value from vector_meta').all() ?? [];
    return Object.fromEntries(rows.map((row: any) => [String(row.key), String(row.value)]));
  } catch {
    return {};
  }
}

function writeMeta(db: any, meta: Record<string, string>): void {
  const stmt = db.prepare('insert into vector_meta(key, value) values (?, ?)');
  for (const [key, value] of Object.entries(meta)) stmt.run(key, value);
}

function indexFingerprint(scope: Scope, entries: MemoryEntry[], dimensions: number): string {
  const payload = entries
    .map((entry) => entrySignature(entry))
    .sort()
    .join('\n');
  return sha256([VECTOR_DB_SCHEMA_VERSION, scope, dimensions, payload].join('\n'));
}

function entrySignature(entry: MemoryEntry): string {
  return [
    entry.scope,
    entry.id,
    entry.type,
    entry.file,
    entry.updated,
    entry.confidence,
    entry.tags.join(','),
    entry.role?.join(',') ?? '',
    entry.summary
  ].join('|');
}

function entryText(entry: MemoryEntry): string {
  return `${entry.id} ${entry.type} ${entry.tags.join(' ')} ${entry.summary}`;
}

function skipped(scope: Scope, file: string, entries: number, reason: string): VectorIndexStatus {
  return { scope, file, action: 'skipped', entries, reason };
}

function closeDb(db: any): void {
  try { db.close?.(); } catch { /* best-effort close */ }
}
