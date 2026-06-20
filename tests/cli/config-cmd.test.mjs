import test from 'node:test';
import assert from 'node:assert/strict';
import { rm } from 'node:fs/promises';
import path from 'node:path';
import { runEngram, tempWorkspace } from '../helpers.mjs';

async function hasSqlite() {
  try { await import('node:sqlite'); return true; } catch { /* check better-sqlite3 */ }
  try { await import('better-sqlite3'); return true; } catch { return false; }
}

test('config view shows resolved config', async () => {
  const { cwd, env } = await tempWorkspace('engram-cfg-');
  const result = await runEngram(cwd, env, ['config', 'view']);
  assert.equal(result.code, 0, result.stderr);
  // Should show key config fields
  assert.ok(result.stdout.includes('Version') || result.stdout.includes('version') || result.stdout.includes('scope'), result.stdout);
  await rm(cwd, { recursive: true, force: true });
});

test('config set writes a user config key', async () => {
  const { cwd, env } = await tempWorkspace('engram-cfg-');
  if (!(await hasSqlite())) {
    await rm(cwd, { recursive: true, force: true });
    return;
  }
  const result = await runEngram(cwd, env, ['config', 'set', 'scope', 'global']);
  assert.equal(result.code, 0, result.stderr);
  assert.match(result.stdout, /user config set/i, result.stdout);
  assert.match(result.stdout, /scope = global/i, result.stdout);

  // Verify it appears in config view
  const view = await runEngram(cwd, env, ['config', 'view']);
  assert.equal(view.code, 0, view.stderr);
  assert.match(view.stdout, /scope.*global/i, view.stdout);

  await rm(cwd, { recursive: true, force: true });
});

test('config set rejects invalid key', async () => {
  const { cwd, env } = await tempWorkspace('engram-cfg-');
  if (!(await hasSqlite())) {
    await rm(cwd, { recursive: true, force: true });
    return;
  }
  const result = await runEngram(cwd, env, ['config', 'set', 'nonexistent_key', 'value']);
  assert.notEqual(result.code, 0);
  assert.match(result.stderr, /unknown config key/i, result.stderr);
  await rm(cwd, { recursive: true, force: true });
});

test('config set handles dotted keys like load.limit', async () => {
  const { cwd, env } = await tempWorkspace('engram-cfg-');
  if (!(await hasSqlite())) {
    await rm(cwd, { recursive: true, force: true });
    return;
  }
  const result = await runEngram(cwd, env, ['config', 'set', 'load.limit', '16']);
  assert.equal(result.code, 0, result.stderr);
  assert.match(result.stdout, /user config set/i, result.stdout);

  const view = await runEngram(cwd, env, ['config', 'view']);
  assert.match(view.stdout, /load\.limit.*16|load.*limit.*16/i, view.stdout);

  await rm(cwd, { recursive: true, force: true });
});

test('config view works without sqlite (JSON fallback)', async () => {
  const { cwd, env } = await tempWorkspace('engram-cfg-');
  const result = await runEngram(cwd, env, ['config', 'view']);
  assert.equal(result.code, 0, result.stderr);
  // Should still show config from JSON fallback
  assert.ok(result.stdout.length > 0, result.stdout);
  await rm(cwd, { recursive: true, force: true });
});