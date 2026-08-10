import test from 'node:test';
import assert from 'node:assert/strict';
import { isReplaceableConflictKind } from '../src/core/upgrade/review-policy.ts';

test('generated replacement policy permits only config instruction and skillset', () => {
  for (const kind of ['config', 'instruction', 'skillset']) assert.equal(isReplaceableConflictKind(kind), true, kind);
  for (const kind of ['memory', 'hook', 'plugin']) assert.equal(isReplaceableConflictKind(kind), false, kind);
});
