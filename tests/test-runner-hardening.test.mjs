import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function text(path) {
  return (await readFile(new URL(`../${path}`, import.meta.url), 'utf8')).replace(/\r\n/g, '\n');
}

test('root test runner bounds hung tests and supports deterministic GHA sharding', async () => {
  const runner = await text('scripts/run-tests.mjs');
  const planner = await text('scripts/test-shard-planner.mjs');
  const pkg = JSON.parse(await text('package.json'));

  assert.match(runner, /--test-timeout=120000/);
  assert.match(runner, /--test-force-exit/);
  assert.match(runner, /TEST_SHARD/);
  assert.match(planner, /Invalid TEST_SHARD/);
  assert.match(runner, /selectWeightedShard/);
  assert.equal(pkg.scripts['test:built'], 'node scripts/run-tests.mjs');
  assert.match(pkg.scripts.coverage, /--test-timeout=120000/);
  assert.match(pkg.scripts.coverage, /--test-force-exit/);
});
