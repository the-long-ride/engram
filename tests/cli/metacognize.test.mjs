import test from 'node:test';
import assert from 'node:assert/strict';
import { rm, writeFile, mkdir, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { initGit, runEngram, tempWorkspace, workspaceMemoryRoot } from '../helpers.mjs';
import { testMemory, duplicateFixtureMemory } from './fixtures.mjs';

test('metacognize dry-run emits compact source pack for target memory', async () => {
  const { cwd, env } = await tempWorkspace('engram-metacognize-');
  await runEngram(cwd, env, ['inject', '--no-skillset']);
  const saved = await runEngram(cwd, env, ['save', 'knowledge', '--scope', 'workspace', 'Metacognize source memory keeps retries concise'], 'A\n');
  assert.equal(saved.code, 0, saved.stderr);

  const dryRun = await runEngram(cwd, env, ['metacognize', '--workspace', '--dry-run']);
  assert.equal(dryRun.code, 0, dryRun.stderr);
  assert.match(dryRun.stdout, /Metacognize workspace memory/);
  assert.match(dryRun.stdout, /Source pack:/);
  assert.match(dryRun.stdout, /workspace:knowledge\/metacognize-source-memory-keeps-retries-concise\.md/);
  assert.match(dryRun.stdout, /TYPE: rule\|skill\|knowledge \| TEXT:/);
  assert.match(dryRun.stdout, /UPDATE: existing-memory-id/);
  await rm(cwd, { recursive: true, force: true });
});

test('metacognize force writes inline restructure candidate and supports natural wording', async () => {
  const { cwd, env } = await tempWorkspace('engram-metacognize-');
  await runEngram(cwd, env, ['inject', '--no-skillset']);
  await runEngram(cwd, env, ['save', 'knowledge', '--scope', 'workspace', 'Metacognize duplicate memory baseline'], 'A\n');

  const updated = await runEngram(cwd, env, [
    'restructure', 'workspace', 'memory', 'force',
    'TYPE: knowledge | TEXT: Metacognize duplicate memory baseline now has clearer structure. | UPDATE: metacognize-duplicate-memory-baseline'
  ]);
  assert.equal(updated.code, 0, updated.stderr);
  assert.match(updated.stdout, /Metacognize forced candidates/);
  assert.match(updated.stdout, /Saved ->/);
  assert.match(await readFile(path.join(workspaceMemoryRoot(cwd), 'knowledge', 'metacognize-duplicate-memory-baseline.md'), 'utf8'), /clearer structure/);
  await rm(cwd, { recursive: true, force: true });
});

test('metacognize force pauses when related memories need restructuring', async () => {
  const { cwd, env } = await tempWorkspace('engram-metacognize-');
  await runEngram(cwd, env, ['inject', '--no-skillset']);
  await runEngram(cwd, env, ['save', 'knowledge', '--scope', 'workspace', 'Release foundation checklist guides OAuth rotation'], 'A\n');
  await runEngram(cwd, env, ['save', 'rule', '--scope', 'workspace', 'OAuth rotation must follow the release foundation checklist'], 'A\n');

  const paused = await runEngram(cwd, env, [
  'metacognize', '--workspace', '--force',
    'TYPE: rule | TEXT: OAuth rotation must follow the release foundation checklist.'
  ]);
  assert.equal(paused.code, 0, paused.stderr);
  assert.match(paused.stdout, /found related memories before writing/);
assert.match(paused.stdout, /engram metacognize --workspace --force/);
  assert.match(paused.stdout, /DEPENDS_ON/);
  assert.doesNotMatch(paused.stdout, /Saved ->/);
  await rm(cwd, { recursive: true, force: true });
});
