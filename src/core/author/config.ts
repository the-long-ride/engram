/** Persist global and workspace Engram author profiles transactionally. */
import fs from 'node:fs/promises';
import path from 'node:path';
import type { AuthorMutationResult, AuthorProfile, AuthorScope } from './types.js';
import { normalizeAuthorProfile, tryNormalizeAuthorProfile } from './validate.js';
import { openConfigDb, isConfigDbUsable } from '../config-db/schema.js';
import { userConfigDir, userConfigPath, workspaceRoot } from '../runtime/config.js';
import { ensureDir, readJson } from '../system/fsx.js';

const AUTHOR_NAME_KEY = 'author.name';
const AUTHOR_EMAIL_KEY = 'author.email';
type SnapshotWriter = (file: string, value: unknown) => Promise<void>;
let snapshotWriterForTests: SnapshotWriter | undefined;

export function setAuthorSnapshotWriterForTests(writer: SnapshotWriter | undefined): void {
  snapshotWriterForTests = writer;
}

async function importQueries(): Promise<any> {
  return import(new URL('../config-db/queries.js', import.meta.url).href);
}

export async function readConfiguredAuthorLayers(cwd: string): Promise<{ global: AuthorProfile | null; workspace: AuthorProfile | null }> {
  let global: AuthorProfile | null = null;
  let workspace: AuthorProfile | null = null;
  const dbh = await openConfigDb();
  if (dbh) {
    try {
      if (isConfigDbUsable(dbh.db)) {
        const q = await importQueries();
        const userKv = q.getUserConfig(dbh.db) as Record<string, string>;
        global = profileFromKv(userKv);
        const ws = q.getWorkspaceByPath(dbh.db, path.resolve(cwd));
        if (ws) workspace = profileFromKv(q.getWorkspaceConfig(dbh.db, ws.id));
      }
    } finally { dbh.close(); }
  }
  if (!global) global = tryNormalizeAuthorProfile((await readJson<any>(userConfigPath(), {})).author);
  if (!workspace) workspace = tryNormalizeAuthorProfile((await readJson<any>(path.join(workspaceRoot(cwd), 'engram.config.json'), {})).author);
  return { global, workspace };
}

export async function setAuthorProfile(cwd: string, scope: AuthorScope, rawProfile: unknown): Promise<AuthorMutationResult> {
  const profile = normalizeAuthorProfile(rawProfile);
  return mutateAuthor(cwd, scope, profile);
}

export async function unsetAuthorProfile(cwd: string, scope: AuthorScope): Promise<AuthorMutationResult> {
  return mutateAuthor(cwd, scope, null);
}

async function mutateAuthor(cwd: string, scope: AuthorScope, current: AuthorProfile | null): Promise<AuthorMutationResult> {
  return withAuthorLock(async () => {
    const file = scope === 'global' ? userConfigPath() : path.join(workspaceRoot(cwd), 'engram.config.json');
    const beforeBytes = await readBytes(file);
    const beforeJson = await readJson<Record<string, unknown>>(file, {});
    const layers = await readConfiguredAuthorLayers(cwd);
    const previous = layers[scope];
    const dbh = await openConfigDb();
    let dbSnapshot: Record<string, string | undefined> | null = null;
    let wsId: number | undefined;
    try {
      if (dbh && isConfigDbUsable(dbh.db)) {
        const q = await importQueries();
        if (scope === 'global') {
          const kv = q.getUserConfig(dbh.db) as Record<string, string>;
          dbSnapshot = { [AUTHOR_NAME_KEY]: kv[AUTHOR_NAME_KEY], [AUTHOR_EMAIL_KEY]: kv[AUTHOR_EMAIL_KEY] };
          applyUserDb(q, dbh.db, current);
        } else {
          const ws = q.upsertWorkspace(dbh.db, path.resolve(cwd), path.basename(cwd));
          wsId = ws.id;
          const kv = q.getWorkspaceConfig(dbh.db, ws.id) as Record<string, string>;
          dbSnapshot = { [AUTHOR_NAME_KEY]: kv[AUTHOR_NAME_KEY], [AUTHOR_EMAIL_KEY]: kv[AUTHOR_EMAIL_KEY] };
          applyWorkspaceDb(q, dbh.db, ws.id, current);
        }
      }
      const nextJson = { ...beforeJson } as Record<string, unknown>;
      if (current) nextJson.author = current;
      else delete nextJson.author;
      await (snapshotWriterForTests ?? atomicWriteJson)(file, nextJson);
      return { scope, previous, current, configFile: file };
    } catch (error) {
      let rollback = 'succeeded';
      try {
        if (dbh && dbSnapshot) {
          const q = await importQueries();
          if (scope === 'global') restoreUserDb(q, dbh.db, dbSnapshot);
          else if (wsId !== undefined) restoreWorkspaceDb(q, dbh.db, wsId, dbSnapshot);
        }
        await restoreBytes(file, beforeBytes);
      } catch { rollback = 'failed'; }
      throw new Error(`${error instanceof Error ? error.message : String(error)} (rollback: ${rollback})`);
    } finally { dbh?.close(); }
  });
}

function profileFromKv(kv: Record<string, string>): AuthorProfile | null {
  if (!kv[AUTHOR_NAME_KEY] || !kv[AUTHOR_EMAIL_KEY]) return null;
  return tryNormalizeAuthorProfile({ name: kv[AUTHOR_NAME_KEY], email: kv[AUTHOR_EMAIL_KEY] });
}

function applyUserDb(q: any, db: any, profile: AuthorProfile | null): void {
  if (profile) {
    q.setUserConfigKey(db, AUTHOR_NAME_KEY, profile.name);
    q.setUserConfigKey(db, AUTHOR_EMAIL_KEY, profile.email);
  } else {
    q.deleteUserConfigKey(db, AUTHOR_NAME_KEY);
    q.deleteUserConfigKey(db, AUTHOR_EMAIL_KEY);
  }
}
function applyWorkspaceDb(q: any, db: any, id: number, profile: AuthorProfile | null): void {
  if (profile) {
    q.setWorkspaceConfigKey(db, id, AUTHOR_NAME_KEY, profile.name);
    q.setWorkspaceConfigKey(db, id, AUTHOR_EMAIL_KEY, profile.email);
  } else {
    q.deleteWorkspaceConfigKey(db, id, AUTHOR_NAME_KEY);
    q.deleteWorkspaceConfigKey(db, id, AUTHOR_EMAIL_KEY);
  }
}
function restoreUserDb(q: any, db: any, snapshot: Record<string, string | undefined>): void {
  for (const key of [AUTHOR_NAME_KEY, AUTHOR_EMAIL_KEY]) {
    if (snapshot[key] === undefined) q.deleteUserConfigKey(db, key);
    else q.setUserConfigKey(db, key, snapshot[key]);
  }
}
function restoreWorkspaceDb(q: any, db: any, id: number, snapshot: Record<string, string | undefined>): void {
  for (const key of [AUTHOR_NAME_KEY, AUTHOR_EMAIL_KEY]) {
    if (snapshot[key] === undefined) q.deleteWorkspaceConfigKey(db, id, key);
    else q.setWorkspaceConfigKey(db, id, key, snapshot[key]);
  }
}

async function withAuthorLock<T>(fn: () => Promise<T>): Promise<T> {
  const lock = path.join(userConfigDir(), 'author.lock');
  await ensureDir(path.dirname(lock));
  let handle: any;
  for (let attempt = 0; attempt < 50; attempt++) {
    try { handle = await fs.open(lock, 'wx'); break; }
    catch (error: any) {
      if (error?.code !== 'EEXIST') throw error;
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
  }
  if (!handle) throw new Error('Author settings are busy; try again');
  try { return await fn(); }
  finally { try { await handle.close(); } finally { await fs.unlink(lock).catch(() => undefined); } }
}

async function atomicWriteJson(file: string, value: unknown): Promise<void> {
  await ensureDir(path.dirname(file));
  const tmp = `${file}.${process.pid}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  await fs.rename(tmp, file);
}
async function readBytes(file: string): Promise<string | null> {
  try { return await fs.readFile(file, 'utf8'); } catch { return null; }
}
async function restoreBytes(file: string, bytes: string | null): Promise<void> {
  if (bytes === null) { await fs.unlink(file).catch(() => undefined); return; }
  await ensureDir(path.dirname(file));
  await fs.writeFile(file, bytes);
}
