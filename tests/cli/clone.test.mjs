import test from 'node:test';
import assert from 'node:assert/strict';
import { rm, writeFile, mkdir, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { initGit, runEngram, tempWorkspace, workspaceMemoryRoot } from '../helpers.mjs';
import { sha256, testMemory, duplicateFixtureMemory } from './fixtures.mjs';

test('clone-memory copies active memories between workspace and global', async () => {
  const { cwd, env } = await tempWorkspace('engram-clone-');
  await runEngram(cwd, env, ['init', '--no-skillset']);
  const saved = await runEngram(cwd, env, ['save', 'knowledge', '--scope', 'workspace', 'Workspace clone source memory'], 'A\n');
  assert.equal(saved.code, 0, saved.stderr);

  const rel = 'knowledge/workspace-clone-source-memory.md';
  const workspaceFile = path.join(workspaceMemoryRoot(cwd), rel);
  const globalFile = path.join(env.ENGRAM_GLOBAL_DIR, rel);
  const dryRun = await runEngram(cwd, env, ['clone', 'workspace', 'memory', 'to', 'global', '--dry-run']);
  assert.equal(dryRun.code, 0, dryRun.stderr);
  assert.match(dryRun.stdout, /Clone memory dry-run workspace -> global/);
  assert.match(dryRun.stdout, /Planned: 1/);
  await assert.rejects(readFile(globalFile, 'utf8'));

  const cloned = await runEngram(cwd, env, ['clone-memory', 'workspace', 'global']);
  assert.equal(cloned.code, 0, cloned.stderr);
  assert.match(cloned.stdout, /Clone memory workspace -> global/);
  assert.match(cloned.stdout, /Copied: 1/);
  assert.match(await readFile(globalFile, 'utf8'), /scope: global/);
  assert.match((await runEngram(cwd, env, ['verify', 'global'])).stdout, /OK global:knowledge\/workspace-clone-source-memory\.md/);

  const skipped = await runEngram(cwd, env, ['clone', 'workspace', 'memory', 'to', 'global']);
  assert.equal(skipped.code, 0, skipped.stderr);
  assert.match(skipped.stdout, /Skipped: 1/);

  const globalRaw = await readFile(globalFile, 'utf8');
  const changedGlobal = globalRaw.replace('Workspace clone source memory', 'Workspace clone source memory updated globally');
  await writeFile(globalFile, changedGlobal);
  const hashesPath = path.join(env.ENGRAM_GLOBAL_DIR, 'memory.hashes.json');
  const hashes = JSON.parse(await readFile(hashesPath, 'utf8'));
  hashes[rel] = sha256(changedGlobal);
  await writeFile(hashesPath, `${JSON.stringify(hashes, null, 2)}\n`);

  const back = await runEngram(cwd, env, ['cm', 'global', 'workspace', '--force']);
  assert.equal(back.code, 0, back.stderr);
  assert.match(back.stdout, /Clone memory global -> workspace/);
  assert.match(back.stdout, /Copied: 1/);
  const workspaceRaw = await readFile(workspaceFile, 'utf8');
  assert.match(workspaceRaw, /scope: workspace/);
  assert.match(workspaceRaw, /updated globally/);
  assert.match((await runEngram(cwd, env, ['verify', 'workspace'])).stdout, /OK workspace:knowledge\/workspace-clone-source-memory\.md/);
  await rm(cwd, { recursive: true, force: true });
});

test('clone-memory metacognize dry-run previews target save plans without writing', async () => {
  const { cwd, env } = await tempWorkspace('engram-clone-metacognize-');
  await runEngram(cwd, env, ['init', '--no-skillset']);
  const saved = await runEngram(cwd, env, ['save', 'knowledge', '--scope', 'workspace', 'Workspace metacognize source memory'], 'A\n');
  assert.equal(saved.code, 0, saved.stderr);

  const globalFile = path.join(env.ENGRAM_GLOBAL_DIR, 'knowledge', 'workspace-metacognize-source-memory.md');
  const preview = await runEngram(cwd, env, ['clone-memory', 'workspace', 'global', '--metacognize', '--dry-run']);
  assert.equal(preview.code, 0, preview.stderr);
  assert.match(preview.stdout, /Clone memory metacognize dry-run workspace -> global/);
  assert.match(preview.stdout, /Candidate: 1/);
  assert.match(preview.stdout, /Action: Add new memory/);
  assert.match(preview.stdout, /Scope: global/);
  assert.match(preview.stdout, /Workspace metacognize source memory/);
  await assert.rejects(readFile(globalFile, 'utf8'));
  await rm(cwd, { recursive: true, force: true });
});

test('clone-memory metacognize uses numbered approval and writes selected candidates', async () => {
  const { cwd, env } = await tempWorkspace('engram-clone-metacognize-');
  await runEngram(cwd, env, ['init', '--no-skillset']);
  await runEngram(cwd, env, ['save', 'knowledge', '--scope', 'workspace', 'Workspace selected clone memory'], 'A\n');
  await runEngram(cwd, env, ['save', 'rule', '--scope', 'workspace', 'Workspace skipped clone memory'], 'A\n');

  const selected = await runEngram(cwd, env, ['clone-memory', 'workspace', 'global', '--metacognize'], 'A 1\n');
  assert.equal(selected.code, 0, selected.stderr);
  assert.match(selected.stdout, /Saved ->/);
  assert.match(await readFile(path.join(env.ENGRAM_GLOBAL_DIR, 'knowledge', 'workspace-selected-clone-memory.md'), 'utf8'), /scope: global/);
  await assert.rejects(readFile(path.join(env.ENGRAM_GLOBAL_DIR, 'rules', 'workspace-skipped-clone-memory.md'), 'utf8'));
  await rm(cwd, { recursive: true, force: true });
});

test('clone-memory metacognize accept-all pauses when related memories need agent restructuring', async () => {
  const { cwd, env } = await tempWorkspace('engram-clone-metacognize-');
  await runEngram(cwd, env, ['init', '--no-skillset']);
  await runEngram(cwd, env, ['save', 'knowledge', '--scope', 'global', 'Release foundation checklist lives in docs release md'], 'A\n');
  await runEngram(cwd, env, ['save', 'rule', '--scope', 'workspace', 'OAuth rotation must follow the release foundation checklist'], 'A\n');

  const paused = await runEngram(cwd, env, ['clone-memory', 'workspace', 'global', '--metacognize', '--accept-all']);
  assert.equal(paused.code, 0, paused.stderr);
  assert.match(paused.stdout, /found related memories before writing/);
  assert.match(paused.stdout, /No file written yet/);
  assert.match(paused.stdout, /DEPENDS_ON/);
  assert.doesNotMatch(paused.stdout, /Saved ->/);
  await assert.rejects(readFile(path.join(env.ENGRAM_GLOBAL_DIR, 'rules', 'oauth-rotation-must-follow-the-release-foundation-checklist.md'), 'utf8'));
  await rm(cwd, { recursive: true, force: true });
});

test('clone-memory rejects force with metacognize', async () => {
  const { cwd, env } = await tempWorkspace('engram-clone-metacognize-');
  await runEngram(cwd, env, ['init', '--no-skillset']);
  const result = await runEngram(cwd, env, ['clone-memory', 'workspace', 'global', '--metacognize', '--force']);
  assert.equal(result.code, 1);
  assert.match(result.stderr, /--force cannot be used with --metacognize/);
  await rm(cwd, { recursive: true, force: true });
});
