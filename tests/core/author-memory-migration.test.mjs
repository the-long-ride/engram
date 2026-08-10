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
  assert.match(after, /author_email:\s*workspace@example\.com/);
  assert.doesNotMatch(after, /^author:/m);
  assert.equal(await readFile(`${file}.pre-author-v3.bak`, 'utf8'), raw);
  assert.equal((await stat(file)).mode & 0o777, 0o600);
  assert.equal((await stat(`${file}.pre-author-v3.bak`)).mode & 0o777, 0o600);
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
