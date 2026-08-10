import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { setAuthorProfile } from '../../dist/core/author/config.js';
import { planGlobalGitAuthorSync, syncGlobalGitAuthor } from '../../dist/core/author/git-sync.js';

function memoryGitConfig(initial = {}, fail = {}) {
  const values = new Map(Object.entries(initial));
  let writes = 0;
  return {
    values,
    async getGlobal(key) { return values.get(key) ?? ''; },
    async setGlobal(key, value) {
      writes++;
      if (fail.write === writes) throw new Error('simulated write failure');
      values.set(key, value);
      if (fail.verify === key) values.set(key, `${value}-wrong`);
    },
    async unsetGlobal(key) { values.delete(key); }
  };
}

async function fixture() {
  const cwd = await mkdtemp(path.join(os.tmpdir(), 'engram-author-sync-'));
  process.env.ENGRAM_CONFIG_DIR = path.join(cwd, 'config');
  await setAuthorProfile(cwd, 'global', { name: 'Global User', email: 'global@example.com' });
  return cwd;
}

test('global Git sync plans exact previous and next values and requires confirmation', async () => {
  const cwd = await fixture();
  const adapter = memoryGitConfig({ 'user.name': 'Old', 'user.email': 'old@example.com' });
  const plan = await planGlobalGitAuthorSync(cwd, adapter);
  assert.deepEqual(plan.previous, { name: 'Old', email: 'old@example.com' });
  assert.deepEqual(plan.next, { name: 'Global User', email: 'global@example.com' });
  await assert.rejects(() => syncGlobalGitAuthor(cwd, { confirmed: false }, adapter), /confirm/i);
  assert.equal(adapter.values.get('user.name'), 'Old');
  await rm(cwd, { recursive: true, force: true });
});

test('global Git sync verifies success', async () => {
  const cwd = await fixture();
  const adapter = memoryGitConfig({ 'user.name': 'Old', 'user.email': 'old@example.com' });
  const result = await syncGlobalGitAuthor(cwd, { confirmed: true }, adapter);
  assert.equal(result.verified, true);
  assert.equal(result.rollback, 'not-needed');
  assert.equal(adapter.values.get('user.name'), 'Global User');
  assert.equal(adapter.values.get('user.email'), 'global@example.com');
  await rm(cwd, { recursive: true, force: true });
});

test('global Git sync rolls back both keys after second write fails', async () => {
  const cwd = await fixture();
  const adapter = memoryGitConfig({ 'user.name': 'Old', 'user.email': 'old@example.com' }, { write: 2 });
  await assert.rejects(() => syncGlobalGitAuthor(cwd, { confirmed: true }, adapter), /rollback: succeeded/i);
  assert.equal(adapter.values.get('user.name'), 'Old');
  assert.equal(adapter.values.get('user.email'), 'old@example.com');
  await rm(cwd, { recursive: true, force: true });
});

test('global Git sync unsets previously absent keys on verification failure', async () => {
  const cwd = await fixture();
  const adapter = memoryGitConfig({}, { verify: 'user.email' });
  await assert.rejects(() => syncGlobalGitAuthor(cwd, { confirmed: true }, adapter), /rollback: succeeded/i);
  assert.equal(adapter.values.has('user.name'), false);
  assert.equal(adapter.values.has('user.email'), false);
  await rm(cwd, { recursive: true, force: true });
});
