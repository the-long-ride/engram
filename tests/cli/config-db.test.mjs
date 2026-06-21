import test from 'node:test';
import assert from 'node:assert/strict';
import { rm } from 'node:fs/promises';
import path from 'node:path';
import { tempWorkspace } from '../helpers.mjs';

// The source modules are TypeScript; tests import from compiled dist/.
// We build then load via dynamic import so that missing sqlite does not kill the suite.

async function loadModules() {
  const schema = await import('../../dist/core/config-db/schema.js');
  const queries = await import('../../dist/core/config-db/queries.js');
  return { schema, queries };
}

test('openConfigDb returns undefined or opens without throwing', async () => {
  const { env } = await tempWorkspace('engram-db-');
  // Override ENGRAM_CONFIG_DIR so we don't touch real user config.
  process.env.ENGRAM_CONFIG_DIR = path.join(env.ENGRAM_CONFIG_DIR);
  const { schema } = await loadModules();
  const db = await schema.openConfigDb();
  // DB may be undefined when neither sqlite module is installed — that's OK.
  // When available, close it cleanly.
  if (db) {
    schema.ensureSchema(db.db);
    db.close();
  }
});

test('loadConfig falls back to JSON when config DB schema is unavailable', async () => {
  const { cwd, env } = await tempWorkspace('engram-db-fallback-');
  process.env.ENGRAM_CONFIG_DIR = path.join(env.ENGRAM_CONFIG_DIR);
  const { schema } = await loadModules();
  const { loadConfig } = await import('../../dist/core/runtime/config.js');

  schema.setConfigDbUnavailableForTests(true);
  try {
    const loaded = await loadConfig(cwd);
    assert.equal(loaded.scope, 'both');
    assert.equal(loaded.read, 'auto');
  } finally {
    schema.setConfigDbUnavailableForTests(false);
  }
});

test('ensureSchema creates tables idempotently', async () => {
  const { env } = await tempWorkspace('engram-db-');
  process.env.ENGRAM_CONFIG_DIR = path.join(env.ENGRAM_CONFIG_DIR);
  const { schema } = await loadModules();
  const db = await schema.openConfigDb();
  if (!db) return; // skip when no sqlite

  assert.equal(schema.ensureSchema(db.db), true);
  // Second call is idempotent.
  assert.equal(schema.ensureSchema(db.db), true);

  // Verify tables exist.
  const tables = db.db.prepare("select name from sqlite_master where type='table' order by name").all();
  const names = tables.map((t) => t.name);
  for (const expected of ['workspaces', 'workspace_config', 'user_config', 'profiles', 'schema_version']) {
    assert.ok(names.includes(expected), `missing table: ${expected}`);
  }
  db.close();
});

test('upsertWorkspace inserts and updates', async () => {
  const { env } = await tempWorkspace('engram-db-');
  process.env.ENGRAM_CONFIG_DIR = path.join(env.ENGRAM_CONFIG_DIR);
  const { schema, queries } = await loadModules();
  const db = await schema.openConfigDb();
  if (!db) return;
  schema.ensureSchema(db.db);

  const ws1 = queries.upsertWorkspace(db.db, '/home/user/project-a', 'Project A');
  assert.equal(ws1.path, '/home/user/project-a');
  assert.equal(ws1.name, 'Project A');
  assert.equal(ws1.is_linked, true);

  // Upsert same path updates last_seen but preserves name.
  const ws2 = queries.upsertWorkspace(db.db, '/home/user/project-a');
  assert.equal(ws2.id, ws1.id);
  assert.equal(ws2.name, 'Project A'); // preserved

  // Upsert with new name updates name.
  const ws3 = queries.upsertWorkspace(db.db, '/home/user/project-a', 'Proj A Renamed');
  assert.equal(ws3.name, 'Proj A Renamed');

  db.close();
});

test('listWorkspaces returns all rows', async () => {
  const { env } = await tempWorkspace('engram-db-');
  process.env.ENGRAM_CONFIG_DIR = path.join(env.ENGRAM_CONFIG_DIR);
  const { schema, queries } = await loadModules();
  const db = await schema.openConfigDb();
  if (!db) return;
  schema.ensureSchema(db.db);

  queries.upsertWorkspace(db.db, '/a');
  queries.upsertWorkspace(db.db, '/b');
  const list = queries.listWorkspaces(db.db);
  assert.ok(list.length >= 2);
  db.close();
});

test('workspace_config CRUD', async () => {
  const { env } = await tempWorkspace('engram-db-');
  process.env.ENGRAM_CONFIG_DIR = path.join(env.ENGRAM_CONFIG_DIR);
  const { schema, queries } = await loadModules();
  const db = await schema.openConfigDb();
  if (!db) return;
  schema.ensureSchema(db.db);

  const ws = queries.upsertWorkspace(db.db, '/project');
  queries.setWorkspaceConfigKey(db.db, ws.id, 'scope', 'global');
  queries.setWorkspaceConfigKey(db.db, ws.id, 'read', 'always');

  const cfg = queries.getWorkspaceConfig(db.db, ws.id);
  assert.equal(cfg['scope'], 'global');
  assert.equal(cfg['read'], 'always');

  queries.deleteWorkspaceConfigKey(db.db, ws.id, 'scope');
  const cfg2 = queries.getWorkspaceConfig(db.db, ws.id);
  assert.equal(cfg2['scope'], undefined);
  assert.equal(cfg2['read'], 'always');

  db.close();
});

test('user_config CRUD', async () => {
  const { env } = await tempWorkspace('engram-db-');
  process.env.ENGRAM_CONFIG_DIR = path.join(env.ENGRAM_CONFIG_DIR);
  const { schema, queries } = await loadModules();
  const db = await schema.openConfigDb();
  if (!db) return;
  schema.ensureSchema(db.db);

  queries.setUserConfigKey(db.db, 'read', 'manual');
  queries.setUserConfigKey(db.db, 'scope', 'both');

  const cfg = queries.getUserConfig(db.db);
  assert.equal(cfg['read'], 'manual');
  assert.equal(cfg['scope'], 'both');

  // setUserConfig batch
  queries.setUserConfig(db.db, { 'read': 'auto', 'proof': 'compact' });
  const cfg2 = queries.getUserConfig(db.db);
  assert.equal(cfg2['read'], 'auto');
  assert.equal(cfg2['proof'], 'compact');

  db.close();
});

test('profiles CRUD', async () => {
  const { env } = await tempWorkspace('engram-db-');
  process.env.ENGRAM_CONFIG_DIR = path.join(env.ENGRAM_CONFIG_DIR);
  const { schema, queries } = await loadModules();
  const db = await schema.openConfigDb();
  if (!db) return;
  schema.ensureSchema(db.db);

  queries.upsertProfile(db.db, 'work', '/home/work-engram', 'global');
  queries.upsertProfile(db.db, 'personal', '/home/personal-engram', 'both');

  const all = queries.listProfiles(db.db);
  assert.ok(all.length >= 2);

  queries.setActiveProfile(db.db, 'work');
  const active = queries.getActiveProfile(db.db);
  assert.equal(active.name, 'work');
  assert.equal(active.is_active, true);

  const personal = queries.getProfile(db.db, 'personal');
  assert.equal(personal.scope, 'both');

  queries.deleteProfile(db.db, 'personal');
  assert.equal(queries.listProfiles(db.db).length, all.length - 1);

  db.close();
});

test('flattenConfig and unflattenConfig roundtrip', async () => {
  const { queries } = await loadModules();
  const config = {
    version: '0.0.16',
    enabled: true,
    global_path: '/test',
    scope: 'both',
    update: 'auto',
    read: 'auto',
    proof: 'off',
    ignore: { source: 'engramignore', gitignore_path: '.gitignore', engramignore_path: '.engramignore', global_engramignore: true, also_ignore: [] },
    roles: ['frontend'],
    live_sync: { enabled: false, targets: [] },
    global_git: { enabled: true, remote: 'origin', branch: 'main', auto_sync: true, auto_resolve: true },
    rule_variants: { enabled: true, active: 'balanced' },
    load: { limit: 8 },
    graph: { enabled: true, max_related: 4, min_related_score: 0.22 },
    vector: { enabled: true, provider: 'sqlite-vec', auto_threshold: 100, candidate_pool: 24, dimensions: 64 },
    pattern_mining: { enabled: false, threshold: 3, lookback_sessions: 20 },
    pr_workflow: { enabled: false, target_branch: 'main' },
    encryption: { enabled: false, scope: 'global', key_source: 'portable-file' }
  };
  const flat = queries.flattenConfig(config);
  assert.equal(flat['scope'], 'both');
  assert.equal(flat['read'], 'auto');
  assert.equal(flat['load.limit'], '8');
  assert.equal(flat['rule_variants.active'], 'balanced');
  assert.equal(flat['roles'], '["frontend"]');

  const roundtrip = queries.unflattenConfig(flat);
  assert.equal(roundtrip.scope, 'both');
  assert.equal(roundtrip.read, 'auto');
  assert.equal(roundtrip.roles?.[0], 'frontend');
  assert.equal(roundtrip.load?.limit, 8);
  assert.equal(roundtrip.rule_variants?.active, 'balanced');
});

test('configKeyToColumn validates known keys', async () => {
  const { queries } = await loadModules();
  assert.equal(queries.configKeyToColumn('scope'), 'scope');
  assert.equal(queries.configKeyToColumn('load.limit'), 'load.limit');
  assert.equal(queries.configKeyToColumn('read'), 'read');
  assert.equal(queries.configKeyToColumn('  SCOPE  '), 'scope');
  assert.equal(queries.configKeyToColumn('invalid.key'), undefined);
  assert.equal(queries.configKeyToColumn(''), undefined);
});

test('deleteWorkspace removes row', async () => {
  const { env } = await tempWorkspace('engram-db-');
  process.env.ENGRAM_CONFIG_DIR = path.join(env.ENGRAM_CONFIG_DIR);
  const { schema, queries } = await loadModules();
  const db = await schema.openConfigDb();
  if (!db) return;
  schema.ensureSchema(db.db);

  queries.upsertWorkspace(db.db, '/to-delete');
  assert.ok(queries.getWorkspaceByPath(db.db, '/to-delete'));
  queries.deleteWorkspace(db.db, '/to-delete');
  assert.equal(queries.getWorkspaceByPath(db.db, '/to-delete'), undefined);

  db.close();
});

test('setWorkspaceLinked toggles flag', async () => {
  const { env } = await tempWorkspace('engram-db-');
  process.env.ENGRAM_CONFIG_DIR = path.join(env.ENGRAM_CONFIG_DIR);
  const { schema, queries } = await loadModules();
  const db = await schema.openConfigDb();
  if (!db) return;
  schema.ensureSchema(db.db);

  queries.upsertWorkspace(db.db, '/linked-test');
  queries.setWorkspaceLinked(db.db, '/linked-test', false);
  assert.equal(queries.getWorkspaceByPath(db.db, '/linked-test').is_linked, false);
  queries.setWorkspaceLinked(db.db, '/linked-test', true);
  assert.equal(queries.getWorkspaceByPath(db.db, '/linked-test').is_linked, true);

  db.close();
});

test('setWorkspaceConfig batch writes all keys', async () => {
  const { env } = await tempWorkspace('engram-db-');
  process.env.ENGRAM_CONFIG_DIR = path.join(env.ENGRAM_CONFIG_DIR);
  const { schema, queries } = await loadModules();
  const db = await schema.openConfigDb();
  if (!db) return;
  schema.ensureSchema(db.db);

  const ws = queries.upsertWorkspace(db.db, '/batch-test');
  queries.setWorkspaceConfig(db.db, ws.id, { 'scope': 'workspace', 'read': 'off', 'load.limit': '16' });
  const cfg = queries.getWorkspaceConfig(db.db, ws.id);
  assert.equal(cfg['scope'], 'workspace');
  assert.equal(cfg['read'], 'off');
  assert.equal(cfg['load.limit'], '16');

  db.close();
});
