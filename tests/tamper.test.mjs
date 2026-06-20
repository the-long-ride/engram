import test from 'node:test';
import assert from 'node:assert/strict';
import { rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { runEngram, tempWorkspace, workspaceMemoryRoot } from './helpers.mjs';

test('verify reports hash mismatch after external tampering', async () => {
  const { cwd, env } = await tempWorkspace('engram-tamper-');
  await runEngram(cwd, env, ['init']);
  const save = await runEngram(cwd, env, ['save', 'rule', '--scope', 'workspace', '--skip-task-type-prompt', 'Use npm scripts for verification'], 'A\n');
  assert.equal(save.code, 0, `Save command failed. stdout: ${save.stdout}, stderr: ${save.stderr}`);
  const file = path.join(workspaceMemoryRoot(cwd), 'rules', 'use-npm-scripts-for-verification.md');
  await writeFile(file, 'tampered outside Engram\n');
  const verify = await runEngram(cwd, env, ['verify', 'workspace']);
  assert.match(verify.stdout, /MISMATCH workspace/);
  await rm(cwd, { recursive: true, force: true });
});
