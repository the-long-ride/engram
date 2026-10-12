import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { handleMcp } from '../../dist/mcp/server.js';
import { initGit, runEngram, tempWorkspace, workspaceMemoryRoot } from '../helpers.mjs';

// The scope .gitignore an Engram build before usage/hook-cache/pending/working/stale existed wrote.
const OLD_SCOPE_GITIGNORE = '# Engram generated routing sidecars.\nmemory.vec.sqlite\nmemory.vec.sqlite-*\n';

function git(cwd, args) {
  return spawnSync('git', args, { cwd, encoding: 'utf8' });
}

/** Untracked paths under the workspace `.agents/` folder. */
function untrackedAgents(cwd) {
  return git(cwd, ['status', '--porcelain', '-uall']).stdout.split(/\r?\n/u).filter((line) => line.startsWith('?? .agents/'));
}

function hook(cwd, env, prompt, session = 's1') {
  return runEngram(cwd, env, ['agent-hook', '--host', 'claude'], `${JSON.stringify({ hook_event_name: 'UserPromptSubmit', session_id: session, cwd, prompt })}\n`);
}

const AUTHOR_ENV_KEYS = ['ENGRAM_CONFIG_DIR', 'ENGRAM_GLOBAL_DIR', 'GIT_CONFIG_COUNT', 'GIT_CONFIG_KEY_0', 'GIT_CONFIG_VALUE_0', 'GIT_CONFIG_KEY_1', 'GIT_CONFIG_VALUE_1'];

/** Run an MCP save proposal in-process with the temp workspace env and cwd. */
async function mcpProposal(cwd, env, text) {
  const previousCwd = process.cwd();
  const previousEnv = Object.fromEntries(AUTHOR_ENV_KEYS.map((key) => [key, process.env[key]]));
  for (const key of AUTHOR_ENV_KEYS) process.env[key] = env[key];
  process.chdir(cwd);
  try {
    return await handleMcp({ id: 1, method: 'tools/call', params: { name: 'engram_save_session', arguments: { text } } });
  } finally {
    process.chdir(previousCwd);
    for (const key of AUTHOR_ENV_KEYS) {
      if (previousEnv[key] === undefined) delete process.env[key];
      else process.env[key] = previousEnv[key];
    }
  }
}

test('hook, MCP proposal, and load --id never leave untracked sidecars under an old scope .gitignore', async () => {
  const { cwd, env } = await tempWorkspace('engram-sidecar-old-ignore-');
  initGit(cwd);
  await runEngram(cwd, env, ['inject', '--no-skillset']);
  await runEngram(cwd, env, ['save', 'knowledge', '--scope', 'workspace', 'Sidecar ledger exports run nightly through the batch worker'], 'A\n');
  await writeFile(path.join(workspaceMemoryRoot(cwd), '.gitignore'), OLD_SCOPE_GITIGNORE);
  git(cwd, ['add', '-A', '.agents']);
  assert.equal(git(cwd, ['-c', 'user.name=t', '-c', 'user.email=t@example.com', 'commit', '-qm', 'seed']).status, 0);
  assert.deepEqual(untrackedAgents(cwd), []);

  const turn = await hook(cwd, env, 'sidecar ledger exports');
  assert.equal(turn.code, 0, turn.stderr);
  assert.match(turn.stdout, /Sidecar ledger exports/);
  const proposal = await mcpProposal(cwd, env, 'TYPE: knowledge | TEXT: Batch worker retries failed exports twice. | TRIGGERS: batch, retries');
  assert.equal(typeof proposal.result.structuredContent.data.approval_token, 'string');
  const index = JSON.parse(await readFile(path.join(workspaceMemoryRoot(cwd), 'memory.index.json'), 'utf8'));
  const loaded = await runEngram(cwd, env, ['load', '--id', index.entries[0].id]);
  assert.equal(loaded.code, 0, loaded.stderr);

  for (const sidecar of ['agent-hook-cache.json', 'usage.json', 'pending-approvals.json']) {
    assert.ok(existsSync(path.join(workspaceMemoryRoot(cwd), sidecar)), `${sidecar} was written`);
  }
  assert.deepEqual(untrackedAgents(cwd), []);
  await rm(cwd, { recursive: true, force: true });
});

test('a hook in a repo that only uses global memory leaves no untracked files', async () => {
  const { cwd, env } = await tempWorkspace('engram-sidecar-global-only-');
  initGit(cwd);
  const saved = await runEngram(cwd, env, ['save', 'knowledge', '--scope', 'global', 'Global installs always use the frozen pnpm lockfile'], 'A\n');
  assert.equal(saved.code, 0, saved.stderr);
  const turn = await hook(cwd, env, 'pnpm install frozen lockfile');
  assert.equal(turn.code, 0, turn.stderr);
  assert.match(turn.stdout, /frozen pnpm lockfile/, 'the global memory is still injected');
  assert.equal(existsSync(path.join(cwd, '.agents')), false);
  assert.deepEqual(untrackedAgents(cwd), []);
  await rm(cwd, { recursive: true, force: true });
});

test('scope gitignore covers migration backups', async () => {
  const { SCOPE_GITIGNORE } = await import('../../dist/core/memory/scope-gitignore.js');
  assert.match(SCOPE_GITIGNORE, /^backups\/$/mu);
});

test('scope gitignore covers atomic-write temp files', async () => {
  const { SCOPE_GITIGNORE } = await import('../../dist/core/memory/scope-gitignore.js');
  assert.match(SCOPE_GITIGNORE, /^\*\.json\.\*\.tmp$/mu);
});

test('scope gitignore covers the SessionEnd transcript queue', async () => {
  const { SCOPE_GITIGNORE } = await import('../../dist/core/memory/scope-gitignore.js');
  for (const pattern of [/^session-queue\.json$/mu, /^session-queue\.json\.lock$/mu, /^session-queue\.json\.\*\.tmp$/mu]) assert.match(SCOPE_GITIGNORE, pattern);
});

test('session-queue.json and its lock and temp files never show up untracked', async () => {
  const { cwd, env } = await tempWorkspace('engram-sidecar-session-queue-');
  initGit(cwd);
  await runEngram(cwd, env, ['inject', '--no-skillset']);
  // An old scope .gitignore from before the queue existed gains the entries on the first queue write.
  await writeFile(path.join(workspaceMemoryRoot(cwd), '.gitignore'), OLD_SCOPE_GITIGNORE);
  git(cwd, ['add', '-A', '.agents']);
  assert.equal(git(cwd, ['-c', 'user.name=t', '-c', 'user.email=t@example.com', 'commit', '-qm', 'seed']).status, 0);

  const turn = await runEngram(cwd, env, ['agent-hook', '--host', 'claude'], `${JSON.stringify({ hook_event_name: 'SessionEnd', session_id: 'q1', cwd, transcript_path: path.join(cwd, 't.jsonl') })}\n`);
  assert.equal(turn.code, 0, turn.stderr);
  const root = workspaceMemoryRoot(cwd);
  assert.ok(existsSync(path.join(root, 'session-queue.json')), 'the queue was written');
  await writeFile(path.join(root, 'session-queue.json.lock'), 'owner');
  await writeFile(path.join(root, 'session-queue.json.123.abcd.tmp'), '{}');
  assert.deepEqual(untrackedAgents(cwd), []);
  for (const name of ['session-queue.json', 'session-queue.json.lock', 'session-queue.json.123.abcd.tmp']) {
    assert.equal(git(cwd, ['check-ignore', '-q', `.agents/.engram/${name}`]).status, 0, `${name} is ignored`);
  }
  await rm(cwd, { recursive: true, force: true });
});
