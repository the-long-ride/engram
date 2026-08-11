import test from 'node:test';
import assert from 'node:assert/strict';
import { isReplaceableConflictKind } from '../dist/core/upgrade/review-policy.js';

test('generated replacement policy permits only config instruction and skillset', () => {
  for (const kind of ['config', 'instruction', 'skillset']) assert.equal(isReplaceableConflictKind(kind), true, kind);
  for (const kind of ['memory', 'hook', 'plugin']) assert.equal(isReplaceableConflictKind(kind), false, kind);
});
