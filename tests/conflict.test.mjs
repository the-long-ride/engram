import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { initGit, runEngram, tempWorkspace, workspaceMemoryRoot } from './helpers.mjs';

test('resolve-conflicts writes and stages only workspace memory files', async () => {
  const { cwd, env } = await tempWorkspace('engram-conflict-');
  initGit(cwd);
  await runEngram(cwd, env, ['init']);
  const memoryFile = path.join(workspaceMemoryRoot(cwd), 'rules', 'merge-rule.md');
  await writeFile(memoryFile, conflictMemory());
  await writeFile(path.join(cwd, 'workspace.txt'), '<<<<<<< ours\ncode\n=======\ncode2\n>>>>>>> theirs\n');
  const result = await runEngram(cwd, env, ['resolve-conflicts']);
  assert.equal(result.code, 0, result.stderr);
  assert.match(result.stdout, /RESOLVED/);
  assert.doesNotMatch(await readFile(memoryFile, 'utf8'), /<<<<<<<|=======|>>>>>>>/);
  assert.match(await readFile(path.join(cwd, 'workspace.txt'), 'utf8'), /<<<<<<< ours/);
  const status = spawnSync('git', ['status', '--porcelain'], { cwd, encoding: 'utf8' }).stdout;
  assert.match(status, /\.agents\/\.engram\/rules\/merge-rule\.md/);
  assert.doesNotMatch(status.split(/\r?\n/).filter((line) => line.startsWith('A ')).join('\n'), /workspace\.txt/);
  await rm(cwd, { recursive: true, force: true });
});

test('resolve-conflicts can append a metacognize source pack for agent restructuring', async () => {
  const { cwd, env } = await tempWorkspace('engram-conflict-metacognize-');
  initGit(cwd);
  await runEngram(cwd, env, ['init', '--no-skillset']);
  const memoryFile = path.join(workspaceMemoryRoot(cwd), 'rules', 'merge-rule.md');
  await writeFile(memoryFile, conflictMemory());

  const result = await runEngram(cwd, env, ['resolve', 'conflicts', 'and', 'metacognize', '--dry-run']);
  assert.equal(result.code, 0, result.stderr);
  assert.match(result.stdout, /Conflict dry-run/);
  assert.match(result.stdout, /Metacognize workspace memory/);
  assert.match(result.stdout, /Source pack:/);
  assert.match(await readFile(memoryFile, 'utf8'), /<<<<<<< ours/);
  await rm(cwd, { recursive: true, force: true });
});

function conflictMemory() {
  return `---
id: merge-rule
type: rule
scope: workspace
tags: [merge]
author: test
confidence: high
---
# Merge Rule

## Context

Conflict resolver regression test.

## Content

<<<<<<< ours
- Use Engram memory as the source of truth.
=======
- Stage only Engram-owned files.
>>>>>>> theirs

## Example

engram resolve-conflicts
`;
}
