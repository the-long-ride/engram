import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseBenchmarkDocument } from '../../dist/core/benchmark/schema.js';

test('versioned benchmark fixture validates expected safety fields', async () => {
  const fixture = JSON.parse(await readFile('tests/fixtures/benchmark/versioned.json', 'utf8'));
  const parsed = parseBenchmarkDocument(fixture);
  assert.equal(parsed.diagnostics.length, 0);
  assert.equal(parsed.document?.cases[0].id, 'release-workflow');
  assert.deepEqual(parsed.document?.cases[0].depends_on, ['knowledge/release-foundation.md']);
  assert.equal(parsed.document?.cases[1].expect.length, 0);
});

test('legacy benchmark arrays remain accepted as version one', () => {
  const parsed = parseBenchmarkDocument([{ query: 'legacy', expect: 'knowledge/legacy.md' }]);
  assert.equal(parsed.diagnostics.length, 0);
  assert.equal(parsed.document?.version, 1);
  assert.deepEqual(parsed.document?.cases[0].expect, ['knowledge/legacy.md']);
});
