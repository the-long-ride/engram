import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { initGit, runEngram, tempWorkspace, workspaceMemoryRoot } from '../helpers.mjs';

function git(cwd, env, args) {
  return execFileSync('git', args, { cwd, env, encoding: 'utf8' });
}

test('live agent-hook learning captures corrections across hosts, takes effect on next turn, and keeps git status clean', async () => {
  const hosts = [
    { host: 'claude', event: 'UserPromptSubmit', correction: 'Remember: always validate claude webhook signatures before parsing JSON payloads.' },
    { host: 'gemini', event: 'BeforeAgent', correction: 'Correction: always pin gemini adapter timeouts explicitly instead of relying on defaults.' },
    { host: 'codex', event: 'UserPromptSubmit', correction: 'Decision: always serialize codex delta turns through hook-session state files.' },
    { host: 'opencode', event: 'UserPromptSubmit', correction: 'Rule: never mutate opencode plugin config files without preserving user hooks.' }
  ];

  for (const spec of hosts) {
    const { cwd, env } = await tempWorkspace(`engram-live-learn-${spec.host}-`);
    initGit(cwd);
    const init = await runEngram(cwd, env, ['inject', '--no-skillset']);
    assert.equal(init.code, 0, init.stderr);

    // Ordinary query must not write any working memory or inbox receipt.
    const ordinary = await runEngram(cwd, env, ['agent-hook', '--host', spec.host], JSON.stringify({
      hook_event_name: spec.event,
      cwd,
      session_id: `sess-${spec.host}`,
      prompt: 'how do we validate webhook signatures in this codebase?'
    }));
    assert.equal(ordinary.code, 0, ordinary.stderr);

    // Explicit correction triggers working/ learning + staged durable inbox receipt.
    const teach = await runEngram(cwd, env, ['agent-hook', '--host', spec.host], JSON.stringify({
      hook_event_name: spec.event,
      cwd,
      session_id: `sess-${spec.host}`,
      prompt: spec.correction
    }));
    assert.equal(teach.code, 0, teach.stderr);

    const root = workspaceMemoryRoot(cwd);
    const workingDir = path.join(root, 'working');
    const inboxDir = path.join(root, 'inbox');
    const inboxFiles = (await readdir(inboxDir)).filter((name) => name.startsWith('r-') && name.endsWith('.json'));
    assert.ok(inboxFiles.length >= 1, `${spec.host}: expected staged receipt in ${inboxDir}`);
    const workingSubdirs = await readdir(workingDir);
    assert.ok(workingSubdirs.length >= 1, `${spec.host}: expected working/ learning`);

    // Next turn immediately retrieves the newly learned working memory.
    const followUp = await runEngram(cwd, env, ['agent-hook', '--host', spec.host], JSON.stringify({
      hook_event_name: spec.event,
      cwd,
      session_id: `sess-${spec.host}-next`,
      prompt: spec.correction.replace(/^(?:Remember|Correction|Decision|Rule):\s*/i, '')
    }));
    assert.equal(followUp.code, 0, followUp.stderr);
    const ctxText = JSON.parse(followUp.stdout)?.hookSpecificOutput?.additionalContext ?? '';
    assert.match(ctxText, /Engram auto-loaded context:/);

    // Commit tracked .agents files first, then verify zero untracked files remain under .agents/.
    git(cwd, env, ['add', '.agents']);
    const statusAfter = git(cwd, env, ['status', '--porcelain', '-uall']);
    const untrackedAgents = statusAfter.split(/\r?\n/).filter((line) => line.startsWith('?? ') && line.includes('.agents/'));
    assert.deepEqual(untrackedAgents, [], `${spec.host}: unexpected untracked .agents/ files:\n${statusAfter}`);
  }
});

test('SessionEnd queue stays observe-only without --learn and captures learnings with --learn', async () => {
  const { cwd, env } = await tempWorkspace('engram-queue-learn-');
  initGit(cwd);
  const init = await runEngram(cwd, env, ['inject', '--no-skillset']);
  assert.equal(init.code, 0, init.stderr);

  const transcript = path.join(cwd, 'session.jsonl');
  await writeFile(transcript, `${JSON.stringify({
    type: 'user',
    message: { content: 'Root cause: stale cache tags caused billing exports to serve outdated currency rates.' }
  })}\n`);

  const enqueue1 = await runEngram(cwd, env, ['agent-hook', '--host', 'claude'], JSON.stringify({
    hook_event_name: 'SessionEnd',
    cwd,
    session_id: 'q-1',
    transcript_path: transcript
  }));
  assert.equal(enqueue1.code, 0, enqueue1.stderr);

  const plainDrain = await runEngram(cwd, env, ['observe', '--queue']);
  assert.equal(plainDrain.code, 0, plainDrain.stderr);
  assert.match(plainDrain.stdout, /No memory written/);

  const enqueue2 = await runEngram(cwd, env, ['agent-hook', '--host', 'claude'], JSON.stringify({
    hook_event_name: 'SessionEnd',
    cwd,
    session_id: 'q-2',
    transcript_path: transcript
  }));
  assert.equal(enqueue2.code, 0, enqueue2.stderr);

  const learnDrain = await runEngram(cwd, env, ['observe', '--queue', '--learn']);
  assert.equal(learnDrain.code, 0, learnDrain.stderr);
  assert.match(learnDrain.stdout, /Learned: \d+ working memories active, \d+ durable receipts staged/);

  const inbox = await runEngram(cwd, env, ['review', 'inbox', '--json']);
  assert.equal(inbox.code, 0, inbox.stderr);
  const receipts = JSON.parse(inbox.stdout).data.receipts;
  assert.ok(receipts.length >= 1, 'expected at least one staged receipt');

  const applied = await runEngram(cwd, env, ['review', 'apply', receipts[0].id]);
  assert.equal(applied.code, 0, applied.stderr);

  git(cwd, env, ['add', '.agents']);
  const status = git(cwd, env, ['status', '--porcelain', '-uall']);
  const untrackedAgents = status.split(/\r?\n/).filter((line) => line.startsWith('?? ') && line.includes('.agents/'));
  assert.deepEqual(untrackedAgents, [], `unexpected untracked .agents/ files:\n${status}`);
});

test('observe --learn --git harvests commit learnings without leaving untracked artifacts', async () => {
  const { cwd, env } = await tempWorkspace('engram-git-learn-');
  initGit(cwd);
  const init = await runEngram(cwd, env, ['inject', '--no-skillset']);
  assert.equal(init.code, 0, init.stderr);

  await mkdir(path.join(cwd, 'src'), { recursive: true });
  await writeFile(path.join(cwd, 'src', 'billing.ts'), 'export const retry = 3;\n');
  git(cwd, env, ['add', 'src/billing.ts', '.agents']);
  git(cwd, env, ['commit', '-m', 'Decision: always cap billing gateway retries at three attempts with exponential backoff']);

  const learned = await runEngram(cwd, env, ['observe', '--learn', '--git', '--json']);
  assert.equal(learned.code, 0, learned.stderr);
  const body = JSON.parse(learned.stdout);
  assert.equal(body.ok, true);
  assert.ok(body.data.working_written.length >= 1, `expected working memory from git log: ${learned.stdout}`);
  assert.ok(body.data.receipts_written.length >= 1, `expected staged receipt from git log: ${learned.stdout}`);

  const status = git(cwd, env, ['status', '--porcelain', '-uall']);
  const untrackedAgents = status.split(/\r?\n/).filter((line) => line.startsWith('?? ') && line.includes('.agents/'));
  assert.deepEqual(untrackedAgents, [], `unexpected untracked .agents/ files:\n${status}`);
});
