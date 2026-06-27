import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { runEngram, tempWorkspace } from '../helpers.mjs';

async function hookJson(cwd, env, args, payload) {
  const result = await runEngram(cwd, env, args, `${JSON.stringify(payload)}\n`);
  assert.equal(result.code, 0, result.stderr);
  return result.stdout.trim() ? JSON.parse(result.stdout) : {};
}

function additionalContext(output) {
  return output?.hookSpecificOutput?.additionalContext ?? '';
}

function proofLine(output) {
  return additionalContext(output).split(/\r?\n/u).find((line) => line.startsWith('Engram proof:')) ?? '';
}

test('set-read supports startup auto always manual and off policies', async () => {
  const { cwd, env } = await tempWorkspace('engram-agent-hooks-read-');
  await runEngram(cwd, env, ['inject', '--no-skillset']);
  for (const mode of ['startup', 'auto', 'always', 'manual', 'off']) {
    const result = await runEngram(cwd, env, ['set-read', mode]);
    assert.equal(result.code, 0, result.stderr);
    assert.match(result.stdout, new RegExp(`Read behavior: ${mode}`));
  }
  const status = await runEngram(cwd, env, ['set-read', 'status']);
  assert.match(status.stdout, /Read behavior: off/);
  await rm(cwd, { recursive: true, force: true });
});

test('install-agent-hooks plan reports supported writes, aliases, and skipped targets', async () => {
  const { cwd, env } = await tempWorkspace('engram-agent-hooks-plan-');
  // install-agent-hooks is now an alias for engram link, which installs skillset files AND agent hooks
  const codex = await runEngram(cwd, env, ['install-agent-hooks', 'codex', '--plan']);
  assert.equal(codex.code, 0, codex.stderr);
  assert.match(codex.stdout, /WRITTEN codex/);
  assert.match(codex.stdout, /PLAN codex/);
  assert.match(codex.stdout, /\.codex[\\/]hooks\.json/);
  assert.match(codex.stdout, /SessionStart, UserPromptSubmit/);

  const alias = await runEngram(cwd, env, ['install-agent-hooks', 'antigravity', '--plan']);
  assert.equal(alias.code, 0, alias.stderr);
  assert.match(alias.stdout, /WRITTEN antigravity/);
  assert.match(alias.stdout, /PLAN gemini/);
  assert.match(alias.stdout, /\.gemini[\\/]settings\.json/);

  // cursor still gets skillset files but no hooks (cursor hooks are unsupported)
  const cursor = await runEngram(cwd, env, ['install-agent-hooks', 'cursor', '--plan']);
  assert.equal(cursor.code, 0, cursor.stderr);
  assert.match(cursor.stdout, /WRITTEN cursor/);
  assert.match(cursor.stdout, /\.cursor[\\/]rules[\\/]engram\.mdc/);

  // opencode gets skillset files AND a hook plugin (opencode has a plugin-based hook system)
  const opencode = await runEngram(cwd, env, ['install-agent-hooks', 'opencode', '--plan']);
  assert.equal(opencode.code, 0, opencode.stderr);
  assert.match(opencode.stdout, /PLAN opencode/);
  assert.match(opencode.stdout, /opencode[\\/]plugins[\\/]engram\.js/);
  assert.match(opencode.stdout, /chat\.message, experimental\.chat\.system\.transform/);
  assert.doesNotMatch(opencode.stdout, /SKIPPED opencode/);
  await rm(cwd, { recursive: true, force: true });
});

test('install-agent-hooks preserves human config and uninstall removes only Engram hooks', async () => {
  const { cwd, env } = await tempWorkspace('engram-agent-hooks-merge-');
  const codexDir = path.join(cwd, '.codex');
  await mkdir(codexDir, { recursive: true });
  const file = path.join(codexDir, 'hooks.json');
  await writeFile(file, `${JSON.stringify({
    hooks: {
      SessionStart: [{
        matcher: 'startup',
        hooks: [{ name: 'human-start', type: 'command', command: 'echo human' }]
      }]
    }
  }, null, 2)}\n`);

  const install = await runEngram(cwd, env, ['install-agent-hooks', 'codex']);
  assert.equal(install.code, 0, install.stderr);
  assert.match(install.stdout, /UPDATED codex/);
  const installed = JSON.parse(await readFile(file, 'utf8'));
  assert.equal(installed.hooks.SessionStart.length, 2);
  assert.equal(installed.hooks.SessionStart[0].hooks[0].name, 'human-start');
  assert.equal(installed.hooks.UserPromptSubmit[0].hooks[0].name, 'engram-auto-load');

  const uninstall = await runEngram(cwd, env, ['uninstall-agent-hooks', 'codex']);
  assert.equal(uninstall.code, 0, uninstall.stderr);
  assert.match(uninstall.stdout, /REMOVED codex/);
  const after = JSON.parse(await readFile(file, 'utf8'));
  assert.deepEqual(after.hooks, {
    SessionStart: [{
      matcher: 'startup',
      hooks: [{ name: 'human-start', type: 'command', command: 'echo human' }]
    }]
  });
  await rm(cwd, { recursive: true, force: true });
});

test('agent-hook runtime injects startup, skips repeated auto signatures, and respects manual/off', async () => {
  const { cwd, env } = await tempWorkspace('engram-agent-hooks-runtime-');
  await runEngram(cwd, env, ['inject', '--no-skillset']);
  await runEngram(cwd, env, ['save', 'knowledge', '--scope', 'workspace', 'Session startup auth tokens refresh before expiry'], 'A\n');

  await runEngram(cwd, env, ['set-read', 'startup']);
  const startup = await hookJson(cwd, env, ['agent-hook', '--host', 'codex'], {
    hook_event_name: 'SessionStart',
    session_id: 's1',
    cwd,
    source: 'startup'
  });
  assert.match(additionalContext(startup), /Session startup auth tokens refresh before expiry/);
  const laterStartupMode = await hookJson(cwd, env, ['agent-hook', '--host', 'codex'], {
    hook_event_name: 'UserPromptSubmit',
    session_id: 's1',
    cwd,
    prompt: 'auth token work'
  });
  assert.equal(additionalContext(laterStartupMode), '');

  await runEngram(cwd, env, ['set-read', 'auto']);
  const firstAuto = await hookJson(cwd, env, ['agent-hook', '--host', 'codex'], {
    hook_event_name: 'UserPromptSubmit',
    session_id: 's2',
    cwd,
    prompt: 'auth token work'
  });
  assert.match(additionalContext(firstAuto), /Session startup auth tokens refresh before expiry/);
  const repeatAuto = await hookJson(cwd, env, ['agent-hook', '--host', 'codex'], {
    hook_event_name: 'UserPromptSubmit',
    session_id: 's2',
    cwd,
    prompt: 'auth token work'
  });
  assert.equal(additionalContext(repeatAuto), '');

  await runEngram(cwd, env, ['set-read', 'manual']);
  const manual = await hookJson(cwd, env, ['agent-hook', '--host', 'codex'], {
    hook_event_name: 'SessionStart',
    session_id: 's3',
    cwd,
    prompt: 'auth token work'
  });
  assert.equal(additionalContext(manual), '');

  await runEngram(cwd, env, ['set-read', 'off']);
  const off = await hookJson(cwd, env, ['agent-hook', '--host', 'gemini'], {
    hook_event_name: 'BeforeAgent',
    session_id: 's4',
    cwd,
    prompt: 'auth token work'
  });
  assert.equal(additionalContext(off), '');
  await rm(cwd, { recursive: true, force: true });
});

test('agent-hook emits compact proof for loaded reused and skipped turns', async () => {
  const { cwd, env } = await tempWorkspace('engram-agent-hooks-proof-');
  await runEngram(cwd, env, ['inject', '--no-skillset']);
  await runEngram(cwd, env, ['save', 'knowledge', '--scope', 'workspace', 'Proof line uses routed Engram memory'], 'A\n');
  await runEngram(cwd, env, ['set-proof', 'compact']);
  await runEngram(cwd, env, ['set-read', 'auto']);

  const first = await hookJson(cwd, env, ['agent-hook', '--host', 'codex'], {
    hook_event_name: 'UserPromptSubmit',
    session_id: 'p1',
    cwd,
    prompt: 'proof routing'
  });
  assert.match(proofLine(first), /Engram proof: loaded/i);
  assert.match(proofLine(first), /\d+\/\d+/);
  assert.match(additionalContext(first), /Proof line uses routed Engram memory/);

  const repeat = await hookJson(cwd, env, ['agent-hook', '--host', 'codex'], {
    hook_event_name: 'UserPromptSubmit',
    session_id: 'p1',
    cwd,
    prompt: 'proof routing'
  });
  assert.match(proofLine(repeat), /reused prior Engram context/i);
  assert.equal(additionalContext(repeat).includes('Proof line uses routed Engram memory'), false);

  await runEngram(cwd, env, ['set-read', 'manual']);
  const manual = await hookJson(cwd, env, ['agent-hook', '--host', 'codex'], {
    hook_event_name: 'UserPromptSubmit',
    session_id: 'p2',
    cwd,
    prompt: 'proof routing'
  });
  assert.match(proofLine(manual), /no Engram load this turn/i);
  assert.match(proofLine(manual), /manual/i);
  await rm(cwd, { recursive: true, force: true });
});

test('agent-hook emits host-specific event names and fails open on bad input', async () => {
  const { cwd, env } = await tempWorkspace('engram-agent-hooks-shapes-');
  await runEngram(cwd, env, ['inject', '--no-skillset']);
  await runEngram(cwd, env, ['save', 'knowledge', '--scope', 'workspace', 'Gemini planning context'], 'A\n');

  const gemini = await hookJson(cwd, env, ['agent-hook', '--host', 'gemini'], {
    hook_event_name: 'BeforeAgent',
    session_id: 'g1',
    cwd,
    prompt: 'gemini planning'
  });
  assert.equal(gemini.hookSpecificOutput.hookEventName, 'BeforeAgent');
  assert.match(gemini.hookSpecificOutput.additionalContext, /Gemini planning context/);

  const bad = await runEngram(cwd, env, ['agent-hook', '--host', 'claude'], '{not json');
  assert.equal(bad.code, 0, bad.stderr);
  assert.equal(bad.stdout.trim(), '{}');
  await rm(cwd, { recursive: true, force: true });
});

test('opencode runtime emits replace retain and clear directives', async () => {
  const { cwd, env } = await tempWorkspace('engram-opencode-runtime-');
  await runEngram(cwd, env, ['inject', '--no-skillset']);
  await runEngram(
    cwd,
    env,
    ['save', 'knowledge', '--scope', 'workspace', 'OpenCode auth context uses routed Engram memory'],
    'A\n'
  );
  await runEngram(cwd, env, ['set-read', 'auto']);

  const first = await hookJson(cwd, env, ['agent-hook', '--host', 'opencode'], {
    hook_event_name: 'UserPromptSubmit',
    session_id: 'oc-1',
    cwd,
    prompt: 'OpenCode auth context'
  });
  assert.equal(first.engramHook.action, 'replace');
  assert.match(additionalContext(first), /OpenCode auth context uses routed Engram memory/);

  const repeated = await hookJson(cwd, env, ['agent-hook', '--host', 'opencode'], {
    hook_event_name: 'UserPromptSubmit',
    session_id: 'oc-1',
    cwd,
    prompt: 'OpenCode auth context'
  });
  assert.equal(repeated.engramHook.action, 'retain');

  await runEngram(cwd, env, ['set-read', 'manual']);
  const manual = await hookJson(cwd, env, ['agent-hook', '--host', 'opencode'], {
    hook_event_name: 'UserPromptSubmit',
    session_id: 'oc-1',
    cwd,
    prompt: 'OpenCode auth context'
  });
  assert.equal(manual.engramHook.action, 'clear');
  await rm(cwd, { recursive: true, force: true });
});

test('install-agent-hooks for gemini/antigravity writes matcher as * for SessionStart and BeforeAgent', async () => {
  const { cwd, env } = await tempWorkspace('engram-agent-hooks-gemini-');
  const geminiDir = path.join(cwd, '.gemini');
  await mkdir(geminiDir, { recursive: true });
  const file = path.join(geminiDir, 'settings.json');

  const install = await runEngram(cwd, env, ['install-agent-hooks', 'gemini']);
  assert.equal(install.code, 0, install.stderr);
  assert.match(install.stdout, /UPDATED gemini/);
  
  const installed = JSON.parse(await readFile(file, 'utf8'));
  assert.equal(installed.hooks.SessionStart[0].matcher, '*');
  assert.equal(installed.hooks.BeforeAgent[0].matcher, '*');
  await rm(cwd, { recursive: true, force: true });
});

import {
  OPENCODE_HOOK_PLUGIN_MARKER,
  renderOpenCodeHookPlugin
} from '../../dist/core/integrations/opencode-hook-plugin.js';

test('generated opencode plugin routes prompts and injects retained context', async () => {
  const source = renderOpenCodeHookPlugin();
  assert.match(source, new RegExp(OPENCODE_HOOK_PLUGIN_MARKER.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  const moduleUrl = `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
  const pluginModule = await import(moduleUrl);

  const payloads = [];
  const responses = [
    { engramHook: { action: 'replace' }, hookSpecificOutput: { additionalContext: 'startup-context' } },
    { engramHook: { action: 'retain' } },
    { engramHook: { action: 'replace' }, hookSpecificOutput: { additionalContext: 'next-context' } },
    { engramHook: { action: 'clear' } }
  ];
  const fakeShell = (strings, ...values) => ({
    nothrow() { return this; },
    async quiet() {
      assert.match(strings.join(''), /engram agent-hook --host opencode/);
      payloads.push(JSON.parse(await values[0].text()));
      return {
        exitCode: 0,
        stdout: Buffer.from(JSON.stringify(responses.shift())),
        stderr: Buffer.alloc(0)
      };
    }
  });

  const hooks = await pluginModule.EngramOpenCodePlugin({
    directory: '/workspace/demo',
    $: fakeShell
  });
  await hooks['chat.message'](
    { sessionID: 'session-1' },
    { parts: [{ type: 'text', text: 'first prompt' }] }
  );
  assert.deepEqual(payloads.map((item) => item.hook_event_name), ['SessionStart', 'UserPromptSubmit']);

  const firstSystem = { system: [] };
  await hooks['experimental.chat.system.transform']({ sessionID: 'session-1' }, firstSystem);
  assert.deepEqual(firstSystem.system, ['startup-context']);

  await hooks['chat.message'](
    { sessionID: 'session-1' },
    { parts: [{ type: 'text', text: 'next prompt' }] }
  );
  const nextSystem = { system: [] };
  await hooks['experimental.chat.system.transform']({ sessionID: 'session-1' }, nextSystem);
  assert.deepEqual(nextSystem.system, ['next-context']);

  await hooks['chat.message'](
    { sessionID: 'session-1' },
    { parts: [{ type: 'text', text: 'manual mode' }] }
  );
  const clearedSystem = { system: [] };
  await hooks['experimental.chat.system.transform']({ sessionID: 'session-1' }, clearedSystem);
  assert.deepEqual(clearedSystem.system, []);

  await hooks.event({
    event: { type: 'session.deleted', properties: { info: { id: 'session-1' } } }
  });
});

test('generated opencode plugin fails open on command and JSON errors', async () => {
  const source = renderOpenCodeHookPlugin();
  const moduleUrl = `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
  const pluginModule = await import(moduleUrl);
  const replies = [
    { exitCode: 0, stdout: JSON.stringify({
      engramHook: { action: 'replace' },
      hookSpecificOutput: { additionalContext: 'stable-context' }
    }) },
    { exitCode: 0, stdout: JSON.stringify({ engramHook: { action: 'retain' } }) },
    { exitCode: 1, stdout: '' },
    { exitCode: 0, stdout: '{invalid json' }
  ];
  const fakeShell = () => ({
    nothrow() { return this; },
    async quiet() {
      const reply = replies.shift();
      return {
        exitCode: reply.exitCode,
        stdout: Buffer.from(reply.stdout),
        stderr: Buffer.alloc(0)
      };
    }
  });
  const hooks = await pluginModule.EngramOpenCodePlugin({ directory: '/workspace/demo', $: fakeShell });
  await hooks['chat.message']({ sessionID: 'session-2' }, { parts: [{ type: 'text', text: 'seed' }] });
  await assert.doesNotReject(
    hooks['chat.message']({ sessionID: 'session-2' }, { parts: [{ type: 'text', text: 'command fails' }] })
  );
  await assert.doesNotReject(
    hooks['chat.message']({ sessionID: 'session-2' }, { parts: [{ type: 'text', text: 'JSON fails' }] })
  );
  const output = { system: [] };
  await hooks['experimental.chat.system.transform']({ sessionID: 'session-2' }, output);
  assert.deepEqual(output.system, ['stable-context']);
});

test('global opencode link installs and unlinks the managed plugin', async () => {
  const { cwd, env } = await tempWorkspace('engram-opencode-global-');
  const agentHome = path.join(cwd, 'agent-home');
  const configHome = path.join(cwd, 'agent-config');
  const globalEnv = {
    ...env,
    ENGRAM_AGENT_HOME: agentHome,
    ENGRAM_AGENT_CONFIG_HOME: configHome
  };
  const pluginFile = path.join(configHome, 'opencode', 'plugins', 'engram.js');

  const linked = await runEngram(cwd, globalEnv, ['link', '--global', 'opencode']);
  assert.equal(linked.code, 0, linked.stderr);
  assert.match(linked.stdout, /UPDATED opencode/);
  assert.match(await readFile(pluginFile, 'utf8'), /EngramOpenCodePlugin/);

  const unlinked = await runEngram(cwd, globalEnv, ['unlink', '--global', 'opencode']);
  assert.equal(unlinked.code, 0, unlinked.stderr);
  assert.match(unlinked.stdout, /REMOVED opencode/);
  await assert.rejects(readFile(pluginFile, 'utf8'));
  await rm(cwd, { recursive: true, force: true });
});

test('opencode link preserves a human plugin unless force is explicit', async () => {
  const { cwd, env } = await tempWorkspace('engram-opencode-human-');
  const configHome = path.join(cwd, 'agent-config');
  const globalEnv = {
    ...env,
    ENGRAM_AGENT_HOME: path.join(cwd, 'agent-home'),
    ENGRAM_AGENT_CONFIG_HOME: configHome
  };
  const pluginFile = path.join(configHome, 'opencode', 'plugins', 'engram.js');
  await mkdir(path.dirname(pluginFile), { recursive: true });
  await writeFile(pluginFile, 'export const HumanPlugin = async () => ({})\n');

  const skipped = await runEngram(cwd, globalEnv, ['link', '--global', 'opencode']);
  assert.equal(skipped.code, 0, skipped.stderr);
  assert.match(skipped.stdout, /SKIPPED opencode/);
  assert.match(await readFile(pluginFile, 'utf8'), /HumanPlugin/);

  const forced = await runEngram(cwd, globalEnv, ['link', '--global', 'opencode', '--force']);
  assert.equal(forced.code, 0, forced.stderr);
  assert.match(await readFile(pluginFile, 'utf8'), /EngramOpenCodePlugin/);
  await rm(cwd, { recursive: true, force: true });
});
