import test from 'node:test';
import assert from 'node:assert/strict';
import { rm } from 'node:fs/promises';
import path from 'node:path';
import { runEngram, tempWorkspace } from '../helpers.mjs';

test('author CLI sets global and workspace profiles and reports resolved JSON', async () => {
  const { cwd, env } = await tempWorkspace('engram-author-cli-');
  const set = await runEngram(cwd, env, ['author', 'set', '--name', 'Jane Doe', '--email', 'jane@example.com']);
  assert.equal(set.code, 0, set.stderr);
  assert.match(set.stdout, /Global Engram author saved/);
  const workspace = await runEngram(cwd, env, ['author', 'set', '--scope', 'workspace', '--name', 'Workspace Jane', '--email', 'jane@work.com']);
  assert.equal(workspace.code, 0, workspace.stderr);
  const shown = await runEngram(cwd, env, ['author', 'show', '--json']);
  assert.equal(shown.code, 0, shown.stderr);
  const body = JSON.parse(shown.stdout);
  assert.equal(body.data.resolved.source, 'workspace');
  assert.equal(body.data.resolved.email, 'jane@work.com');
  const human = await runEngram(cwd, env, ['author', 'show']);
  assert.match(human.stdout, /Git fallback/);
  assert.match(human.stdout, /Source:\s+workspace/);
  await rm(cwd, { recursive: true, force: true });
});

test('author CLI validates scopes, values, and confirmations without persistence', async () => {
  const { cwd, env } = await tempWorkspace('engram-author-cli-invalid-');
  const invalid = await runEngram(cwd, env, ['author', 'set', '--name', 'Jane', '--email', 'not-an-email']);
  assert.notEqual(invalid.code, 0);
  const shown = JSON.parse((await runEngram(cwd, env, ['author', 'show', '--json'])).stdout);
  assert.equal(shown.data.global, null);
  assert.notEqual((await runEngram(cwd, env, ['author', 'unset'])).code, 0);
  assert.notEqual((await runEngram(cwd, env, ['author', 'set', '--scope', 'both', '--name', 'Jane Doe', '--email', 'jane@example.com'])).code, 0);
  await runEngram(cwd, env, ['author', 'set', '--name', 'Jane Doe', '--email', 'jane@example.com']);
  assert.notEqual((await runEngram(cwd, env, ['author', 'sync-git-global'])).code, 0);
  assert.notEqual((await runEngram(cwd, env, ['author', 'migrate-memories'])).code, 0);
  assert.equal((await runEngram(cwd, env, ['author', 'migrate-memories', '--scope', 'both', '--plan'])).code, 0);
  await rm(cwd, { recursive: true, force: true });
});

test('author CLI exposes nested help for every action', async () => {
  const { cwd, env } = await tempWorkspace('engram-author-help-');
  for (const args of [
    ['author', '--help'],
    ['author', 'show', '--help'],
    ['author', 'set', '--help'],
    ['author', 'unset', '--help'],
    ['author', 'sync-git-global', '--help'],
    ['author', 'migrate-memories', '--help']
  ]) {
    const result = await runEngram(cwd, env, args);
    assert.equal(result.code, 0, `${args.join(' ')}: ${result.stderr}`);
    assert.match(result.stdout, /Usage:/);
  }
  const bash = await runEngram(cwd, env, ['completion', 'bash']);
  assert.match(bash.stdout, /author/);
  assert.match(bash.stdout, /sync-git-global/);
  await rm(cwd, { recursive: true, force: true });
});
