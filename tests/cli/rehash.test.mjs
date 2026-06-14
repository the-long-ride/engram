import test from 'node:test';
import assert from 'node:assert/strict';
import { rm, writeFile, mkdir, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { initGit, runEngram, tempWorkspace, workspaceMemoryRoot } from '../helpers.mjs';
import { testMemory, duplicateFixtureMemory } from './fixtures.mjs';

test('rehash recomputes hashes for all memory files and fixes mismatches', async () => {
  const { cwd, env } = await tempWorkspace('engram-rehash-');
  await runEngram(cwd, env, ['init', '--no-skillset']);
  const root = workspaceMemoryRoot(cwd);
  const memoryDir = path.join(root, 'knowledge');
  await mkdir(memoryDir, { recursive: true });
  await writeFile(path.join(memoryDir, 'test-kb.md'), `---
id: test-kb
type: knowledge
scope: workspace
tags: [test]
created: 2026-06-05
updated: 2026-06-05
author: test
source: manual
confidence: high
---

# Knowledge: test

## Context

Test.

## Content

- Some content.

## Example

Use this memory when a future task touches: test.
`);
  // First, save creates a hash.
  const rehash1 = await runEngram(cwd, env, ['rehash']);
  assert.equal(rehash1.code, 0, rehash1.stderr);
  assert.match(rehash1.stdout, /Hashed/);
  assert.match(rehash1.stdout, /Changed:\s+1/);
  // Tamper with the file.
  const filePath = path.join(memoryDir, 'test-kb.md');
  await writeFile(filePath, (await readFile(filePath, 'utf8')).replace('Some content', 'Tampered content'));
  // Rehash should detect the change.
  const rehash2 = await runEngram(cwd, env, ['rehash']);
  assert.equal(rehash2.code, 0, rehash2.stderr);
  assert.match(rehash2.stdout, /Changed:\s+1/);
  // Verify should pass after rehash.
  const verify = await runEngram(cwd, env, ['verify']);
  assert.equal(verify.code, 0, verify.stderr);
  assert.match(verify.stdout, /OK/);
  assert.doesNotMatch(verify.stdout, /MISMATCH/);
});

test('rehash scopes work individually', async () => {
  const { cwd, env } = await tempWorkspace('engram-rehash-scope-');
  await runEngram(cwd, env, ['init', '--no-skillset']);
  const rehashWorkspace = await runEngram(cwd, env, ['rehash', 'workspace']);
  assert.equal(rehashWorkspace.code, 0, rehashWorkspace.stderr);
  assert.match(rehashWorkspace.stdout, /Hashed/);
  // global is configured via ENGRAM_GLOBAL_DIR in tempWorkspace env
  const rehashGlobal = await runEngram(cwd, env, ['rehash', 'global']);
  assert.equal(rehashGlobal.code, 0, rehashGlobal.stderr);
  assert.match(rehashGlobal.stdout, /Hashed/);
});

test('natural language rehash normalizes to engram rehash', async () => {
  const { cwd, env } = await tempWorkspace('engram-nat-rehash-');
  await runEngram(cwd, env, ['init', '--no-skillset']);
  const rehash = await runEngram(cwd, env, ['rehash', 'memory']);
  assert.equal(rehash.code, 0, rehash.stderr);
  assert.match(rehash.stdout, /Hashed/);
});
