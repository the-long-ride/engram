import test from 'node:test';
import { existsSync } from 'node:fs';
import assert from 'node:assert/strict';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { runEngram, tempWorkspace, workspaceMemoryRoot } from '../helpers.mjs';
import { testMemory } from './fixtures.mjs';

const MANAGED = 'engram-auto-load';

async function hookJson(cwd, env, host, payload) {
  const result = await runEngram(cwd, env, ['agent-hook', '--host', host], `${JSON.stringify(payload)}\n`);
  assert.equal(result.code, 0, result.stderr);
  return result.stdout.trim() ? JSON.parse(result.stdout) : {};
}

function context(output) {
  return output?.hookSpecificOutput?.additionalContext ?? '';
}

async function geminiWorkspace(prefix) {
  const { cwd, env } = await tempWorkspace(prefix);
  await runEngram(cwd, env, ['inject', '--no-skillset']);
  const dir = path.join(workspaceMemoryRoot(cwd), 'knowledge');
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, 'pnpm-install-root.md'), testMemory({ id: 'pnpm-install-root', tags: ['pnpm', 'install'], content: 'Compress body X: run pnpm install from the repository root.' }));
  await runEngram(cwd, env, ['rebuild-index']);
  await runEngram(cwd, env, ['rehash', 'workspace']);
  await runEngram(cwd, env, ['set-read', 'auto']);
  return { cwd, env };
}

function managedHooks(settings, event) {
  return (settings.hooks?.[event] ?? []).flatMap((group) => group.hooks ?? []).filter((hook) => hook.name === MANAGED);
}

test('gemini installs PreCompress, and a PreCompress event resets the delivered set', async () => {
  const { cwd, env } = await geminiWorkspace('engram-gemini-precompress-');
  const linked = await runEngram(cwd, env, ['install-agent-hooks', 'gemini']);
  assert.equal(linked.code, 0, linked.stderr);
  const settings = JSON.parse(await readFile(path.join(cwd, '.gemini', 'settings.json'), 'utf8'));
  assert.equal(managedHooks(settings, 'PreCompress').length, 1);
  assert.equal(settings.hooks.PreCompress[0].matcher, '*');

  const turn = (event, prompt) => hookJson(cwd, env, 'gemini', { hook_event_name: event, session_id: 'g1', cwd, ...(prompt ? { prompt } : {}) });
  assert.match(context(await turn('BeforeAgent', 'pnpm install')), /Compress body X/);
  assert.doesNotMatch(context(await turn('BeforeAgent', 'pnpm install')), /Compress body X/);
  assert.deepEqual(await turn('PreCompress'), {});
  assert.match(context(await turn('BeforeAgent', 'pnpm install')), /Compress body X/, 'PreCompress resets the delivered set');
  await rm(cwd, { recursive: true, force: true });
});

test('gemini installs AfterTool with the file-tool matcher and a millisecond timeout', async () => {
  const { cwd, env } = await tempWorkspace('engram-gemini-aftertool-');
  const installed = await runEngram(cwd, env, ['install-agent-hooks', 'gemini']);
  assert.equal(installed.code, 0, installed.stderr);
  const settings = JSON.parse(await readFile(path.join(cwd, '.gemini', 'settings.json'), 'utf8'));
  assert.equal(managedHooks(settings, 'AfterTool').length, 1);
  assert.equal(settings.hooks.AfterTool[0].matcher, 'read_file|write_file|replace');
  assert.equal(settings.hooks.AfterTool[0].hooks[0].timeout, 10000);
  await rm(cwd, { recursive: true, force: true });
});

test('link gemini and upgrade --latest add AfterTool and PreCompress to an existing Gemini install', async () => {
  for (const command of [['link', 'gemini'], ['upgrade', '--latest', '--yes', '--no-version-check']]) {
    const { cwd, env } = await tempWorkspace('engram-gemini-refresh-');
    await runEngram(cwd, env, ['link', 'gemini']);
    const file = path.join(cwd, '.gemini', 'settings.json');
    const current = JSON.parse(await readFile(file, 'utf8'));
    const hook = managedHooks(current, 'SessionStart')[0];
    // An install from before PreCompress existed, next to user settings.
    await writeFile(file, `${JSON.stringify({
      theme: 'Dracula',
      hooks: {
        SessionStart: [{ matcher: '*', hooks: [hook] }],
        BeforeAgent: [{ matcher: '*', hooks: [hook] }]
      }
    }, null, 2)}\n`);
    const result = await runEngram(cwd, env, command);
    assert.equal(result.code, 0, result.stderr);
    const settings = JSON.parse(await readFile(file, 'utf8'));
    assert.equal(settings.theme, 'Dracula');
    for (const event of ['SessionStart', 'BeforeAgent', 'AfterTool', 'PreCompress']) assert.equal(managedHooks(settings, event).length, 1, `${command[0]}: ${event}`);
    await rm(cwd, { recursive: true, force: true });
  }
});

test('cursor hook timeout is written in seconds and an old millisecond install is corrected', async () => {
  const { cwd, env } = await tempWorkspace('engram-cursor-seconds-');
  const install = await runEngram(cwd, env, ['install-agent-hooks', 'cursor']);
  assert.equal(install.code, 0, install.stderr);
  const file = path.join(cwd, '.cursor', 'hooks.json');
  const hooks = JSON.parse(await readFile(file, 'utf8'));
  const managed = () => hooks.sessionStart.find((entry) => entry.name === MANAGED);
  assert.equal(managed().timeout, 10);

  await writeFile(file, `${JSON.stringify({ sessionStart: [{ ...managed(), timeout: 10000 }] }, null, 2)}\n`);
  const relinked = await runEngram(cwd, env, ['link', 'cursor']);
  assert.equal(relinked.code, 0, relinked.stderr);
  const refreshed = JSON.parse(await readFile(file, 'utf8'));
  assert.equal(refreshed.sessionStart.filter((entry) => entry.name === MANAGED).length, 1);
  assert.equal(refreshed.sessionStart.find((entry) => entry.name === MANAGED).timeout, 10);
  await rm(cwd, { recursive: true, force: true });
});

test('hook installers leave an unparseable host settings file byte-identical', async () => {
  const cases = [
    ['gemini', path.join('.gemini', 'settings.json')],
    ['claude', path.join('.claude', 'settings.json')],
    ['codex', path.join('.codex', 'hooks.json')],
    ['cursor', path.join('.cursor', 'hooks.json')]
  ];
  for (const [host, rel] of cases) {
    const { cwd, env } = await tempWorkspace(`engram-unparseable-${host}-`);
    const file = path.join(cwd, rel);
    await mkdir(path.dirname(file), { recursive: true });
    const broken = '{\n  "theme": "dark",\n  "model": { "name": "pro" \n  oops\n}\n';
    await writeFile(file, broken);
    const linked = await runEngram(cwd, env, ['link', host]);
    assert.equal(await readFile(file, 'utf8'), broken, `${host} settings untouched`);
    assert.match(`${linked.stdout}\n${linked.stderr}`, /could not parse existing file; left untouched/, host);
    const installed = await runEngram(cwd, env, ['install-agent-hooks', host]);
    assert.equal(await readFile(file, 'utf8'), broken, `${host} settings untouched by install-agent-hooks`);
    assert.match(installed.stdout, /SKIPPED/, host);
    await rm(cwd, { recursive: true, force: true });
  }
});

test('hook installers merge into a BOM-prefixed settings file and refuse an unreadable one', async () => {
  const { cwd, env } = await tempWorkspace('engram-bom-settings-');
  const file = path.join(cwd, '.gemini', 'settings.json');
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `﻿${JSON.stringify({ theme: 'dark' })}`);
  const linked = await runEngram(cwd, env, ['link', 'gemini']);
  assert.doesNotMatch(`${linked.stdout}\n${linked.stderr}`, /could not parse existing file/);
  const merged = JSON.parse((await readFile(file, 'utf8')).replace(/^﻿/u, ''));
  assert.equal(merged.theme, 'dark');
  assert.ok(merged.hooks, 'hooks merged');
  await rm(cwd, { recursive: true, force: true });

  // A directory where the settings file should be reads with EISDIR: never treated as an empty config.
  const blocked = await tempWorkspace('engram-unreadable-settings-');
  const dir = path.join(blocked.cwd, '.claude', 'settings.json');
  await mkdir(dir, { recursive: true });
  const result = await runEngram(blocked.cwd, blocked.env, ['link', 'claude']);
  assert.match(`${result.stdout}\n${result.stderr}`, /left untouched|SKIPPED/);
  await rm(blocked.cwd, { recursive: true, force: true });
});

test('link claude and upgrade --latest add SubagentStart to an existing install', async () => {
  for (const [host, rel] of [['claude', path.join('.claude', 'settings.json')], ['codex', path.join('.codex', 'hooks.json')]]) {
    for (const command of [['link', host], ['upgrade', '--latest', '--yes', '--no-version-check']]) {
      const { cwd, env } = await tempWorkspace('engram-subagent-refresh-');
      await runEngram(cwd, env, ['link', host]);
      const file = path.join(cwd, rel);
      const current = JSON.parse(await readFile(file, 'utf8'));
      const hook = managedHooks(current, 'SessionStart')[0];
      // An install from before SubagentStart existed, next to a user setting.
      await writeFile(file, `${JSON.stringify({
        theme: 'Dracula',
        hooks: {
          SessionStart: [{ matcher: '*', hooks: [hook] }],
          UserPromptSubmit: [{ matcher: '', hooks: [hook] }]
        }
      }, null, 2)}\n`);
      const result = await runEngram(cwd, env, command);
      assert.equal(result.code, 0, result.stderr);
      const settings = JSON.parse(await readFile(file, 'utf8'));
      assert.equal(settings.theme, 'Dracula');
      // E13: Claude registers InstructionsLoaded where Codex keeps PreToolUse.
      const events = ['SessionStart', 'UserPromptSubmit', host === 'claude' ? 'InstructionsLoaded' : 'PreToolUse', 'PreCompact', 'SubagentStart'];
      for (const event of events) {
        assert.equal(managedHooks(settings, event).length, 1, `${host} ${command[0]}: ${event}`);
      }
      assert.equal(settings.hooks.SubagentStart[0].matcher, '*');
      assert.equal(managedHooks(settings, 'SubagentStart')[0].timeout, 10);
      await rm(cwd, { recursive: true, force: true });
    }
  }
});

test('link claude|codex --session-end registers SessionEnd; plain link does not', async () => {
  const cases = [
    ['claude', path.join('.claude', 'settings.json'), 5],
    ['codex', path.join('.codex', 'hooks.json'), 3]
  ];
  for (const [host, rel, timeout] of cases) {
    const { cwd, env } = await tempWorkspace(`engram-session-end-${host}-`);
    const file = path.join(cwd, rel);
    const read = async () => JSON.parse(await readFile(file, 'utf8'));
    const plain = await runEngram(cwd, env, ['link', host]);
    assert.equal(plain.code, 0, plain.stderr);
    assert.equal(managedHooks(await read(), 'SessionEnd').length, 0, `${host}: plain link never registers SessionEnd`);

    const opted = await runEngram(cwd, env, ['link', host, '--session-end']);
    assert.equal(opted.code, 0, opted.stderr);
    assert.match(opted.stdout, /SessionEnd/, `${host}: the install result lists the event`);
    const settings = await read();
    const [hook] = managedHooks(settings, 'SessionEnd');
    assert.equal(managedHooks(settings, 'SessionEnd').length, 1, host);
    assert.equal(hook.timeout, timeout, `${host}: timeout is in seconds`);
    assert.equal(hook.type, 'command');
    assert.equal(hook.async, undefined, `${host}: a plain command hook, never async`);
    assert.equal(hook.command, `engram agent-hook --host ${host}`);
    assert.equal(settings.hooks.SessionEnd[0].matcher, '');
    assert.equal(managedHooks(settings, 'SessionStart')[0].timeout, 10, `${host}: other events keep their timeout`);

    // The opt-in is sticky: a plain relink and upgrade neither drop nor duplicate it.
    for (const command of [['link', host], ['upgrade', '--latest', '--yes', '--no-version-check']]) {
      const again = await runEngram(cwd, env, command);
      assert.equal(again.code, 0, again.stderr);
      assert.equal(managedHooks(await read(), 'SessionEnd').length, 1, `${host}: ${command[0]} keeps SessionEnd`);
    }
    const removed = await runEngram(cwd, env, ['unlink', host]);
    assert.equal(removed.code, 0, removed.stderr);
    assert.equal(managedHooks(await read().catch(() => ({})), 'SessionEnd').length, 0, `${host}: unlink removes SessionEnd`);
    await rm(cwd, { recursive: true, force: true });
  }
});

test('link --session-end never registers SessionEnd for Gemini', async () => {
  const { cwd, env } = await tempWorkspace('engram-session-end-gemini-');
  const linked = await runEngram(cwd, env, ['link', 'gemini', '--session-end']);
  assert.equal(linked.code, 0, linked.stderr);
  const settings = JSON.parse(await readFile(path.join(cwd, '.gemini', 'settings.json'), 'utf8'));
  assert.equal(settings.hooks.SessionEnd, undefined);
  await rm(cwd, { recursive: true, force: true });
});

function sessionEnd(cwd, env, host, session, transcript) {
  return hookJson(cwd, env, host, { hook_event_name: 'SessionEnd', session_id: session, cwd, transcript_path: transcript, reason: 'other' });
}

test('SessionEnd handler appends under lock, dedupes, caps at 50, returns {}', async () => {
  const { cwd, env } = await tempWorkspace('engram-session-end-queue-');
  await runEngram(cwd, env, ['inject', '--no-skillset']);
  const root = workspaceMemoryRoot(cwd);
  const queueFile = path.join(root, 'session-queue.json');
  const read = async () => JSON.parse(await readFile(queueFile, 'utf8'));
  const first = path.join(cwd, 'one.jsonl');

  assert.deepEqual(await sessionEnd(cwd, env, 'claude', 's1', first), {});
  const queued = await read();
  assert.equal(queued.version, 1);
  assert.equal(queued.entries.length, 1);
  assert.equal(queued.entries[0].host, 'claude');
  assert.equal(queued.entries[0].session, 's1');
  assert.equal(queued.entries[0].transcript_path, first);
  assert.ok(Number.isFinite(Date.parse(queued.entries[0].at)));

  // Dedupe on (host, session): a repeat replaces the entry, another host keeps its own.
  assert.deepEqual(await sessionEnd(cwd, env, 'claude', 's1', path.join(cwd, 'again.jsonl')), {});
  assert.deepEqual(await sessionEnd(cwd, env, 'codex', 's1', path.join(cwd, 'codex.jsonl')), {});
  const deduped = await read();
  assert.deepEqual(deduped.entries.map((entry) => `${entry.host}:${entry.session}`), ['claude:s1', 'codex:s1']);
  assert.equal(deduped.entries.find((entry) => entry.host === 'claude').transcript_path, path.join(cwd, 'again.jsonl'));

  // Parallel hooks serialize on the lock and lose nothing.
  const sessions = Array.from({ length: 8 }, (_, index) => `par-${index}`);
  await Promise.all(sessions.map((session) => sessionEnd(cwd, env, 'claude', session, path.join(cwd, `${session}.jsonl`))));
  const parallel = await read();
  for (const session of sessions) assert.ok(parallel.entries.some((entry) => entry.session === session), session);

  // An event that is not Claude/Codex, or has no transcript or session, queues nothing.
  const before = JSON.stringify(await read());
  assert.deepEqual(await sessionEnd(cwd, env, 'gemini', 'g1', path.join(cwd, 'g.jsonl')), {});
  assert.deepEqual(await hookJson(cwd, env, 'claude', { hook_event_name: 'SessionEnd', session_id: 'no-path', cwd }), {});
  assert.deepEqual(await hookJson(cwd, env, 'claude', { hook_event_name: 'SessionEnd', cwd, transcript_path: first }), {});
  assert.equal(JSON.stringify(await read()), before);
  await rm(cwd, { recursive: true, force: true });
});

test('session queue keeps the newest 50 entries', async () => {
  const { cwd } = await tempWorkspace('engram-session-end-cap-');
  const root = workspaceMemoryRoot(cwd);
  await mkdir(root, { recursive: true });
  const { enqueueSession, readSessionQueue, SESSION_QUEUE_MAX } = await import('../../dist/core/memory/session-queue.js');
  assert.equal(SESSION_QUEUE_MAX, 50);
  for (let index = 0; index < 60; index += 1) {
    await enqueueSession(root, { transcript_path: path.join(cwd, `t${index}.jsonl`), host: 'claude', session: `s${index}`, at: new Date().toISOString() });
  }
  const entries = await readSessionQueue(root);
  assert.equal(entries.length, 50);
  assert.equal(entries[0].session, 's10', 'the oldest entries are dropped');
  assert.equal(entries.at(-1).session, 's59');
  await rm(cwd, { recursive: true, force: true });
});

test('SessionEnd handler fails open on unwritable root', async () => {
  const { cwd, env } = await tempWorkspace('engram-session-end-open-');
  // No Engram folder: the hook neither queues nor creates one.
  assert.deepEqual(await sessionEnd(cwd, env, 'claude', 's1', path.join(cwd, 't.jsonl')), {});
  assert.equal(existsSync(path.join(cwd, '.agents')), false);

  // A directory where the queue file belongs makes every write fail; the answer is still {}.
  await runEngram(cwd, env, ['inject', '--no-skillset']);
  await mkdir(path.join(workspaceMemoryRoot(cwd), 'session-queue.json'), { recursive: true });
  const blocked = await runEngram(cwd, env, ['agent-hook', '--host', 'claude'], `${JSON.stringify({ hook_event_name: 'SessionEnd', session_id: 's2', cwd, transcript_path: path.join(cwd, 't.jsonl') })}\n`);
  assert.equal(blocked.code, 0, blocked.stderr);
  assert.deepEqual(JSON.parse(blocked.stdout), {});
  await rm(cwd, { recursive: true, force: true });
});
