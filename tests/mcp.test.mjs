import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { handleMcp } from '../dist/mcp/server.js';
import { runCli } from '../dist/cli.js';
import { tempWorkspace, workspaceMemoryRoot } from './helpers.mjs';
import { profileMemoryRaw, writeProfileMemory } from './cli/fixtures.mjs';

test('mcp protocol handshake lists tools and wraps tool call content', async () => {
  const initialized = await handleMcp({
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'opencode', version: 'test' }
    }
  });
  assert.equal(initialized.result.protocolVersion, '2024-11-05');
  assert.deepEqual(initialized.result.capabilities, { tools: {} });
  assert.equal(initialized.result.serverInfo.name, 'engram');

  const notification = await handleMcp({ method: 'notifications/initialized', params: {} });
  assert.equal(notification, undefined);

  const tools = await handleMcp({ id: 2, method: 'tools/list', params: {} });
  const names = tools.result.tools.map((tool) => tool.name);
  assert.ok(names.includes('engram_load'));
  assert.ok(names.includes('engram_save_session'));
  const loadTool = tools.result.tools.find((tool) => tool.name === 'engram_load');
  assert.equal(loadTool.inputSchema.type, 'object');
  assert.ok(loadTool.inputSchema.properties.query);
  assert.equal(loadTool.inputSchema.properties.explain.type, 'boolean');

  const status = await handleMcp({
    id: 3,
    method: 'tools/call',
    params: { name: 'engram_status', arguments: {} }
  });
  assert.equal(status.result.content[0].type, 'text');
  assert.match(status.result.content[0].text, /Memory health|Workspace:/);
  assert.equal(status.result.contract_version, '1');
  assert.equal(status.result.structuredContent.ok, true);
});

test('mcp status and save proposal do not write silently', async () => {
  const { cwd, env } = await tempWorkspace('engram-mcp-');
  const previous = process.cwd();
  const previousGlobalDir = process.env.ENGRAM_GLOBAL_DIR;
  const previousConfigDir = process.env.ENGRAM_CONFIG_DIR;
  process.chdir(cwd);
  process.env.ENGRAM_CONFIG_DIR = env.ENGRAM_CONFIG_DIR;
  process.env.ENGRAM_GLOBAL_DIR = env.ENGRAM_GLOBAL_DIR;
  try {
    await runCli(['inject']);
    const status = await handleMcp({ id: 1, method: 'engram_status', params: {} });
    assert.match(status.result, /Memory health/);

    const proposal = await handleMcp({ id: 2, method: 'engram_save', params: { text: 'Use Vitest', type: 'rule' } });
    assert.match(proposal.result, /AI-agent chat approval required/);
    assert.match(proposal.result, /yes.*audit.*cancel/is);

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
          'TYPE: rule | TEXT: Always run tests before release. | TRIGGERS: release, tests | LIGHT: Mention release tests when release work starts. | BALANCED: Always run tests before release. | STRICT: Block release completion claims until tests pass.',
          'TYPE: knowledge | TEXT: The release checklist lives in CHANGELOG.md. | TRIGGERS: release, changelog'
        ].join('\n'),
        role: ['release'],
        showRuleVariants: true
      }
    });
    assert.match(saveSession.result, /ENGRAM SAVE-SESSION PROPOSAL/);
    assert.match(saveSession.result, /Candidate: 1/);
    assert.match(saveSession.result, /Candidate: 2/);
    assert.match(saveSession.result, /triggers: \[release, tests\]/);
    assert.match(saveSession.result, /### Light/);
    assert.match(saveSession.result, /Block release completion claims until tests pass/);
    assert.match(saveSession.result, /AI-agent chat approval required/);
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
    assert.match(related.result, /AI-agent chat approval required/);
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
    assert.match(mcpLoad.result.content[0].text, /loaded 1 memory files/);
    assert.match(mcpLoad.result.content[0].text, /release-foundation-checklist/);

    const explained = await handleMcp({
      id: 7.1,
      method: 'tools/call',
      params: {
        name: 'engram_load',
        arguments: { query: 'release foundation checklist', explain: true }
      }
    });
    assert.equal(explained.result.structuredContent.ok, true);
    assert.ok(Array.isArray(explained.result.structuredContent.data.selected));
    assert.equal(explained.result.structuredContent.data.selected[0].id, 'release-foundation-checklist');
    assert.equal(Object.hasOwn(explained.result.structuredContent.data, 'text'), false);

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

test('mcp load uses workspace default profile instead of active user profile', async () => {
  const { cwd, env } = await tempWorkspace('engram-mcp-profile-isolation-');
  const personalRoot = path.join(cwd, 'profiles', 'personal');
  const companyRoot = path.join(cwd, 'profiles', 'company');
  const previous = process.cwd();
  const previousGlobalDir = process.env.ENGRAM_GLOBAL_DIR;
  const previousConfigDir = process.env.ENGRAM_CONFIG_DIR;
  process.chdir(cwd);
  process.env.ENGRAM_CONFIG_DIR = env.ENGRAM_CONFIG_DIR;
  process.env.ENGRAM_GLOBAL_DIR = env.ENGRAM_GLOBAL_DIR;
  try {
    assert.match(await runCli(['profile', 'create', 'personal', '--global-path', personalRoot]), /Profile created: personal/);
    assert.match(await runCli(['profile', 'create', 'company', '--global-path', companyRoot]), /Profile created: company/);
    assert.match(await runCli(['profile', 'use', 'personal', '--user']), /User default profile: personal/);
    await runCli(['inject', '--no-skillset']);
    assert.match(await runCli(['profile', 'use', 'company', '--workspace']), /Workspace default profile: company/);
    assert.match(await runCli(['profile', 'use', 'personal', '--user']), /User default profile: personal/);

    await writeProfileMemory(
      personalRoot,
      'knowledge/personal-amber-profile-marker.md',
      profileMemoryRaw('personal-amber-profile-marker', 'Personal amber profile marker should stay out of workspace-pinned MCP loads.')
    );
    await writeProfileMemory(
      companyRoot,
      'knowledge/workspace-cobalt-profile-marker.md',
      profileMemoryRaw('workspace-cobalt-profile-marker', 'Workspace cobalt profile marker should load through MCP for the workspace default profile.')
    );
    await runCli(['rebuild-index', 'global']);

    const loaded = await handleMcp({
      id: 20,
      method: 'tools/call',
      params: {
        name: 'engram_load',
        arguments: { query: 'workspace cobalt profile marker', forAgents: true }
      }
    });
    assert.match(loaded.result.content[0].text, /Workspace cobalt profile marker/);
    assert.doesNotMatch(loaded.result.content[0].text, /Personal amber profile marker/);
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


