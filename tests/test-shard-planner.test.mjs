import test from 'node:test';
import assert from 'node:assert/strict';
import { selectWeightedShard } from '../scripts/test-shard-planner.mjs';

test('weighted shard planner spreads the largest test files across shards deterministically', () => {
  const entries = [
    { file: 'huge-a.test.mjs', size: 100 },
    { file: 'huge-b.test.mjs', size: 90 },
    { file: 'medium.test.mjs', size: 50 },
    { file: 'small-a.test.mjs', size: 10 },
    { file: 'small-b.test.mjs', size: 10 },
  ];

  assert.deepEqual(selectWeightedShard(entries, '1/2'), ['huge-a.test.mjs', 'small-a.test.mjs', 'small-b.test.mjs']);
  assert.deepEqual(selectWeightedShard(entries, '2/2'), ['huge-b.test.mjs', 'medium.test.mjs']);
});

test('weighted shard planner rejects malformed shard values', () => {
  const entries = [{ file: 'a.test.mjs', size: 1 }];
  for (const shard of ['0/2', '3/2', '1/0', 'abc']) {
    assert.throws(() => selectWeightedShard(entries, shard), /Invalid TEST_SHARD/);
  }
});
