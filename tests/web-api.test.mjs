import test from 'node:test';
import assert from 'node:assert/strict';
import { rm, readFile } from 'node:fs/promises';
import path from 'node:path';
import { tempWorkspace } from './helpers.mjs';
import {
  loadPanelData,
  apiConfigSet,
  apiConfigUpdate,
  apiConfigValidate,
  apiWorkspaceAdd,
  apiWorkspaceLink,
  apiWorkspaceRemove,
  apiProfileAdd,
  apiProfileActivate,
  apiProfileRemove,
  parseEntryText,
  apiAgentsScan,
  apiAgentLink,
  apiAgentUnlink
} from '../dist/core/web/api.js';


async function hasSqlite() {
  try { await import('node:sqlite'); return true; } catch { /* check better-sqlite3 */ }
  try { await import('better-sqlite3'); return true; } catch { return false; }
}


test('web UI api workspace, profile, config handlers and entry text parser', async () => {
  const { cwd, env } = await tempWorkspace('engram-web-api-');
  
  // Set up the environment variables for config dir and global dir so the API calls resolve correctly.
  const oldEnv = {
    ENGRAM_CONFIG_DIR: process.env.ENGRAM_CONFIG_DIR,
    ENGRAM_GLOBAL_DIR: process.env.ENGRAM_GLOBAL_DIR,
    NODE_ENV: process.env.NODE_ENV
  };
  process.env.ENGRAM_CONFIG_DIR = env.ENGRAM_CONFIG_DIR;
  process.env.ENGRAM_GLOBAL_DIR = env.ENGRAM_GLOBAL_DIR;
  process.env.NODE_ENV = 'test';

  try {
    // 1. parseEntryText
    const entryText = `
## Runtime
- not this

## Core Configurations
- scope: workspace
- proof: off
`;
    const parsed = parseEntryText(entryText);
    assert.equal(parsed.length, 1);
    assert.equal(parsed[0].group, 'Core Configurations');
    assert.deepEqual(parsed[0].rows, [['scope', 'workspace'], ['proof', 'off']]);

    // 2. loadPanelData on empty/uninitialized workspace
    const initialData = await loadPanelData(cwd, entryText);
    assert.equal(initialData.sqliteAvailable, await hasSqlite());
    assert.equal(initialData.isInitialized, false);
    assert.equal(initialData.cwd, cwd);

    // 3. apiConfigSet (valid keys)
    const setScope = await apiConfigSet('scope', 'global', cwd);
    assert.match(setScope, /Set scope = global/);

    const setRead = await apiConfigSet('read', 'always', cwd);
    assert.match(setRead, /Set read = always/);

    const setProof = await apiConfigSet('proof', 'compact', cwd);
    assert.match(setProof, /Set proof = compact/);

    const validation = apiConfigValidate({
      'load.limit': '12',
      'graph.min_related_score': '0.4',
      roles: 'agent, reviewer'
    });
    assert.equal(validation.ok, true);
    assert.deepEqual(validation.riskyKeys, []);

    const batchSet = await apiConfigUpdate({
      'load.limit': '12',
      'graph.min_related_score': '0.4',
      roles: 'agent, reviewer'
    }, cwd);
    assert.match(batchSet, /Saved 3 config settings/);

    await assert.rejects(
      async () => {
        await apiConfigUpdate({ read: 'always', 'load.limit': '99' }, cwd);
      },
      /load\.limit must be at most 32/
    );

    // 4. apiConfigSet (invalid key)
    await assert.rejects(
      async () => {
        await apiConfigSet('invalid_key', 'value', cwd);
      },
      /Unknown config key/
    );

    // 5. Workspace operations (require SQLite — skip when unavailable)
    const sqliteOk = await hasSqlite();
    if (sqliteOk) {
      const wsPath = path.join(cwd, 'another-workspace');
      const wsAdd = await apiWorkspaceAdd(wsPath, 'another');
      assert.match(wsAdd, /Registered/);

      const wsLink = await apiWorkspaceLink(wsPath, true);
      assert.match(wsLink, /Linked/);

      const wsUnlink = await apiWorkspaceLink(wsPath, false);
      assert.match(wsUnlink, /Unlinked/);

      const wsRemove = await apiWorkspaceRemove(wsPath);
      assert.match(wsRemove, /Removed/);

      // 6. Profile operations (also require SQLite)
      const profilePath = path.join(cwd, 'another-profile');
      const profileAdd = await apiProfileAdd('another', profilePath, 'global');
      assert.match(profileAdd, /Profile saved/);

      const profileActivate = await apiProfileActivate('another');
      assert.match(profileActivate, /Active profile/);

      const profileRemove = await apiProfileRemove('another');
      assert.match(profileRemove, /Profile deleted/);
    }

    // 7. Verify config values after set
    const finalData = await loadPanelData(cwd, entryText);
    assert.equal(finalData.config.scope, 'global');
    assert.equal(finalData.config.read, 'always');
    assert.equal(finalData.config.proof, 'compact');
    assert.equal(finalData.config.load.limit, 12);
    assert.equal(finalData.config.graph.min_related_score, 0.4);
    assert.deepEqual(finalData.config.roles, ['agent', 'reviewer']);

    // 8. Fallback: apiConfigSet persists JSON even when SQLite is unavailable
    const schema = await import('../dist/core/config-db/schema.js');
    schema.setConfigDbUnavailableForTests(true);
    try {
      const fallbackSet = await apiConfigSet('read', 'manual', cwd);
      assert.match(fallbackSet, /Set read = manual/);
      assert.match(fallbackSet, /SQLite unavailable; JSON only/);

      const fallbackData = await loadPanelData(cwd, entryText);
      assert.equal(fallbackData.sqliteAvailable, false);
      assert.equal(fallbackData.config.read, 'manual');
    } finally {
      schema.setConfigDbUnavailableForTests(false);
    }

    // 9. Final config verification reflects last saved values
    const finalData2 = await loadPanelData(cwd, entryText);
    assert.equal(finalData2.config.scope, 'global');
    // After SQLite is available again, DB value 'always' takes priority over JSON fallback 'manual'
    assert.equal(finalData2.config.read, sqliteOk ? 'always' : 'manual');
    assert.equal(finalData2.config.proof, 'compact');

    // 10. Agent Connection APIs
    const agents = await apiAgentsScan(cwd);
    assert.ok(Array.isArray(agents));
    // Verify structure
    const claudeAgent = agents.find((a) => a.id === 'claude');
    assert.ok(claudeAgent);
    assert.equal(claudeAgent.name, 'Anthropic Claude');
    assert.equal(claudeAgent.workspaceLinked, false);

    // Since default scope in test is 'global' (from previous setScope test step),
    // linking workspace should skip first.
    const linkResultGlobal = await apiAgentLink(cwd, 'claude', false);
    assert.match(linkResultGlobal, /Skipped claude \(workspace\): config scope is global/);

    // Set scope back to 'both'
    await apiConfigSet('scope', 'both', cwd);

    // Link workspace
    const linkResult = await apiAgentLink(cwd, 'claude', false);
    assert.match(linkResult, /Connected claude in this workspace/);

    // Verify it is now linked in workspace
    const agentsAfterLink = await apiAgentsScan(cwd);
    const claudeAgentAfter = agentsAfterLink.find((a) => a.id === 'claude');
    assert.equal(claudeAgentAfter.workspaceLinked, true);

    // Unlink workspace
    const unlinkResult = await apiAgentUnlink(cwd, 'claude', false);
    assert.match(unlinkResult, /Disconnected claude from this workspace/);

    // Verify it is unlinked
    const agentsAfterUnlink = await apiAgentsScan(cwd);
    const claudeAgentAfterUnlink = agentsAfterUnlink.find((a) => a.id === 'claude');
    assert.equal(claudeAgentAfterUnlink.workspaceLinked, false);

    // Test that when config scope is global, workspace linking is skipped even if initialized
    await apiConfigSet('scope', 'global', cwd);
    const linkGlobalScopeResult = await apiAgentLink(cwd, 'claude', false);
    assert.match(linkGlobalScopeResult, /Skipped claude \(workspace\): config scope is global/);

    // Link global
    const linkGlobalResult = await apiAgentLink(cwd, 'claude', true);
    assert.match(linkGlobalResult, /Connected claude globally/);

    // Verify linked globally
    const agentsAfterGlobalLink = await apiAgentsScan(cwd);
    const claudeAgentAfterGlobal = agentsAfterGlobalLink.find((a) => a.id === 'claude');
    assert.equal(claudeAgentAfterGlobal.globalLinked, true);

    // Unlink global
    const unlinkGlobalResult = await apiAgentUnlink(cwd, 'claude', true);
    assert.match(unlinkGlobalResult, /Disconnected claude globally/);

    // Verify unlinked globally
    const agentsAfterGlobalUnlink = await apiAgentsScan(cwd);
    const claudeAgentAfterGlobalUnlink = agentsAfterGlobalUnlink.find((a) => a.id === 'claude');
    assert.equal(claudeAgentAfterGlobalUnlink.globalLinked, false);
  } finally {
    // Restore environment
    process.env.ENGRAM_CONFIG_DIR = oldEnv.ENGRAM_CONFIG_DIR;
    process.env.ENGRAM_GLOBAL_DIR = oldEnv.ENGRAM_GLOBAL_DIR;
    process.env.NODE_ENV = oldEnv.NODE_ENV;
    await rm(cwd, { recursive: true, force: true });
  }
});

test('web UI api core data reports duplicate memory candidates and scope metadata', async () => {
  const { cwd, env } = await tempWorkspace('engram-web-core-');
  const oldEnv = {
    ENGRAM_CONFIG_DIR: process.env.ENGRAM_CONFIG_DIR,
    ENGRAM_GLOBAL_DIR: process.env.ENGRAM_GLOBAL_DIR,
    NODE_ENV: process.env.NODE_ENV
  };
  process.env.ENGRAM_CONFIG_DIR = env.ENGRAM_CONFIG_DIR;
  process.env.ENGRAM_GLOBAL_DIR = env.ENGRAM_GLOBAL_DIR;
  process.env.NODE_ENV = 'test';

  try {
    const { runEngram, workspaceMemoryRoot } = await import('./helpers.mjs');
    const { mkdir, writeFile } = await import('node:fs/promises');
    const path = await import('node:path');
    const { apiCoreData } = await import('../dist/core/web/api.js');

    await runEngram(cwd, env, ['init', '--no-skillset']);
    const rules = path.join(workspaceMemoryRoot(cwd), 'rules');
    await mkdir(rules, { recursive: true });
    const memory = ({ id, title, content }) => `---
id: ${id}
type: rule
scope: workspace
tags: [pnpm, scripts]
created: 2026-06-01
updated: 2026-06-01
author: dev@example.com
source: manual
confidence: high
---
# ${title}

## Context

Dashboard duplicate test.

## Content

- ${content}

## Example

pnpm test
`;
    await writeFile(path.join(rules, 'prefer-pnpm-package-scripts.md'), memory({
      id: 'prefer-pnpm-package-scripts',
      title: 'Prefer pnpm package scripts',
      content: 'Prefer pnpm package scripts for workspace tasks.'
    }));
    await writeFile(path.join(rules, 'run-pnpm-for-npm-scripts.md'), memory({
      id: 'run-pnpm-for-npm-scripts',
      title: 'Run pnpm for npm scripts',
      content: 'Use pnpm when running npm scripts in the workspace.'
    }));
    await runEngram(cwd, env, ['rebuild-index']);

    const data = await apiCoreData(cwd, { semantic: true, rebuild: false, scope: 'all' });
    assert.equal(data.scope.activeProfile === undefined || typeof data.scope.activeProfile === 'string', true);
    assert.ok(Array.isArray(data.duplicates));
    assert.ok(data.duplicates.some((pair) => pair.a.file.includes('prefer-pnpm-package-scripts.md') && pair.b.file.includes('run-pnpm-for-npm-scripts.md')));
    assert.ok(data.prompts.resolveDuplicates.includes('UPDATE:'));
    assert.ok(data.prompts.metacognize.includes('engram metacognize'));
    assert.ok(data.relationship.nodes.length >= 3);
    assert.ok(data.relationship.links.some((link) => link.kind === 'duplicate'));
  } finally {
    process.env.ENGRAM_CONFIG_DIR = oldEnv.ENGRAM_CONFIG_DIR;
    process.env.ENGRAM_GLOBAL_DIR = oldEnv.ENGRAM_GLOBAL_DIR;
    process.env.NODE_ENV = oldEnv.NODE_ENV;
    await rm(cwd, { recursive: true, force: true });
  }
});

