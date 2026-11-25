/** CLI and runtime tests for closed-loop telemetry, noise decay reporting, and task-scoped SubagentStart routing. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { runEngram, tempWorkspace, workspaceMemoryRoot } from '../helpers.mjs';
import { testMemory } from './fixtures.mjs';
import { queryText } from '../../dist/core/integrations/agent-hook-runtime.js';

async function hookJson(cwd, env, args, payload) {
  const result = await runEngram(cwd, env, args, `${JSON.stringify(payload)}\n`);
  assert.equal(result.code, 0, result.stderr);
  return result.stdout.trim() ? JSON.parse(result.stdout) : {};
}

function additionalContext(output) {
  return output?.hookSpecificOutput?.additionalContext ?? '';
}

function pathMemory({ id, tags, appliesTo, content }) {
  return testMemory({ id, tags, content }).replace('confidence: high\n', `confidence: high\napplies_to: [${appliesTo.join(', ')}]\n`);
}

async function setupWorkspace(prefix) {
  const { cwd, env } = await tempWorkspace(prefix);
  const init = await runEngram(cwd, env, ['inject', '--no-skillset']);
  assert.equal(init.code, 0, init.stderr);
  const root = workspaceMemoryRoot(cwd);
  await mkdir(path.join(root, 'knowledge'), { recursive: true });
  return { cwd, env, root };
}

test('queryText scopes SubagentStart to task prompt and prefixes specialized agent_type', () => {
  assert.equal(queryText({ agent_type: 'Explore' }, 'SubagentStart'), 'current session');
  assert.equal(queryText({ prompt: 'current session', task: 'current task' }, 'SubagentStart'), 'current session');
  assert.equal(queryText({ prompt: 'hi', description: '  ' }, 'SubagentStart'), 'current session');
  assert.equal(
    queryText({ agent_type: 'Explore', prompt: 'Audit stripe webhook idempotency' }, 'SubagentStart'),
    'Audit stripe webhook idempotency'
  );
  assert.equal(
    queryText({ agent_type: 'general-purpose', tool_input: { description: 'Check postgres pool limits' } }, 'SubagentStart'),
    'Check postgres pool limits'
  );
  assert.equal(
    queryText({ agent_type: 'security-reviewer', task: 'Inspect JWT signature verification' }, 'SubagentStart'),
    'security-reviewer: Inspect JWT signature verification'
  );
  assert.equal(queryText({ prompt: 'ignored on session start' }, 'SessionStart'), 'current session');
});

test('agent-hook SubagentStart routes task-scoped memories when prompt is present and falls back to current session', async () => {
  const { cwd, env, root } = await setupWorkspace('engram-subagent-scoped-');
  await writeFile(
    path.join(root, 'knowledge', 'billing-idempotency.md'),
    testMemory({
      id: 'billing-idempotency',
      tags: ['billing', 'stripe', 'idempotency'],
      content: 'Always pass an idempotency key when retrying Stripe billing charges.'
    })
  );
  await writeFile(
    path.join(root, 'knowledge', 'session-brief.md'),
    testMemory({
      id: 'session-brief',
      tags: ['current', 'session', 'workspace'],
      content: 'General session startup brief for this repository.'
    })
  );
  await runEngram(cwd, env, ['rebuild-index']);
  await runEngram(cwd, env, ['rehash', 'workspace']);

  const scoped = await hookJson(cwd, env, ['agent-hook', '--host', 'claude'], {
    hook_event_name: 'SubagentStart',
    session_id: 's-sub',
    agent_id: 'a-billing',
    agent_type: 'billing-auditor',
    prompt: 'Audit stripe billing idempotency retries',
    cwd
  });
  assert.equal(scoped.hookSpecificOutput.hookEventName, 'SubagentStart');
  assert.match(additionalContext(scoped), /idempotency key when retrying Stripe billing charges/);

  const fallback = await hookJson(cwd, env, ['agent-hook', '--host', 'claude'], {
    hook_event_name: 'SubagentStart',
    session_id: 's-sub',
    agent_id: 'a-generic',
    agent_type: 'Explore',
    cwd
  });
  assert.equal(fallback.hookSpecificOutput.hookEventName, 'SubagentStart');
  assert.match(additionalContext(fallback), /General session startup brief/);

  await rm(cwd, { recursive: true, force: true });
});

test('PreToolUse and AfterTool record applied usage on previously delivered path memories', async () => {
  const { cwd, env, root } = await setupWorkspace('engram-telemetry-applied-');
  await writeFile(
    path.join(root, 'knowledge', 'payments-rule.md'),
    pathMemory({
      id: 'payments-rule',
      tags: ['payments', 'stripe'],
      appliesTo: ['src/payments/**'],
      content: 'Payments handlers must validate webhook signatures before processing.'
    })
  );
  await runEngram(cwd, env, ['rebuild-index']);
  await runEngram(cwd, env, ['rehash', 'workspace']);
  const memKey = 'workspace:knowledge/payments-rule.md';

  // Claude PreToolUse #1 delivers the path memory (injected: 1, no applied yet).
  const first = await hookJson(cwd, env, ['agent-hook', '--host', 'claude'], {
    hook_event_name: 'PreToolUse',
    session_id: 's-apply',
    tool_name: 'Read',
    tool_input: { file_path: path.join(cwd, 'src', 'payments', 'charge.ts') },
    cwd
  });
  assert.match(additionalContext(first), /validate webhook signatures/);
  let usage = JSON.parse(await readFile(path.join(root, 'usage.json'), 'utf8'));
  assert.equal(usage[memKey].injected, 1);
  assert.equal(usage[memKey].applied, undefined);

  // Claude PreToolUse #2 touches a matching file after delivery -> records applied: 1.
  await hookJson(cwd, env, ['agent-hook', '--host', 'claude'], {
    hook_event_name: 'PreToolUse',
    session_id: 's-apply',
    tool_name: 'Edit',
    tool_input: { file_path: path.join(cwd, 'src', 'payments', 'refund.ts') },
    cwd
  });
  usage = JSON.parse(await readFile(path.join(root, 'usage.json'), 'utf8'));
  assert.equal(usage[memKey].applied, 1);

  // Gemini AfterTool delivers in its own session, then records applied on the next matching tool call.
  await hookJson(cwd, env, ['agent-hook', '--host', 'gemini'], {
    hook_event_name: 'AfterTool',
    session_id: 'g-apply',
    tool_name: 'read_file',
    tool_input: { file_path: 'src/payments/charge.ts' },
    cwd
  });
  await hookJson(cwd, env, ['agent-hook', '--host', 'gemini'], {
    hook_event_name: 'AfterTool',
    session_id: 'g-apply',
    tool_name: 'write_file',
    tool_input: { file_path: 'src/payments/charge.ts' },
    cwd
  });
  usage = JSON.parse(await readFile(path.join(root, 'usage.json'), 'utf8'));
  assert.equal(usage[memKey].applied, 2);

  await rm(cwd, { recursive: true, force: true });
});

test('UserPromptSubmit records corrected usage only on live prompt corrections for delivered touched path memories', async () => {
  const { cwd, env, root } = await setupWorkspace('engram-telemetry-corrected-');
  await writeFile(
    path.join(root, 'knowledge', 'payments-rule.md'),
    pathMemory({
      id: 'payments-rule',
      tags: ['payments', 'stripe'],
      appliesTo: ['src/payments/**'],
      content: 'Payments handlers must validate webhook signatures before processing.'
    })
  );
  await runEngram(cwd, env, ['rebuild-index']);
  await runEngram(cwd, env, ['rehash', 'workspace']);
  const memKey = 'workspace:knowledge/payments-rule.md';

  // Deliver the memory and record touched path via PreToolUse.
  await hookJson(cwd, env, ['agent-hook', '--host', 'claude'], {
    hook_event_name: 'PreToolUse',
    session_id: 's-corr',
    tool_name: 'Edit',
    tool_input: { file_path: path.join(cwd, 'src', 'payments', 'charge.ts') },
    cwd
  });

  // Ordinary prompt does NOT record corrected.
  await hookJson(cwd, env, ['agent-hook', '--host', 'claude'], {
    hook_event_name: 'UserPromptSubmit',
    session_id: 's-corr',
    prompt: 'Can you summarize what charge.ts does?',
    cwd
  });
  let usage = JSON.parse(await readFile(path.join(root, 'usage.json'), 'utf8'));
  assert.equal(usage[memKey].corrected, undefined);

  // Explicit correction prompt records corrected: 1 on the delivered memory matching touchedPaths.
  await hookJson(cwd, env, ['agent-hook', '--host', 'claude'], {
    hook_event_name: 'UserPromptSubmit',
    session_id: 's-corr',
    prompt: 'Correction: never retry stripe charges without an idempotency key in src/payments.',
    cwd
  });
  usage = JSON.parse(await readFile(path.join(root, 'usage.json'), 'utf8'));
  assert.equal(usage[memKey].corrected, 1);

  await rm(cwd, { recursive: true, force: true });
});

test('stats --usage reports noisy memories in JSON and text output only when present', async () => {
  const { cwd, env, root } = await setupWorkspace('engram-stats-noisy-');
  await writeFile(
    path.join(root, 'usage.json'),
    JSON.stringify({
      'workspace:knowledge/noisy.md': { injected: 25, fetched: 0, last: '2026-03-01T00:00:00.000Z' },
      'workspace:knowledge/applied.md': { injected: 25, fetched: 0, applied: 1, last: '2026-03-01T00:00:00.000Z' },
      'workspace:knowledge/quiet.md': { injected: 4, fetched: 0, last: '2026-03-01T00:00:00.000Z' }
    })
  );

  const jsonRes = await runEngram(cwd, env, ['stats', '--usage', '--json']);
  assert.equal(jsonRes.code, 0, jsonRes.stderr);
  const parsed = JSON.parse(jsonRes.stdout);
  assert.equal(typeof parsed.data.total, 'number');
  assert.ok(Array.isArray(parsed.data.usage.never_fetched));
  assert.deepEqual(parsed.data.usage.noisy.map((row) => row.key), ['workspace:knowledge/noisy.md']);

  const textRes = await runEngram(cwd, env, ['stats', '--usage']);
  assert.equal(textRes.code, 0, textRes.stderr);
  assert.match(textRes.stdout, /Noisy memories \(20\+ injections, 0 utility\):/);
  assert.match(textRes.stdout, /workspace:knowledge\/noisy\.md \(injected 25/);

  // Without noisy memories, the text section is omitted.
  await writeFile(
    path.join(root, 'usage.json'),
    JSON.stringify({
      'workspace:knowledge/applied.md': { injected: 25, fetched: 0, applied: 1, last: '2026-03-01T00:00:00.000Z' }
    })
  );
  const cleanText = await runEngram(cwd, env, ['stats', '--usage']);
  assert.equal(cleanText.code, 0, cleanText.stderr);
  assert.doesNotMatch(cleanText.stdout, /Noisy memories \(20\+ injections, 0 utility\):/);

  await rm(cwd, { recursive: true, force: true });
});
