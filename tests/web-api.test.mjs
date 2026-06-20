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
import { servePanel, stopServer } from '../dist/core/web/entry-server.js';

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
  } finally {
    // Restore environment
    process.env.ENGRAM_CONFIG_DIR = oldEnv.ENGRAM_CONFIG_DIR;
    process.env.ENGRAM_GLOBAL_DIR = oldEnv.ENGRAM_GLOBAL_DIR;
    process.env.NODE_ENV = oldEnv.NODE_ENV;
    await rm(cwd, { recursive: true, force: true });
  }
});

test('entry server starts, responds to api/data, post requests, and shuts down', async () => {
  const { cwd, env } = await tempWorkspace('engram-entry-server-');
  
  const oldEnv = {
    ENGRAM_CONFIG_DIR: process.env.ENGRAM_CONFIG_DIR,
    ENGRAM_GLOBAL_DIR: process.env.ENGRAM_GLOBAL_DIR,
    NODE_ENV: process.env.NODE_ENV
  };
  process.env.ENGRAM_CONFIG_DIR = env.ENGRAM_CONFIG_DIR;
  process.env.ENGRAM_GLOBAL_DIR = env.ENGRAM_GLOBAL_DIR;
  process.env.NODE_ENV = 'test';

  const signal = () => AbortSignal.timeout(10_000);

  try {
    const url = await servePanel(cwd);
    assert.ok(url.startsWith('http://127.0.0.1:'));

    // Test GET /
    const getRoot = await fetch(url, { signal: signal() });
    assert.equal(getRoot.status, 200);
    const rootText = await getRoot.text();
    assert.match(rootText, /<!DOCTYPE html>/i);

    // Test GET /panel.css
    const getCss = await fetch(`${url}/panel.css`, { signal: signal() });
    assert.equal(getCss.status, 200);
    assert.equal(getCss.headers.get('content-type'), 'text/css; charset=utf-8');

    // Test GET /panel.js
    const getJs = await fetch(`${url}/panel.js`, { signal: signal() });
    assert.equal(getJs.status, 200);
    assert.equal(getJs.headers.get('content-type'), 'application/javascript; charset=utf-8');

    // Test GET /api/data
    const getData = await fetch(`${url}/api/data`, { signal: signal() });
    assert.equal(getData.status, 200);
    const dataJson = await getData.json();
    assert.equal(dataJson.sqliteAvailable, await hasSqlite());
    assert.equal(dataJson.cwd, cwd);

    // Test POST /api/config
    const postConfig = await fetch(`${url}/api/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'scope', value: 'both' }),
      signal: signal()
    });
    assert.equal(postConfig.status, 200);
    const configRes = await postConfig.json();
    assert.equal(configRes.ok, true);

    // Test POST /api/init
    const postInit = await fetch(`${url}/api/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
      signal: signal()
    });
    assert.equal(postInit.status, 200);
    const initRes = await postInit.json();
    assert.equal(initRes.ok, true);

    // Test GET /shutdown
    const shutdownRes = await fetch(`${url}/shutdown`, { signal: signal() });
    assert.equal(shutdownRes.status, 204);
  } finally {
    // Force-close the server so keep-alive connections don't block the event loop.
    stopServer();
    process.env.ENGRAM_CONFIG_DIR = oldEnv.ENGRAM_CONFIG_DIR;
    process.env.ENGRAM_GLOBAL_DIR = oldEnv.ENGRAM_GLOBAL_DIR;
    process.env.NODE_ENV = oldEnv.NODE_ENV;
    await rm(cwd, { recursive: true, force: true });
  }
});

