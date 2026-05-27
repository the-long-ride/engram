import test from 'node:test';
import assert from 'node:assert/strict';
import { rm } from 'node:fs/promises';
import { handleMcp } from '../dist/mcp/server.js';
import { runCli } from '../dist/cli.js';
import { tempWorkspace } from './helpers.mjs';

test('mcp status and save proposal do not write silently', async () => {
  const { cwd, env } = await tempWorkspace('engram-mcp-');
  const previous = process.cwd();
  process.chdir(cwd);
  process.env.ENGRAM_GLOBAL_DIR = env.ENGRAM_GLOBAL_DIR;
  await runCli(['init']);
  const status = await handleMcp({ id: 1, method: 'engram_status', params: {} });
  assert.match(status.result, /Memory health/);
  const proposal = await handleMcp({ id: 2, method: 'engram_save', params: { text: 'Use Vitest', type: 'rule' } });
  assert.match(proposal.result, /Human approval required/);
  process.chdir(previous);
  await rm(cwd, { recursive: true, force: true });
});
