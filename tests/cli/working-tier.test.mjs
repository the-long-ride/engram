import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { handleMcp } from '../../dist/mcp/server.js';
import { runCli } from '../../dist/cli.js';
import { initGit, runEngram, tempWorkspace, workspaceMemoryRoot } from '../helpers.mjs';

const TODAY = '2026-10-07';
const EXPIRES = '2026-10-21';
const TASK_TEXT = 'Billing export batches invoices nightly through the ledger worker';
const TASK_ID = 'billing-export-batches-invoices-nightly-through-the-ledger-worker';
const TASK_CANDIDATE = `TYPE: knowledge | TEXT: ${TASK_TEXT} | OBJECTIVE: task`;

function at(env, day) {
  return { ...env, ENGRAM_TODAY: day };
}

function workingFile(cwd, id = TASK_ID, dir = 'knowledge') {
  return path.join(workspaceMemoryRoot(cwd), 'working', dir, `${id}.md`);
}

function durableFile(cwd, id = TASK_ID, dir = 'knowledge') {
  return path.join(workspaceMemoryRoot(cwd), dir, `${id}.md`);
}

async function workspaceWithTaskMemory(prefix) {
  const { cwd, env } = await tempWorkspace(prefix);
  await runEngram(cwd, env, ['inject']);
  const saved = await runEngram(cwd, at(env, TODAY), ['take-control', '--scope', 'workspace', '--objective', 'add billing export', TASK_CANDIDATE], 'A\n');
  assert.equal(saved.code, 0, saved.stderr);
  return { cwd, env, saved };
}

test('an approved OBJECTIVE: task candidate lands in working/ with tier, objective, and a TTL, and load routes it until it expires', async () => {
  const { cwd, env, saved } = await workspaceWithTaskMemory('engram-working-write-');
  assert.match(saved.stdout, /Objective: task\nTier: working \(expires 2026-10-21\)\n/);
  const raw = await readFile(workingFile(cwd), 'utf8');
  assert.match(raw, /^tier: working$/m);
  assert.match(raw, /^objective: "add billing export"$/m);
  assert.match(raw, new RegExp(`^valid_until: "?${EXPIRES}"?$`, 'm'));
  assert.equal(existsSync(durableFile(cwd)), false);

  const loaded = await runEngram(cwd, at(env, TODAY), ['load', 'billing export invoices ledger worker']);
  assert.equal(loaded.code, 0, loaded.stderr);
  assert.match(loaded.stdout, new RegExp(TASK_ID));
  assert.match(loaded.stdout, /working/);

  const lastDay = await runEngram(cwd, at(env, EXPIRES), ['load', 'billing export invoices ledger worker']);
  assert.match(lastDay.stdout, new RegExp(TASK_ID));
  const expired = await runEngram(cwd, at(env, '2026-10-22'), ['load', 'billing export invoices ledger worker']);
  assert.equal(expired.code, 0, expired.stderr);
  assert.doesNotMatch(expired.stdout, new RegExp(TASK_ID));

  const verified = await runEngram(cwd, at(env, TODAY), ['verify']);
  assert.equal(verified.code, 0, verified.stdout + verified.stderr);
  await rm(cwd, { recursive: true, force: true });
});

test('engram promote moves a working memory to durable on A and leaves it on C', async () => {
  const { cwd, env } = await workspaceWithTaskMemory('engram-working-promote-');
  const cancelled = await runEngram(cwd, at(env, TODAY), ['promote', TASK_ID], 'C\n');
  assert.equal(cancelled.code, 0, cancelled.stderr);
  assert.match(cancelled.stdout, /Discarded/);
  assert.match(cancelled.stdout, /working\/knowledge\//);
  assert.ok(existsSync(workingFile(cwd)));
  assert.equal(existsSync(durableFile(cwd)), false);

  const promoted = await runEngram(cwd, at(env, TODAY), ['promote', TASK_ID], 'A\n');
  assert.equal(promoted.code, 0, promoted.stderr);
  assert.match(promoted.stdout, /Promoted/);
  assert.equal(existsSync(workingFile(cwd)), false);
  const raw = await readFile(durableFile(cwd), 'utf8');
  assert.doesNotMatch(raw, /^tier:/m);
  assert.doesNotMatch(raw, /^valid_until:/m);
  assert.match(raw, /^revision: 2$/m);
  assert.match(raw, /^objective: "add billing export"$/m);

  // Durable now: it routes after the old TTL, verifies, and is indexed once under knowledge/.
  const later = await runEngram(cwd, at(env, '2026-12-01'), ['load', 'billing export invoices ledger worker']);
  assert.match(later.stdout, new RegExp(TASK_ID));
  const verified = await runEngram(cwd, at(env, TODAY), ['verify']);
  assert.equal(verified.code, 0, verified.stdout + verified.stderr);
  const index = JSON.parse(await readFile(path.join(workspaceMemoryRoot(cwd), 'memory.index.json'), 'utf8'));
  assert.deepEqual(index.entries.filter((entry) => entry.id === TASK_ID).map((entry) => entry.file), [`knowledge/${TASK_ID}.md`]);

  const again = await runEngram(cwd, at(env, TODAY), ['promote', TASK_ID], 'A\n');
  assert.notEqual(again.code, 0);
  assert.match(again.stderr, /already durable/);
  const unknown = await runEngram(cwd, at(env, TODAY), ['promote', 'no-such-memory'], 'A\n');
  assert.notEqual(unknown.code, 0);
  assert.match(unknown.stderr, /No working memory found/);
  await rm(cwd, { recursive: true, force: true });
});

test('engram promote refuses an expired working memory', async () => {
  const { cwd, env } = await workspaceWithTaskMemory('engram-working-promote-expired-');
  const expired = await runEngram(cwd, at(env, '2026-10-22'), ['promote', TASK_ID], 'A\n');
  assert.notEqual(expired.code, 0);
  assert.match(expired.stderr, /expired on 2026-10-21/);
  assert.ok(existsSync(workingFile(cwd)));
  await rm(cwd, { recursive: true, force: true });
});

test('engram working prune deletes expired working memories, lists them, and never touches durable memory', async () => {
  const { cwd, env } = await tempWorkspace('engram-working-prune-');
  await runEngram(cwd, env, ['inject']);
  const old = await runEngram(cwd, at(env, '2026-09-01'), ['save-session', '--scope', 'workspace', '--force'], 'TYPE: knowledge | TEXT: Legacy importer retries failed rows twice | OBJECTIVE: task\n');
  assert.equal(old.code, 0, old.stderr);
  const fresh = await runEngram(cwd, at(env, TODAY), ['save-session', '--scope', 'workspace', '--force'], [
    'TYPE: knowledge | TEXT: Search indexer warms the cache before deploys | OBJECTIVE: task',
    'TYPE: knowledge | TEXT: Payments service owns refund reconciliation'
  ].join('\n'));
  assert.equal(fresh.code, 0, fresh.stderr);
  const oldFile = workingFile(cwd, 'legacy-importer-retries-failed-rows-twice');
  const freshFile = workingFile(cwd, 'search-indexer-warms-the-cache-before-deploys');
  const durable = durableFile(cwd, 'payments-service-owns-refund-reconciliation');
  assert.ok(existsSync(oldFile) && existsSync(freshFile) && existsSync(durable));

  const dry = await runEngram(cwd, at(env, TODAY), ['working', 'prune', '--dry-run']);
  assert.equal(dry.code, 0, dry.stderr);
  assert.match(dry.stdout, /workspace:working\/knowledge\/legacy-importer-retries-failed-rows-twice\.md/);
  assert.doesNotMatch(dry.stdout, /search-indexer/);
  assert.ok(existsSync(oldFile));

  const pruned = await runEngram(cwd, at(env, TODAY), ['working', 'prune']);
  assert.equal(pruned.code, 0, pruned.stderr);
  assert.match(pruned.stdout, /Pruned 1 expired working memor/);
  assert.match(pruned.stdout, /legacy-importer-retries-failed-rows-twice/);
  assert.equal(existsSync(oldFile), false);
  assert.ok(existsSync(freshFile) && existsSync(durable));
  // Working entries live in the local working/ index; the committed index never names them.
  const index = await readFile(path.join(workspaceMemoryRoot(cwd), 'working', 'memory.index.json'), 'utf8');
  assert.doesNotMatch(index, /legacy-importer/);
  assert.match(index, /search-indexer-warms/);
  assert.doesNotMatch(await readFile(path.join(workspaceMemoryRoot(cwd), 'memory.index.json'), 'utf8'), /legacy-importer|search-indexer-warms/);
  const verified = await runEngram(cwd, at(env, TODAY), ['verify']);
  assert.equal(verified.code, 0, verified.stdout + verified.stderr);

  const none = await runEngram(cwd, at(env, TODAY), ['working', 'prune']);
  assert.match(none.stdout, /No expired working memories/);
  await rm(cwd, { recursive: true, force: true });
});

test('working/ is gitignored in workspace and global scopes, and a global working write still commits', async () => {
  const { cwd, env } = await tempWorkspace('engram-working-gitignore-');
  initGit(cwd);
  await runEngram(cwd, env, ['inject']);
  const saved = await runEngram(cwd, at(env, TODAY), ['save-session', '--scope', 'both', '--force'], `${TASK_CANDIDATE}\n`);
  assert.equal(saved.code, 0, saved.stderr);
  const workspaceIgnored = spawnSync('git', ['check-ignore', '-q', workingFile(cwd)], { cwd, encoding: 'utf8' });
  assert.equal(workspaceIgnored.status, 0, 'workspace working/ file must be gitignored');
  const globalFile = path.join(env.ENGRAM_GLOBAL_DIR, 'working', 'knowledge', `${TASK_ID}.md`);
  assert.match(await readFile(globalFile, 'utf8'), /^tier: working$/m);
  const globalIgnored = spawnSync('git', ['check-ignore', '-q', globalFile], { cwd: env.ENGRAM_GLOBAL_DIR, encoding: 'utf8' });
  assert.equal(globalIgnored.status, 0, 'global working/ file must be gitignored');
  const tracked = spawnSync('git', ['ls-files'], { cwd: env.ENGRAM_GLOBAL_DIR, encoding: 'utf8' }).stdout;
  assert.doesNotMatch(tracked, /^working\//m);
  assert.match(await readFile(path.join(workspaceMemoryRoot(cwd), '.gitignore'), 'utf8'), /^working\/$/m);
  await rm(cwd, { recursive: true, force: true });
});

test('--force writes task candidates to working/ and durable candidates exactly as before', async () => {
  const { cwd, env } = await tempWorkspace('engram-working-force-');
  await runEngram(cwd, env, ['inject']);
  const forced = await runEngram(cwd, at(env, TODAY), ['save-session', '--scope', 'workspace', '--force'], [
    TASK_CANDIDATE,
    'TYPE: knowledge | TEXT: Payments service owns refund reconciliation | OBJECTIVE: durable'
  ].join('\n'));
  assert.equal(forced.code, 0, forced.stderr);
  const working = await readFile(workingFile(cwd), 'utf8');
  assert.match(working, /^tier: working$/m);
  assert.match(working, new RegExp(`^valid_until: "?${EXPIRES}"?$`, 'm'));
  assert.doesNotMatch(working, /^objective:/m);
  const durable = await readFile(durableFile(cwd, 'payments-service-owns-refund-reconciliation'), 'utf8');
  assert.doesNotMatch(durable, /^(tier|objective|valid_until):/m);
  assert.equal(existsSync(workingFile(cwd, 'payments-service-owns-refund-reconciliation')), false);
  await rm(cwd, { recursive: true, force: true });
});

test('UPDATE keeps a working memory working, and a task candidate cannot rewrite a durable memory', async () => {
  const { cwd, env } = await workspaceWithTaskMemory('engram-working-update-');
  const updated = await runEngram(cwd, at(env, '2026-10-10'), ['save-session', '--scope', 'workspace', '--force'], `TYPE: knowledge | TEXT: The ledger worker also emails a nightly summary | UPDATE: ${TASK_ID} | OBJECTIVE: task\n`);
  assert.equal(updated.code, 0, updated.stderr);
  const raw = await readFile(workingFile(cwd), 'utf8');
  assert.match(raw, /^tier: working$/m);
  assert.match(raw, /^objective: "add billing export"$/m);
  assert.match(raw, new RegExp(`^valid_until: "?${EXPIRES}"?$`, 'm'));
  assert.match(raw, /^revision: 2$/m);
  assert.match(raw, /nightly summary/);

  const durableSave = await runEngram(cwd, at(env, TODAY), ['save-session', '--scope', 'workspace', '--force'], 'TYPE: knowledge | TEXT: Payments service owns refund reconciliation\n');
  assert.equal(durableSave.code, 0, durableSave.stderr);
  const before = await readFile(durableFile(cwd, 'payments-service-owns-refund-reconciliation'), 'utf8');
  const blocked = await runEngram(cwd, at(env, TODAY), ['save-session', '--scope', 'workspace', '--force'], 'TYPE: knowledge | TEXT: Refunds settle in two days | UPDATE: payments-service-owns-refund-reconciliation | OBJECTIVE: task\n');
  assert.notEqual(blocked.code, 0);
  assert.match(blocked.stderr, /durable memory; an OBJECTIVE: task candidate cannot change it/);
  assert.equal(await readFile(durableFile(cwd, 'payments-service-owns-refund-reconciliation'), 'utf8'), before);
  assert.equal(existsSync(workingFile(cwd, 'payments-service-owns-refund-reconciliation')), false);
  await rm(cwd, { recursive: true, force: true });
});

test('an expired working memory is never extended: auto-upsert adds a fresh one and UPDATE refuses', async () => {
  const { cwd, env } = await workspaceWithTaskMemory('engram-working-expired-update-');
  const before = await readFile(workingFile(cwd), 'utf8');
  const later = at(env, '2026-10-30');
  const resaved = await runEngram(cwd, later, ['save-session', '--scope', 'workspace', '--force'], `${TASK_CANDIDATE}\n`);
  assert.equal(resaved.code, 0, resaved.stderr);
  assert.equal(await readFile(workingFile(cwd), 'utf8'), before);
  const files = (await readdir(path.join(workspaceMemoryRoot(cwd), 'working', 'knowledge'))).filter((name) => name !== `${TASK_ID}.md`);
  assert.equal(files.length, 1);
  assert.match(await readFile(path.join(workspaceMemoryRoot(cwd), 'working', 'knowledge', files[0]), 'utf8'), /^valid_until: "?2026-11-13"?$/m);
  const loaded = await runEngram(cwd, later, ['load', 'billing export invoices ledger worker']);
  assert.match(loaded.stdout, new RegExp(files[0].replace(/\.md$/, '')));

  const blocked = await runEngram(cwd, later, ['save-session', '--scope', 'workspace', '--force'], `TYPE: knowledge | TEXT: The ledger worker emails a summary | UPDATE: ${TASK_ID} | OBJECTIVE: task\n`);
  assert.notEqual(blocked.code, 0);
  assert.match(blocked.stderr, /expired on 2026-10-21/);
  assert.equal(await readFile(workingFile(cwd), 'utf8'), before);
  await rm(cwd, { recursive: true, force: true });
});

test('load.working_ttl_days sets the TTL and must be a positive integer', async () => {
  const { cwd, env } = await tempWorkspace('engram-working-ttl-');
  await runEngram(cwd, env, ['inject']);
  const configFile = path.join(workspaceMemoryRoot(cwd), 'engram.config.json');
  const config = JSON.parse(await readFile(configFile, 'utf8'));
  await writeFile(configFile, JSON.stringify({ ...config, load: { ...config.load, working_ttl_days: 3 } }, null, 2));
  const short = await runEngram(cwd, at(env, TODAY), ['save-session', '--scope', 'workspace', '--force'], `${TASK_CANDIDATE}\n`);
  assert.equal(short.code, 0, short.stderr);
  assert.match(await readFile(workingFile(cwd), 'utf8'), /^valid_until: "?2026-10-10"?$/m);

  await writeFile(configFile, JSON.stringify({ ...config, load: { ...config.load, working_ttl_days: 0 } }, null, 2));
  const invalid = await runEngram(cwd, at(env, TODAY), ['save-session', '--scope', 'workspace', '--force'], 'TYPE: knowledge | TEXT: Search indexer warms the cache before deploys | OBJECTIVE: task\n');
  assert.notEqual(invalid.code, 0);
  assert.match(invalid.stderr, /load\.working_ttl_days must be a positive integer/);
  await rm(cwd, { recursive: true, force: true });
});

test('mcp engram_commit writes an approved task candidate to working/', async () => {
  const { cwd, env } = await tempWorkspace('engram-working-mcp-');
  const keys = ['ENGRAM_CONFIG_DIR', 'ENGRAM_GLOBAL_DIR', 'ENGRAM_TODAY', 'NODE_ENV', 'GIT_CONFIG_COUNT', 'GIT_CONFIG_KEY_0', 'GIT_CONFIG_VALUE_0', 'GIT_CONFIG_KEY_1', 'GIT_CONFIG_VALUE_1'];
  const previousEnv = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  for (const key of keys) {
    const value = key === 'ENGRAM_TODAY' ? TODAY : env[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  const previous = process.cwd();
  process.chdir(cwd);
  try {
    await runCli(['inject']);
    const call = (id, name, args) => handleMcp({ id, method: 'tools/call', params: { name, arguments: args } });
    const proposal = await call(1, 'engram_save_session', { text: TASK_CANDIDATE, scope: 'workspace' });
    assert.match(proposal.result.content[0].text, /Tier: working \(expires 2026-10-21\)/);
    const token = proposal.result.structuredContent.data.approval_token;
    const committed = await call(2, 'engram_commit', { approval_token: token, approve: 'all' });
    assert.equal(committed.result.isError, undefined, committed.result.content[0].text);
    const raw = await readFile(workingFile(cwd), 'utf8');
    assert.match(raw, /^tier: working$/m);
    assert.match(raw, new RegExp(`^valid_until: "?${EXPIRES}"?$`, 'm'));
    assert.equal(existsSync(durableFile(cwd)), false);
  } finally {
    process.chdir(previous);
    for (const key of keys) {
      if (previousEnv[key] === undefined) delete process.env[key];
      else process.env[key] = previousEnv[key];
    }
    await rm(cwd, { recursive: true, force: true });
  }
});

test('a durable file whose frontmatter claims tier: working stays durable, and a task UPDATE cannot target it', async () => {
  const { cwd, env } = await tempWorkspace('engram-working-forged-tier-');
  await runEngram(cwd, env, ['inject']);
  const id = 'refund-ledger-closes-at-midnight';
  const file = durableFile(cwd, id);
  const raw = `---
id: ${id}
type: knowledge
scope: workspace
tags: [refund, ledger]
created: 2026-06-05
updated: 2026-06-05
author: test@example.com
source: manual
confidence: high
tier: working
valid_until: "2026-01-01"
---

# Knowledge: ${id}

## Context

Test memory fixture.

## Content

- The refund ledger closes at midnight UTC.

## Example

Use this memory when a future task touches: refund, ledger.
`;
  await writeFile(file, raw);
  assert.equal((await runEngram(cwd, env, ['rebuild-index'])).code, 0);
  assert.equal((await runEngram(cwd, env, ['rehash', 'workspace'])).code, 0);
  const index = JSON.parse(await readFile(path.join(workspaceMemoryRoot(cwd), 'memory.index.json'), 'utf8'));
  const entry = index.entries.find((item) => item.id === id);
  assert.ok(entry, 'the durable file is in the committed index');
  assert.equal(entry.tier, undefined, 'frontmatter tier is ignored for durable paths');

  const blocked = await runEngram(cwd, at(env, TODAY), ['save-session', '--scope', 'workspace', '--force'], `TYPE: knowledge | TEXT: Refund ledger closes at 23:00 UTC | UPDATE: ${id} | OBJECTIVE: task\n`);
  assert.notEqual(blocked.code, 0);
  assert.match(blocked.stderr, /durable memory; an OBJECTIVE: task candidate cannot change it/);
  assert.equal(await readFile(file, 'utf8'), raw);
  assert.equal(existsSync(workingFile(cwd, id)), false);
  await rm(cwd, { recursive: true, force: true });
});
