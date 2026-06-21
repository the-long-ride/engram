import test from 'node:test';
import assert from 'node:assert/strict';
import { rm, readFile } from 'node:fs/promises';
import path from 'node:path';
import { tempWorkspace } from './helpers.mjs';
import {
  loadPanelData,
  apiConfigSet,
  apiWorkspaceAdd,
  apiWorkspaceLink,
  apiWorkspaceRemove,
  apiProfileAdd,
  apiProfileActivate,
  apiProfileRemove,
  parseEntryText
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

    // 4. apiConfigSet (invalid key)
    await assert.rejects(
      async () => {
        await apiConfigSet('invalid_key', 'value', cwd);
      },
      /unknown config key/
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
  } finally {
    // Restore environment
    process.env.ENGRAM_CONFIG_DIR = oldEnv.ENGRAM_CONFIG_DIR;
    process.env.ENGRAM_GLOBAL_DIR = oldEnv.ENGRAM_GLOBAL_DIR;
    process.env.NODE_ENV = oldEnv.NODE_ENV;
    await rm(cwd, { recursive: true, force: true });
  }
});
