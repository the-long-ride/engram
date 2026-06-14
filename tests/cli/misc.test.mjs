import test from 'node:test';
import assert from 'node:assert/strict';
import { rm, writeFile, mkdir, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { initGit, runEngram, tempWorkspace, workspaceMemoryRoot } from '../helpers.mjs';
import { testMemory, duplicateFixtureMemory } from './fixtures.mjs';

test('short command aliases dispatch to canonical commands', async () => {
  const { cwd, env } = await tempWorkspace('engram-cli-');
  assert.equal((await runEngram(cwd, env, ['i'])).code, 0);
  const saved = await runEngram(cwd, env, ['s', 'rule', '--scope', 'workspace', 'Alias save rule'], 'A\n');
  assert.equal(saved.code, 0, saved.stderr);
  const shortcutSaved = await runEngram(cwd, env, ['ss', '-a', '--scope', 'workspace', 'TYPE: knowledge | TEXT: Alias ss accepts all save-session candidates.']);
  assert.equal(shortcutSaved.code, 0, shortcutSaved.stderr);
  assert.match(shortcutSaved.stdout, /Accepted all save-session candidates/);
  const canonical = await runEngram(cwd, env, ['save-session', '--accept-all', '--scope', 'workspace', 'TYPE: knowledge | TEXT: Canonical save-session accepts all candidates.']);
  assert.equal(canonical.code, 0, canonical.stderr);
  assert.match(canonical.stdout, /Accepted all save-session candidates/);
  assert.doesNotMatch((await runEngram(cwd, env, ['at', '-a', '--scope', 'workspace', 'TYPE: knowledge | TEXT: Legacy at should not save.'])).stdout, /Accepted all save-session candidates/);
  assert.doesNotMatch((await runEngram(cwd, env, ['auto', 'save', 'accept', 'all', '--scope', 'workspace', 'TYPE: knowledge | TEXT: Natural auto save should not save.'])).stdout, /Accepted all save-session candidates/);
  assert.match((await runEngram(cwd, env, ['ld', 'alias save'])).stdout, /Alias save rule/);
  assert.doesNotMatch((await runEngram(cwd, env, ['search', 'Natural auto save'])).stdout, /Natural auto save should not save/);
  assert.match((await runEngram(cwd, env, ['search', 'Alias ss'])).stdout, /Alias ss accepts all save.?session candidates/);
  assert.match((await runEngram(cwd, env, ['vf'])).stdout, /OK workspace/);
  await rm(cwd, { recursive: true, force: true });
});

test('unsupported public flags fail instead of silently degrading', async () => {
  const { cwd, env } = await tempWorkspace('engram-cli-');
  await runEngram(cwd, env, ['init']);
  assert.equal((await runEngram(cwd, env, ['export', '--format', 'bogus'])).code, 1);
  assert.equal((await runEngram(cwd, env, ['resolve-conflicts', '--auto'])).code, 1);
  await rm(cwd, { recursive: true, force: true });
});

test('all registered commands have topic help entries', async () => {
  const { HELP_DATA } = await import('../../dist/core/cli/command-registry.js');
  const { COMMAND_TOPICS } = await import('../../dist/core/cli/help-topics.js');
  for (const section of HELP_DATA) {
    for (const item of section.commands) {
      const name = item.command.replace(/^engram\s+/, '').trim().split(/\s+/)[0];
      assert.ok(COMMAND_TOPICS[name], `missing help topic for command: ${name}`);
    }
  }
});

test('all registered commands appear in engram -h output', async () => {
  const { cwd, env } = await tempWorkspace('engram-h-all-');
  const { HELP_DATA } = await import('../../dist/core/cli/command-registry.js');
  const help = await runEngram(cwd, env, ['-h']);
  const output = help.stdout.replace(/\x1b\[[0-9;]*m/g, '');
  for (const section of HELP_DATA) {
    for (const item of section.commands) {
      const name = item.command.replace(/^engram\s+/, '').trim().split(/\s+/)[0];
      assert.match(output, new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `command ${name} missing from -h output`);
    }
  }
});
