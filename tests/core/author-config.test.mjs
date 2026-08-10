import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { tempWorkspace } from '../helpers.mjs';
import {
  readConfiguredAuthorLayers,
  setAuthorProfile,
  unsetAuthorProfile,
  setAuthorSnapshotWriterForTests
} from '../../dist/core/author/config.js';

test('global and workspace author profiles persist independently', async () => {
  const { cwd, env } = await tempWorkspace('engram-author-config-');
  Object.assign(process.env, env);
  await setAuthorProfile(cwd, 'global', { name: 'Global User', email: 'global@example.com' });
  await setAuthorProfile(cwd, 'workspace', { name: 'Workspace User', email: 'workspace@example.com' });
  assert.deepEqual(await readConfiguredAuthorLayers(cwd), {
    global: { name: 'Global User', email: 'global@example.com' },
    workspace: { name: 'Workspace User', email: 'workspace@example.com' }
  });
  const workspaceJson = JSON.parse(await readFile(path.join(cwd, '.agents/.engram/engram.config.json'), 'utf8'));
  assert.deepEqual(workspaceJson.author, { name: 'Workspace User', email: 'workspace@example.com' });
});

test('unset removes author object without touching unrelated config', async () => {
  const { cwd, env } = await tempWorkspace('engram-author-unset-');
  Object.assign(process.env, env);
  await setAuthorProfile(cwd, 'global', { name: 'Jane', email: 'jane@example.com' });
  await unsetAuthorProfile(cwd, 'global');
  assert.equal((await readConfiguredAuthorLayers(cwd)).global, null);
});

test('snapshot failure rolls DB and JSON back', async () => {
  const { cwd, env } = await tempWorkspace('engram-author-rollback-');
  Object.assign(process.env, env);
  await setAuthorProfile(cwd, 'global', { name: 'Before', email: 'before@example.com' });
  setAuthorSnapshotWriterForTests(async () => { throw new Error('snapshot failed'); });
  await assert.rejects(
    setAuthorProfile(cwd, 'global', { name: 'After', email: 'after@example.com' }),
    /rollback: succeeded/i
  );
  setAuthorSnapshotWriterForTests(undefined);
  assert.deepEqual((await readConfiguredAuthorLayers(cwd)).global, { name: 'Before', email: 'before@example.com' });
});
