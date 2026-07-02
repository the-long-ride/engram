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

  // cursor gets skillset files and hook support
  const cursor = await runEngram(cwd, env, ['install-agent-hooks', 'cursor', '--plan']);
  assert.equal(cursor.code, 0, cursor.stderr);
  assert.match(cursor.stdout, /WRITTEN cursor/);
  assert.match(cursor.stdout, /\.cursor[\\/]rules[\\/]engram\.mdc/);
  assert.match(cursor.stdout, /PLAN cursor/);

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

test('install-agent-hooks supports JSONC-style human config and preserves unrelated settings', async () => {
  const { cwd, env } = await tempWorkspace('engram-agent-hooks-jsonc-');
  const codexDir = path.join(cwd, '.codex');
  await mkdir(codexDir, { recursive: true });
  const file = path.join(codexDir, 'hooks.json');
  await writeFile(file, [
    '{',
    '  // keep human hooks',
    '  "theme": "dark",',
    '  "hooks": {',
    '    "SessionStart": [',
    '      {',
    '        "matcher": "startup",',
    '        "hooks": [',
    '          { "name": "human-start", "type": "command", "command": "echo human" },',
    '        ]',
    '      },',
    '    ]',
    '  },',
    '}',
    ''
  ].join('\n'));

  const install = await runEngram(cwd, env, ['install-agent-hooks', 'codex']);
  assert.equal(install.code, 0, install.stderr);
  const installed = JSON.parse(await readFile(file, 'utf8'));
  assert.equal(installed.theme, 'dark');
  assert.equal(installed.hooks.SessionStart[0].hooks[0].name, 'human-start');
  assert.equal(installed.hooks.UserPromptSubmit[0].hooks[0].name, 'engram-auto-load');

  const uninstall = await runEngram(cwd, env, ['uninstall-agent-hooks', 'codex']);
  assert.equal(uninstall.code, 0, uninstall.stderr);
  const after = JSON.parse(await readFile(file, 'utf8'));
  assert.equal(after.theme, 'dark');
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

test('workspace opencode link installs managed plugin hook path', async () => {
  const { cwd, env } = await tempWorkspace('engram-opencode-workspace-plugin-');
  const linked = await runEngram(cwd, env, ['link', 'opencode']);
  assert.equal(linked.code, 0, linked.stderr);
  const pluginFile = path.join(cwd, '.opencode', 'plugins', 'engram.js');
  assert.match(await readFile(pluginFile, 'utf8'), /EngramOpenCodePlugin/);
  assert.doesNotMatch(linked.stdout, /\.opencode[\\\/]hooks\.json/);
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

test('cursor hook install writes sessionStart command hook and no beforeSubmitPrompt', async () => {
  const { cwd, env } = await tempWorkspace('engram-cursor-hooks-');
  const cursorDir = path.join(cwd, '.cursor');
  await mkdir(cursorDir, { recursive: true });

  const install = await runEngram(cwd, env, ['install-agent-hooks', 'cursor']);
  assert.equal(install.code, 0, install.stderr);
  assert.match(install.stdout, /UPDATED cursor/);

  const hooks = JSON.parse(await readFile(path.join(cursorDir, 'hooks.json'), 'utf8'));
  assert.ok(Array.isArray(hooks.sessionStart), 'should have sessionStart array');
  assert.ok(
    hooks.sessionStart.some((h) => isObject(h) && h.name === 'engram-auto-load'),
    'sessionStart should contain a managed engram hook'
  );
  assert.ok(!hooks.beforeSubmitPrompt, 'should not add beforeSubmitPrompt context injection');

  await rm(cwd, { recursive: true, force: true });
});

test('cursor hook install preserves user hooks and uninstall removes only engram entries', async () => {
  const { cwd, env } = await tempWorkspace('engram-cursor-hooks-merge-');
  const cursorDir = path.join(cwd, '.cursor');
  await mkdir(cursorDir, { recursive: true });
  const hooksFile = path.join(cursorDir, 'hooks.json');
  await writeFile(hooksFile, JSON.stringify({
    sessionStart: [{ name: 'user-start', type: 'command', command: 'echo hi' }]
  }, null, 2) + '\n');

  const install = await runEngram(cwd, env, ['install-agent-hooks', 'cursor']);
  assert.equal(install.code, 0, install.stderr);
  const installed = JSON.parse(await readFile(hooksFile, 'utf8'));
  assert.ok(installed.sessionStart.some((h) => h.name === 'user-start'));
  assert.ok(installed.sessionStart.some((h) => h.name === 'engram-auto-load'));

  const uninstall = await runEngram(cwd, env, ['uninstall-agent-hooks', 'cursor']);
  assert.equal(uninstall.code, 0, uninstall.stderr);
  const after = JSON.parse(await readFile(hooksFile, 'utf8'));
  assert.ok(after.sessionStart.some((h) => h.name === 'user-start'));
  assert.ok(!after.sessionStart.some((h) => h.name === 'engram-auto-load'));

  await rm(cwd, { recursive: true, force: true });
});

test('windsurf hook install writes pre_user_prompt hook', async () => {
  const { cwd, env } = await tempWorkspace('engram-windsurf-hooks-');
  const windsurfDir = path.join(cwd, '.windsurf');
  await mkdir(windsurfDir, { recursive: true });

  const install = await runEngram(cwd, env, ['install-agent-hooks', 'windsurf']);
  assert.equal(install.code, 0, install.stderr);
  assert.match(install.stdout, /UPDATED windsurf/);

  const hooks = JSON.parse(await readFile(path.join(windsurfDir, 'hooks.json'), 'utf8'));
  assert.ok(Array.isArray(hooks.pre_user_prompt));
  assert.ok(
    hooks.pre_user_prompt.some((h) =>
      isObject(h) && (h.command?.includes('engram') || h.powershell?.includes('engram'))
    ),
    'pre_user_prompt should contain engram hook'
  );

  await rm(cwd, { recursive: true, force: true });
});

test('windsurf hook uninstall removes only engram entries', async () => {
  const { cwd, env } = await tempWorkspace('engram-windsurf-hooks-un-');
  const windsurfDir = path.join(cwd, '.windsurf');
  await mkdir(windsurfDir, { recursive: true });
  const hooksFile = path.join(windsurfDir, 'hooks.json');
  await writeFile(hooksFile, JSON.stringify({
    pre_user_prompt: [{ command: 'echo human', type: 'command' }]
  }, null, 2) + '\n');

  await runEngram(cwd, env, ['install-agent-hooks', 'windsurf']);
  const installed = JSON.parse(await readFile(hooksFile, 'utf8'));
  assert.ok(installed.pre_user_prompt.length >= 2);

  await runEngram(cwd, env, ['uninstall-agent-hooks', 'windsurf']);
  const after = JSON.parse(await readFile(hooksFile, 'utf8'));
  assert.ok(after.pre_user_prompt.some((h) => h.command === 'echo human'));
  assert.ok(!after.pre_user_prompt.some((h) => h.command?.includes('engram') || h.powershell?.includes('engram')));

  await rm(cwd, { recursive: true, force: true });
});

test('cascade is accepted as windsurf hook alias', async () => {
  const { cwd, env } = await tempWorkspace('engram-cascade-hooks-');
  const windsurfDir = path.join(cwd, '.windsurf');
  await mkdir(windsurfDir, { recursive: true });
  const install = await runEngram(cwd, env, ['install-agent-hooks', 'cascade']);
  assert.equal(install.code, 0, install.stderr);
  assert.match(install.stdout, /UPDATED windsurf/);
  await rm(cwd, { recursive: true, force: true });
});

test('cursor hook runtime injects context via additional_context on sessionStart', async () => {
  const { cwd, env } = await tempWorkspace('engram-cursor-runtime-');
  await runEngram(cwd, env, ['inject', '--no-skillset']);
  await runEngram(cwd, env, ['save', 'knowledge', '--scope', 'workspace', 'Cursor startup context test'], 'A\n');
  await runEngram(cwd, env, ['set-read', 'startup']);
  const result = await hookJson(cwd, env, ['agent-hook', '--host', 'cursor'], {
    hook_event_name: 'sessionStart',
    session_id: 'c1',
    cwd,
    source: 'cursor'
  });
  assert.ok(result.additional_context !== undefined || result.hookSpecificOutput?.additionalContext !== undefined,
    'cursor sessionStart should emit additional_context or hookSpecificOutput.additionalContext');
  await rm(cwd, { recursive: true, force: true });
});

test('cursor hook install is idempotent - re-install does not duplicate entries', async () => {
  const { cwd, env } = await tempWorkspace('engram-cursor-hooks-idempotent-');
  const cursorDir = path.join(cwd, '.cursor');
  await mkdir(cursorDir, { recursive: true });

  await runEngram(cwd, env, ['install-agent-hooks', 'cursor']);
  await runEngram(cwd, env, ['install-agent-hooks', 'cursor']);
  const hooks = JSON.parse(await readFile(path.join(cursorDir, 'hooks.json'), 'utf8'));

  assert.equal(
    hooks.sessionStart.filter((h) => h.name === 'engram-auto-load').length,
    1,
    'should have exactly one engram entry after double install'
  );

  await rm(cwd, { recursive: true, force: true });
});

test('windsurf hook install is idempotent - re-install does not duplicate entries', async () => {
  const { cwd, env } = await tempWorkspace('engram-windsurf-hooks-idempotent-');
  const windsurfDir = path.join(cwd, '.windsurf');
  await mkdir(windsurfDir, { recursive: true });

  await runEngram(cwd, env, ['install-agent-hooks', 'windsurf']);
  await runEngram(cwd, env, ['install-agent-hooks', 'windsurf']);
  const hooks = JSON.parse(await readFile(path.join(windsurfDir, 'hooks.json'), 'utf8'));

  assert.equal(
    hooks.pre_user_prompt.filter((h) =>
      (h.command ?? h.powershell ?? '').includes('engram agent-hook --host windsurf')
    ).length,
    1,
    'should have exactly one engram entry after double install'
  );

  await rm(cwd, { recursive: true, force: true });
});

test('cursor hook runtime only responds to sessionStart event', async () => {
  const { cwd, env } = await tempWorkspace('engram-cursor-runtime-event-');
  await runEngram(cwd, env, ['inject', '--no-skillset']);
  await runEngram(cwd, env, ['save', 'knowledge', '--scope', 'workspace', 'Cursor event filtering test'], 'A\n');
  await runEngram(cwd, env, ['set-read', 'auto']);

  const sessionStart = await hookJson(cwd, env, ['agent-hook', '--host', 'cursor'], {
    hook_event_name: 'sessionStart',
    session_id: 'ce1',
    cwd,
    source: 'cursor'
  });
  assert.ok(
    sessionStart.additional_context !== undefined ||
    sessionStart.hookSpecificOutput?.additionalContext !== undefined,
    'cursor should respond to sessionStart'
  );

  const badEvent = await hookJson(cwd, env, ['agent-hook', '--host', 'cursor'], {
    hook_event_name: 'UserPromptSubmit',
    session_id: 'ce1',
    cwd,
    prompt: 'should be ignored'
  });
  const badCtx = badEvent.additional_context ?? badEvent.hookSpecificOutput?.additionalContext ?? '';
  assert.equal(badCtx, '', 'cursor should not respond to UserPromptSubmit');

  await rm(cwd, { recursive: true, force: true });
});

test('windsurf hook runtime responds to pre_user_prompt and extracts query from tool_info', async () => {
  const { cwd, env } = await tempWorkspace('engram-windsurf-runtime-');
  await runEngram(cwd, env, ['inject', '--no-skillset']);
  await runEngram(cwd, env, ['save', 'knowledge', '--scope', 'workspace', 'Windsurf prompt context test'], 'A\n');
  await runEngram(cwd, env, ['set-read', 'auto']);
  await runEngram(cwd, env, ['set-proof', 'compact']);

  const result = await hookJson(cwd, env, ['agent-hook', '--host', 'windsurf'], {
    agent_action_name: 'pre_user_prompt',
    session_id: `w-runtime-${Date.now()}`,
    cwd,
    tool_info: { user_prompt: 'windsurf prompt context' }
  });
  assert.ok(result.proof !== undefined, 'windsurf should emit proof on pre_user_prompt');
  assert.match(result.proof, /Engram proof:/);

  const nonWindsurfEvent = await hookJson(cwd, env, ['agent-hook', '--host', 'windsurf'], {
    hook_event_name: 'UserPromptSubmit',
    session_id: 'w1',
    cwd,
    prompt: 'should be ignored'
  });
  assert.deepEqual(nonWindsurfEvent, {}, 'windsurf should not respond to UserPromptSubmit');

  await rm(cwd, { recursive: true, force: true });
});

test('windsurf hook runtime respects manual and off read modes', async () => {
  const { cwd, env } = await tempWorkspace('engram-windsurf-readmodes-');
  await runEngram(cwd, env, ['inject', '--no-skillset']);
  await runEngram(cwd, env, ['save', 'knowledge', '--scope', 'workspace', 'Windsurf read mode test'], 'A\n');
  await runEngram(cwd, env, ['set-proof', 'compact']);

  await runEngram(cwd, env, ['set-read', 'manual']);
  const manual = await hookJson(cwd, env, ['agent-hook', '--host', 'windsurf'], {
    agent_action_name: 'pre_user_prompt',
    session_id: 'wm1',
    cwd,
    tool_info: { user_prompt: 'test query' }
  });
  assert.ok(!manual.hookSpecificOutput, 'manual mode should not emit hookSpecificOutput');
  assert.match(manual.proof, /manual/, 'manual mode proof should mention manual');

  await runEngram(cwd, env, ['set-read', 'off']);
  const off = await hookJson(cwd, env, ['agent-hook', '--host', 'windsurf'], {
    agent_action_name: 'pre_user_prompt',
    session_id: 'wm2',
    cwd,
    tool_info: { user_prompt: 'test query' }
  });
  assert.ok(!off.hookSpecificOutput, 'off mode should not emit hookSpecificOutput');
  assert.match(off.proof, /read mode off/, 'off mode proof should mention off');

  await rm(cwd, { recursive: true, force: true });
});

test('cursor hook runtime extracts additional_context from hookSpecificOutput', async () => {
  const { cwd, env } = await tempWorkspace('engram-cursor-cwd-');
  await runEngram(cwd, env, ['inject', '--no-skillset']);
  await runEngram(cwd, env, ['save', 'knowledge', '--scope', 'workspace', 'Cursor cwd payload test'], 'A\n');
  await runEngram(cwd, env, ['set-read', 'always']);

  const result = await hookJson(cwd, env, ['agent-hook', '--host', 'cursor'], {
    hook_event_name: 'sessionStart',
    session_id: 'cc1',
    cwd,
    source: 'cursor'
  });
  assert.ok('additional_context' in result, 'cursor should return additional_context at top level');
  assert.equal(result.hookSpecificOutput, undefined, 'cursor should not return nested hookSpecificOutput');

  await rm(cwd, { recursive: true, force: true });
});

test('normalizeTarget resolves cursor windsurf and cascade correctly', async () => {
  const { normalizeTarget } = await import('../../dist/core/integrations/agent-hooks.js');
  assert.equal(normalizeTarget('cursor'), 'cursor');
  assert.equal(normalizeTarget('windsurf'), 'windsurf');
  assert.equal(normalizeTarget('cascade'), 'windsurf');
  assert.equal(normalizeTarget('open-code'), 'opencode');
  assert.equal(normalizeTarget('antigravity'), 'gemini');
  const unsupported = normalizeTarget('copilot');
  assert.ok(typeof unsupported === 'object' && unsupported.target === 'copilot', 'copilot should be unsupported');
});

test('windsurf hook entry has powershell field on win32 platform', async () => {
  const { cwd, env } = await tempWorkspace('engram-windsurf-powershell-');
  const windsurfDir = path.join(cwd, '.windsurf');
  await mkdir(windsurfDir, { recursive: true });

  await runEngram(cwd, env, ['install-agent-hooks', 'windsurf']);
  const hooks = JSON.parse(await readFile(path.join(windsurfDir, 'hooks.json'), 'utf8'));
  const entry = hooks.pre_user_prompt.find((h) =>
    (h.command ?? h.powershell ?? '').includes('engram agent-hook --host windsurf')
  );
  assert.ok(entry, 'should find engram entry');
  if (process.platform === 'win32') {
    assert.ok(entry.powershell, 'win32 should have powershell field');
    assert.match(entry.powershell, /engram agent-hook --host windsurf/);
  } else {
    assert.ok(entry.command, 'non-win32 should have command field');
  }

  await rm(cwd, { recursive: true, force: true });
});

test('cursor sessionStart (lowercase) works in startup read mode - case normalization fix', async () => {
  const { cwd, env } = await tempWorkspace('engram-cursor-case-');
  await runEngram(cwd, env, ['inject', '--no-skillset']);
  await runEngram(cwd, env, ['save', 'knowledge', '--scope', 'workspace', 'Cursor lowercase session start event'], 'A\n');
  await runEngram(cwd, env, ['set-read', 'startup']);

  const lowerResult = await hookJson(cwd, env, ['agent-hook', '--host', 'cursor'], {
    hook_event_name: 'sessionStart',
    session_id: 'lc1',
    cwd,
    source: 'cursor'
  });
  const lowerCtx = lowerResult.additional_context ?? '';
  assert.match(lowerCtx, /Cursor lowercase session start event/, 'cursor lowercase sessionStart should inject context in startup mode');

  const upperResult = await hookJson(cwd, env, ['agent-hook', '--host', 'codex'], {
    hook_event_name: 'SessionStart',
    session_id: 'uc1',
    cwd,
    source: 'codex'
  });
  assert.match(additionalContext(upperResult), /Cursor lowercase session start event/, 'codex uppercase SessionStart should inject context in startup mode');

  await rm(cwd, { recursive: true, force: true });
});

test('windsurf pre_user_prompt returns proof-only output, not AI context', async () => {
  const { cwd, env } = await tempWorkspace('engram-windsurf-proof-');
  await runEngram(cwd, env, ['inject', '--no-skillset']);
  await runEngram(cwd, env, ['save', 'knowledge', '--scope', 'workspace', 'Windsurf proof only test'], 'A\n');
  await runEngram(cwd, env, ['set-read', 'auto']);
  await runEngram(cwd, env, ['set-proof', 'compact']);

  const result = await hookJson(cwd, env, ['agent-hook', '--host', 'windsurf'], {
    agent_action_name: 'pre_user_prompt',
    session_id: 'wp1',
    cwd,
    tool_info: { user_prompt: 'windsurf proof audit' }
  });
  assert.ok(!result.hookSpecificOutput, 'windsurf should NOT emit hookSpecificOutput (no AI context injection)');
  assert.ok(result.proof !== undefined, 'windsurf should emit proof field for audit');
  assert.match(result.proof, /Engram proof:/, 'proof field should contain proof line');

  await rm(cwd, { recursive: true, force: true });
});

test('cascade alias global unlink normalizes to windsurf registry key', async () => {
  const { cwd, env } = await tempWorkspace('engram-cascade-unlink-');
  const agentHome = path.join(cwd, 'agent-home');
  const globalEnv = { ...env, ENGRAM_AGENT_HOME: agentHome, ENGRAM_AGENT_CONFIG_HOME: path.join(cwd, 'agent-config') };
  await runEngram(cwd, globalEnv, ['link', '--global', 'cascade']);

  const unlinkResult = await runEngram(cwd, globalEnv, ['unlink', '--global', 'cascade']);
  assert.equal(unlinkResult.code, 0, unlinkResult.stderr);
  assert.doesNotMatch(unlinkResult.stdout, /not registered/, 'cascade should normalize to windsurf for registry lookup');

  await rm(cwd, { recursive: true, force: true });
});

function isObject(v) {
  return Boolean(v) && typeof v === 'object' && !Array.isArray(v);
}
