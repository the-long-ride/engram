import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { handleMcp } from '../dist/mcp/server.js';
import { runCli } from '../dist/cli.js';
import { agentMemoryProtocolText } from '../dist/core/memory/agent-proposal-protocol.js';
import { tempWorkspace, workspaceMemoryRoot } from './helpers.mjs';
import { SERVER_INSTRUCTIONS, SERVER_INSTRUCTIONS_MAX, SUPPORTED_VERSIONS } from '../dist/mcp/protocol.js';
import { argsDigest, cwdDigest, openRequestState, sealRequestState } from '../dist/mcp/elicitation.js';

const MODERN = '2026-07-28';
function meta(caps = {}, version = MODERN) {
  return { 'io.modelcontextprotocol/protocolVersion': version, 'io.modelcontextprotocol/clientInfo': { name: 'test-client', version: '0' }, 'io.modelcontextprotocol/clientCapabilities': caps };
}
const modern = (id, method, params = {}, caps = {}) => handleMcp({ jsonrpc: '2.0', id, method, params: { ...params, _meta: meta(caps) } });

test('legacy initialize negotiates a supported version and never echoes an unknown one', async () => {
  const supported = await handleMcp({ id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {} } });
  assert.equal(supported.result.protocolVersion, '2025-06-18');
  const unknown = await handleMcp({ id: 2, method: 'initialize', params: { protocolVersion: '1999-01-01', capabilities: {} } });
  assert.equal(unknown.result.protocolVersion, '2025-11-25');
  const missing = await handleMcp({ id: 3, method: 'initialize' });
  assert.equal(missing.result.protocolVersion, '2025-11-25');
  const modernString = await handleMcp({ id: 4, method: 'initialize', params: { protocolVersion: MODERN } });
  assert.equal(modernString.result.protocolVersion, '2025-11-25');
});

test('legacy initialize records client capabilities on the session', async () => {
  const session = {};
  await handleMcp({ id: 1, method: 'initialize', params: { protocolVersion: '2025-11-25', capabilities: { elicitation: {} } } }, session);
  assert.deepEqual(session.legacyClientCapabilities, { elicitation: {} });
  await handleMcp({ id: 2, method: 'initialize', params: { protocolVersion: '2025-11-25', capabilities: 'nope' } }, session);
  assert.deepEqual(session.legacyClientCapabilities, {});
});

test('server/discover returns supported versions, capabilities, serverInfo meta, and cache hints', async () => {
  const { result } = await modern(1, 'server/discover');
  assert.equal(result.supportedVersions[0], MODERN);
  assert.ok(result.supportedVersions.includes('2025-11-25'));
  assert.deepEqual(result.supportedVersions, SUPPORTED_VERSIONS);
  assert.deepEqual(result.capabilities, { tools: {}, resources: {}, prompts: {} });
  assert.equal(result.resultType, 'complete');
  assert.ok(result.ttlMs >= 0);
  assert.ok(['public', 'private'].includes(result.cacheScope));
  assert.equal(result._meta['io.modelcontextprotocol/serverInfo'].name, 'engram');
  assert.equal(result.serverInfo, undefined);
});

test('modern tools/list carries resultType, ttlMs, cacheScope and a stable order', async () => {
  const first = await modern(1, 'tools/list');
  const second = await modern(2, 'tools/list');
  const names = first.result.tools.map((tool) => tool.name);
  assert.deepEqual(names, second.result.tools.map((tool) => tool.name));
  assert.deepEqual(names, ['engram_load', 'engram_route', 'engram_search', 'engram_verify', 'engram_status', 'engram_set_role', 'engram_set_rule_variant', 'engram_save', 'engram_save_session', 'engram_commit', 'engram_note']);
  assert.equal(first.result.resultType, 'complete');
  assert.equal(first.result.ttlMs, 300000);
  assert.ok(['public', 'private'].includes(first.result.cacheScope));
  assert.equal(first.result._meta['io.modelcontextprotocol/serverInfo'].name, 'engram');
});

test('modern request with an unknown version returns -32022 with supported and requested', async () => {
  const unknown = await handleMcp({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: { _meta: meta({}, '1900-01-01') } });
  assert.equal(unknown.error.code, -32022);
  assert.equal(unknown.error.data.requested, '1900-01-01');
  assert.deepEqual(unknown.error.data.supported, SUPPORTED_VERSIONS);
  // A legacy version string in _meta is not a modern version either.
  const legacyString = await handleMcp({ jsonrpc: '2.0', id: 2, method: 'server/discover', params: { _meta: meta({}, '2025-06-18') } });
  assert.equal(legacyString.error.code, -32022);
  assert.equal(legacyString.error.data.requested, '2025-06-18');
  // A non-string version is a params error, not a version error.
  const badType = await handleMcp({ jsonrpc: '2.0', id: 3, method: 'tools/list', params: { _meta: { 'io.modelcontextprotocol/protocolVersion': 7, 'io.modelcontextprotocol/clientCapabilities': {} } } });
  assert.equal(badType.error.code, -32602);
});

test('modern request missing clientCapabilities returns -32602', async () => {
  const bad = meta();
  delete bad['io.modelcontextprotocol/clientCapabilities'];
  const response = await handleMcp({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: { _meta: bad } });
  assert.equal(response.error.code, -32602);
  assert.match(response.error.message, /clientCapabilities/);
});

test('modern tools/call wraps the tool result with resultType complete', async () => {
  const { result } = await modern(1, 'tools/call', { name: 'engram_status', arguments: {} });
  assert.equal(result.resultType, 'complete');
  assert.equal(result.content[0].type, 'text');
  assert.equal(result.structuredContent.ok, true);
  assert.equal(result.ttlMs, undefined);
  assert.equal(result.cacheScope, undefined);
  const failed = await modern(2, 'tools/call', { name: 'engram_save', arguments: { text: '' } });
  assert.equal(failed.result.isError, true);
  assert.equal(failed.result.resultType, 'complete');
  assert.equal(failed.result.structuredContent.ok, false);
});

test('modern ping, initialize and bare tool methods return -32601', async () => {
  for (const method of ['ping', 'initialize', 'engram_status', 'no/such/method']) {
    const response = await modern(1, method);
    assert.equal(response.error.code, -32601, method);
    assert.equal(response.result, undefined, method);
  }
});

test('modern unknown tool returns -32602', async () => {
  const response = await modern(1, 'tools/call', { name: 'engram_nope', arguments: {} });
  assert.equal(response.error.code, -32602);
  assert.match(response.error.message, /engram_nope/);
  const noName = await modern(2, 'tools/call', { arguments: {} });
  assert.equal(noName.error.code, -32602);
});

test('server instructions are present in both eras and fit 512 characters', async () => {
  assert.equal(SERVER_INSTRUCTIONS_MAX, 512);
  assert.ok(SERVER_INSTRUCTIONS.length <= 512, `instructions are ${SERVER_INSTRUCTIONS.length} chars`);
  const legacy = await handleMcp({ id: 1, method: 'initialize', params: { protocolVersion: '2025-11-25', capabilities: {} } });
  assert.equal(legacy.result.instructions, SERVER_INSTRUCTIONS);
  const { result } = await modern(2, 'server/discover');
  assert.equal(result.instructions, SERVER_INSTRUCTIONS);
  for (const name of ['engram_load', 'engram_save', 'engram_commit']) assert.match(SERVER_INSTRUCTIONS, new RegExp(name));
});

test('modern tools/list honours the always-load session flag and keeps existing _meta', async () => {
  const session = { alwaysLoad: true };
  const { result } = await handleMcp({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: { _meta: meta() } }, session);
  assert.equal(result.tools.find((tool) => tool.name === 'engram_load')._meta['anthropic/alwaysLoad'], true);
  assert.equal(result.tools.find((tool) => tool.name === 'engram_commit')._meta['anthropic/requiresUserInteraction'], true);
  assert.equal(result.tools.filter((tool) => tool._meta?.['anthropic/alwaysLoad']).length, 1);
});

test('modern notifications get no response', async () => {
  assert.equal(await handleMcp({ jsonrpc: '2.0', method: 'notifications/cancelled', params: { _meta: meta(), requestId: 1 } }), undefined);
});

/** Run `fn(cwd)` inside an injected temp workspace; ENGRAM_* env and process cwd are restored afterwards. */
async function inTempWorkspace(fn) {
  const { cwd, env } = await tempWorkspace('engram-mcp-modern-resources-');
  const keys = Object.keys(env).filter((key) => key.startsWith('ENGRAM_') || key.startsWith('GIT_CONFIG_'));
  const previousEnv = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  const previousCwd = process.cwd();
  for (const key of keys) process.env[key] = env[key];
  process.chdir(cwd);
  try {
    await runCli(['inject']);
    return await fn(cwd);
  } finally {
    process.chdir(previousCwd);
    for (const key of keys) {
      if (previousEnv[key] === undefined) delete process.env[key];
      else process.env[key] = previousEnv[key];
    }
    await rm(cwd, { recursive: true, force: true });
  }
}

test('modern resources and prompts lists carry resultType and cache hints', async () => {
  await inTempWorkspace(async () => {
    const resources = await modern(1, 'resources/list');
    assert.equal(resources.result.resultType, 'complete');
    assert.equal(resources.result.cacheScope, 'private');
    assert.equal(typeof resources.result.ttlMs, 'number');
    assert.equal(resources.result.resources[0].uri, 'engram://index');
    for (const [method, key] of [['resources/templates/list', 'resourceTemplates'], ['prompts/list', 'prompts']]) {
      const { result } = await modern(2, method);
      assert.equal(result.resultType, 'complete', method);
      assert.equal(result.cacheScope, 'public', method);
      assert.equal(result.ttlMs, 300000, method);
      assert.ok(result[key].length > 0, method);
      assert.equal(result._meta['io.modelcontextprotocol/serverInfo'].name, 'engram', method);
    }
    const index = await modern(3, 'resources/read', { uri: 'engram://index' });
    assert.equal(index.result.resultType, 'complete');
    assert.equal(index.result.cacheScope, 'private');
    assert.equal(index.result.contents[0].uri, 'engram://index');
  });
});

test('modern resources/read of an unknown id returns -32602 with the uri, never -32002', async () => {
  await inTempWorkspace(async () => {
    for (const uri of ['engram://memory/missing', 'engram://memory/..%2Fsecret']) {
      const response = await modern(1, 'resources/read', { uri });
      assert.equal(response.error.code, -32602, uri);
      assert.equal(response.error.message, 'Resource not found');
      assert.deepEqual(response.error.data, { uri }, uri);
      assert.equal(response.result, undefined, uri);
    }
    const noUri = await modern(2, 'resources/read');
    assert.equal(noUri.error.code, -32602);
  });
});

test('modern prompts/get returns the proposal protocol and -32602 for an unknown prompt', async () => {
  const { result } = await modern(1, 'prompts/get', { name: 'propose' });
  assert.equal(result.resultType, 'complete');
  assert.equal(result.messages[0].content.text, agentMemoryProtocolText());
  const unknown = await modern(2, 'prompts/get', { name: 'nope' });
  assert.equal(unknown.error.code, -32602);
});

test('legacy requests stay byte-identical: ping, bare tool methods, unknown method code', async () => {
  assert.deepEqual(await handleMcp({ id: 1, method: 'ping' }), { jsonrpc: '2.0', id: 1, result: {} });
  const unknown = await handleMcp({ id: 2, method: 'no/such/method' });
  assert.equal(unknown.error.code, -32000);
  assert.equal(unknown.error.message, 'Unknown tool: no/such/method');
  const tools = await handleMcp({ id: 3, method: 'tools/list', params: {} });
  assert.equal(tools.result.resultType, undefined);
  assert.equal(tools.result.ttlMs, undefined);
});

// --- Task 9: elicitation approval over MRTR (input_required) ---

const FORM = { elicitation: { form: {} } };
const SAVE_ARGS = {
  text: [
    'TYPE: knowledge | TEXT: The release checklist lives in CHANGELOG.md. | TRIGGERS: release, changelog',
    'TYPE: knowledge | TEXT: Feature flags are configured in config/flags.yaml. | TRIGGERS: feature flags, config'
  ].join('\n'),
  scope: 'workspace'
};
const approvalCall = (id, state, response, { args = SAVE_ARGS, caps = FORM, name = 'engram_save_session', session } = {}) => handleMcp({
  jsonrpc: '2.0',
  id,
  method: 'tools/call',
  params: {
    name,
    arguments: args,
    ...(response === undefined ? {} : { inputResponses: { engram_approval: response } }),
    ...(state === undefined ? {} : { requestState: state }),
    _meta: meta(caps)
  }
}, session);
const accepted = (approve, scope = 'workspace') => ({ action: 'accept', content: { approve, scope } });

async function memoryFiles(cwd) {
  return (await readdir(path.join(workspaceMemoryRoot(cwd), 'knowledge')).catch(() => [])).filter((name) => name.endsWith('.md'));
}

async function firstState(id = 1, options) {
  const first = await approvalCall(id, undefined, undefined, options);
  assert.equal(first.result.resultType, 'input_required', JSON.stringify(first));
  return first.result.requestState;
}

test('modern save_session returns input_required and an accept retry commits once', async () => {
  await inTempWorkspace(async (cwd) => {
    const first = await approvalCall(1);
    assert.equal(first.result.resultType, 'input_required');
    assert.equal(first.result.inputRequests.engram_approval.method, 'elicitation/create');
    assert.equal(first.result.inputRequests.engram_approval.params.mode, 'form');
    assert.equal(first.result.inputRequests.engram_approval.params.requestedSchema.properties.approve.items.anyOf.length, 2);
    assert.equal(typeof first.result.requestState, 'string');
    assert.equal(first.result.ttlMs, undefined);
    assert.equal(first.result.cacheScope, undefined);
    assert.equal(first.result._meta['io.modelcontextprotocol/serverInfo'].name, 'engram');
    // The raw token never reaches the client, and the hash on disk is not in the state in the clear.
    assert.doesNotMatch(JSON.stringify(first.result), /approval_token/);
    assert.equal((await memoryFiles(cwd)).length, 0);

    const retry = await approvalCall(2, first.result.requestState, accepted(['1', '2']));
    assert.equal(retry.result.resultType, 'complete', JSON.stringify(retry));
    assert.equal(retry.result.isError, undefined, retry.result.content?.[0]?.text);
    assert.match(retry.result.content[0].text, /Approved in the Engram approval dialog/);
    assert.equal((await memoryFiles(cwd)).length, 2);

    const replay = await approvalCall(3, first.result.requestState, accepted(['1', '2']));
    assert.equal(replay.result.isError, true);
    assert.match(replay.result.content[0].text, /already used/);
    assert.equal((await memoryFiles(cwd)).length, 2);
  });
});

test('modern accept writes only the selected candidate and honours the offered scope', async () => {
  await inTempWorkspace(async (cwd) => {
    const state = await firstState();
    const retry = await approvalCall(2, state, accepted(['2']));
    assert.equal(retry.result.structuredContent.data.committed, true);
    assert.equal((await memoryFiles(cwd)).length, 1);
  });
});

test('modern engram_note returns input_required and an accept retry writes one working note', async () => {
  await inTempWorkspace(async (cwd) => {
    const args = { text: 'Billing export batches invoices nightly through the ledger worker', objective: 'add billing export' };
    const options = { args, name: 'engram_note' };
    const first = await approvalCall(1, undefined, undefined, options);
    assert.equal(first.result.resultType, 'input_required', JSON.stringify(first));
    const form = first.result.inputRequests.engram_approval.params;
    assert.match(form.message, /working note/);
    assert.equal(form.requestedSchema.properties.approve.items.anyOf.length, 1);
    assert.equal((await readdir(path.join(workspaceMemoryRoot(cwd), 'working'), { recursive: true })).filter((name) => name.endsWith('.md')).length, 0);
    // Asking again without an answer keeps the note form, not the save-session one.
    const again = await approvalCall(2, first.result.requestState, undefined, options);
    assert.match(again.result.inputRequests.engram_approval.params.message, /working note/);
    // A requestState issued for another tool never opens here.
    const wrongTool = await approvalCall(3, first.result.requestState, accepted(['1']), { ...options, name: 'engram_save_session' });
    assert.equal(wrongTool.error?.code, -32602, JSON.stringify(wrongTool));

    const retry = await approvalCall(4, first.result.requestState, accepted(['1']), options);
    assert.equal(retry.result.resultType, 'complete', JSON.stringify(retry));
    assert.equal(retry.result.isError, undefined, retry.result.content?.[0]?.text);
    const data = retry.result.structuredContent.data;
    assert.equal(data.committed, true);
    assert.match(data.file, /^working\/knowledge\/.+\.md$/);
    assert.match(data.valid_until, /^\d{4}-\d{2}-\d{2}$/);
    assert.deepEqual(await readdir(path.join(workspaceMemoryRoot(cwd), 'working', 'knowledge')), [path.basename(data.file)]);
    assert.equal((await memoryFiles(cwd)).length, 0, 'no durable memory is written');
    const replay = await approvalCall(5, first.result.requestState, accepted(['1']), options);
    assert.equal(replay.result.isError, true);
    assert.match(replay.result.content[0].text, /already used/);
  });
});

test('modern retry with a forged requestState fails closed', async () => {
  await inTempWorkspace(async (cwd) => {
    const state = await firstState();
    const rejected = async (id, response, options) => {
      const result = await approvalCall(id, response.state, accepted(['1', '2']), options);
      assert.equal(result.error?.code, -32602, JSON.stringify(result));
      assert.equal(result.result, undefined);
      assert.equal((await memoryFiles(cwd)).length, 0);
    };
    const last = state.at(-1);
    await rejected(2, { state: `${state.slice(0, -1)}${last === 'A' ? 'B' : 'A'}` });

    // The pending hash is readable from disk, but without the MAC it opens nothing.
    const pending = JSON.parse(await readFile(path.join(workspaceMemoryRoot(cwd), 'pending-approvals.json'), 'utf8'));
    const body = Buffer.from(JSON.stringify({
      v: 1, th: pending.approvals[0].token_hash, cwd: cwdDigest(cwd), tool: 'engram_save_session', args: argsDigest(SAVE_ARGS), exp: Date.now() + 600000,
      choices: [{ number: 1, title: '1. x' }, { number: 2, title: '2. y' }], scopes: ['workspace']
    })).toString('base64url');
    await rejected(3, { state: `v1.${body}.AAAA` });
    await rejected(4, { state: `v1.${body}` });
    await rejected(5, { state: 'not-a-state' });
    await rejected(6, { state: 7 });

    // A valid state, but the arguments changed.
    await rejected(7, { state }, { args: { ...SAVE_ARGS, text: `${SAVE_ARGS.text}\nTYPE: knowledge | TEXT: A third candidate nobody saw.` } });
    // A valid state replayed against another tool.
    await rejected(8, { state }, { name: 'engram_save', args: SAVE_ARGS });
    // An oversized state.
    await rejected(9, { state: 'v1.'.padEnd(10 * 1024, 'a') });

    // A valid state in a different workspace.
    const other = await tempWorkspace('engram-mcp-modern-other-');
    const previous = process.cwd();
    process.chdir(other.cwd);
    try {
      const result = await approvalCall(10, state, accepted(['1', '2']));
      assert.equal(result.error?.code, -32602);
    } finally {
      process.chdir(previous);
      await rm(other.cwd, { recursive: true, force: true });
    }
    assert.equal((await memoryFiles(cwd)).length, 0);

    // The untouched state still works: nothing above consumed or revoked the proposal.
    const good = await approvalCall(11, state, accepted(['1']));
    assert.equal(good.result.resultType, 'complete');
    assert.equal((await memoryFiles(cwd)).length, 1);
  });
});

test('modern requestState: expiry, tool, cwd, and args binding are enforced by openRequestState', () => {
  const payload = { v: 1, th: 'abc', cwd: cwdDigest('/work/a'), tool: 'engram_save', args: argsDigest({ text: 'x' }), exp: 1000, choices: [{ number: 1, title: '1. ADD workspace:x' }], scopes: ['workspace'] };
  const expected = { tool: 'engram_save', cwd: '/work/a', args: { text: 'x' } };
  const state = sealRequestState(payload);
  assert.equal(openRequestState(state, expected, 999)?.th, 'abc');
  assert.equal(openRequestState(state, expected, 1001), undefined, 'expired');
  assert.equal(openRequestState(state, { ...expected, tool: 'engram_save_session' }, 999), undefined);
  assert.equal(openRequestState(state, { ...expected, cwd: '/work/b' }, 999), undefined);
  assert.equal(openRequestState(state, { ...expected, args: { text: 'y' } }, 999), undefined);
  assert.equal(openRequestState(sealRequestState({ ...payload, scopes: ['everywhere'] }), expected, 999), undefined);
  assert.equal(openRequestState(sealRequestState({ ...payload, choices: [] }), expected, 999), undefined);
});

test('modern decline revokes and a retry without inputResponses asks again', async () => {
  await inTempWorkspace(async (cwd) => {
    const state = await firstState();
    const again = await approvalCall(2, state);
    assert.equal(again.result.resultType, 'input_required');
    assert.equal(again.result.requestState, state);
    assert.equal(again.result.inputRequests.engram_approval.method, 'elicitation/create');
    const declined = await approvalCall(3, state, { action: 'decline' });
    assert.equal(declined.result.resultType, 'complete');
    assert.match(declined.result.content[0].text, /Nothing was saved: the human chose decline/);
    assert.equal((await memoryFiles(cwd)).length, 0);
    const late = await approvalCall(4, state, accepted(['1', '2']));
    assert.equal(late.result.isError, true);
    assert.match(late.result.content[0].text, /approval was declined/);
    assert.equal((await memoryFiles(cwd)).length, 0);
  });
});

test('modern cancel and invalid answers revoke the proposal with nothing saved', async () => {
  await inTempWorkspace(async (cwd) => {
    const cancelled = await approvalCall(2, await firstState(1), { action: 'cancel' });
    assert.match(cancelled.result.content[0].text, /Nothing was saved: the human chose cancel/);
    assert.equal(cancelled.result.structuredContent.data.approval_token, undefined);
    for (const [id, response] of [[4, accepted(['9'])], [5, accepted(['1'], 'global')], [6, { action: 'accept' }], [7, 'accept'], [8, { action: 'maybe' }]]) {
      const result = await approvalCall(id, await firstState(id * 10), response);
      assert.match(result.result.content[0].text, /response was invalid/, JSON.stringify(response));
    }
    assert.equal((await memoryFiles(cwd)).length, 0);
  });
});

test('modern client without elicitation keeps the token flow with resultType complete', async () => {
  await inTempWorkspace(async (cwd) => {
    for (const caps of [{}, { elicitation: { url: {} } }]) {
      const response = await approvalCall(1, undefined, undefined, { caps });
      assert.equal(response.result.resultType, 'complete');
      assert.equal(typeof response.result.structuredContent.data.approval_token, 'string');
    }
    assert.equal((await memoryFiles(cwd)).length, 0);
  });
});

test('modern --no-elicitation keeps the token flow and rejects a leftover requestState', async () => {
  await inTempWorkspace(async (cwd) => {
    const state = await firstState();
    const session = { elicitation: false };
    const response = await approvalCall(2, undefined, undefined, { session });
    assert.equal(response.result.resultType, 'complete');
    assert.equal(typeof response.result.structuredContent.data.approval_token, 'string');
    const retry = await approvalCall(3, state, accepted(['1', '2']), { session });
    assert.equal(retry.error.code, -32602);
    assert.equal((await memoryFiles(cwd)).length, 0);
  });
});

test('modern retry fields in tool arguments are never trusted', async () => {
  await inTempWorkspace(async (cwd) => {
    const state = await firstState();
    const smuggled = { ...SAVE_ARGS, requestState: state, inputResponses: { engram_approval: accepted(['1', '2']) } };
    const response = await approvalCall(2, undefined, undefined, { args: smuggled });
    assert.equal(response.result.resultType, 'input_required');
    assert.equal((await memoryFiles(cwd)).length, 0);
  });
});
