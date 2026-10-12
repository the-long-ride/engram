import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { runEngram, tempWorkspace, workspaceMemoryRoot } from './helpers.mjs';

const MCP_BIN = fileURLToPath(new URL('../dist/bin/engram-mcp.js', import.meta.url));
const CANDIDATES = [
  'TYPE: knowledge | TEXT: The release checklist lives in CHANGELOG.md. | TRIGGERS: release, changelog',
  'TYPE: knowledge | TEXT: Feature flags are configured in config/flags.yaml. | TRIGGERS: feature flags, config'
].join('\n');

/** Plays an MCP client: answers server-to-client requests with `onServerRequest`, records every stdout line. */
class FakeClient {
  constructor({ cwd, env, args = [], onServerRequest }) {
    this.child = spawn(process.execPath, [MCP_BIN, ...args], { cwd, env, stdio: ['pipe', 'pipe', 'pipe'] });
    this.lines = [];
    this.serverRequests = [];
    this.waiting = new Map();
    this.nextId = 0;
    let buffer = '';
    this.child.stdout.on('data', (chunk) => {
      buffer += chunk;
      let index;
      while ((index = buffer.indexOf('\n')) >= 0) {
        const message = JSON.parse(buffer.slice(0, index));
        buffer = buffer.slice(index + 1);
        this.lines.push(message);
        this.#route(message, onServerRequest);
      }
    });
  }

  async #route(message, onServerRequest) {
    if (message.method && message.id !== undefined) {
      this.serverRequests.push(message);
      const reply = await onServerRequest?.(message);
      if (reply !== undefined) this.send({ jsonrpc: '2.0', id: message.id, ...reply });
      return;
    }
    this.waiting.get(message.id)?.(message);
    this.waiting.delete(message.id);
  }

  send(message) {
    this.child.stdin.write(`${JSON.stringify(message)}\n`);
  }

  /** Send a request without waiting; `promise` resolves with the response. */
  start(method, params, timeoutMs = 15000) {
    const id = ++this.nextId;
    const promise = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`timeout waiting for ${method}`)), timeoutMs);
      this.waiting.set(id, (message) => { clearTimeout(timer); resolve(message); });
    });
    this.send({ jsonrpc: '2.0', id, method, params });
    return { id, promise };
  }

  request(method, params, timeoutMs) {
    return this.start(method, params, timeoutMs).promise;
  }

  initialize(capabilities) {
    return this.request('initialize', { protocolVersion: '2025-11-25', capabilities, clientInfo: { name: 'fake', version: '0' } });
  }

  async waitForServerRequest() {
    for (let attempt = 0; attempt < 100 && !this.serverRequests.length; attempt++) await new Promise((resolve) => setTimeout(resolve, 50));
    assert.ok(this.serverRequests.length, 'expected an elicitation/create request');
  }

  async close() {
    const closed = this.child.exitCode === null && this.child.signalCode === null ? new Promise((resolve) => this.child.once('close', resolve)) : undefined;
    this.child.stdin.end();
    this.child.kill();
    await closed;
  }
}

async function workspace(prefix) {
  const { cwd, env } = await tempWorkspace(prefix);
  assert.equal((await runEngram(cwd, env, ['inject'])).code, 0);
  return { cwd, env };
}

async function knowledgeCount(cwd) {
  return (await readdir(path.join(workspaceMemoryRoot(cwd), 'knowledge')).catch(() => [])).filter((name) => name.endsWith('.md')).length;
}

async function pendingRecords(cwd) {
  return JSON.parse(await readFile(path.join(workspaceMemoryRoot(cwd), 'pending-approvals.json'), 'utf8')).approvals;
}

const accept = (approve, scope = 'workspace') => async () => ({ result: { action: 'accept', content: { approve, scope } } });
const answer = (action) => async () => ({ result: { action } });
test('pipelined tool calls run in arrival order', async () => {
  await withClient({}, async ({ client }) => {
    await client.initialize({});
    const set = client.start('tools/call', { name: 'engram_set_rule_variant', arguments: { variant: 'strict' } });
    const status = client.start('tools/call', { name: 'engram_set_rule_variant', arguments: { variant: 'status' } });
    const [setReply, statusReply] = await Promise.all([set.promise, status.promise]);
    assert.equal(setReply.result.isError, undefined, JSON.stringify(setReply));
    assert.match(statusReply.result.content[0].text, /strict/i, 'the status call sees the write sent before it');
    const order = client.lines.filter((line) => line.id === set.id || line.id === status.id).map((line) => line.id);
    assert.deepEqual(order, [set.id, status.id]);
  });
});

const saveSession = (client) => client.request('tools/call', { name: 'engram_save_session', arguments: { text: CANDIDATES, scope: 'workspace' } });

/** Run `fn` with a fake client over a fresh workspace; the client and the workspace are always cleaned up. */
async function withClient(options, fn) {
  const { cwd, env } = await workspace('engram-mcp-elicit-');
  const client = new FakeClient({ cwd, env: { ...env, ...(options.env ?? {}) }, args: options.args, onServerRequest: options.onServerRequest });
  try {
    await fn({ client, cwd });
  } finally {
    await client.close();
    await rm(cwd, { recursive: true, force: true });
  }
}

test('legacy elicitation accept writes only the selected candidates', async () => {
  await withClient({ onServerRequest: accept(['2']) }, async ({ client, cwd }) => {
    await client.initialize({ elicitation: {} });
    const response = await saveSession(client);
    assert.equal(client.serverRequests.length, 1);
    const [dialog] = client.serverRequests;
    assert.equal(dialog.method, 'elicitation/create');
    assert.equal(dialog.params.mode, 'form');
    const choices = dialog.params.requestedSchema.properties.approve.items.anyOf;
    assert.equal(choices.length, 2);
    assert.deepEqual(dialog.params.requestedSchema.properties.scope.enum, ['workspace']);
    for (const choice of choices) {
      assert.doesNotMatch(choice.title, /release checklist lives|Feature flags are configured/);
      assert.doesNotMatch(choice.title, /REDACTED|<[a-z-]+>/);
      assert.ok(choice.title.length <= 120);
    }
    assert.doesNotMatch(JSON.stringify(dialog.params), /approval_token/);
    assert.match(response.result.content[0].text, /Approved in the Engram approval dialog/);
    assert.equal(response.result.structuredContent.data.committed, true);
    assert.deepEqual(response.result.structuredContent.data.approved, [2]);
    assert.equal(response.result.structuredContent.data.approval_token, undefined);
    assert.doesNotMatch(response.result.content[0].text, /approval_token/);
    assert.equal(await knowledgeCount(cwd), 1);
    const [record] = await pendingRecords(cwd);
    assert.ok(record.used_at);
    assert.equal(record.revoked_at, undefined);
  });
});

test('legacy engram_save single proposal also goes through the dialog', async () => {
  await withClient({ onServerRequest: accept(['1']) }, async ({ client, cwd }) => {
    await client.initialize({ elicitation: { form: {} } });
    const response = await client.request('tools/call', { name: 'engram_save', arguments: { text: 'Deploys to staging run through the ci-staging workflow.', type: 'knowledge', scope: 'workspace' } });
    assert.equal(client.serverRequests.length, 1);
    assert.match(response.result.content[0].text, /Approved in the Engram approval dialog/);
    assert.equal(await knowledgeCount(cwd), 1);
  });
});

test('legacy elicitation decline writes nothing and revokes the proposal', async () => {
  await withClient({ onServerRequest: answer('decline') }, async ({ client, cwd }) => {
    await client.initialize({ elicitation: {} });
    const response = await saveSession(client);
    assert.match(response.result.content[0].text, /Nothing was saved: the human chose decline/);
    assert.equal(response.result.structuredContent.data.approval_token, undefined);
    assert.doesNotMatch(response.result.content[0].text, /approval_token/);
    assert.equal(await knowledgeCount(cwd), 0);
    const records = await pendingRecords(cwd);
    assert.equal(records.length, 1);
    assert.ok(records[0].revoked_at);
    assert.ok(records[0].used_at);
  });
});

test('legacy elicitation cancel falls back to the chat approval token', async () => {
  await withClient({ onServerRequest: answer('cancel') }, async ({ client, cwd }) => {
    await client.initialize({ elicitation: {} });
    const response = await saveSession(client);
    assert.match(response.result.content[0].text, /dismissed; nothing was saved/);
    const token = response.result.structuredContent.data.approval_token;
    assert.equal(typeof token, 'string');
    assert.equal(await knowledgeCount(cwd), 0);
    const committed = await client.request('tools/call', { name: 'engram_commit', arguments: { approval_token: token, approve: 'all' } });
    assert.equal(committed.result.isError, undefined, committed.result.content?.[0]?.text);
    assert.equal(await knowledgeCount(cwd), 2);
  });
});

test('legacy elicitation timeout falls back to the token and ignores a late answer', async () => {
  await withClient({ env: { ENGRAM_MCP_ELICITATION_TIMEOUT_MS: '300' }, onServerRequest: async () => undefined }, async ({ client, cwd }) => {
    await client.initialize({ elicitation: {} });
    const response = await saveSession(client);
    assert.match(response.result.content[0].text, /The approval dialog was not completed; nothing was saved\./);
    assert.equal(typeof response.result.structuredContent.data.approval_token, 'string');
    client.send({ jsonrpc: '2.0', id: client.serverRequests[0].id, result: { action: 'accept', content: { approve: ['1'], scope: 'workspace' } } });
    const ping = await client.request('ping');
    assert.deepEqual(ping.result, {});
    assert.equal(await knowledgeCount(cwd), 0);
  });
});

test('legacy elicitation client error falls back to the token', async () => {
  await withClient({ onServerRequest: async () => ({ error: { code: -32601, message: 'no elicitation here' } }) }, async ({ client, cwd }) => {
    await client.initialize({ elicitation: {} });
    const response = await saveSession(client);
    assert.match(response.result.content[0].text, /not completed; nothing was saved/);
    assert.equal(typeof response.result.structuredContent.data.approval_token, 'string');
    assert.equal(await knowledgeCount(cwd), 0);
  });
});

test('legacy client without the elicitation capability keeps the token flow', async () => {
  await withClient({ onServerRequest: accept(['1', '2']) }, async ({ client, cwd }) => {
    await client.initialize({});
    const response = await saveSession(client);
    assert.equal(client.serverRequests.length, 0);
    assert.equal(typeof response.result.structuredContent.data.approval_token, 'string');
    assert.match(response.result.content[0].text, /AI-agent chat approval required/);
    assert.equal(await knowledgeCount(cwd), 0);
  });
});

test('legacy url-only elicitation capability keeps the token flow', async () => {
  await withClient({ onServerRequest: accept(['1']) }, async ({ client }) => {
    await client.initialize({ elicitation: { url: {} } });
    const response = await saveSession(client);
    assert.equal(client.serverRequests.length, 0);
    assert.equal(typeof response.result.structuredContent.data.approval_token, 'string');
  });
});

test('--no-elicitation keeps the token flow even when the client supports it', async () => {
  await withClient({ args: ['--no-elicitation'], onServerRequest: accept(['1', '2']) }, async ({ client, cwd }) => {
    await client.initialize({ elicitation: { form: {} } });
    const response = await saveSession(client);
    assert.equal(client.serverRequests.length, 0);
    assert.equal(typeof response.result.structuredContent.data.approval_token, 'string');
    assert.equal(await knowledgeCount(cwd), 0);
  });
});

test('legacy elicitation with an out-of-range or malformed selection writes nothing', async () => {
  for (const content of [{ approve: ['3'], scope: 'workspace' }, { approve: [], scope: 'workspace' }, { approve: ['1'], scope: 'global' }, { approve: ['1'] }]) {
    await withClient({ onServerRequest: async () => ({ result: { action: 'accept', content } }) }, async ({ client, cwd }) => {
      await client.initialize({ elicitation: {} });
      const response = await saveSession(client);
      assert.match(response.result.content[0].text, /response was invalid/, JSON.stringify(content));
      assert.equal(await knowledgeCount(cwd), 0);
      assert.ok((await pendingRecords(cwd))[0].revoked_at);
    });
  }
});

test('legacy elicitation with an unknown action writes nothing', async () => {
  await withClient({ onServerRequest: answer('maybe') }, async ({ client, cwd }) => {
    await client.initialize({ elicitation: {} });
    const response = await saveSession(client);
    assert.match(response.result.content[0].text, /response was invalid/);
    assert.equal(await knowledgeCount(cwd), 0);
  });
});

test('the loop keeps answering while a dialog is open, and notifications/cancelled sends no response for the call', async () => {
  await withClient({ onServerRequest: async () => undefined }, async ({ client, cwd }) => {
    await client.initialize({ elicitation: {} });
    const call = client.start('tools/call', { name: 'engram_save_session', arguments: { text: CANDIDATES, scope: 'workspace' } });
    await client.waitForServerRequest();
    const ping = await client.request('ping');
    assert.deepEqual(ping.result, {});
    client.send({ jsonrpc: '2.0', method: 'notifications/cancelled', params: { requestId: call.id } });
    await new Promise((resolve) => setTimeout(resolve, 300));
    assert.equal(client.lines.filter((line) => line.id === call.id).length, 0);
    assert.deepEqual((await client.request('ping')).result, {});
    assert.equal(await knowledgeCount(cwd), 0);
    // A cancelled dialog must not leave a redeemable proposal behind.
    assert.ok((await pendingRecords(cwd))[0].revoked_at);
  });
});

test('closing stdin while a dialog is open still ends the process', async () => {
  const { cwd, env } = await workspace('engram-mcp-elicit-eof-');
  const client = new FakeClient({ cwd, env, onServerRequest: async () => undefined });
  try {
    await client.initialize({ elicitation: {} });
    client.start('tools/call', { name: 'engram_save_session', arguments: { text: CANDIDATES, scope: 'workspace' } }).promise.catch(() => undefined);
    await client.waitForServerRequest();
    const exited = new Promise((resolve) => client.child.once('close', resolve));
    client.child.stdin.end();
    await Promise.race([exited, new Promise((_, reject) => setTimeout(() => reject(new Error('server did not exit after stdin EOF')), 10000))]);
    assert.equal(await knowledgeCount(cwd), 0);
  } finally {
    await client.close();
    await rm(cwd, { recursive: true, force: true });
  }
});
