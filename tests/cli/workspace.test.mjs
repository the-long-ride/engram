import test from 'node:test';
import assert from 'node:assert/strict';
import { rm } from 'node:fs/promises';
import path from 'node:path';
import { runEngram, tempWorkspace } from '../helpers.mjs';

async function hasSqlite() {
  const originalEmitWarning = process.emitWarning;
  process.emitWarning = function patchedEmitWarning(warning, ...args) {
    const message = typeof warning === 'string' ? warning : warning?.message ?? '';
    const option = args[0];
    const type = typeof option === 'string' ? option : option?.type ?? warning?.name ?? '';
    if (type === 'ExperimentalWarning' && message.includes('SQLite')) return false;
    return originalEmitWarning.call(this, warning, ...args);
  };
  try {
    try { await import('node:sqlite'); return true; } catch { /* check better-sqlite3 */ }
    try { await import('better-sqlite3'); return true; } catch { return false; }
  } finally {
    process.emitWarning = originalEmitWarning;
  }
}

test('workspace list shows header when no workspaces', async () => {
  const { cwd, env } = await tempWorkspace('engram-ws-');
  const result = await runEngram(cwd, env, ['workspace', 'list']);
  if (!(await hasSqlite())) {
    assert.match(result.stdout, /SQLite unavailable|not available/i);
    await rm(cwd, { recursive: true, force: true });
    return;
  }
  assert.equal(result.code, 0, result.stderr);
  // May say "No workspaces" since fresh temp dir
  assert.ok(result.stdout.includes('Workspaces') || result.stdout.includes('No workspaces'), result.stdout);
  await rm(cwd, { recursive: true, force: true });
});

test('workspace info reports unregistered workspace', async () => {
  const { cwd, env } = await tempWorkspace('engram-ws-');
  const result = await runEngram(cwd, env, ['workspace', 'info', cwd]);
  if (!(await hasSqlite())) {
    assert.match(result.stdout, /SQLite unavailable|not available/i);
    await rm(cwd, { recursive: true, force: true });
    return;
  }
  assert.equal(result.code, 0, result.stderr);
  assert.match(result.stdout, /not registered/i, result.stdout);
  await rm(cwd, { recursive: true, force: true });
});

test('workspace set writes a config key and links workspace', async () => {
  const { cwd, env } = await tempWorkspace('engram-ws-');
  const result = await runEngram(cwd, env, ['workspace', 'set', 'scope', 'global']);
  if (!(await hasSqlite())) {
    assert.match(result.stdout, /SQLite unavailable|not available/i);
    await rm(cwd, { recursive: true, force: true });
    return;
  }
  assert.equal(result.code, 0, result.stderr);
  assert.match(result.stdout, /workspace config set/i, result.stdout);
  assert.match(result.stdout, /scope = global/i, result.stdout);

  // Verify the workspace now shows in list
  const list = await runEngram(cwd, env, ['workspace', 'list']);
  assert.match(list.stdout, new RegExp(cwd.replace(/[\\^$.*+?()[\]{}|]/g, '\\$&')), list.stdout);
  await rm(cwd, { recursive: true, force: true });
});

test('workspace link and unlink toggle linked status', async () => {
  const { cwd, env } = await tempWorkspace('engram-ws-');
  if (!(await hasSqlite())) {
    await rm(cwd, { recursive: true, force: true });
    return;
  }
  // Register workspace first via set
  await runEngram(cwd, env, ['workspace', 'set', 'scope', 'workspace']);

  const unlinkRes = await runEngram(cwd, env, ['workspace', 'unlink']);
  assert.equal(unlinkRes.code, 0, unlinkRes.stderr);
  assert.match(unlinkRes.stdout, /unlinked/i, unlinkRes.stdout);

  const linkRes = await runEngram(cwd, env, ['workspace', 'link']);
  assert.equal(linkRes.code, 0, linkRes.stderr);
  assert.match(linkRes.stdout, /linked/i, linkRes.stdout);

  await rm(cwd, { recursive: true, force: true });
});

test('workspace unregister removes workspace from DB', async () => {
  const { cwd, env } = await tempWorkspace('engram-ws-');
  if (!(await hasSqlite())) {
    await rm(cwd, { recursive: true, force: true });
    return;
  }
  // Register via set
  await runEngram(cwd, env, ['workspace', 'set', 'scope', 'workspace']);

  const unreg = await runEngram(cwd, env, ['workspace', 'unregister', cwd]);
  assert.equal(unreg.code, 0, unreg.stderr);
  assert.match(unreg.stdout, /unregistered/i, unreg.stdout);

  // Info should now report not registered
  const info = await runEngram(cwd, env, ['workspace', 'info', cwd]);
  assert.match(info.stdout, /not registered/i, info.stdout);

  await rm(cwd, { recursive: true, force: true });
});

test('workspace set rejects invalid config key', async () => {
  const { cwd, env } = await tempWorkspace('engram-ws-');
  if (!(await hasSqlite())) {
    await rm(cwd, { recursive: true, force: true });
    return;
  }
  const result = await runEngram(cwd, env, ['workspace', 'set', 'nonexistent_key', 'value']);
  assert.notEqual(result.code, 0);
  assert.match(result.stderr, /unknown config key/i, result.stderr);
  await rm(cwd, { recursive: true, force: true });
});

test('workspace info shows config keys for registered workspace', async () => {
  const { cwd, env } = await tempWorkspace('engram-ws-');
  if (!(await hasSqlite())) {
    await rm(cwd, { recursive: true, force: true });
    return;
  }
  // Register with specific key
  await runEngram(cwd, env, ['workspace', 'set', 'scope', 'global']);
  await runEngram(cwd, env, ['workspace', 'set', 'load.limit', '12']);

  const info = await runEngram(cwd, env, ['workspace', 'info', cwd]);
  assert.equal(info.code, 0, info.stderr);
  assert.match(info.stdout, /scope/i, info.stdout);
  assert.match(info.stdout, /load\.limit/i, info.stdout);
  assert.match(info.stdout, /12/, info.stdout);

  await rm(cwd, { recursive: true, force: true });
});