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
