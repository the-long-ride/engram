import test from 'node:test';
import assert from 'node:assert/strict';
import { rm, writeFile, mkdir, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { initGit, runEngram, tempWorkspace, workspaceMemoryRoot } from '../helpers.mjs';
import { testMemory, duplicateFixtureMemory } from './fixtures.mjs';

test('install-hooks preserves human-authored hooks', async () => {
  const { cwd, env } = await tempWorkspace('engram-cli-');
  assert.equal(initGit(cwd).status, 0);
  const hook = path.join(cwd, '.git', 'hooks', 'post-merge');
  await writeFile(hook, '#!/bin/sh\n# human hook\n');
  const result = await runEngram(cwd, env, ['install-hooks']);
  assert.equal(result.code, 0, result.stderr);
  assert.match(result.stdout, /SKIPPED post-merge/);
  assert.match(result.stdout, /WRITTEN pre-commit/);
  assert.match(await readFile(hook, 'utf8'), /human hook/);
  assert.match(await readFile(path.join(cwd, '.git', 'hooks', 'pre-commit'), 'utf8'), /^#!\/bin\/sh/);
  await rm(cwd, { recursive: true, force: true });
});

test('update-global-folder can retarget config without moving memory', async () => {
  const { cwd, env } = await tempWorkspace('engram-cli-');
  const customEnv = { ...env };
  delete customEnv.ENGRAM_GLOBAL_DIR;
  const oldGlobal = path.join(cwd, 'old-global');
  const newGlobal = path.join(cwd, 'new-global');
  assert.equal((await runEngram(cwd, customEnv, ['inject', '--global-path', oldGlobal, '--no-skillset'])).code, 0);

  const updated = await runEngram(cwd, customEnv, ['set', 'global', 'memory', 'path', 'to', newGlobal]);
  assert.equal(updated.code, 0, updated.stderr);
  assert.match(updated.stdout, /global path updated/);
  assert.match(updated.stdout, /global memory not moved/);
  const profiles = JSON.parse(await readFile(path.join(customEnv.ENGRAM_CONFIG_DIR, 'profiles.json'), 'utf8'));
  assert.equal(profiles.profiles[profiles.active_profile].global_path, newGlobal);
  await readFile(path.join(oldGlobal, 'engram.config.json'), 'utf8');
  const newConfig = JSON.parse(await readFile(path.join(newGlobal, 'engram.config.json'), 'utf8'));
  assert.equal(newConfig.global_path, newGlobal);
  const entry = await runEngram(cwd, customEnv, ['entry']);
  assert.match(entry.stdout.replace(/\x1b\[[0-9;]*m/g, ''), new RegExp(`roots\\.global:\\s*${newGlobal.replace(/[\\^$.*+?()[\]{}|]/g, '\\$&')}`));
  await rm(cwd, { recursive: true, force: true });
});

test('update-global-folder moves an old global root into a renamed path', async () => {
  const { cwd, env } = await tempWorkspace('engram-cli-');
  const customEnv = { ...env };
  delete customEnv.ENGRAM_GLOBAL_DIR;
  const oldGlobal = path.join(cwd, 'old-global');
  const newGlobal = path.join(cwd, 'renamed-global');
  assert.equal((await runEngram(cwd, customEnv, ['inject', '--global-path', oldGlobal, '--no-skillset'])).code, 0);
  const saved = await runEngram(cwd, customEnv, ['save', 'knowledge', '--scope', 'global', 'Moved global memory survives'], 'A\n');
  assert.equal(saved.code, 0, saved.stderr);
  await writeFile(path.join(oldGlobal, 'custom-notes.txt'), 'custom root file\n');

  const moved = await runEngram(cwd, customEnv, ['move', 'global', 'folder', 'from', oldGlobal, 'to', newGlobal]);
  assert.equal(moved.code, 0, moved.stderr);
  assert.match(moved.stdout, /global memory moved/);
  await assert.rejects(readdir(oldGlobal));
  assert.match(await readFile(path.join(newGlobal, 'knowledge', 'moved-global-memory-survives.md'), 'utf8'), /Moved global memory survives/);
  assert.equal(await readFile(path.join(newGlobal, 'custom-notes.txt'), 'utf8'), 'custom root file\n');
  assert.equal(spawnSync('git', ['-C', newGlobal, 'rev-parse', '--is-inside-work-tree'], { encoding: 'utf8' }).stdout.trim(), 'true');
  const loaded = await runEngram(cwd, customEnv, ['load', 'global memory survives']);
  assert.equal(loaded.code, 0, loaded.stderr);
  assert.match(loaded.stdout, /global: 1/);
  assert.match((await runEngram(cwd, customEnv, ['verify', 'global'])).stdout, /OK global:knowledge\/moved-global-memory-survives\.md/);
  await rm(cwd, { recursive: true, force: true });
});

test('update-global-folder refuses to move into a destination with memory files', async () => {
  const { cwd, env } = await tempWorkspace('engram-cli-');
  const customEnv = { ...env };
  delete customEnv.ENGRAM_GLOBAL_DIR;
  const oldGlobal = path.join(cwd, 'old-global');
  const newGlobal = path.join(cwd, 'existing-global');
  assert.equal((await runEngram(cwd, customEnv, ['inject', '--global-path', oldGlobal, '--no-skillset'])).code, 0);
  await mkdir(path.join(newGlobal, 'knowledge'), { recursive: true });
  await writeFile(path.join(newGlobal, 'knowledge', 'existing.md'), 'keep this\n');

  const moved = await runEngram(cwd, customEnv, ['update-global-folder', newGlobal, '--move-from-path', oldGlobal]);
  assert.equal(moved.code, 1);
  assert.match(moved.stderr, /already contains memory or user files/);
  await readFile(path.join(oldGlobal, 'engram.config.json'), 'utf8');
  assert.equal(await readFile(path.join(newGlobal, 'knowledge', 'existing.md'), 'utf8'), 'keep this\n');
  const fileTarget = path.join(cwd, 'global-file');
  await writeFile(fileTarget, 'not a directory\n');
  const fileMove = await runEngram(cwd, customEnv, ['update-global-folder', fileTarget, '--move-from-path', oldGlobal]);
  assert.equal(fileMove.code, 1);
  assert.match(fileMove.stderr, /not a directory/);
  await rm(cwd, { recursive: true, force: true });
});

test('ignore add and check manage visibility', async () => {
  const { cwd, env } = await tempWorkspace('engram-ignore-');
  await runEngram(cwd, env, ['inject', '--no-skillset']);
  // Check a path that is not ignored.
  const check1 = await runEngram(cwd, env, ['ignore', 'check', 'knowledge/public.md']);
  assert.equal(check1.stdout.trim(), 'visible');
  // Add an ignore pattern.
  const add = await runEngram(cwd, env, ['ignore', 'add', 'private/**']);
  assert.match(add.stdout, /Added ignore pattern/);
  // Check a path that is now ignored.
  const check2 = await runEngram(cwd, env, ['ignore', 'check', 'private/secret.md']);
  assert.equal(check2.stdout.trim(), 'ignored');
  // Status shows the pattern.
  const status = await runEngram(cwd, env, ['ignore', 'status']);
  assert.match(status.stdout, /private\/\*\*/);
});

test('set-role configures developer roles', async () => {
  const { cwd, env } = await tempWorkspace('engram-role-');
  await runEngram(cwd, env, ['inject', '--no-skillset']);
  // Default status shows no roles.
  const status1 = await runEngram(cwd, env, ['set-role']);
  assert.match(status1.stdout, /Roles:\s*\(?none\)?/i);
  assert.match(status1.stdout, /Agent action:/);
assert.match(status1.stdout, /engram load "<current task\/request>"/);
  assert.match(status1.stdout, /replace prior Engram-loaded context/i);
  // Set roles — returns confirmation.
  const set = await runEngram(cwd, env, ['set-role', 'frontend', 'design']);
  assert.match(set.stdout, /frontend, design/);
  assert.match(set.stdout, /Agent action:/);
assert.match(set.stdout, /engram load "<current task\/request>"/);
  // Calling with no args clears roles (command behavior).
  const clear = await runEngram(cwd, env, ['set-role']);
  assert.match(clear.stdout, /Roles:\s*\(?none\)?/i);
  assert.match(clear.stdout, /Agent action:/);
});

test('set-read configures read behavior', async () => {
  const { cwd, env } = await tempWorkspace('engram-read-');
  await runEngram(cwd, env, ['inject', '--no-skillset']);
  // Default.
  const s1 = await runEngram(cwd, env, ['set-read', 'status']);
  assert.match(s1.stdout, /Read behavior: auto/);
  // Change to always.
  const set = await runEngram(cwd, env, ['set-read', 'always']);
  assert.match(set.stdout, /Read behavior: always/);
  // Bad value fails.
  const bad = await runEngram(cwd, env, ['set-read', 'invalid']);
  assert.ok(bad.code !== 0);
});

test('set-proof configures per-response proof behavior', async () => {
  const { cwd, env } = await tempWorkspace('engram-proof-');
  await runEngram(cwd, env, ['inject', '--no-skillset']);
  const status = await runEngram(cwd, env, ['set-proof', 'status']);
  assert.match(status.stdout, /Proof behavior: off/);
  const set = await runEngram(cwd, env, ['set-proof', 'compact']);
  assert.match(set.stdout, /Proof behavior: compact/);
  const bad = await runEngram(cwd, env, ['set-proof', 'verbose']);
  assert.ok(bad.code !== 0);
});

test('set-rule-variant configures rule strictness', async () => {
  const { cwd, env } = await tempWorkspace('engram-rv-');
  await runEngram(cwd, env, ['inject', '--no-skillset']);
  // Default.
  const s1 = await runEngram(cwd, env, ['set-rule-variant', 'status']);
  assert.match(s1.stdout, /Rule variants:/);
  assert.doesNotMatch(s1.stdout, /Agent action:/);
  // Set strict.
  const set = await runEngram(cwd, env, ['set-rule-variant', 'strict']);
  assert.match(set.stdout, /strict/);
  assert.match(set.stdout, /Agent action:/);
assert.match(set.stdout, /engram load "<current task\/request>"/);
  // Set off.
  const off = await runEngram(cwd, env, ['set-rule-variant', 'off']);
  assert.match(off.stdout, /off/);
  assert.match(off.stdout, /Agent action:/);
});

test('set-save-target configures default save scope', async () => {
  const { cwd, env } = await tempWorkspace('engram-st-');
  await runEngram(cwd, env, ['inject', '--no-skillset']);
  // Status default.
  const s1 = await runEngram(cwd, env, ['set-save-target', 'status']);
  assert.match(s1.stdout, /Save target:/);
  // Change to workspace.
  const set = await runEngram(cwd, env, ['set-save-target', 'workspace']);
  assert.match(set.stdout, /Save target: workspace/);
  // global with ENGRAM_GLOBAL_DIR works.
  const globalOk = await runEngram(cwd, env, ['set-save-target', 'global']);
  assert.match(globalOk.stdout, /Save target: global/);
});

test('set-load-limit configures the compact load cap', async () => {
  const { cwd, env } = await tempWorkspace('engram-ll-');
  await runEngram(cwd, env, ['inject', '--no-skillset']);
  // Default.
  const s1 = await runEngram(cwd, env, ['set-load-limit', 'status']);
  assert.match(s1.stdout, /Load limit: 8/);
  // Change.
  const set = await runEngram(cwd, env, ['set-load-limit', '5']);
  assert.match(set.stdout, /Load limit: 5/);
  // Reset.
  const reset = await runEngram(cwd, env, ['set-load-limit', 'reset']);
  assert.match(reset.stdout, /Load limit: 8/);
  // Out of range fails.
  const bad = await runEngram(cwd, env, ['set-load-limit', '0']);
  assert.ok(bad.code !== 0);
});

test('unlink reports skipped when no files exist', async () => {
  const { cwd, env } = await tempWorkspace('engram-unlink-');
  await runEngram(cwd, env, ['inject', '--no-skillset']);
  // Unlink should report skipped files (nothing to unlink).
  const unlink = await runEngram(cwd, env, ['unlink', 'codex']);
  assert.equal(unlink.code, 0, unlink.stderr);
  assert.match(unlink.stdout, /SKIPPED|not found/);
});
