import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { resolveUnderRoot, isPathInsideRoot } from '../dist/core/web/path-utils.js';

test('resolveUnderRoot accepts relative paths inside root', async () => {
  const base = await mkdtemp(path.join(tmpdir(), 'engram-path-'));
  const root = path.join(base, 'root');
  await mkdir(path.join(root, 'rules'), { recursive: true });

  assert.equal(
    resolveUnderRoot(root, path.join('rules', 'agent.md')),
    path.join(root, 'rules', 'agent.md')
  );
});

test('resolveUnderRoot rejects traversal outside root', async () => {
  const base = await mkdtemp(path.join(tmpdir(), 'engram-path-'));
  const root = path.join(base, 'root');
  await mkdir(root, { recursive: true });

  assert.throws(
    () => resolveUnderRoot(root, path.join('..', 'outside.md')),
    /Path escapes allowed root/
  );
});

test('isPathInsideRoot rejects absolute paths outside root', async () => {
  const base = await mkdtemp(path.join(tmpdir(), 'engram-path-'));
  const root = path.join(base, 'root');
  const outside = path.join(base, 'outside.md');

  assert.equal(isPathInsideRoot(root, outside), false);
  assert.equal(isPathInsideRoot(root, path.join(root, 'knowledge', 'a.md')), true);
});
