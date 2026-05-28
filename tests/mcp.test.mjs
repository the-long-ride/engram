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
  try {
    await runCli(['init']);
    const status = await handleMcp({ id: 1, method: 'engram_status', params: {} });
    assert.match(status.result, /Memory health/);

    const proposal = await handleMcp({ id: 2, method: 'engram_save', params: { text: 'Use Vitest', type: 'rule' } });
    assert.match(proposal.result, /Human approval required/);

    const workflow = await handleMcp({
      id: 3,
      method: 'engram_save',
      params: { text: 'When deploying, first run tests. Then verify health.', type: 'workflow', role: 'release' }
    });
    assert.match(workflow.result, /Type: skill/);
    assert.match(workflow.result, /role: \[release\]/);

    const detected = await handleMcp({ id: 4, method: 'engram_save', params: { text: 'Always use pnpm for installs' } });
    assert.match(detected.result, /Type: rule/);

    const autosave = await handleMcp({
      id: 5,
      method: 'engram_autosave',
      params: {
        text: [
          'TYPE: rule | TEXT: Always run tests before release.',
          'TYPE: knowledge | TEXT: The release checklist lives in CHANGELOG.md.'
        ].join('\n'),
        role: ['release']
      }
    });
    assert.match(autosave.result, /ENGRAM AUTOSAVE PROPOSAL/);
    assert.match(autosave.result, /Candidate: 1/);
    assert.match(autosave.result, /Candidate: 2/);
    assert.match(autosave.result, /Human approval required/);
    assert.match(await runCli(['stats']), /Total: 0/);

    const empty = await handleMcp({ id: 6, method: 'engram_save', params: { text: '' } });
    assert.match(empty.error.message, /non-empty text/);
    const badType = await handleMcp({ id: 7, method: 'engram_save', params: { text: 'Use Vitest', type: 'bogus' } });
    assert.match(badType.error.message, /rule, skill, workflow, or knowledge/);
  } finally {
    process.chdir(previous);
    await rm(cwd, { recursive: true, force: true });
  }
});
