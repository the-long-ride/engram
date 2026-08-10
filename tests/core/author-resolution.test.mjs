import test from 'node:test';
import assert from 'node:assert/strict';
import { tempWorkspace } from '../helpers.mjs';
import { setAuthorProfile } from '../../dist/core/author/config.js';
import { getAuthorState, requireResolvedAuthor } from '../../dist/core/author/resolve.js';

test('workspace profile wins over global and Git', async () => {
  const { cwd, env } = await tempWorkspace('engram-author-resolve-');
  Object.assign(process.env, env);
  await setAuthorProfile(cwd, 'global', { name: 'Global', email: 'global@example.com' });
  await setAuthorProfile(cwd, 'workspace', { name: 'Workspace', email: 'workspace@example.com' });
  const state = await getAuthorState(cwd, { gitReader: async () => ({ name: 'Git', email: 'git@example.com' }) });
  assert.equal(state.resolved.source, 'workspace');
  assert.equal(state.resolved.email, 'workspace@example.com');
});

test('global profile wins over Git when workspace is absent', async () => {
  const { cwd, env } = await tempWorkspace('engram-author-global-');
  Object.assign(process.env, env);
  await setAuthorProfile(cwd, 'global', { name: 'Global', email: 'global@example.com' });
  const state = await getAuthorState(cwd, { gitReader: async () => ({ name: 'Git', email: 'git@example.com' }) });
  assert.equal(state.resolved.source, 'global');
});

test('resolver never mixes fields from different layers', async () => {
  const { cwd, env } = await tempWorkspace('engram-author-no-mix-');
  Object.assign(process.env, env);
  const state = await getAuthorState(cwd, {
    layerReader: async () => ({ global: null, workspace: null }),
    gitReader: async () => null
  });
  assert.deepEqual(state.resolved, { name: '', email: '', source: 'unresolved', complete: false });
});

test('missing identity error lists all three remedies', async () => {
  const { cwd, env } = await tempWorkspace('engram-author-missing-');
  Object.assign(process.env, env);
  await assert.rejects(() => requireResolvedAuthor(cwd, { gitReader: async () => null }), /engram author set --name/);
});
