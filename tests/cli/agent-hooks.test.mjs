import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { runEngram, tempWorkspace, workspaceMemoryRoot } from '../helpers.mjs';
import { testMemory } from './fixtures.mjs';

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
  assert.match(codex.stdout, /SessionStart, UserPromptSubmit, PreToolUse, PreCompact/);

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

test('agent-hook runtime injects startup, skips repeated auto bodies, and respects manual/off', async () => {
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
  // D7: a repeat turn re-injects no body; with proof off only the `already loaded:` line remains.
  assert.doesNotMatch(additionalContext(repeatAuto), /Session startup auth tokens refresh before expiry/);
  assert.match(additionalContext(repeatAuto), /^already loaded: \S+$/);

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

test('agent hook loads workspace profile memory instead of active user profile memory', async () => {
  const { cwd, env } = await tempWorkspace('engram-agent-hook-profile-isolation-');
  const personalRoot = path.join(cwd, 'profiles', 'personal');
  const companyRoot = path.join(cwd, 'profiles', 'company');

  assert.equal((await runEngram(cwd, env, ['profile', 'create', 'personal', '--global-path', personalRoot])).code, 0);
  assert.equal((await runEngram(cwd, env, ['profile', 'create', 'company', '--global-path', companyRoot])).code, 0);
  assert.equal((await runEngram(cwd, env, ['profile', 'use', 'personal', '--user'])).code, 0);
  assert.equal((await runEngram(cwd, env, ['inject', '--no-skillset'])).code, 0);
  assert.equal((await runEngram(cwd, env, ['profile', 'use', 'company', '--workspace'])).code, 0);
  assert.equal((await runEngram(cwd, env, ['profile', 'use', 'personal', '--user'])).code, 0);

  assert.equal((await runEngram(
    cwd,
    env,
    ['save', '--profile', 'personal', '--scope', 'global', 'knowledge', 'Personal amber profile marker'],
    'A\n'
  )).code, 0);
  assert.equal((await runEngram(
    cwd,
    env,
    ['save', '--profile', 'company', '--scope', 'global', 'knowledge', 'Workspace cobalt profile marker'],
    'A\n'
  )).code, 0);
  assert.equal((await runEngram(cwd, env, ['set-read', 'always'])).code, 0);

  const output = await hookJson(cwd, env, ['agent-hook', '--host', 'codex'], {
    hook_event_name: 'UserPromptSubmit',
    session_id: 'profile-isolation-1',
    cwd,
    prompt: 'workspace cobalt profile marker'
  });
  assert.match(additionalContext(output), /Workspace cobalt profile marker/);
  assert.doesNotMatch(additionalContext(output), /Personal amber profile marker/);

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

// D7 fixture: X answers "pnpm install"; a broader prompt routes to X and Y.
const DELTA_X = 'pnpm-install-root';
const DELTA_Y = 'lockfile-drift-check';

async function deltaWorkspace(prefix) {
  const { cwd, env } = await tempWorkspace(prefix);
  await runEngram(cwd, env, ['inject', '--no-skillset']);
  const dir = path.join(workspaceMemoryRoot(cwd), 'knowledge');
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, `${DELTA_X}.md`), testMemory({ id: DELTA_X, tags: ['pnpm', 'install'], content: 'Delta body X: run pnpm install from the repository root.' }));
  await writeFile(path.join(dir, `${DELTA_Y}.md`), testMemory({ id: DELTA_Y, tags: ['lockfile', 'drift'], content: 'Delta body Y: check lockfile drift before merging.' }));
  await runEngram(cwd, env, ['rebuild-index']);
  await runEngram(cwd, env, ['rehash', 'workspace']);
  await runEngram(cwd, env, ['set-read', 'auto']);
  await runEngram(cwd, env, ['set-proof', 'compact']);
  return { cwd, env };
}

function deltaTurn(cwd, env, session, prompt, event = 'UserPromptSubmit') {
  return hookJson(cwd, env, ['agent-hook', '--host', 'claude'], { hook_event_name: event, session_id: session, cwd, ...(prompt ? { prompt } : {}) });
}

function hookCacheFile(cwd) {
  return path.join(workspaceMemoryRoot(cwd), 'agent-hook-cache.json');
}

test('agent-hook injects only undelivered bodies per session and collapses repeats into already loaded', async () => {
  const { cwd, env } = await deltaWorkspace('engram-agent-hooks-delta-');

  const first = await deltaTurn(cwd, env, 'd1', 'pnpm install');
  assert.match(additionalContext(first), /Delta body X/);
  assert.doesNotMatch(additionalContext(first), /Delta body Y/);
  assert.match(proofLine(first), /Engram proof: loaded/);
  const usage = JSON.parse(await readFile(path.join(workspaceMemoryRoot(cwd), 'usage.json'), 'utf8'));
  assert.equal(usage[`workspace:knowledge/${DELTA_X}.md`].injected, 1);

  const second = await deltaTurn(cwd, env, 'd1', 'pnpm install');
  assert.doesNotMatch(additionalContext(second), /Delta body X/);
  assert.match(additionalContext(second), new RegExp(`already loaded: ${DELTA_X}`));
  assert.match(proofLine(second), /reused prior Engram context/);
  const usageAfter = JSON.parse(await readFile(path.join(workspaceMemoryRoot(cwd), 'usage.json'), 'utf8'));
  assert.equal(usageAfter[`workspace:knowledge/${DELTA_X}.md`].injected, 1, 'a reused turn records no new injection');

  const third = await deltaTurn(cwd, env, 'd1', 'pnpm install lockfile drift');
  assert.match(additionalContext(third), /Delta body Y/);
  assert.doesNotMatch(additionalContext(third), /Delta body X/);
  assert.match(additionalContext(third), new RegExp(`already loaded: ${DELTA_X}`));

  // Another session keeps its own delivered set.
  const other = await deltaTurn(cwd, env, 'd2', 'pnpm install');
  assert.match(additionalContext(other), /Delta body X/);
  await rm(cwd, { recursive: true, force: true });
});

test('agent-hook SessionStart and PreCompact reset the delivered set', async () => {
  const { cwd, env } = await deltaWorkspace('engram-agent-hooks-reset-');
  assert.match(additionalContext(await deltaTurn(cwd, env, 'r1', 'pnpm install')), /Delta body X/);
  assert.doesNotMatch(additionalContext(await deltaTurn(cwd, env, 'r1', 'pnpm install')), /Delta body X/);

  await deltaTurn(cwd, env, 'r1', undefined, 'SessionStart');
  assert.match(additionalContext(await deltaTurn(cwd, env, 'r1', 'pnpm install')), /Delta body X/, 'SessionStart resets');
  assert.doesNotMatch(additionalContext(await deltaTurn(cwd, env, 'r1', 'pnpm install')), /Delta body X/);

  await deltaTurn(cwd, env, 'r1', undefined, 'PreCompact');
  assert.match(additionalContext(await deltaTurn(cwd, env, 'r1', 'pnpm install')), /Delta body X/, 'PreCompact resets');
  await rm(cwd, { recursive: true, force: true });
});

test('agent-hook read always re-injects eligible bodies on every prompt', async () => {
  const { cwd, env } = await deltaWorkspace('engram-agent-hooks-always-delta-');
  await runEngram(cwd, env, ['set-read', 'always']);
  assert.match(additionalContext(await deltaTurn(cwd, env, 'a1', 'pnpm install')), /Delta body X/);
  const repeat = await deltaTurn(cwd, env, 'a1', 'pnpm install');
  assert.match(additionalContext(repeat), /Delta body X/, 'always ignores the delivered set');
  assert.doesNotMatch(additionalContext(repeat), /already loaded:/);
  assert.match(proofLine(repeat), /Engram proof: loaded/);
  // Switching back to auto restores delta semantics for the same session.
  await runEngram(cwd, env, ['set-read', 'auto']);
  assert.doesNotMatch(additionalContext(await deltaTurn(cwd, env, 'a1', 'pnpm install')), /Delta body X/);
  await rm(cwd, { recursive: true, force: true });
});

test('agent-hook prunes stale and excess session records', async () => {
  const { cwd, env } = await deltaWorkspace('engram-agent-hooks-prune-');
  const now = Date.now();
  const records = {};
  for (let i = 0; i < 250; i += 1) {
    records[`claude:fresh:${i}`] = { delivered: ['workspace:knowledge/x.md'], updated: new Date(now - i * 60_000).toISOString() };
  }
  for (let i = 0; i < 20; i += 1) {
    records[`claude:stale:${i}`] = { delivered: [], updated: new Date(now - (8 + i) * 864e5).toISOString() };
  }
  records['claude:legacy:0'] = { host: 'claude', cwd, sessionId: 'old', promptHash: 'x', routedSignature: 'y' };
  await writeFile(hookCacheFile(cwd), JSON.stringify({ records }));

  assert.match(additionalContext(await deltaTurn(cwd, env, 'p-new', 'pnpm install')), /Delta body X/);
  const cache = JSON.parse(await readFile(hookCacheFile(cwd), 'utf8'));
  const kept = Object.entries(cache.records);
  assert.ok(kept.length <= 200, `kept ${kept.length}`);
  const cutoff = Date.now() - 7 * 864e5;
  for (const [key, record] of kept) {
    assert.ok(Date.parse(record.updated) >= cutoff, `${key} is fresh`);
    assert.ok(Array.isArray(record.delivered), `${key} has delivered`);
  }
  assert.ok(kept.some(([key, record]) => key.endsWith(':p-new') && record.delivered.includes(`workspace:knowledge/${DELTA_X}.md`)));
  // The cap drops the oldest records first.
  assert.ok(cache.records['claude:fresh:0'], 'newest pre-existing record kept');
  assert.equal(cache.records['claude:fresh:249'], undefined, 'oldest fresh record dropped');
  assert.equal(cache.records['claude:legacy:0'], undefined, 'legacy signature record dropped');
  await rm(cwd, { recursive: true, force: true });
});

test('agent-hook fails open on a corrupt session cache', async () => {
  const { cwd, env } = await deltaWorkspace('engram-agent-hooks-corrupt-');
  await writeFile(hookCacheFile(cwd), '{not json');
  assert.match(additionalContext(await deltaTurn(cwd, env, 'c1', 'pnpm install')), /Delta body X/);
  await writeFile(hookCacheFile(cwd), JSON.stringify({ records: { x: 'bad', y: null } }));
  assert.match(additionalContext(await deltaTurn(cwd, env, 'c2', 'pnpm install')), /Delta body X/);
  await rm(cwd, { recursive: true, force: true });
});

// Six memories routed by one tag: more than expand_top (3), so the pack has bodies and cards.
async function proofcountWorkspace(prefix) {
  const { cwd, env } = await tempWorkspace(prefix);
  await runEngram(cwd, env, ['inject', '--no-skillset']);
  const dir = path.join(workspaceMemoryRoot(cwd), 'knowledge');
  await mkdir(dir, { recursive: true });
  for (let i = 0; i < 6; i += 1) {
    const id = `proofcount-memory-${i}`;
    await writeFile(path.join(dir, `${id}.md`), testMemory({ id, tags: ['proofcount'], content: `${id} body.` }));
  }
  await runEngram(cwd, env, ['rebuild-index']);
  await runEngram(cwd, env, ['rehash', 'workspace']);
  await runEngram(cwd, env, ['set-load-limit', '6']);
  await runEngram(cwd, env, ['set-read', 'auto']);
  await runEngram(cwd, env, ['set-proof', 'compact']);
  return { cwd, env };
}

test('agent-hook delivered bodies keep their expansion slots, so a repeated prompt never drains its cards', async () => {
  const { cwd, env } = await proofcountWorkspace('engram-agent-hooks-slots-');
  const turn = () => hookJson(cwd, env, ['agent-hook', '--host', 'claude'], { hook_event_name: 'UserPromptSubmit', session_id: 's1', cwd, prompt: 'proofcount' });
  const bodies = (output) => [...additionalContext(output).matchAll(/proofcount-memory-\d body\./g)].length;

  const first = await turn();
  assert.equal(bodies(first), 3, additionalContext(first));
  assert.match(additionalContext(first), /^related:$/m);
  for (const label of ['turn 2', 'turn 3']) {
    const repeat = await turn();
    assert.equal(bodies(repeat), 0, `${label}: ${additionalContext(repeat)}`);
    assert.match(proofLine(repeat), /reused prior Engram context/, label);
    assert.match(additionalContext(repeat), /^already loaded: proofcount-memory-\d,proofcount-memory-\d,proofcount-memory-\d$/m, label);
    assert.doesNotMatch(additionalContext(repeat), /^related:$/m, `${label}: cards are not re-emitted`);
  }
  await rm(cwd, { recursive: true, force: true });
});

test('agent-hook zero-hit turns take the no-context path instead of a header-only payload', async () => {
  const { cwd, env } = await deltaWorkspace('engram-agent-hooks-zero-hit-');
  await runEngram(cwd, env, ['set-proof', 'off']);
  for (const label of ['first', 'repeat']) {
    const output = await deltaTurn(cwd, env, 'z1', 'banana smoothie recipe');
    assert.deepEqual(output, {}, label);
  }
  await runEngram(cwd, env, ['set-proof', 'compact']);
  const proof = await deltaTurn(cwd, env, 'z1', 'banana smoothie recipe');
  assert.equal(additionalContext(proof), 'Engram proof: no Engram load this turn (0/0 routed memories).');
  await rm(cwd, { recursive: true, force: true });
});

test('agent-hook proof counts come from loadForAgent, not from parsing prose', async () => {
  const { cwd, env } = await proofcountWorkspace('engram-agent-hooks-proof-counts-');

  const saved = { config: process.env.ENGRAM_CONFIG_DIR, global: process.env.ENGRAM_GLOBAL_DIR };
  process.env.ENGRAM_CONFIG_DIR = env.ENGRAM_CONFIG_DIR;
  process.env.ENGRAM_GLOBAL_DIR = env.ENGRAM_GLOBAL_DIR;
  let expected;
  try {
    const { loadForAgent } = await import('../../dist/commands/read.js');
    expected = await loadForAgent('proofcount', { cwd });
  } finally {
    for (const [name, value] of [['ENGRAM_CONFIG_DIR', saved.config], ['ENGRAM_GLOBAL_DIR', saved.global]]) {
      if (value === undefined) delete process.env[name]; else process.env[name] = value;
    }
  }
  assert.ok(expected.selectedKeys.length > expected.bodyKeys.length, 'fixture needs cards so prose and plan counts differ');
  const output = await hookJson(cwd, env, ['agent-hook', '--host', 'codex'], { hook_event_name: 'UserPromptSubmit', session_id: 'pc1', cwd, prompt: 'proofcount' });
  assert.match(proofLine(output), new RegExp(`loaded ${expected.selectedKeys.length}/${expected.related} routed \\(${expected.bodyKeys.length} new bodies\\) `));
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
  const pluginFile = path.join(agentHome, '.config', 'opencode', 'plugins', 'engram.js');

  const linked = await runEngram(cwd, globalEnv, ['link', '--global', 'opencode']);
  assert.equal(linked.code, 0, linked.stderr);
  assert.match(linked.stdout, /UPDATED opencode/);
  assert.match(await readFile(pluginFile, 'utf8'), /EngramOpenCodePlugin/);
  await assert.rejects(readFile(path.join(configHome, 'opencode', 'plugins', 'engram.js'), 'utf8'));

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
  const agentHome = path.join(cwd, 'agent-home');
  const globalEnv = {
    ...env,
    ENGRAM_AGENT_HOME: agentHome,
    ENGRAM_AGENT_CONFIG_HOME: path.join(cwd, 'agent-config')
  };
  const pluginFile = path.join(agentHome, '.config', 'opencode', 'plugins', 'engram.js');
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

// D9 fixture: memories scoped to src/api/** by `applies_to`, plus one unscoped memory.
function pathMemory(id, appliesTo, content) {
  return testMemory({ id, tags: ['pathscope'], content }).replace('confidence: high\n', `confidence: high\napplies_to: [${appliesTo.join(', ')}]\n`);
}

async function pathWorkspace(prefix, count = 1) {
  const { cwd, env } = await tempWorkspace(prefix);
  await runEngram(cwd, env, ['inject', '--no-skillset']);
  const dir = path.join(workspaceMemoryRoot(cwd), 'knowledge');
  await mkdir(dir, { recursive: true });
  for (let i = 0; i < count; i += 1) {
    await writeFile(path.join(dir, `api-path-rule-${i}.md`), pathMemory(`api-path-rule-${i}`, ['src/api/**'], `Path body ${i}: validate request DTOs at the API edge.`));
  }
  await writeFile(path.join(dir, 'web-path-rule.md'), pathMemory('web-path-rule', ['src/web/**'], 'Web path body: never touch the API.'));
  await runEngram(cwd, env, ['rebuild-index']);
  await runEngram(cwd, env, ['rehash', 'workspace']);
  await runEngram(cwd, env, ['set-read', 'auto']);
  await runEngram(cwd, env, ['set-proof', 'compact']);
  return { cwd, env };
}

function toolTurn(cwd, env, session, toolName, toolInput, host = 'claude') {
  return hookJson(cwd, env, ['agent-hook', '--host', host], { hook_event_name: 'PreToolUse', session_id: session, cwd, tool_name: toolName, tool_input: toolInput });
}

const pathBodies = (output) => [...additionalContext(output).matchAll(/Path body \d:/g)].length;

test('agent-hook PreToolUse injects path-scoped memory once per session and never blocks', async () => {
  const { cwd, env } = await pathWorkspace('engram-agent-hooks-pretool-');
  const edit = { file_path: `${cwd}/src/api/users.ts` };

  const first = await toolTurn(cwd, env, 't1', 'Edit', edit);
  assert.equal(first.hookSpecificOutput.hookEventName, 'PreToolUse');
  assert.match(additionalContext(first), /Path body 0:/);
  assert.doesNotMatch(additionalContext(first), /Web path body/);
  assert.equal(first.hookSpecificOutput.permissionDecision, undefined, 'a path trigger never decides permission');
  assert.equal(first.decision, undefined);
  assert.equal(first.continue, undefined);
  const usage = JSON.parse(await readFile(path.join(workspaceMemoryRoot(cwd), 'usage.json'), 'utf8'));
  assert.equal(usage['workspace:knowledge/api-path-rule-0.md'].injected, 1);

  assert.deepEqual(await toolTurn(cwd, env, 't1', 'Edit', edit), {}, 'a repeated event injects nothing');
  assert.deepEqual(await toolTurn(cwd, env, 't1', 'Bash', { command: 'cat src/api/users.ts' }), {}, 'non-file tools are ignored');

  // The delivered set is shared with prompt routing: the prompt turn does not re-inject the body.
  const prompt = await hookJson(cwd, env, ['agent-hook', '--host', 'claude'], { hook_event_name: 'UserPromptSubmit', session_id: 't1', cwd, prompt: 'pathscope' });
  assert.doesNotMatch(additionalContext(prompt), /Path body 0:/);
  assert.match(additionalContext(prompt), /already loaded: .*api-path-rule-0/);
  await rm(cwd, { recursive: true, force: true });
});

test('agent-hook PreToolUse caps path-triggered bodies at three per event', async () => {
  const { cwd, env } = await pathWorkspace('engram-agent-hooks-pretool-cap-', 5);
  const read = { file_path: path.join(cwd, 'src', 'api', 'orders.ts') };
  assert.equal(pathBodies(await toolTurn(cwd, env, 'c1', 'Read', read)), 3);
  assert.equal(pathBodies(await toolTurn(cwd, env, 'c1', 'Read', read)), 2, 'the rest arrive on the next event');
  assert.deepEqual(await toolTurn(cwd, env, 'c1', 'Read', read), {});
  await rm(cwd, { recursive: true, force: true });
});

test('agent-hook PreToolUse reads Codex apply_patch paths and omits suppressOutput', async () => {
  const { cwd, env } = await pathWorkspace('engram-agent-hooks-pretool-codex-');
  const patch = ['*** Begin Patch', '*** Update File: src/api/users.ts', '@@', '-a', '+b', '*** End Patch'].join('\n');
  const output = await toolTurn(cwd, env, 'x1', 'apply_patch', { command: patch }, 'codex');
  assert.match(additionalContext(output), /Path body 0:/);
  assert.equal(output.suppressOutput, undefined, 'Codex PreToolUse fails a hook that sets suppressOutput');
  await rm(cwd, { recursive: true, force: true });
});

test('agent-hook PreToolUse stays silent outside auto/always and for other hosts', async () => {
  const { cwd, env } = await pathWorkspace('engram-agent-hooks-pretool-modes-');
  const edit = { file_path: `${cwd}/src/api/users.ts` };
  await runEngram(cwd, env, ['set-read', 'startup']);
  assert.deepEqual(await toolTurn(cwd, env, 'm1', 'Edit', edit), {});
  await runEngram(cwd, env, ['set-read', 'always']);
  assert.deepEqual(await toolTurn(cwd, env, 'm1', 'Edit', edit, 'gemini'), {});
  assert.match(additionalContext(await toolTurn(cwd, env, 'm1', 'Edit', edit)), /Path body 0:/);
  await rm(cwd, { recursive: true, force: true });
});

function afterToolTurn(cwd, env, session, toolName, toolInput, host = 'gemini') {
  return hookJson(cwd, env, ['agent-hook', '--host', host], { hook_event_name: 'AfterTool', session_id: session, cwd, tool_name: toolName, tool_input: toolInput, tool_response: { llmContent: 'x' } });
}

test('gemini AfterTool injects a matching applies_to memory once per session', async () => {
  const { cwd, env } = await pathWorkspace('engram-agent-hooks-aftertool-');
  const read = { file_path: 'src/api/users.ts' };

  const first = await afterToolTurn(cwd, env, 'ga', 'read_file', read);
  assert.equal(first.hookSpecificOutput.hookEventName, 'AfterTool');
  assert.match(additionalContext(first), /Path body 0:/);
  assert.doesNotMatch(additionalContext(first), /Web path body/);
  assert.equal(first.suppressOutput, undefined, 'suppressOutput stays Claude-only');
  assert.equal(first.hookSpecificOutput.permissionDecision, undefined);
  const usage = JSON.parse(await readFile(path.join(workspaceMemoryRoot(cwd), 'usage.json'), 'utf8'));
  assert.equal(usage['workspace:knowledge/api-path-rule-0.md'].injected, 1);
  assert.deepEqual(await afterToolTurn(cwd, env, 'ga', 'read_file', read), {}, 'a repeated event injects nothing');

  // write_file and replace reach the same trigger on a fresh session; an absolute path inside the workspace works too.
  assert.match(additionalContext(await afterToolTurn(cwd, env, 'gb', 'write_file', { file_path: path.join(cwd, 'src', 'api', 'a.ts'), content: 'x' })), /Path body 0:/);
  assert.match(additionalContext(await afterToolTurn(cwd, env, 'gc', 'replace', { file_path: 'src/api/a.ts', old_string: 'a', new_string: 'b' })), /Path body 0:/);

  assert.deepEqual(await afterToolTurn(cwd, env, 'gd', 'run_shell_command', { command: 'cat src/api/users.ts' }), {}, 'non-file tools are ignored');
  assert.deepEqual(await afterToolTurn(cwd, env, 'gd', 'read_file', { file_path: path.resolve(cwd, '..', 'elsewhere', 'src', 'api', 'x.ts') }), {}, 'a path outside the cwd is ignored');

  // The delivered set is shared with BeforeAgent, and PreCompress re-arms the trigger.
  const prompt = await hookJson(cwd, env, ['agent-hook', '--host', 'gemini'], { hook_event_name: 'BeforeAgent', session_id: 'ga', cwd, prompt: 'pathscope' });
  assert.doesNotMatch(additionalContext(prompt), /Path body 0:/);
  await hookJson(cwd, env, ['agent-hook', '--host', 'gemini'], { hook_event_name: 'PreCompress', session_id: 'ga', cwd });
  assert.match(additionalContext(await afterToolTurn(cwd, env, 'ga', 'read_file', read)), /Path body 0:/, 'compaction drops prior injections');

  await runEngram(cwd, env, ['set-read', 'startup']);
  assert.deepEqual(await afterToolTurn(cwd, env, 'ge', 'read_file', read), {}, 'startup mode stays silent on tool calls');
  await rm(cwd, { recursive: true, force: true });
});

test('gemini AfterTool caps bodies at three per event and AfterTool is not a Claude event', async () => {
  const { cwd, env } = await pathWorkspace('engram-agent-hooks-aftertool-cap-', 5);
  const read = { file_path: 'src/api/orders.ts' };
  assert.equal(pathBodies(await afterToolTurn(cwd, env, 'cap', 'read_file', read)), 3);
  assert.equal(pathBodies(await afterToolTurn(cwd, env, 'cap', 'read_file', read)), 2, 'the rest arrive on the next event');
  assert.deepEqual(await afterToolTurn(cwd, env, 'cap', 'read_file', read), {});
  assert.deepEqual(await afterToolTurn(cwd, env, 'k1', 'Read', { file_path: `${cwd}/src/api/users.ts` }, 'claude'), {}, 'claude AfterTool is not eligible');
  assert.deepEqual(await afterToolTurn(cwd, env, 'k1', 'apply_patch', { command: '*** Update File: src/api/users.ts' }, 'codex'), {}, 'codex AfterTool is not eligible');
  await rm(cwd, { recursive: true, force: true });
});

test('agent-hook PreToolUse skips a body prompt routing already delivered, and PreCompact re-arms it', async () => {
  const { cwd, env } = await pathWorkspace('engram-agent-hooks-pretool-shared-');
  const edit = { file_path: `${cwd}/src/api/users.ts` };
  const prompt = await hookJson(cwd, env, ['agent-hook', '--host', 'claude'], { hook_event_name: 'UserPromptSubmit', session_id: 's1', cwd, prompt: 'pathscope' });
  assert.match(additionalContext(prompt), /Path body 0:/);
  assert.deepEqual(await toolTurn(cwd, env, 's1', 'Edit', edit), {}, 'a prompt-delivered body is not re-injected by the path trigger');

  await hookJson(cwd, env, ['agent-hook', '--host', 'claude'], { hook_event_name: 'PreCompact', session_id: 's1', cwd, trigger: 'auto' });
  assert.match(additionalContext(await toolTurn(cwd, env, 's1', 'Edit', edit)), /Path body 0:/, 'compaction drops prior injections');
  await rm(cwd, { recursive: true, force: true });
});

test('uninstall-agent-hooks keeps a user-authored PreToolUse group and removes the managed one', async () => {
  const { cwd, env } = await tempWorkspace('engram-agent-hooks-pretool-unlink-');
  const file = path.join(cwd, '.claude', 'settings.json');
  await mkdir(path.dirname(file), { recursive: true });
  const human = { matcher: 'Bash', hooks: [{ name: 'human-guard', type: 'command', command: 'echo guard' }] };
  await writeFile(file, `${JSON.stringify({ hooks: { PreToolUse: [human] } }, null, 2)}\n`);
  // `hook` mode keeps the managed PreToolUse; the native-mode twin below covers the default.
  assert.equal((await runEngram(cwd, env, ['config', 'set', 'hooks.path_rules', 'hook'])).code, 0);
  assert.equal((await runEngram(cwd, env, ['install-agent-hooks', 'claude'])).code, 0);
  const installed = JSON.parse(await readFile(file, 'utf8'));
  assert.equal(installed.hooks.PreToolUse.length, 2);
  assert.equal((await runEngram(cwd, env, ['uninstall-agent-hooks', 'claude'])).code, 0);
  const after = JSON.parse(await readFile(file, 'utf8'));
  assert.deepEqual(after.hooks, { PreToolUse: [human] });
  await rm(cwd, { recursive: true, force: true });
});

test('uninstall-agent-hooks under native path rules keeps the human PreToolUse group and removes InstructionsLoaded', async () => {
  const { cwd, env } = await tempWorkspace('engram-agent-hooks-uninstall-native-');
  const file = path.join(cwd, '.claude', 'settings.json');
  await mkdir(path.dirname(file), { recursive: true });
  const human = { matcher: 'Bash', hooks: [{ name: 'human-guard', type: 'command', command: 'echo guard' }] };
  await writeFile(file, `${JSON.stringify({ hooks: { PreToolUse: [human] } }, null, 2)}\n`);
  assert.equal((await runEngram(cwd, env, ['install-agent-hooks', 'claude'])).code, 0);
  const installed = JSON.parse(await readFile(file, 'utf8'));
  assert.deepEqual(installed.hooks.PreToolUse, [human], 'native mode adds no managed PreToolUse');
  assert.equal(installed.hooks.InstructionsLoaded.length, 1);
  assert.equal((await runEngram(cwd, env, ['uninstall-agent-hooks', 'claude'])).code, 0);
  assert.deepEqual(JSON.parse(await readFile(file, 'utf8')).hooks, { PreToolUse: [human] });
  await rm(cwd, { recursive: true, force: true });
});

// Current-session routing only selects rules and memories tagged always-load, so the subagent fixture adds one.
const SUBAGENT_BRIEF = 'session-brief';

async function subagentWorkspace(prefix) {
  const { cwd, env } = await deltaWorkspace(prefix);
  const dir = path.join(workspaceMemoryRoot(cwd), 'knowledge');
  await writeFile(path.join(dir, `${SUBAGENT_BRIEF}.md`), testMemory({ id: SUBAGENT_BRIEF, tags: ['always-load', 'brief'], content: 'Subagent brief body S: start every task by reading the project notes.' }));
  await runEngram(cwd, env, ['rebuild-index']);
  await runEngram(cwd, env, ['rehash', 'workspace']);
  return { cwd, env };
}

function subagentTurn(cwd, env, host, extra = {}) {
  return hookJson(cwd, env, ['agent-hook', '--host', host], { hook_event_name: 'SubagentStart', session_id: 'p1', agent_id: 'agent-a1', agent_type: 'Explore', cwd, ...extra });
}

test('agent-hook SubagentStart routes current-session context into the subagent', async () => {
  const { cwd, env } = await subagentWorkspace('engram-agent-hooks-subagent-');
  const out = await subagentTurn(cwd, env, 'claude');
  assert.equal(out.hookSpecificOutput.hookEventName, 'SubagentStart');
  assert.match(proofLine(out), /Engram proof: loaded/);
  assert.match(additionalContext(out), /Subagent brief body S/);
  assert.equal(out.permissionDecision, undefined);
  assert.equal(out.hookSpecificOutput.permissionDecision, undefined);
  assert.equal(out.suppressOutput, true, 'Claude accepts suppressOutput on SubagentStart');
  await rm(cwd, { recursive: true, force: true });
});

test('agent-hook SubagentStart keys the delivered set by agent_id and leaves the parent set untouched', async () => {
  const { cwd, env } = await subagentWorkspace('engram-agent-hooks-subagent-keys-');
  const parent = (prompt) => hookJson(cwd, env, ['agent-hook', '--host', 'claude'], { hook_event_name: 'UserPromptSubmit', session_id: 'p1', cwd, prompt });
  assert.match(additionalContext(await parent('pnpm install')), /Delta body X/);

  // The subagent shares the parent session_id but has its own window, so it still receives body X.
  const started = await subagentTurn(cwd, env, 'claude', { agent_id: 'a1' });
  const prompted = await hookJson(cwd, env, ['agent-hook', '--host', 'claude'], { hook_event_name: 'UserPromptSubmit', session_id: 'p1', agent_id: 'a1', cwd, prompt: 'pnpm install' });
  assert.match(additionalContext(started), /Subagent brief body S/);
  assert.match(additionalContext(prompted), /Delta body X/, 'the subagent has its own delivered set');

  const again = await parent('pnpm install');
  assert.match(additionalContext(again), new RegExp(`already loaded: ${DELTA_X}`));
  assert.doesNotMatch(additionalContext(again), /Delta body X/, 'subagent traffic never resets or rewrites the parent set');

  const cache = JSON.parse(await readFile(hookCacheFile(cwd), 'utf8'));
  const keys = Object.keys(cache.records);
  assert.ok(keys.some((key) => key.endsWith(':p1')), keys.join(','));
  assert.ok(keys.some((key) => key.endsWith(':p1#agent:a1')), keys.join(','));
  await rm(cwd, { recursive: true, force: true });
});

test('agent-hook SubagentStart without agent_id neither resets nor rewrites the parent delivered set', async () => {
  const { cwd, env } = await subagentWorkspace('engram-agent-hooks-subagent-noid-');
  const parent = (prompt) => hookJson(cwd, env, ['agent-hook', '--host', 'codex'], { hook_event_name: 'UserPromptSubmit', session_id: 'p1', cwd, prompt });
  assert.match(additionalContext(await parent('pnpm install')), /Delta body X/);
  const before = await readFile(hookCacheFile(cwd), 'utf8');

  // The subagent hook shares the parent session_id and carries no agent_id.
  const started = await subagentTurn(cwd, env, 'codex', { agent_id: undefined });
  assert.match(additionalContext(started), /Subagent brief body S/, 'the subagent still receives context');
  assert.equal(await readFile(hookCacheFile(cwd), 'utf8'), before, 'the parent record is neither reset nor rewritten');

  const again = await parent('pnpm install');
  assert.doesNotMatch(additionalContext(again), /Delta body X/, 'the parent does not get its bodies again');
  await rm(cwd, { recursive: true, force: true });
});

test('agent-hook Codex SubagentStart omits suppressOutput', async () => {
  const { cwd, env } = await subagentWorkspace('engram-agent-hooks-subagent-codex-');
  const out = await subagentTurn(cwd, env, 'codex', { turn_id: 't1', permission_mode: 'default' });
  assert.equal(out.suppressOutput, undefined);
  assert.equal(out.hookSpecificOutput.hookEventName, 'SubagentStart');
  assert.ok(additionalContext(out).length > 0);
  await rm(cwd, { recursive: true, force: true });
});

test('agent-hook SubagentStart is ignored for gemini, cursor, windsurf and opencode', async () => {
  const { cwd, env } = await subagentWorkspace('engram-agent-hooks-subagent-ignored-');
  for (const host of ['gemini', 'cursor', 'windsurf', 'opencode']) {
    assert.deepEqual(await subagentTurn(cwd, env, host), {}, host);
  }
  await rm(cwd, { recursive: true, force: true });
});

test('pruneSessions caps subagent records separately so they never evict parent sessions', async () => {
  const { pruneSessions, MAX_SUBAGENT_RECORDS, MAX_SESSION_RECORDS } = await import('../../dist/core/integrations/hook-session.js');
  const now = new Date();
  const records = {};
  // Subagent records are the newest, so a single shared cap would evict every parent.
  for (let i = 0; i < 150; i += 1) records[`claude:cwd:p1#agent:a${i}`] = { delivered: [], updated: new Date(now.getTime() - i * 1000).toISOString() };
  for (let i = 0; i < 90; i += 1) records[`claude:cwd:parent${i}`] = { delivered: [], updated: new Date(now.getTime() - (200 + i) * 1000).toISOString() };
  const kept = Object.keys(pruneSessions({ records }, now).records);
  const subagents = kept.filter((key) => key.includes('#agent:'));
  assert.equal(subagents.length, MAX_SUBAGENT_RECORDS);
  assert.equal(MAX_SUBAGENT_RECORDS, 100);
  assert.equal(kept.length - subagents.length, 90, 'every fresh parent survives');
  assert.ok(kept.length <= MAX_SESSION_RECORDS);
  assert.ok(subagents.includes('claude:cwd:p1#agent:a0'), 'newest subagent kept');
  assert.equal(kept.includes('claude:cwd:p1#agent:a149'), false, 'oldest subagent dropped');
});

// E9 host caps. Each memory is one long bullet bracketed by BEGIN-<id> ... END-<id>, so a cut body is detectable.
async function capWorkspace(prefix, count, chars, mode = 'always') {
  const { cwd, env } = await tempWorkspace(prefix);
  await runEngram(cwd, env, ['inject', '--no-skillset']);
  const root = workspaceMemoryRoot(cwd);
  const dir = path.join(root, 'knowledge');
  await mkdir(dir, { recursive: true });
  for (let i = 0; i < count; i += 1) {
    const id = `capbench-memory-${i}`;
    await writeFile(path.join(dir, `${id}.md`), testMemory({ id, tags: ['capbench', 'always-load'], content: `BEGIN-${id} ${'lorem '.repeat(Math.floor(chars / 6))} END-${id}` }));
  }
  const configFile = path.join(root, 'engram.config.json');
  const config = JSON.parse(await readFile(configFile, 'utf8'));
  await writeFile(configFile, JSON.stringify({ ...config, load: { ...config.load, limit: 12, max_tokens: 20000, expand_top: 12 } }, null, 2));
  await runEngram(cwd, env, ['rebuild-index']);
  await runEngram(cwd, env, ['rehash', 'workspace']);
  await runEngram(cwd, env, ['set-read', mode]);
  await runEngram(cwd, env, ['set-proof', 'compact']);
  return { cwd, env };
}

function startTurn(cwd, env, host, session, event = 'SessionStart') {
  return hookJson(cwd, env, ['agent-hook', '--host', host], { hook_event_name: event, session_id: session, cwd });
}

/** Every `BEGIN-x` in a hook text must have its `END-x`: bodies are whole or absent, never cut. */
function assertWholeBodies(ctx) {
  const begins = [...ctx.matchAll(/BEGIN-(capbench-memory-\d+)/g)].map((match) => match[1]);
  assert.ok(begins.length > 0, 'at least one body is expanded');
  for (const id of begins) assert.ok(ctx.includes(`END-${id}`), `${id} body is whole`);
  return begins.length;
}

test('agent-hook Codex payload stays within 2,400 tokens and never cuts a body', async () => {
  const { cwd, env } = await capWorkspace('engram-agent-hooks-cap-codex-', 10, 1600);
  const ctx = additionalContext(await startTurn(cwd, env, 'codex', 'cx1'));
  assert.ok(Math.ceil(Buffer.byteLength(ctx, 'utf8') / 4) <= 2400, `codex payload is ${Math.ceil(Buffer.byteLength(ctx, 'utf8') / 4)} tokens`);
  const bodies = assertWholeBodies(ctx);
  assert.ok(bodies < 10, 'over the cap some bodies demote to cards');
  assert.match(ctx, /related:|fetch: engram load --id/);
  // Delivered and usage record only what was sent.
  const usage = JSON.parse(await readFile(path.join(workspaceMemoryRoot(cwd), 'usage.json'), 'utf8'));
  const injected = Object.values(usage).filter((row) => row.injected > 0).length;
  assert.equal(injected, bodies, 'usage counts only the expanded bodies');
  await rm(cwd, { recursive: true, force: true });
});

test('agent-hook Claude payload stays within 9,500 characters', async () => {
  const { cwd, env } = await capWorkspace('engram-agent-hooks-cap-claude-', 10, 1600);
  const ctx = additionalContext(await startTurn(cwd, env, 'claude', 'cl1'));
  assert.ok(ctx.length <= 9500, `claude payload is ${ctx.length} chars`);
  assert.ok(assertWholeBodies(ctx) < 10);
  assert.match(ctx, /related:|fetch: engram load --id/);
  await rm(cwd, { recursive: true, force: true });
});

test('agent-hook caps the SubagentStart payload like any context event', async () => {
  const { cwd, env } = await capWorkspace('engram-agent-hooks-cap-subagent-', 10, 1600);
  const out = await hookJson(cwd, env, ['agent-hook', '--host', 'codex'], { hook_event_name: 'SubagentStart', session_id: 'p1', agent_id: 'a1', cwd });
  const ctx = additionalContext(out);
  assert.ok(Math.ceil(Buffer.byteLength(ctx, 'utf8') / 4) <= 2400);
  assertWholeBodies(ctx);
  await rm(cwd, { recursive: true, force: true });
});

test('hook-caps measures Codex in UTF-8 bytes / 4 and Claude in characters', async () => {
  const { hookCap, hookSize, plannerTokensFor } = await import('../../dist/core/integrations/hook-caps.js');
  assert.deepEqual(hookCap('codex', 1600), { unit: 'tokens', max: 2400 });
  assert.deepEqual(hookCap('claude', 1600), { unit: 'chars', max: 9500 });
  assert.deepEqual(hookCap('gemini', 1234), { unit: 'tokens', max: 1234 });
  const text = 'é'.repeat(100);
  assert.equal(hookSize(text, hookCap('codex', 1600)), 50, '200 UTF-8 bytes / 4');
  assert.equal(hookSize(text, hookCap('claude', 1600)), 100, '100 chars');
  assert.equal(plannerTokensFor(hookCap('claude', 1600), 9500), 2375);
  assert.equal(plannerTokensFor(hookCap('codex', 1600), 2400), 2400);
  assert.equal(plannerTokensFor(hookCap('codex', 1600), -5), 0);
});

test('agent-hook SessionStart bytes are identical for the same memory set', async () => {
  const { cwd, env } = await capWorkspace('engram-agent-hooks-stable-', 4, 300, 'auto');
  const first = additionalContext(await startTurn(cwd, env, 'claude', 'b1'));
  const second = additionalContext(await startTurn(cwd, env, 'claude', 'b2'));
  assert.ok(first.includes('BEGIN-capbench-memory-'), first);
  assert.equal(second, first);
  // A fresh SessionStart on an already used session id resets the delivered set and prints the same bytes.
  assert.equal(additionalContext(await startTurn(cwd, env, 'claude', 'b1')), first);
  await rm(cwd, { recursive: true, force: true });
});

test('agent-hook already loaded ids are sorted and the proof sig hashes the routed key set', async () => {
  const { cwd, env } = await tempWorkspace('engram-agent-hooks-sorted-');
  await runEngram(cwd, env, ['inject', '--no-skillset']);
  const dir = path.join(workspaceMemoryRoot(cwd), 'knowledge');
  await mkdir(dir, { recursive: true });
  for (const name of ['zulu', 'mike', 'alpha']) {
    await writeFile(path.join(dir, `sorted-${name}.md`), testMemory({ id: `sorted-${name}`, tags: [`${name}tag`, 'sortedset'], content: `Sorted body ${name}.` }));
  }
  await runEngram(cwd, env, ['rebuild-index']);
  await runEngram(cwd, env, ['rehash', 'workspace']);
  await runEngram(cwd, env, ['set-read', 'auto']);
  await runEngram(cwd, env, ['set-proof', 'compact']);
  for (const name of ['zulu', 'mike', 'alpha']) {
    assert.match(additionalContext(await deltaTurn(cwd, env, 's1', `${name}tag`)), new RegExp(`Sorted body ${name}`));
  }
  const repeat = await deltaTurn(cwd, env, 's1', 'sortedset');
  assert.match(additionalContext(repeat), /^already loaded: sorted-alpha,sorted-mike,sorted-zulu$/m);
  // The sig depends on the routed set only: another session routing the same set prints the same one.
  const other = await deltaTurn(cwd, env, 's2', 'sortedset');
  const sig = (output) => proofLine(output).match(/sig ([0-9a-f]{8})/)?.[1];
  assert.ok(sig(repeat), proofLine(repeat));
  assert.equal(sig(other), sig(repeat));
  await rm(cwd, { recursive: true, force: true });
});

test('planHookTurn sorts already loaded ids, signs the sorted key set, and can shorten the line', async () => {
  const { planHookTurn, setSignature } = await import('../../dist/core/integrations/hook-turn.js');
  const load = (selectedKeys, alreadyLoaded) => ({ text: '### x [knowledge, normal]\n- body', selectedKeys, bodyKeys: [], related: selectedKeys.length, alreadyLoaded, cardIds: [], omittedIds: [] });
  const opts = { proofMode: 'compact', readMode: 'auto' };
  const turn = planHookTurn('UserPromptSubmit', load(['workspace:c.md', 'workspace:a.md', 'workspace:b.md'], ['c', 'a', 'b']), ['workspace:a.md'], opts);
  assert.match(turn.additionalContext, /^already loaded: a,b,c$/m);
  assert.match(turn.additionalContext, new RegExp(`sig ${setSignature(['workspace:a.md', 'workspace:b.md', 'workspace:c.md'])}\\)`));
  assert.equal(setSignature(['x', 'y', 'x']), setSignature(['y', 'x']), 'order and repeats do not matter');
  assert.notEqual(setSignature(['x']), setSignature(['x', 'y']));
  const short = planHookTurn('UserPromptSubmit', load(['workspace:a.md'], ['c', 'a', 'b']), ['workspace:a.md'], { ...opts, alreadyLoadedLimit: 1 });
  assert.match(short.additionalContext, /^already loaded: a \(\+2 more\)$/m);
});

// Three path rules of about 4,000 characters each: two fit under the Codex cap, three do not.
async function bigPathWorkspace(prefix) {
  const { cwd, env } = await tempWorkspace(prefix);
  await runEngram(cwd, env, ['inject', '--no-skillset']);
  const root = workspaceMemoryRoot(cwd);
  const dir = path.join(root, 'knowledge');
  await mkdir(dir, { recursive: true });
  for (let i = 0; i < 3; i += 1) {
    await writeFile(path.join(dir, `api-path-rule-${i}.md`), pathMemory(`api-path-rule-${i}`, ['src/api/**'], `Path body ${i}: ${'lorem '.repeat(660)} END-${i}`));
  }
  const configFile = path.join(root, 'engram.config.json');
  const config = JSON.parse(await readFile(configFile, 'utf8'));
  await writeFile(configFile, JSON.stringify({ ...config, load: { ...config.load, max_tokens: 20000 } }, null, 2));
  await runEngram(cwd, env, ['rebuild-index']);
  await runEngram(cwd, env, ['rehash', 'workspace']);
  await runEngram(cwd, env, ['set-read', 'auto']);
  await runEngram(cwd, env, ['set-proof', 'compact']);
  return { cwd, env };
}

test('agent-hook path trigger output obeys the host cap', async () => {
  const { cwd, env } = await bigPathWorkspace('engram-agent-hooks-pathcap-');
  const patch = ['*** Begin Patch', '*** Update File: src/api/users.ts', '@@', '-a', '+b', '*** End Patch'].join('\n');
  const codex = additionalContext(await toolTurn(cwd, env, 'pc1', 'apply_patch', { command: patch }, 'codex'));
  assert.ok(Math.ceil(Buffer.byteLength(codex, 'utf8') / 4) <= 2400, `codex path payload is ${Math.ceil(Buffer.byteLength(codex, 'utf8') / 4)} tokens`);
  const bodies = [...codex.matchAll(/Path body (\d):/g)].map((match) => match[1]);
  assert.ok(bodies.length >= 1 && bodies.length < 3, `whole bodies only: ${bodies.length}`);
  for (const index of bodies) assert.ok(codex.includes(`END-${index}`), `body ${index} is whole`);

  // The body that did not fit stays undelivered, so the next event brings it.
  const next = additionalContext(await toolTurn(cwd, env, 'pc1', 'apply_patch', { command: patch }, 'codex'));
  assert.ok(pathBodies({ hookSpecificOutput: { additionalContext: next } }) >= 1, 'the remaining body arrives on the next event');

  const claude = additionalContext(await toolTurn(cwd, env, 'pc2', 'Edit', { file_path: `${cwd}/src/api/users.ts` }));
  assert.ok(claude.length <= 9500, `claude path payload is ${claude.length} chars`);
  assert.ok(pathBodies({ hookSpecificOutput: { additionalContext: claude } }) < 3);
  await rm(cwd, { recursive: true, force: true });
});

test('agent-hook bodies use the Balanced rule wording by default', async () => {
  const { cwd, env } = await tempWorkspace('engram-agent-hooks-balanced-');
  await runEngram(cwd, env, ['inject', '--no-skillset']);
  const saved = await runEngram(cwd, env, ['save', 'rule', '--scope', 'workspace', 'Run the shared linter before every commit'], 'A\n');
  assert.equal(saved.code, 0, saved.stderr);
  await runEngram(cwd, env, ['set-read', 'auto']);
  await runEngram(cwd, env, ['set-proof', 'compact']);
  const balanced = additionalContext(await startTurn(cwd, env, 'claude', 'r1'));
  assert.match(balanced, /shared linter/);
  assert.doesNotMatch(balanced, /Treat this rule as mandatory/);

  // An explicit user choice is respected.
  const set = await runEngram(cwd, env, ['set-rule-variant', 'strict']);
  assert.equal(set.code, 0, set.stderr);
  const strict = additionalContext(await startTurn(cwd, env, 'claude', 'r2'));
  assert.match(strict, /Treat this rule as mandatory/);
  await rm(cwd, { recursive: true, force: true });
});
