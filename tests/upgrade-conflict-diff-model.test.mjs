import test from 'node:test';
import assert from 'node:assert/strict';
import { buildUpgradeConflictDiff } from '../dist/core/web/app/components/upgrade-conflict-diff-model.js';

function compact(ops) {
  return ops.map(({ kind, text }) => `${kind}:${JSON.stringify(text)}`);
}

test('builds deterministic unchanged, removed, and added operations', () => {
  const diff = buildUpgradeConflictDiff('keep\nold\ntail', 'keep\nnew\ntail');
  assert.deepEqual(compact(diff.ops), [
    'unchanged:"keep"',
    'removed:"old"',
    'added:"new"',
    'unchanged:"tail"'
  ]);
  assert.equal(diff.changed, true);
});

test('aligns replacement rows for parallel rendering', () => {
  const diff = buildUpgradeConflictDiff('keep\nold-a\nold-b\ntail', 'keep\nnew-a\ntail');
  assert.deepEqual(diff.rows, [
    {
      current: { text: 'keep', kind: 'unchanged' },
      proposed: { text: 'keep', kind: 'unchanged' }
    },
    {
      current: { text: 'old-a', kind: 'removed' },
      proposed: { text: 'new-a', kind: 'added' }
    },
    {
      current: { text: 'old-b', kind: 'removed' }
    },
    {
      current: { text: 'tail', kind: 'unchanged' },
      proposed: { text: 'tail', kind: 'unchanged' }
    }
  ]);
});

test('normalizes CRLF without hiding a trailing newline change', () => {
  const normalized = buildUpgradeConflictDiff('a\r\nb', 'a\nb');
  assert.equal(normalized.changed, false);
  assert.deepEqual(compact(normalized.ops), ['unchanged:"a"', 'unchanged:"b"']);

  const trailing = buildUpgradeConflictDiff('a\n', 'a');
  assert.equal(trailing.changed, true);
  assert.deepEqual(compact(trailing.ops), ['unchanged:"a"', 'removed:""']);
});

test('handles empty, add-only, remove-only, and duplicate-line input', () => {
  assert.deepEqual(compact(buildUpgradeConflictDiff('', 'new').ops), ['added:"new"']);
  assert.deepEqual(compact(buildUpgradeConflictDiff('old', '').ops), ['removed:"old"']);

  const duplicate = buildUpgradeConflictDiff('x\nx\ny', 'x\ny\nx');
  assert.equal(duplicate.changed, true);
  assert.deepEqual(compact(duplicate.ops), [
    'unchanged:"x"',
    'removed:"x"',
    'unchanged:"y"',
    'added:"x"'
  ]);
});
