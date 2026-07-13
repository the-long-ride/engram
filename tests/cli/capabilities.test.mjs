import test from 'node:test';
import assert from 'node:assert/strict';
import { runEngram, tempWorkspace } from '../helpers.mjs';

test('capabilities exposes explicit host support matrix', async () => {
  const { cwd, env } = await tempWorkspace('engram-capabilities-');
  const result = await runEngram(cwd, env, ['capabilities', '--json']);
  assert.equal(result.code, 0, result.stderr);
  const body = JSON.parse(result.stdout);
  const cursor = body.data.capabilities.find((item) => item.host === 'cursor');
  assert.ok(cursor);
  assert.equal(typeof cursor.mcp, 'boolean');
  assert.equal(typeof cursor.transcript_events, 'boolean');
});
