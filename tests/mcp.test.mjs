import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { handleMcp } from '../dist/mcp/server.js';
import { runCli } from '../dist/cli.js';
import { tempWorkspace, workspaceMemoryRoot } from './helpers.mjs';

test('mcp status and save proposal do not write silently', async () => {
  const { cwd, env } = await tempWorkspace('engram-mcp-');
  const previous = process.cwd();
  const previousGlobalDir = process.env.ENGRAM_GLOBAL_DIR;
  const previousConfigDir = process.env.ENGRAM_CONFIG_DIR;
  process.chdir(cwd);
  process.env.ENGRAM_CONFIG_DIR = env.ENGRAM_CONFIG_DIR;
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
    assert.doesNotMatch(detected.result, /## Rule Variants/);

    const detectedWithVariants = await handleMcp({
      id: 4.1,
      method: 'engram_save',
      params: { text: 'Always use pnpm for installs', showRuleVariants: true }
    });
    assert.match(detectedWithVariants.result, /## Rule Variants/);

    const saveSession = await handleMcp({
      id: 5,
      method: 'engram_save_session',
      params: {
        text: [
          'TYPE: rule | TEXT: Always run tests before release.',
          'TYPE: knowledge | TEXT: The release checklist lives in CHANGELOG.md.'
        ].join('\n'),
        role: ['release']
      }
    });
    assert.match(saveSession.result, /ENGRAM SAVE-SESSION PROPOSAL/);
    assert.match(saveSession.result, /Candidate: 1/);
    assert.match(saveSession.result, /Candidate: 2/);
    assert.match(saveSession.result, /Human approval required/);
    assert.match(await runCli(['stats']), /Total: 0/);

    const knowledgeDir = path.join(workspaceMemoryRoot(cwd), 'knowledge');
    await mkdir(knowledgeDir, { recursive: true });
    await writeFile(path.join(knowledgeDir, 'release-foundation-checklist.md'), mcpMemoryFixture({
      id: 'release-foundation-checklist',
      content: 'Release foundation checklist lives in docs/release.md.'
    }));
    await runCli(['rebuild-index', 'workspace']);

    const related = await handleMcp({
      id: 6,
      method: 'engram_save',
      params: {
        text: 'OAuth rotation must follow the release foundation checklist',
        type: 'rule',
        scope: 'workspace'
      }
    });
    assert.match(related.result, /ENGRAM SAVE PROPOSAL/);
    assert.match(related.result, /Related memories found/);
    assert.match(related.result, /Suggested depends_on: \[release-foundation-checklist\]/);
    assert.match(related.result, /Human approval required/);
    assert.match(await runCli(['stats']), /Total: 1/);

    const cliLoad = await runCli(['load', 'release foundation checklist']);
    assert.match(cliLoad, /loaded 1 memory files/);
    assert.match(cliLoad, /release-foundation-checklist/);

    const mcpLoad = await handleMcp({
      id: 7,
      method: 'tools/call',
      params: {
        name: 'engram_load',
        arguments: { query: 'release foundation checklist' }
      }
    });
    assert.match(mcpLoad.result, /loaded 1 memory files/);
    assert.match(mcpLoad.result, /release-foundation-checklist/);

    const setRole = await handleMcp({
      id: 8,
      method: 'engram_set_role',
      params: { roles: ['frontend', 'design'] }
    });
    assert.match(setRole.result, /Roles: frontend, design/);
    assert.match(setRole.result, /Agent action:/);

    const clearRole = await handleMcp({
      id: 9,
      method: 'engram_set_role',
      params: { roles: [] }
    });
    assert.match(clearRole.result, /Roles: \(none\)/);
    assert.match(clearRole.result, /Agent action:/);

    const setVariant = await handleMcp({
      id: 10,
      method: 'engram_set_rule_variant',
      params: { variant: 'strict' }
    });
    assert.match(setVariant.result, /Rule variants: strict/);
    assert.match(setVariant.result, /Agent action:/);

    const statusVariant = await handleMcp({
      id: 11,
      method: 'engram_set_rule_variant',
      params: { variant: 'status' }
    });
    assert.match(statusVariant.result, /Rule variants:/);
    assert.doesNotMatch(statusVariant.result, /Agent action:/);

    const empty = await handleMcp({ id: 12, method: 'engram_save', params: { text: '' } });
    assert.match(empty.error.message, /non-empty text/);
    const badType = await handleMcp({ id: 13, method: 'engram_save', params: { text: 'Use Vitest', type: 'bogus' } });
    assert.match(badType.error.message, /rule, skill, workflow, or knowledge/);
  } finally {
    process.chdir(previous);
    if (previousConfigDir === undefined) delete process.env.ENGRAM_CONFIG_DIR;
    else process.env.ENGRAM_CONFIG_DIR = previousConfigDir;
    if (previousGlobalDir === undefined) delete process.env.ENGRAM_GLOBAL_DIR;
    else process.env.ENGRAM_GLOBAL_DIR = previousGlobalDir;
    await rm(cwd, { recursive: true, force: true });
  }
});

function mcpMemoryFixture({ id, content }) {
  return `---
id: ${id}
type: knowledge
scope: workspace
tags: [release, foundation, checklist]
created: 2026-06-05
updated: 2026-06-05
author: test@example.com
source: manual
confidence: high
---

# Knowledge: ${id}

## Context

MCP test fixture.

## Content

- ${content}

## Example

Use this memory when validating MCP save proposals.
`;
}
