import test from 'node:test';
import assert from 'node:assert/strict';
import { rm } from 'node:fs/promises';
import { tempWorkspace } from './helpers.mjs';
import { servePanel, stopServer } from '../dist/core/web/entry-server.js';

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    signal: AbortSignal.timeout(3000),
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {})
    }
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : {};
  return { response, body };
}

test('entry server exposes safe config metadata and validated config updates', async () => {
  const { cwd, env } = await tempWorkspace('engram-entry-server-');
  const oldEnv = {
    ENGRAM_CONFIG_DIR: process.env.ENGRAM_CONFIG_DIR,
    ENGRAM_GLOBAL_DIR: process.env.ENGRAM_GLOBAL_DIR,
    NODE_ENV: process.env.NODE_ENV
  };

  process.env.ENGRAM_CONFIG_DIR = env.ENGRAM_CONFIG_DIR;
  process.env.ENGRAM_GLOBAL_DIR = env.ENGRAM_GLOBAL_DIR;
  process.env.NODE_ENV = 'test';

  try {
    const baseUrl = await servePanel(cwd);

    const data = await requestJson(baseUrl + '/api/data');
    assert.equal(data.response.status, 200);
    assert.ok(data.body.configFields.some((field) => field.key === 'scope'));
    assert.equal(data.body.configFields.some((field) => field.key === 'theme'), false);

    const coreData = await requestJson(baseUrl + '/api/core');
    assert.equal(coreData.response.status, 200);
    assert.equal(coreData.body.ok, true);
    assert.ok(Array.isArray(coreData.body.data.duplicates));
    assert.ok(coreData.body.data.prompts.resolveDuplicates.includes('UPDATE:'));

    const refreshedCore = await requestJson(baseUrl + '/api/core', {
      method: 'POST',
      body: JSON.stringify({ semantic: true, rebuild: true, scope: 'workspace' })
    });
    assert.equal(refreshedCore.response.status, 200);
    assert.equal(refreshedCore.body.ok, true);
    assert.equal(refreshedCore.body.data.scope.filter, 'workspace');

    const invalid = await requestJson(baseUrl + '/api/config/validate', {
      method: 'POST',
      body: JSON.stringify({ patch: { 'load.limit': '99' } })
    });
    assert.equal(invalid.response.status, 200);
    assert.equal(invalid.body.ok, false);
    assert.match(invalid.body.issues[0].message, /at most 32/);

    const valid = await requestJson(baseUrl + '/api/config/validate', {
      method: 'POST',
      body: JSON.stringify({ patch: { scope: 'workspace' } })
    });
    assert.equal(valid.body.ok, true);
    assert.deepEqual(valid.body.riskyKeys, ['scope']);

    const saved = await requestJson(baseUrl + '/api/config', {
      method: 'POST',
      body: JSON.stringify({ patch: { scope: 'workspace', read: 'manual' } })
    });
    assert.equal(saved.response.status, 200);
    assert.equal(saved.body.ok, true);
    assert.match(saved.body.message, /Saved 2 config settings/);

    const after = await requestJson(baseUrl + '/api/data');
    assert.equal(after.body.config.scope, 'workspace');
    assert.equal(after.body.config.read, 'manual');

    // HTTP test for agent scanning and linking endpoints
    const scanRes = await requestJson(baseUrl + '/api/agents/scan');
    assert.equal(scanRes.response.status, 200);
    assert.equal(scanRes.body.ok, true);
    assert.ok(Array.isArray(scanRes.body.data));
    const claudeData = scanRes.body.data.find(a => a.id === 'claude');
    assert.ok(claudeData);
    assert.equal(claudeData.workspaceLinked, false);

    // Link workspace
    const linkRes = await requestJson(baseUrl + '/api/agents/link', {
      method: 'POST',
      body: JSON.stringify({ agentId: 'claude', global: false })
    });
    assert.equal(linkRes.response.status, 200);
    assert.equal(linkRes.body.ok, true);
    assert.match(linkRes.body.message, /Connected claude in this workspace/);

    // Verify linked status
    const scanRes2 = await requestJson(baseUrl + '/api/agents/scan');
    const claudeData2 = scanRes2.body.data.find(a => a.id === 'claude');
    assert.equal(claudeData2.workspaceLinked, true);

    // Unlink workspace
    const unlinkRes = await requestJson(baseUrl + '/api/agents/unlink', {
      method: 'POST',
      body: JSON.stringify({ agentId: 'claude', global: false })
    });
    assert.equal(unlinkRes.response.status, 200);
    assert.equal(unlinkRes.body.ok, true);
    assert.match(unlinkRes.body.message, /Disconnected claude from this workspace/);

    // Verify unlinked status
    const scanRes3 = await requestJson(baseUrl + '/api/agents/scan');
    const claudeData3 = scanRes3.body.data.find(a => a.id === 'claude');
    assert.equal(claudeData3.workspaceLinked, false);
  } finally {
    stopServer();
    process.env.ENGRAM_CONFIG_DIR = oldEnv.ENGRAM_CONFIG_DIR;
    process.env.ENGRAM_GLOBAL_DIR = oldEnv.ENGRAM_GLOBAL_DIR;
    process.env.NODE_ENV = oldEnv.NODE_ENV;
    await rm(cwd, { recursive: true, force: true });
  }
});
