import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { runEngram, tempWorkspace, workspaceMemoryRoot } from '../helpers.mjs';

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

test('author migrate-memories --strip-email is plan-first', async () => {
  const { cwd, env } = await tempWorkspace('engram-author-strip-cli-');
  await runEngram(cwd, env, ['inject', '--no-skillset']);
  await runEngram(cwd, env, ['author', 'set', '--name', 'Jane Doe', '--email', 'jane@example.com']);
  const file = path.join(workspaceMemoryRoot(cwd), 'knowledge', 'strip-cli.md');
  const raw = ['---', 'schema_version: 3', 'id: strip-cli', 'type: knowledge', 'scope: workspace', 'tags: [test]', 'created: 2025-01-01', 'updated: 2025-01-01', 'author_name: Jane Doe', 'author_email: jane@example.com', 'source: manual', 'confidence: high', 'authority: reference', 'revision: 1', 'valid_from: 2025-01-01', 'last_confirmed: 2025-01-01', '---', '# Strip cli', '', '## Content', '', '- Strip email check.', ''].join('\n');
  await writeFile(file, raw);
  const plan = await runEngram(cwd, env, ['author', 'migrate-memories', '--strip-email', '--scope', 'workspace', '--json']);
  assert.equal(plan.code, 0, plan.stderr);
  const planned = JSON.parse(plan.stdout).data;
  assert.equal(planned.eligible, 1);
  assert.equal(planned.migrated, undefined);
  assert.equal(await readFile(file, 'utf8'), raw);
  const applied = await runEngram(cwd, env, ['author', 'migrate-memories', '--strip-email', '--scope', 'workspace', '--confirm', '--json']);
  assert.equal(applied.code, 0, applied.stderr);
  assert.equal(JSON.parse(applied.stdout).data.migrated, 1);
  const after = await readFile(file, 'utf8');
  assert.doesNotMatch(after, /^author_email:/m);
  assert.match(after, /^author_name:/m);
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
