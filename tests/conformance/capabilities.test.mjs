import test from 'node:test';
import assert from 'node:assert/strict';
import { adapterCapabilities } from '../../dist/core/integrations/capabilities.js';

const hosts = ['codex', 'claude', 'gemini', 'cursor', 'windsurf', 'copilot', 'cline', 'opencode'];
const fields = ['instruction', 'skillset', 'mcp', 'startup_injection', 'prompt_turn_injection', 'proof', 'transcript_events', 'unlink_cleanup'];

test('adapter capability registry is explicit and conformance-safe', () => {
  const rows = adapterCapabilities();
  assert.deepEqual(rows.map((row) => row.host), hosts);
  for (const row of rows) {
    for (const field of fields) assert.equal(typeof row[field], 'boolean', `${row.host}.${field} must be boolean`);
    if (!row.prompt_turn_injection) assert.equal(row.transcript_events, false, `${row.host} cannot claim transcript events without prompt injection`);
  }
});

test('capability lookup isolates one host without exposing mutable registry state', () => {
  const cursor = adapterCapabilities('cursor');
  assert.equal(cursor.length, 1);
  cursor[0].mcp = !cursor[0].mcp;
  assert.equal(adapterCapabilities('cursor')[0].mcp, true);
});
