import test from 'node:test';
import assert from 'node:assert/strict';
import { chmod, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { tempWorkspace, runEngram, workspaceMemoryRoot } from '../helpers.mjs';
import { setAuthorProfile, unsetAuthorProfile } from '../../dist/core/author/config.js';
import { migrateMemoryAuthors, planAuthorMemoryMigration, setAuthorMigrationWriterForTests, AuthorMigrationError } from '../../dist/core/author/migrate-memories.js';

function legacy(id, author = 'old@example.com', eol = '\n') {
  return [`---`,`id: ${id}`,'type: knowledge','scope: workspace','tags: [legacy]','created: 2025-01-01','updated: 2025-01-01',`author: ${author}`,'confidence: medium','---',`# ${id}`,'','## Content','','- Preserve this body.',''].join(eol);
}
function bodyBytes(raw) {
  const match = raw.match(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/u);
  return Buffer.from(raw.slice(match ? match[0].length : 0), 'utf8');
}

async function fixture() {
  const ws = await tempWorkspace('engram-author-migrate-');
  await runEngram(ws.cwd, ws.env, ['inject', '--no-skillset']);
  process.env.ENGRAM_CONFIG_DIR = ws.env.ENGRAM_CONFIG_DIR;
  await setAuthorProfile(ws.cwd, 'global', { name: 'Global User', email: 'global@example.com' });
  await setAuthorProfile(ws.cwd, 'workspace', { name: 'Workspace User', email: 'workspace@example.com' });
  return ws;
}

test('author migration previews without writes and preserves body bytes and mode', async () => {
  const { cwd } = await fixture();
  const file = path.join(workspaceMemoryRoot(cwd), 'knowledge', 'legacy.md');
  const raw = legacy('legacy', 'old@example.com', '\r\n');
  await writeFile(file, raw);
  await chmod(file, 0o600);
  const plan = await planAuthorMemoryMigration(cwd, 'workspace');
  assert.equal(plan.eligible, 1);
  assert.equal(plan.files.find((row) => row.file === 'knowledge/legacy.md').action, 'migrate');
  assert.equal(await readFile(file, 'utf8'), raw);

  const result = await migrateMemoryAuthors(cwd, 'workspace', { confirmed: true });
  assert.equal(result.migrated, 1);
  const after = await readFile(file, 'utf8');
  assert.deepEqual(bodyBytes(after), bodyBytes(raw));
  assert.match(after, /author_name:\s*(?:"Workspace User"|Workspace User)/);
  assert.doesNotMatch(after, /^author_email:/m);
  assert.doesNotMatch(after, /^author:/m);
  const backupFile = path.join(workspaceMemoryRoot(cwd), 'backups', 'author-v3', 'knowledge', 'legacy.md.pre-author-v3.bak');
  assert.equal(await readFile(backupFile, 'utf8'), raw);
  assert.equal(result.files.find((row) => row.file === 'knowledge/legacy.md').backup, 'backups/author-v3/knowledge/legacy.md.pre-author-v3.bak');
  await assert.rejects(readFile(`${file}.pre-author-v3.bak`, 'utf8'));
  // POSIX permission bits are not preserved on Windows filesystems.
  if (process.platform !== 'win32') {
    assert.equal((await stat(file)).mode & 0o777, 0o600);
    assert.equal((await stat(backupFile)).mode & 0o777, 0o600);
  }
  const second = await migrateMemoryAuthors(cwd, 'workspace', { confirmed: true });
  assert.equal(second.migrated, 0);
  assert.equal(second.current, 1);
  await rm(cwd, { recursive: true, force: true });
});

test('global author migration never uses Git fallback', async () => {
  const { cwd, env } = await fixture();
  await unsetAuthorProfile(cwd, 'global');
  const globalFile = path.join(env.ENGRAM_GLOBAL_DIR, 'knowledge', 'global-legacy.md');
  await writeFile(globalFile, legacy('global-legacy'));
  const plan = await planAuthorMemoryMigration(cwd, 'global');
  const row = plan.files.find((item) => item.file === 'knowledge/global-legacy.md');
  assert.equal(row.action, 'skipped');
  assert.match(row.reason, /global Engram author/i);
  await rm(cwd, { recursive: true, force: true });
});

function v3Memory(id, authorLines = ['author_name: Jane Doe', 'author_email: jane@example.com']) {
  return ['---', 'schema_version: 3', `id: ${id}`, 'type: knowledge', 'scope: workspace', 'tags: [test]', 'created: 2025-01-01', 'updated: 2025-01-01', ...authorLines, 'source: manual', 'confidence: high', 'authority: reference', 'revision: 1', 'valid_from: 2025-01-01', 'last_confirmed: 2025-01-01', '---', `# ${id}`, '', '## Content', '', '- Preserve this body.', ''].join('\n');
}

test('author migration omits author_email by default and writes it when memory.include_author_email is true', async () => {
  const { cwd } = await fixture();
  const root = workspaceMemoryRoot(cwd);
  await writeFile(path.join(root, 'knowledge', 'default-off.md'), legacy('default-off'));
  await migrateMemoryAuthors(cwd, 'workspace', { confirmed: true });
  const off = await readFile(path.join(root, 'knowledge', 'default-off.md'), 'utf8');
  assert.match(off, /^author_name:/m);
  assert.doesNotMatch(off, /^author_email:/m);
  const configFile = path.join(root, 'engram.config.json');
  const config = JSON.parse(await readFile(configFile, 'utf8'));
  await writeFile(configFile, JSON.stringify({ ...config, memory: { ...config.memory, include_author_email: true } }));
  await writeFile(path.join(root, 'knowledge', 'opt-in.md'), legacy('opt-in'));
  await migrateMemoryAuthors(cwd, 'workspace', { confirmed: true });
  assert.match(await readFile(path.join(root, 'knowledge', 'opt-in.md'), 'utf8'), /^author_email:\s*workspace@example\.com$/m);
  await rm(cwd, { recursive: true, force: true });
});

test('name-only memories are current and an email without a name is invalid', async () => {
  const { cwd } = await fixture();
  const root = workspaceMemoryRoot(cwd);
  await writeFile(path.join(root, 'knowledge', 'name-only.md'), v3Memory('name-only', ['author_name: Jane Doe']));
  await writeFile(path.join(root, 'knowledge', 'email-only.md'), v3Memory('email-only', ['author_email: jane@example.com']));
  const plan = await planAuthorMemoryMigration(cwd, 'workspace', { stripEmail: true });
  assert.equal(plan.files.find((row) => row.file === 'knowledge/name-only.md').action, 'current');
  assert.equal(plan.files.find((row) => row.file === 'knowledge/email-only.md').action, 'invalid');
  await rm(cwd, { recursive: true, force: true });
});

test('strip-email plans then strips, backs up, and rehashes', async () => {
  const { cwd, env } = await fixture();
  const root = workspaceMemoryRoot(cwd);
  const file = path.join(root, 'knowledge', 'strip-me.md');
  const legacyFile = path.join(root, 'knowledge', 'strip-legacy.md');
  const raw = v3Memory('strip-me').replace(/\n/g, '\r\n');
  const legacyRaw = legacy('strip-legacy');
  await writeFile(file, raw);
  await writeFile(legacyFile, legacyRaw);
  const plan = await planAuthorMemoryMigration(cwd, 'workspace', { stripEmail: true });
  assert.equal(plan.eligible, 2);
  assert.equal(await readFile(file, 'utf8'), raw);
  assert.equal(await readFile(legacyFile, 'utf8'), legacyRaw);
  const result = await migrateMemoryAuthors(cwd, 'workspace', { confirmed: true, stripEmail: true });
  assert.equal(result.migrated, 2);
  const after = await readFile(file, 'utf8');
  assert.doesNotMatch(after, /^author_email:/m);
  assert.match(after, /^author_name:/m);
  assert.deepEqual(bodyBytes(after), bodyBytes(raw));
  const legacyAfter = await readFile(legacyFile, 'utf8');
  assert.doesNotMatch(legacyAfter, /^author(_email)?:\s*\S*@/m);
  assert.match(legacyAfter, /^author_name:/m);
  const row = result.files.find((item) => item.file === 'knowledge/strip-me.md');
  assert.match(row.backup, /^backups\/author-strip-email-[\w.-]+\/knowledge\/strip-me\.md\.pre-strip-email\.bak$/);
  assert.equal(await readFile(path.join(root, ...row.backup.split('/')), 'utf8'), raw);
  const verified = await runEngram(cwd, env, ['verify', 'workspace']);
  assert.equal(verified.code, 0, verified.stderr || verified.stdout);
  assert.equal((await migrateMemoryAuthors(cwd, 'workspace', { confirmed: true, stripEmail: true })).migrated, 0);
  await rm(cwd, { recursive: true, force: true });
});

test('author migration requires confirmation', async () => {
  const { cwd } = await fixture();
  await assert.rejects(() => migrateMemoryAuthors(cwd, 'workspace', { confirmed: false }), /confirm/i);
  await rm(cwd, { recursive: true, force: true });
});

test('author migration rolls back all changed files after a write failure', async () => {
  const { cwd } = await fixture();
  const root = workspaceMemoryRoot(cwd);
  const one = path.join(root, 'knowledge', 'one.md');
  const two = path.join(root, 'knowledge', 'two.md');
  const rawOne = legacy('one');
  const rawTwo = legacy('two');
  await writeFile(one, rawOne);
  await writeFile(two, rawTwo);
  let writes = 0;
  setAuthorMigrationWriterForTests(async (file, content, mode) => {
    writes += 1;
    if (writes === 2) throw new Error('simulated migration write failure');
    await writeFile(file, content, { mode });
  });
  try {
    await assert.rejects(
      () => migrateMemoryAuthors(cwd, 'workspace', { confirmed: true }),
      (error) => error instanceof AuthorMigrationError && error.rollback === 'succeeded'
    );
  } finally {
    setAuthorMigrationWriterForTests(undefined);
  }
  assert.equal(await readFile(one, 'utf8'), rawOne);
  assert.equal(await readFile(two, 'utf8'), rawTwo);
  await rm(cwd, { recursive: true, force: true });
});
