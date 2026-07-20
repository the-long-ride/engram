import test from 'node:test';
import assert from 'node:assert/strict';
import { rm } from 'node:fs/promises';
import { runEngram, tempWorkspace } from './helpers.mjs';
import { servePanel, stopServer, launchEntryUi, getActiveServerToken } from '../dist/core/web/entry-server.js';

let csrfToken = '';

function extractCsrfTokenFromHtml(html) {
  const match = html.match(/<meta name="engram-csrf-token" content="([0-9a-f]+)">/);
  return match ? match[1] : '';
}

async function fetchCsrfToken(baseUrl) {
  const response = await fetch(baseUrl + '/', { signal: AbortSignal.timeout(3000) });
  const text = await response.text();
  return extractCsrfTokenFromHtml(text);
}

async function requestJson(url, options = {}) {
  const method = options.method || 'GET';
  const headers = { ...(options.headers ?? {}) };
  if (method !== 'GET' && !headers['Content-Type'] && !url.endsWith('/shutdown')) {
    headers['Content-Type'] = 'application/json';
  }
  if (method !== 'GET' && !headers['X-Engram-CSRF']) {
    headers['X-Engram-CSRF'] = csrfToken;
  }
  const response = await fetch(url, {
    ...options,
    signal: AbortSignal.timeout(3000),
    headers
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : {};
  return { response, body };
}

async function rawRequest(url, options = {}) {
  return fetch(url, { ...options, signal: AbortSignal.timeout(3000) });
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
    csrfToken = await fetchCsrfToken(baseUrl);
    assert.ok(csrfToken, 'panel HTML must publish a CSRF token');
    assert.equal(csrfToken, getActiveServerToken());

    const data = await requestJson(baseUrl + '/api/data');
    assert.equal(data.response.status, 200);
    assert.ok(data.body.configFields.some((field) => field.key === 'scope'));
    for (const key of ['update', 'ignore.source', 'ignore.also_ignore', 'live_sync.targets', 'vector.provider', 'pr_workflow.provider', 'pr_workflow.repo']) {
      assert.ok(data.body.configFields.some((field) => field.key === key), key + ' should be exposed');
    }
    assert.equal(data.body.configFields.some((field) => field.key === 'theme'), false);
    assert.equal(data.body.policy.exists, false);

    const coreData = await requestJson(baseUrl + '/api/core');
    assert.equal(coreData.response.status, 200);
    assert.equal(coreData.body.ok, true);
    assert.ok(Array.isArray(coreData.body.data.duplicates));
    assert.ok(coreData.body.data.prompts.resolveDuplicates.includes('UPDATE:'));

    const recall = await requestJson(baseUrl + '/api/recall?query=release%20workflow&explain=true');
    assert.equal(recall.response.status, 200);
    assert.equal(recall.body.contract_version, '1');
    assert.equal(recall.body.ok, true);
    assert.ok(Array.isArray(recall.body.data.selected));

    const review = await requestJson(baseUrl + '/api/review');
    assert.equal(review.response.status, 200);
    assert.equal(review.body.contract_version, '1');
    assert.ok(Array.isArray(review.body.data.findings));
    assert.ok(Array.isArray(review.body.data.receipts));

    const missingFinding = await requestJson(baseUrl + '/api/review/inspect?id=missing-finding');
    assert.equal(missingFinding.response.status, 404);
    assert.equal(missingFinding.body.ok, false);

    const unconfirmedWrite = await requestJson(baseUrl + '/api/review/write', {
      method: 'POST',
      body: JSON.stringify({ proposal: 'TYPE: knowledge | TEXT: Reviewed memory', scope: 'workspace', confirmed: false })
    });
    assert.equal(unconfirmedWrite.response.status, 400);
    assert.match(unconfirmedWrite.body.error.message, /explicit confirmation/i);

    const capabilities = await requestJson(baseUrl + '/api/capabilities');
    assert.equal(capabilities.response.status, 200);
    assert.ok(Array.isArray(capabilities.body.data.capabilities));

    const refreshedCore = await requestJson(baseUrl + '/api/core', {
      method: 'POST',
      body: JSON.stringify({ semantic: true, rebuild: true, scope: 'workspace', limit: 50 })
    });
    assert.equal(refreshedCore.response.status, 200);
    assert.equal(refreshedCore.body.ok, true);
    assert.equal(refreshedCore.body.data.scope.filter, 'workspace');
    assert.deepEqual(refreshedCore.body.data.scope.scopes, ['workspace']);

    const scopesCore = await requestJson(baseUrl + '/api/core', {
      method: 'POST',
      body: JSON.stringify({ semantic: true, rebuild: true, scopes: ['global', 'profile'], limit: 50 })
    });
    assert.equal(scopesCore.response.status, 200);
    assert.equal(scopesCore.body.ok, true);
    assert.deepEqual(scopesCore.body.data.scope.scopes, ['global', 'profile']);
    assert.deepEqual(scopesCore.body.data.scope.types, ['rule', 'skill', 'workflow', 'knowledge']);

    const typesCore = await requestJson(baseUrl + '/api/core', {
      method: 'POST',
      body: JSON.stringify({ semantic: true, rebuild: true, types: ['rule', 'knowledge'], limit: 50 })
    });
    assert.equal(typesCore.response.status, 200);
    assert.equal(typesCore.body.ok, true);
    assert.deepEqual(typesCore.body.data.scope.types, ['rule', 'knowledge']);

    const memoriesData = await requestJson(baseUrl + '/api/memories');
    assert.equal(memoriesData.response.status, 200);
    assert.equal(memoriesData.body.ok, true);
    assert.ok(Array.isArray(memoriesData.body.data.nodes));
    assert.ok(Array.isArray(memoriesData.body.data.links));
    assert.deepEqual(memoriesData.body.data.filters.availableScopes, ['profile', 'global', 'workspace']);

    const refreshedMemories = await requestJson(baseUrl + '/api/memories', {
      method: 'POST',
      body: JSON.stringify({ scopes: ['workspace'], semantic: true, rebuild: true, limit: 25 })
    });
    assert.equal(refreshedMemories.response.status, 200);
    assert.equal(refreshedMemories.body.ok, true);
    assert.deepEqual(refreshedMemories.body.data.filters.enabledScopes, ['workspace']);
    assert.equal(refreshedMemories.body.data.filters.semantic, true);

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
    assert.ok(valid.body.data);
    assert.deepEqual(valid.body.riskyKeys, ['scope']);

    const policySaved = await requestJson(baseUrl + '/api/policy', {
      method: 'POST',
      body: JSON.stringify({ patch: { autonomous_writes: { enabled: true, mode: 'autonomous' } } })
    });
    assert.equal(policySaved.response.status, 200);
    assert.equal(policySaved.body.ok, true);
    const policyAfter = await requestJson(baseUrl + '/api/policy');
    assert.equal(policyAfter.body.data.policy.autonomous_writes.enabled, true);
    assert.equal(policyAfter.body.data.policy.autonomous_writes.mode, 'autonomous');

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

    const expanded = await requestJson(baseUrl + '/api/config', {
      method: 'POST',
      body: JSON.stringify({ patch: {
        update: 'manual',
        'ignore.also_ignore': ['*.tmp', 'private/**'],
        'live_sync.targets': ['agents-md'],
        'pr_workflow.provider': 'github',
        'pr_workflow.repo': 'owner/repo'
      } })
    });
    assert.equal(expanded.response.status, 200);
    assert.equal(expanded.body.ok, true);
    const expandedData = await requestJson(baseUrl + '/api/data');
    assert.equal(expandedData.body.config.update, 'manual');
    assert.deepEqual(expandedData.body.config.ignore.also_ignore, ['*.tmp', 'private/**']);
    assert.deepEqual(expandedData.body.config.live_sync.targets, ['agents-md']);
    assert.equal(expandedData.body.config.pr_workflow.provider, 'github');
    assert.equal(expandedData.body.config.pr_workflow.repo, 'owner/repo');

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

    const browseRes = await requestJson(baseUrl + '/api/browse', {
      method: 'POST',
      body: JSON.stringify({ path: cwd })
    });
    assert.equal(browseRes.response.status, 200);
    assert.equal(browseRes.body.ok, true);
    assert.ok(Array.isArray(browseRes.body.directories));
    assert.equal(browseRes.body.directories.every((entry) => typeof entry.path === 'string'), true);

    const errMem = await requestJson(baseUrl + '/api/memory?profile=default&scope=workspace&file=nonexistent.md');
    assert.equal(errMem.response.status, 500);
    assert.equal(errMem.body.ok, false);
    assert.equal(errMem.body.contract_version, '1');
    assert.deepEqual(errMem.body.diagnostics, []);
    assert.ok(errMem.body.error);

    const errFile = await requestJson(baseUrl + '/api/memory/file?profile=default&scope=workspace&file=nonexistent.md');
    assert.equal(errFile.response.status, 500);
    assert.ok(errFile.body.error);


    const faviconRes = await fetch(baseUrl + '/favicon.svg');
    assert.equal(faviconRes.status, 200);
    assert.equal(faviconRes.headers.get('content-type'), 'image/svg+xml');
    const faviconText = await faviconRes.text();
    assert.match(faviconText, /<svg/);

    const faviconIcoRes = await fetch(baseUrl + '/favicon.ico');
    assert.equal(faviconIcoRes.status, 200);
    assert.equal(faviconIcoRes.headers.get('content-type'), 'image/svg+xml');

    for (const asset of ['panel-core.css', 'panel-data.css', 'panel-graph.css', 'panel-memory.css']) {
      const cssRes = await fetch(baseUrl + '/' + asset);
      assert.equal(cssRes.status, 200, asset + ' should be served for panel.css @import');
      assert.match(cssRes.headers.get('content-type') || '', /text\/css/);
      assert.match(await cssRes.text(), /[.#][a-z0-9_-]+/i);
    }
  } finally {
    stopServer();
    process.env.ENGRAM_CONFIG_DIR = oldEnv.ENGRAM_CONFIG_DIR;
    process.env.ENGRAM_GLOBAL_DIR = oldEnv.ENGRAM_GLOBAL_DIR;
    process.env.NODE_ENV = oldEnv.NODE_ENV;
    await rm(cwd, { recursive: true, force: true });
  }
});

test('entry recall resolves memory from the served cwd', async () => {
  const { cwd, env } = await tempWorkspace('engram-entry-recall-cwd-');
  const previous = {
    ENGRAM_CONFIG_DIR: process.env.ENGRAM_CONFIG_DIR,
    ENGRAM_GLOBAL_DIR: process.env.ENGRAM_GLOBAL_DIR
  };
  process.env.ENGRAM_CONFIG_DIR = env.ENGRAM_CONFIG_DIR;
  process.env.ENGRAM_GLOBAL_DIR = env.ENGRAM_GLOBAL_DIR;
  try {
    await runEngram(cwd, env, ['inject', '--no-skillset']);
    await runEngram(cwd, env, ['save', 'knowledge', '--scope', 'workspace', '--skip-task-type-prompt', 'Entry server cwd isolation marker'], 'A\n');
    const baseUrl = await servePanel(cwd);
    csrfToken = await fetchCsrfToken(baseUrl);
    const recall = await requestJson(baseUrl + '/api/recall?query=entry%20server%20cwd%20isolation%20marker&explain=true');
    assert.equal(recall.response.status, 200);
    assert.equal(recall.body.data.selected[0].id, 'entry-server-cwd-isolation-marker');
  } finally {
    stopServer();
    process.env.ENGRAM_CONFIG_DIR = previous.ENGRAM_CONFIG_DIR;
    process.env.ENGRAM_GLOBAL_DIR = previous.ENGRAM_GLOBAL_DIR;
    await rm(cwd, { recursive: true, force: true });
  }
});

test('launchEntryUi respects hostOnly option', async () => {
  const { cwd, env } = await tempWorkspace('engram-launch-entry-');
  const oldEnv = {
    ENGRAM_CONFIG_DIR: process.env.ENGRAM_CONFIG_DIR,
    ENGRAM_GLOBAL_DIR: process.env.ENGRAM_GLOBAL_DIR,
    NODE_ENV: process.env.NODE_ENV
  };

  process.env.ENGRAM_CONFIG_DIR = env.ENGRAM_CONFIG_DIR;
  process.env.ENGRAM_GLOBAL_DIR = env.ENGRAM_GLOBAL_DIR;

  try {
    const output = await launchEntryUi(cwd, { hostOnly: true });
    assert.match(output, /Control panel at/);
  } finally {
    stopServer();
    process.env.ENGRAM_CONFIG_DIR = oldEnv.ENGRAM_CONFIG_DIR;
    process.env.ENGRAM_GLOBAL_DIR = oldEnv.ENGRAM_GLOBAL_DIR;
    process.env.NODE_ENV = oldEnv.NODE_ENV;
    await rm(cwd, { recursive: true, force: true });
  }
});

// ── Security regressions ─────────────────────────────────────────────────────
// These tests lock down the protections documented in the repository's
// `engram-repo-review.md` P0 finding: every mutating request needs a same-origin
// context (Origin/Host) plus the per-session CSRF token, and every known route
// returns a precise status code (403/405/415) instead of falling through to 404.

import http from 'node:http';

function lowLevelRequest(baseUrl, { path, method, headers = {}, body } = {}) {
  const u = new URL(baseUrl);
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: u.hostname,
      port: u.port,
      path,
      method,
      headers
    }, (res) => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve({ status: res.statusCode || 0, headers: res.headers, body: data }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

function parseEnvelope(response) {
  if (!response.body) return null;
  try { return JSON.parse(response.body); } catch { return null; }
}

async function withSecurityWorkspace(label) {
  const { cwd, env } = await tempWorkspace(label);
  const oldEnv = {
    ENGRAM_CONFIG_DIR: process.env.ENGRAM_CONFIG_DIR,
    ENGRAM_GLOBAL_DIR: process.env.ENGRAM_GLOBAL_DIR,
    NODE_ENV: process.env.NODE_ENV
  };
  process.env.ENGRAM_CONFIG_DIR = env.ENGRAM_CONFIG_DIR;
  process.env.ENGRAM_GLOBAL_DIR = env.ENGRAM_GLOBAL_DIR;
  process.env.NODE_ENV = 'test';
  return { cwd, env, oldEnv };
}

test('entry server rejects GET /shutdown with 405 and documents the allowed method', async () => {
  const { cwd, oldEnv } = await withSecurityWorkspace('engram-entry-shutdown-get-');
  try {
    const baseUrl = await servePanel(cwd);
    csrfToken = await fetchCsrfToken(baseUrl);

    const getShutdown = await rawRequest(baseUrl + '/shutdown');
    assert.equal(getShutdown.status, 405);
    assert.equal(getShutdown.headers.get('allow'), 'POST');
    const parsed = JSON.parse(await getShutdown.text());
    assert.equal(parsed.ok, false);
    assert.equal(parsed.error.code, 'ENG_HTTP_METHOD_NOT_ALLOWED');
  } finally {
    stopServer();
    process.env.ENGRAM_CONFIG_DIR = oldEnv.ENGRAM_CONFIG_DIR;
    process.env.ENGRAM_GLOBAL_DIR = oldEnv.ENGRAM_GLOBAL_DIR;
    process.env.NODE_ENV = oldEnv.NODE_ENV;
    await rm(cwd, { recursive: true, force: true });
  }
});

test('entry server rejects /shutdown POST without or with wrong CSRF token and accepts the valid token', async () => {
  const { cwd, oldEnv } = await withSecurityWorkspace('engram-entry-shutdown-post-');
  try {
    const baseUrl = await servePanel(cwd);
    csrfToken = await fetchCsrfToken(baseUrl);

    const noToken = await lowLevelRequest(baseUrl, { path: '/shutdown', method: 'POST' });
    assert.equal(noToken.status, 403);
    assert.equal(parseEnvelope(noToken)?.error?.code, 'ENG_HTTP_CSRF');

    const wrongToken = await lowLevelRequest(baseUrl, {
      path: '/shutdown', method: 'POST',
      headers: { 'x-engram-csrf': 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef' }
    });
    assert.equal(wrongToken.status, 403);
    assert.equal(parseEnvelope(wrongToken)?.error?.code, 'ENG_HTTP_CSRF');

    const valid = await lowLevelRequest(baseUrl, {
      path: '/shutdown', method: 'POST',
      headers: { 'x-engram-csrf': csrfToken }
    });
    assert.equal(valid.status, 204);

    // After the shutdown timer elapses the server must stop accepting connections.
    await new Promise((r) => setTimeout(r, 260));
    const afterShutdown = await rawRequest(baseUrl + '/api/data').catch(() => 'connection-refused');
    assert.equal(afterShutdown, 'connection-refused', 'server should be closed after a valid shutdown');
  } finally {
    stopServer();
    process.env.ENGRAM_CONFIG_DIR = oldEnv.ENGRAM_CONFIG_DIR;
    process.env.ENGRAM_GLOBAL_DIR = oldEnv.ENGRAM_GLOBAL_DIR;
    process.env.NODE_ENV = oldEnv.NODE_ENV;
    await rm(cwd, { recursive: true, force: true });
  }
});

test('entry server rejects foreign Origin, foreign Host, and tokenless /api/* mutations', async () => {
  const { cwd, oldEnv } = await withSecurityWorkspace('engram-entry-csrf-');
  try {
    const baseUrl = await servePanel(cwd);
    csrfToken = await fetchCsrfToken(baseUrl);

    // Same-origin GET works (no Origin header from Node fetch).
    const sameOrigin = await rawRequest(baseUrl + '/api/data');
    assert.equal(sameOrigin.status, 200);

    // Foreign Origin on GET /api/data -> 403.
    const foreignOrigin = await lowLevelRequest(baseUrl, {
      path: '/api/data', method: 'GET',
      headers: { origin: 'http://evil.example' }
    });
    assert.equal(foreignOrigin.status, 403);
    assert.equal(parseEnvelope(foreignOrigin)?.error?.code, 'ENG_HTTP_FORBIDDEN_ORIGIN');

    // Foreign Host on GET /api/data -> 403.
    const foreignHost = await lowLevelRequest(baseUrl, {
      path: '/api/data', method: 'GET',
      headers: { host: 'evil.example:1234' }
    });
    assert.equal(foreignHost.status, 403);
    assert.equal(parseEnvelope(foreignHost)?.error?.code, 'ENG_HTTP_FORBIDDEN_HOST');

    // POST /api/config without CSRF token -> 403.
    const postNoToken = await lowLevelRequest(baseUrl, {
      path: '/api/config', method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ patch: { read: 'manual' } })
    });
    assert.equal(postNoToken.status, 403);
    assert.equal(parseEnvelope(postNoToken)?.error?.code, 'ENG_HTTP_CSRF');

    // POST /api/config with CSRF token but wrong content type -> 415.
    const postWrongCT = await lowLevelRequest(baseUrl, {
      path: '/api/config', method: 'POST',
      headers: { 'x-engram-csrf': csrfToken, 'content-type': 'text/plain' },
      body: JSON.stringify({ patch: { read: 'manual' } })
    });
    assert.equal(postWrongCT.status, 415);
    assert.equal(parseEnvelope(postWrongCT)?.error?.code, 'ENG_HTTP_CONTENT_TYPE');

    // POST /api/config with valid token + JSON content type -> 200.
    const postOk = await lowLevelRequest(baseUrl, {
      path: '/api/config', method: 'POST',
      headers: { 'x-engram-csrf': csrfToken, 'content-type': 'application/json' },
      body: JSON.stringify({ patch: { read: 'manual' } })
    });
    assert.equal(postOk.status, 200);
    const postOkBody = JSON.parse(postOk.body);
    assert.equal(postOkBody.ok, true);

    // PUT /api/data is not one of the allowed methods -> 405 with Allow header.
    const putMethod = await lowLevelRequest(baseUrl, {
      path: '/api/data', method: 'PUT',
      headers: { 'x-engram-csrf': csrfToken }
    });
    assert.equal(putMethod.status, 405);
    assert.equal(putMethod.headers.allow, 'GET, POST');

    // POST /static asset -> 405 (only GET allowed).
    const postRoot = await lowLevelRequest(baseUrl, {
      path: '/panel.js', method: 'POST',
      headers: { 'x-engram-csrf': csrfToken }
    });
    assert.equal(postRoot.status, 405);
    assert.equal(postRoot.headers.allow, 'GET');

    // POST with malformed JSON body -> 400 (already covered by existing test, but ensure shape is stable here).
    const postBadJson = await lowLevelRequest(baseUrl, {
      path: '/api/config', method: 'POST',
      headers: { 'x-engram-csrf': csrfToken, 'content-type': 'application/json' },
      body: 'not-json'
    });
    assert.equal(postBadJson.status, 400);
  } finally {
    stopServer();
    process.env.ENGRAM_CONFIG_DIR = oldEnv.ENGRAM_CONFIG_DIR;
    process.env.ENGRAM_GLOBAL_DIR = oldEnv.ENGRAM_GLOBAL_DIR;
    process.env.NODE_ENV = oldEnv.NODE_ENV;
    await rm(cwd, { recursive: true, force: true });
  }
});
