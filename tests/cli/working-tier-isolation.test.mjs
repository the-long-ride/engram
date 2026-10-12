// Working-tier isolation (D16): working memories stay out of committed sidecars, inbox applies, and stale indexes.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { canonicalCandidateText, serializeCandidateForApply } from '../../dist/core/review/inbox.js';
import { initGit, runEngram, tempWorkspace, workspaceMemoryRoot } from '../helpers.mjs';

const TODAY = '2026-10-07';
const TASK_TEXT = 'Billing export batches invoices nightly through the ledger worker';
const TASK_ID = 'billing-export-batches-invoices-nightly-through-the-ledger-worker';
const TASK_CANDIDATE = `TYPE: knowledge | TEXT: ${TASK_TEXT} | OBJECTIVE: task`;
const SECRET_OBJECTIVE = 'confidential customer acme migration';
const QUERY = 'billing export invoices ledger worker';
const SIDECARS = ['memory.index.json', 'memory.hashes.json', 'memory.graph.json', 'changelog.md'];

function at(env, day) {
  return { ...env, ENGRAM_TODAY: day };
}

function workingFile(root, id = TASK_ID, dir = 'knowledge') {
  return path.join(root, 'working', dir, `${id}.md`);
}

async function assertSidecarsClean(root, label) {
  for (const name of SIDECARS) {
    const text = await readFile(path.join(root, name), 'utf8').catch(() => '');
    assert.doesNotMatch(text, new RegExp(TASK_ID), `${label} ${name} must not mention the working id`);
    assert.doesNotMatch(text, /acme/, `${label} ${name} must not carry the objective text`);
  }
}

test('working memories stay out of committed sidecars, and a fresh clone without working/ shows no phantoms', async () => {
  const { cwd, env } = await tempWorkspace('engram-working-sidecars-');
  initGit(cwd);
  await runEngram(cwd, env, ['inject']);
  const root = workspaceMemoryRoot(cwd);
  const saved = await runEngram(cwd, at(env, TODAY), ['take-control', '--scope', 'workspace', '--objective', SECRET_OBJECTIVE, TASK_CANDIDATE], 'A\n');
  assert.equal(saved.code, 0, saved.stderr);
  assert.ok(existsSync(workingFile(root)));
  await assertSidecarsClean(root, 'workspace');
  assert.match(await readFile(path.join(root, 'working', 'memory.index.json'), 'utf8'), new RegExp(TASK_ID));
  assert.match(await readFile(path.join(root, 'working', 'memory.hashes.json'), 'utf8'), new RegExp(TASK_ID));

  // A later durable write rebuilds every sidecar and still keeps the working entry local.
  const durable = await runEngram(cwd, at(env, TODAY), ['save-session', '--scope', 'workspace', '--force'], 'TYPE: knowledge | TEXT: Payments service owns refund reconciliation\n');
  assert.equal(durable.code, 0, durable.stderr);
  await assertSidecarsClean(root, 'workspace after durable write');
  const loaded = await runEngram(cwd, at(env, TODAY), ['load', QUERY]);
  assert.match(loaded.stdout, new RegExp(TASK_ID));
  const verified = await runEngram(cwd, at(env, TODAY), ['verify']);
  assert.equal(verified.code, 0, verified.stdout + verified.stderr);

  spawnSync('git', ['add', '-A'], { cwd });
  const staged = spawnSync('git', ['grep', '--cached', '-l', '-e', TASK_ID, '-e', 'acme'], { cwd, encoding: 'utf8' });
  assert.equal(staged.stdout.trim(), '', `staged files mention the working memory: ${staged.stdout}`);

  // Fresh clone: the committed files only, no working/ directory.
  await rm(path.join(root, 'working'), { recursive: true, force: true });
  const fresh = at(env, TODAY);
  const load = await runEngram(cwd, fresh, ['load', QUERY]);
  assert.equal(load.code, 0, load.stderr);
  assert.doesNotMatch(load.stdout + load.stderr, new RegExp(`${TASK_ID}|SKIPPED`));
  const stats = await runEngram(cwd, fresh, ['stats']);
  assert.doesNotMatch(stats.stdout, /Working tier/);
  const search = await runEngram(cwd, fresh, ['search', 'billing']);
  assert.doesNotMatch(search.stdout, new RegExp(TASK_ID));
  const doctor = await runEngram(cwd, fresh, ['doctor']);
  assert.doesNotMatch(doctor.stdout, new RegExp(`${TASK_ID}|rebuild-index`));
  await rm(cwd, { recursive: true, force: true });
});

test('a global working write commits nothing that names it', async () => {
  const { cwd, env } = await tempWorkspace('engram-working-global-git-');
  initGit(cwd);
  await runEngram(cwd, env, ['inject']);
  const global = env.ENGRAM_GLOBAL_DIR;
  const before = spawnSync('git', ['rev-list', '--count', 'HEAD'], { cwd: global, encoding: 'utf8' }).stdout.trim();
  const saved = await runEngram(cwd, at(env, TODAY), ['save-session', '--scope', 'global', '--force'], `${TASK_CANDIDATE}\n`);
  assert.equal(saved.code, 0, saved.stderr);
  assert.ok(existsSync(workingFile(global)));
  await assertSidecarsClean(global, 'global');
  const log = spawnSync('git', ['log', '--format=%s'], { cwd: global, encoding: 'utf8' }).stdout;
  assert.doesNotMatch(log, new RegExp(TASK_ID));
  assert.equal(spawnSync('git', ['rev-list', '--count', 'HEAD'], { cwd: global, encoding: 'utf8' }).stdout.trim(), before);
  const committed = spawnSync('git', ['grep', '-l', TASK_ID, 'HEAD'], { cwd: global, encoding: 'utf8' });
  assert.equal(committed.stdout.trim(), '');
  await rm(cwd, { recursive: true, force: true });
});

test('a stale index from an older build degrades gracefully and doctor asks for rebuild-index', async () => {
  const { cwd, env } = await tempWorkspace('engram-working-stale-index-');
  await runEngram(cwd, env, ['inject']);
  const root = workspaceMemoryRoot(cwd);
  const saved = await runEngram(cwd, at(env, TODAY), ['save-session', '--scope', 'workspace', '--force'], `${TASK_CANDIDATE}\n`);
  assert.equal(saved.code, 0, saved.stderr);
  // Older builds kept working entries in the committed index; a clone then lacks the working file.
  const working = JSON.parse(await readFile(path.join(root, 'working', 'memory.index.json'), 'utf8'));
  const mainFile = path.join(root, 'memory.index.json');
  const main = JSON.parse(await readFile(mainFile, 'utf8'));
  await writeFile(mainFile, JSON.stringify({ ...main, entries: [...main.entries, ...working.entries] }, null, 2));
  await rm(path.join(root, 'working'), { recursive: true, force: true });

  const day = at(env, TODAY);
  const load = await runEngram(cwd, day, ['load', QUERY]);
  assert.equal(load.code, 0, load.stderr);
  assert.doesNotMatch(load.stdout + load.stderr, new RegExp(`${TASK_ID}|SKIPPED`));
  assert.doesNotMatch((await runEngram(cwd, day, ['search', 'billing'])).stdout, new RegExp(TASK_ID));
  assert.doesNotMatch((await runEngram(cwd, day, ['stats'])).stdout, /Working tier/);
  const doctor = await runEngram(cwd, day, ['doctor']);
  assert.match(doctor.stdout, /engram rebuild-index/);
  const promote = await runEngram(cwd, day, ['promote', TASK_ID], 'A\n');
  assert.notEqual(promote.code, 0);
  assert.match(promote.stderr, /engram rebuild-index/);
  assert.doesNotMatch(promote.stdout, /Promote /);

  const rebuilt = await runEngram(cwd, day, ['rebuild-index']);
  assert.equal(rebuilt.code, 0, rebuilt.stderr);
  assert.doesNotMatch(await readFile(mainFile, 'utf8'), new RegExp(TASK_ID));
  assert.doesNotMatch((await runEngram(cwd, day, ['doctor'])).stdout, /rebuild-index/);
  await rm(cwd, { recursive: true, force: true });
});

test('inbox receipts keep OBJECTIVE: task, so review apply never merges a task candidate into durable memory', async () => {
  const { cwd, env } = await tempWorkspace('engram-working-inbox-block-');
  await runEngram(cwd, env, ['inject']);
  const root = workspaceMemoryRoot(cwd);
  const day = at(env, TODAY);
  await runEngram(cwd, day, ['save', '--scope', 'workspace', '--force', 'TYPE: knowledge | TEXT: Billing export ledger worker batches invoices for nightly runs']);
  const durableFile = path.join(root, 'knowledge', 'billing-export-ledger-worker-batches-invoices-for-nightly-runs.md');
  const before = await readFile(durableFile, 'utf8');
  const deferred = await runEngram(cwd, day, ['save-session', '--scope', 'workspace', '--force', '--inbox'], 'TYPE: knowledge | TEXT: Billing export ledger worker now retries invoices nightly with backoff | OBJECTIVE: task\n');
  assert.equal(deferred.code, 0, deferred.stderr);
  assert.doesNotMatch(deferred.stdout, /Action: rerun with UPDATE:/);
  assert.match(deferred.stdout, /durable; an OBJECTIVE: task candidate cannot UPDATE it/);
  const receiptId = deferred.stdout.match(/\br-[a-z0-9]+\b/)?.[0];
  assert.ok(receiptId, deferred.stdout);
  const receipt = JSON.parse(await readFile(path.join(root, 'inbox', `${receiptId}.json`), 'utf8'));
  assert.equal(receipt.candidate.objective, 'task');

  const applied = await runEngram(cwd, day, ['review', 'apply', receiptId, '--force']);
  assert.equal(applied.code, 0, applied.stderr);
  assert.match(applied.stdout, /Apply blocked/);
  assert.match(applied.stdout, /OBJECTIVE: task/);
  assert.equal(await readFile(durableFile, 'utf8'), before);
  assert.equal(existsSync(path.join(root, 'working', 'knowledge')) && (await readdir(path.join(root, 'working', 'knowledge'))).length > 0, false);
  await rm(cwd, { recursive: true, force: true });
});

test('review apply writes a task receipt to the working tier and previews the tier', async () => {
  const { cwd, env } = await tempWorkspace('engram-working-inbox-apply-');
  await runEngram(cwd, env, ['inject']);
  const root = workspaceMemoryRoot(cwd);
  const day = at(env, TODAY);
  await runEngram(cwd, day, ['save', 'knowledge', '--scope', 'workspace', 'Release foundation checklist lives in docs/release.md'], 'A\n');
  const corpusId = 'release-foundation-checklist-lives-in-docs-release-md';
  const deferred = await runEngram(cwd, day, ['save-session', '--scope', 'workspace', '--force', '--inbox'], 'TYPE: rule | TEXT: DeferredNeedleInbox must follow the release foundation checklist | OBJECTIVE: task\n');
  assert.equal(deferred.code, 0, deferred.stderr);
  const receiptId = deferred.stdout.match(/\br-[a-z0-9]+\b/)?.[0];
  assert.ok(receiptId, deferred.stdout);
  const applied = await runEngram(cwd, day, ['review', 'apply', receiptId, '--depends-on', corpusId], 'A\n');
  assert.equal(applied.code, 0, applied.stderr);
  assert.match(applied.stdout, /Objective: task\nTier: working \(expires 2026-10-21\)/);
  const file = workingFile(root, 'deferredneedleinbox-must-follow-the-release-foundation-checklist', 'rules');
  const raw = await readFile(file, 'utf8');
  assert.match(raw, /^tier: working$/m);
  assert.match(raw, /^valid_until: "?2026-10-21"?$/m);
  assert.equal(existsSync(path.join(root, 'rules', 'deferredneedleinbox-must-follow-the-release-foundation-checklist.md')), false);
  await rm(cwd, { recursive: true, force: true });
});

test('receipt canonical text only gains OBJECTIVE when the candidate carries it', () => {
  const candidate = { type: 'rule', text: 'Always run tests', scope: 'workspace' };
  assert.equal(canonicalCandidateText(candidate), 'TYPE: rule | TEXT: Always run tests | SCOPE: workspace');
  assert.equal(serializeCandidateForApply(candidate), 'TYPE: rule | TEXT: Always run tests');
  assert.equal(canonicalCandidateText({ ...candidate, objective: 'task' }), 'TYPE: rule | TEXT: Always run tests | SCOPE: workspace | OBJECTIVE: task');
  assert.equal(serializeCandidateForApply({ ...candidate, objective: 'task' }), 'TYPE: rule | TEXT: Always run tests | OBJECTIVE: task');
});

test('autosave --policy writes an OBJECTIVE: task candidate to the working tier', async () => {
  const { cwd, env } = await tempWorkspace('engram-working-autosave-');
  await runEngram(cwd, env, ['inject', '--no-skillset']);
  const policyFile = path.join(cwd, '.agents', 'engram.policy.json');
  await mkdir(path.dirname(policyFile), { recursive: true });
  await writeFile(policyFile, JSON.stringify({
    version: 1,
    autonomous_writes: { enabled: true, mode: 'autonomous', allowed_types: ['knowledge'], allowed_scopes: ['workspace'], allowed_sources: ['autosave'], confidence_threshold: 'high', daily_limit: 2, rollback_retention_days: 30 },
    review: { max_rule_lines: 100, benchmark_min_recall_at_k: 0.9 }
  }, null, 2));
  const saved = await runEngram(cwd, at(env, TODAY), ['autosave', '--policy', '--scope', 'workspace', '--skip-task-type-prompt', '--json', `TYPE: knowledge | CONFIDENCE: high | TEXT: ${TASK_TEXT} | OBJECTIVE: task`]);
  assert.equal(saved.code, 0, saved.stderr);
  assert.equal(JSON.parse(saved.stdout).data.status, 'written');
  const root = workspaceMemoryRoot(cwd);
  assert.match(await readFile(workingFile(root), 'utf8'), /^tier: working$/m);
  assert.equal(existsSync(path.join(root, 'knowledge', `${TASK_ID}.md`)), false);
  await rm(cwd, { recursive: true, force: true });
});

test('ENGRAM_TODAY only pins the clock when NODE_ENV=test', async () => {
  const { cwd, env } = await tempWorkspace('engram-working-clock-');
  await runEngram(cwd, env, ['inject']);
  const production = { ...env, NODE_ENV: 'production', ENGRAM_TODAY: '2030-01-01' };
  const saved = await runEngram(cwd, production, ['save-session', '--scope', 'workspace', '--force'], `${TASK_CANDIDATE}\n`);
  assert.equal(saved.code, 0, saved.stderr);
  const raw = await readFile(workingFile(workspaceMemoryRoot(cwd)), 'utf8');
  assert.doesNotMatch(raw, /2030-01-(01|15)/);
  await rm(cwd, { recursive: true, force: true });
});

test('working memories without valid_until are reported by prune and doctor but never deleted', async () => {
  const { cwd, env } = await tempWorkspace('engram-working-undated-');
  await runEngram(cwd, env, ['inject']);
  const root = workspaceMemoryRoot(cwd);
  await runEngram(cwd, at(env, TODAY), ['save-session', '--scope', 'workspace', '--force'], `${TASK_CANDIDATE}\n`);
  const file = workingFile(root);
  await writeFile(file, (await readFile(file, 'utf8')).replace(/^valid_until:.*\r?\n/m, ''));
  await runEngram(cwd, env, ['rehash']);
  const later = at(env, '2030-01-01');
  const pruned = await runEngram(cwd, later, ['working', 'prune']);
  assert.equal(pruned.code, 0, pruned.stderr);
  assert.match(pruned.stdout, /no valid_until/);
  assert.match(pruned.stdout, new RegExp(`workspace:working/knowledge/${TASK_ID}\\.md`));
  assert.ok(existsSync(file));
  const doctor = await runEngram(cwd, later, ['doctor']);
  assert.match(doctor.stdout, new RegExp(`working/knowledge/${TASK_ID}\\.md.*valid_until|valid_until.*${TASK_ID}`));
  await rm(cwd, { recursive: true, force: true });
});

test('search labels working memories and marks expired ones', async () => {
  const { cwd, env } = await tempWorkspace('engram-working-search-');
  await runEngram(cwd, env, ['inject']);
  await runEngram(cwd, at(env, TODAY), ['save-session', '--scope', 'workspace', '--force'], `${TASK_CANDIDATE}\n`);
  const fresh = await runEngram(cwd, at(env, TODAY), ['search', 'billing']);
  assert.match(fresh.stdout, /knowledge \[working\]/);
  const expired = await runEngram(cwd, at(env, '2026-10-22'), ['search', 'billing']);
  assert.match(expired.stdout, /knowledge \[working, expired\]/);
  await rm(cwd, { recursive: true, force: true });
});

test('load.working_ttl_days is capped at 365 like the web config schema', async () => {
  const { cwd, env } = await tempWorkspace('engram-working-ttl-cap-');
  await runEngram(cwd, env, ['inject']);
  const configFile = path.join(workspaceMemoryRoot(cwd), 'engram.config.json');
  const config = JSON.parse(await readFile(configFile, 'utf8'));
  await writeFile(configFile, JSON.stringify({ ...config, load: { ...config.load, working_ttl_days: 366 } }, null, 2));
  const invalid = await runEngram(cwd, at(env, TODAY), ['save-session', '--scope', 'workspace', '--force'], `${TASK_CANDIDATE}\n`);
  assert.notEqual(invalid.code, 0);
  assert.match(invalid.stderr, /load\.working_ttl_days must be a positive integer up to 365/);
  await rm(cwd, { recursive: true, force: true });
});

function git(cwd, args) {
  return spawnSync('git', args, { cwd, encoding: 'utf8' });
}

function commitAll(cwd) {
  git(cwd, ['add', '-A']);
  git(cwd, ['commit', '-q', '-m', 'baseline']);
}

function assertNothingStagedNames(cwd, patterns) {
  git(cwd, ['add', '-A']);
  const staged = git(cwd, ['grep', '--cached', '-l', ...patterns.flatMap((pattern) => ['-e', pattern])]);
  assert.equal(staged.stdout.trim(), '', `staged files name the working memory: ${staged.stdout}`);
}

test('archiving a working memory stays inside working/ and names it in no committed file', async () => {
  const { cwd, env } = await tempWorkspace('engram-working-archive-');
  initGit(cwd);
  await runEngram(cwd, env, ['inject']);
  const day = at(env, TODAY);
  const saved = await runEngram(cwd, day, ['take-control', '--scope', 'both', '--objective', SECRET_OBJECTIVE, TASK_CANDIDATE], 'A\n');
  assert.equal(saved.code, 0, saved.stderr);
  const global = env.ENGRAM_GLOBAL_DIR;
  const globalCommits = git(global, ['rev-list', '--count', 'HEAD']).stdout.trim();
  // The workspace archive also archives the same-tier global twin, as it does for durable memories.
  const archived = await runEngram(cwd, day, ['archive', `workspace:${TASK_ID}`, '--reason', 'done'], 'A\n');
  assert.equal(archived.code, 0, archived.stderr);
  assert.match(archived.stdout, /Also archive: global:working\/knowledge\//);
  const root = workspaceMemoryRoot(cwd);
  for (const scopeRoot of [root, global]) {
    assert.ok(existsSync(path.join(scopeRoot, 'working', 'archive', TODAY, 'knowledge', `${TASK_ID}.md`)), `${scopeRoot} working archive`);
    assert.equal(existsSync(path.join(scopeRoot, 'archive', TODAY, 'working')), false);
    await assertSidecarsClean(scopeRoot, scopeRoot === root ? 'workspace' : 'global');
  }
  assertNothingStagedNames(cwd, [TASK_ID, 'acme']);
  assert.equal(git(global, ['rev-list', '--count', 'HEAD']).stdout.trim(), globalCommits, 'archiving a working memory must not commit global Git');
  assert.doesNotMatch(git(global, ['log', '--format=%B']).stdout, new RegExp(TASK_ID));
  // Archived working files are never indexed or loaded again.
  assert.doesNotMatch((await runEngram(cwd, day, ['load', QUERY])).stdout, new RegExp(TASK_ID));
  assert.doesNotMatch((await runEngram(cwd, day, ['search', 'billing'])).stdout, new RegExp(TASK_ID));
  await rm(cwd, { recursive: true, force: true });
});

test('policy rollback of an autosaved task candidate leaves no committed trace of it', async () => {
  const { cwd, env } = await tempWorkspace('engram-working-rollback-');
  initGit(cwd);
  await runEngram(cwd, env, ['inject', '--no-skillset']);
  const policyFile = path.join(cwd, '.agents', 'engram.policy.json');
  await writeFile(policyFile, JSON.stringify({
    version: 1,
    autonomous_writes: { enabled: true, mode: 'autonomous', allowed_types: ['knowledge'], allowed_scopes: ['workspace'], allowed_sources: ['autosave'], confidence_threshold: 'high', daily_limit: 2, rollback_retention_days: 30 },
    review: { max_rule_lines: 100, benchmark_min_recall_at_k: 0.9 }
  }, null, 2));
  const day = at(env, TODAY);
  const saved = await runEngram(cwd, day, ['autosave', '--policy', '--scope', 'workspace', '--skip-task-type-prompt', '--json', `TYPE: knowledge | CONFIDENCE: high | TEXT: ${TASK_TEXT} | OBJECTIVE: task`]);
  assert.equal(saved.code, 0, saved.stderr);
  const auditId = JSON.parse(saved.stdout).data.audit_id;
  assertNothingStagedNames(cwd, [TASK_ID]);
  const rolled = await runEngram(cwd, day, ['policy', 'rollback', auditId, '--json']);
  assert.equal(rolled.code, 0, rolled.stderr);
  assert.equal(JSON.parse(rolled.stdout).data.rolled_back, auditId);
  const root = workspaceMemoryRoot(cwd);
  assert.equal(existsSync(workingFile(root)), false);
  assert.ok(existsSync(path.join(root, 'working', 'archive', TODAY, 'knowledge', `${TASK_ID}.md`)));
  await assertSidecarsClean(root, 'workspace');
  assertNothingStagedNames(cwd, [TASK_ID]);
  const audit = await runEngram(cwd, day, ['policy', 'audit', '--json']);
  assert.ok(JSON.parse(audit.stdout).data.records.some((record) => record.id === auditId && record.status === 'rolled_back'));
  await rm(cwd, { recursive: true, force: true });
});

test('rebuild-index moves working keys out of a committed hash store left by an older build, and doctor flags them first', async () => {
  const { cwd, env } = await tempWorkspace('engram-working-stale-hashes-');
  await runEngram(cwd, env, ['inject']);
  const root = workspaceMemoryRoot(cwd);
  const day = at(env, TODAY);
  await runEngram(cwd, day, ['save-session', '--scope', 'workspace', '--force'], `${TASK_CANDIDATE}\n`);
  const mainFile = path.join(root, 'memory.hashes.json');
  const merged = { ...JSON.parse(await readFile(mainFile, 'utf8')), ...JSON.parse(await readFile(path.join(root, 'working', 'memory.hashes.json'), 'utf8')) };
  await writeFile(mainFile, JSON.stringify(merged, null, 2));
  await rm(path.join(root, 'working', 'memory.hashes.json'));
  const doctor = await runEngram(cwd, day, ['doctor']);
  assert.match(doctor.stdout, /engram rebuild-index/);
  const rebuilt = await runEngram(cwd, day, ['rebuild-index']);
  assert.equal(rebuilt.code, 0, rebuilt.stderr);
  assert.doesNotMatch(await readFile(mainFile, 'utf8'), new RegExp(TASK_ID));
  assert.match(await readFile(path.join(root, 'working', 'memory.hashes.json'), 'utf8'), new RegExp(TASK_ID));
  assert.doesNotMatch((await runEngram(cwd, day, ['doctor'])).stdout, /rebuild-index/);
  const verified = await runEngram(cwd, day, ['verify']);
  assert.equal(verified.code, 0, verified.stdout + verified.stderr);
  await rm(cwd, { recursive: true, force: true });
});

test('working-only saves and prune leave every tracked sidecar unmodified in workspace and global repos', async () => {
  const { cwd, env } = await tempWorkspace('engram-working-untracked-');
  initGit(cwd);
  await runEngram(cwd, env, ['inject']);
  await runEngram(cwd, at(env, TODAY), ['save-session', '--scope', 'both', '--force'], 'TYPE: knowledge | TEXT: Payments service owns refund reconciliation\n');
  commitAll(cwd);
  const global = env.ENGRAM_GLOBAL_DIR;
  const tracked = (dir) => git(dir, ['status', '--porcelain', '--untracked-files=no']).stdout.trim();
  assert.equal(tracked(cwd), '');
  assert.equal(tracked(global), '');
  const globalCommits = git(global, ['rev-list', '--count', 'HEAD']).stdout.trim();
  const saved = await runEngram(cwd, at(env, '2026-09-01'), ['save-session', '--scope', 'both', '--force'], `${TASK_CANDIDATE}\n`);
  assert.equal(saved.code, 0, saved.stderr);
  assert.equal(tracked(cwd), '', 'workspace working save modified tracked files');
  assert.equal(tracked(global), '', 'global working save modified tracked files');
  const pruned = await runEngram(cwd, at(env, TODAY), ['working', 'prune']);
  assert.match(pruned.stdout, /Pruned 2 expired working memories/);
  assert.equal(tracked(cwd), '', 'workspace prune modified tracked files');
  assert.equal(tracked(global), '', 'global prune modified tracked files');
  assert.equal(git(global, ['rev-list', '--count', 'HEAD']).stdout.trim(), globalCommits);
  await rm(cwd, { recursive: true, force: true });
});

test('sync and export --format never publish working memories; the JSON bundle keeps live ones and drops expired ones', async () => {
  const { cwd, env } = await tempWorkspace('engram-working-sync-export-');
  await runEngram(cwd, env, ['inject', '--no-skillset']);
  const root = workspaceMemoryRoot(cwd);
  const saved = await runEngram(cwd, at(env, TODAY), ['take-control', '--scope', 'workspace', '--objective', 'acmeconfidential migration', TASK_CANDIDATE], 'A\n');
  assert.equal(saved.code, 0, saved.stderr);
  assert.ok(existsSync(workingFile(root)));
  const durable = await runEngram(cwd, at(env, TODAY), ['save-session', '--scope', 'workspace', '--force'], 'TYPE: knowledge | TEXT: Release deploy windows open every Tuesday at noon UTC\n');
  assert.equal(durable.code, 0, durable.stderr);
  const configFile = path.join(root, 'engram.config.json');
  const config = JSON.parse(await readFile(configFile, 'utf8'));
  await writeFile(configFile, JSON.stringify({ ...config, live_sync: { enabled: true, targets: ['agents-md', 'claude-md', 'cursorrules'] } }, null, 2));

  const synced = await runEngram(cwd, at(env, TODAY), ['sync']);
  assert.equal(synced.code, 0, synced.stdout + synced.stderr);
  for (const target of ['AGENTS.md', 'CLAUDE.md', path.join('.cursor', 'rules', 'engram.mdc')]) {
    const text = await readFile(path.join(cwd, target), 'utf8');
    assert.match(text, /Tuesday at noon/, `${target} keeps durable memory`);
    assert.doesNotMatch(text, new RegExp(TASK_ID), `${target} must not name the working id`);
    assert.doesNotMatch(text, /acmeconfidential|tier: working/, `${target} must not carry the objective or tier`);
  }
  for (const format of ['agents-md', 'claude-md', 'cursorrules', 'cursor-rules']) {
    const exported = await runEngram(cwd, at(env, TODAY), ['export', '--format', format]);
    assert.equal(exported.code, 0, exported.stderr);
    assert.match(exported.stdout, /Tuesday at noon/);
    assert.doesNotMatch(exported.stdout, new RegExp(`${TASK_ID}|acmeconfidential`), format);
  }

  const bundle = async (day, name) => {
    const out = path.join(cwd, name);
    assert.equal((await runEngram(cwd, at(env, day), ['export', '--out', out])).code, 0);
    return JSON.parse(await readFile(out, 'utf8')).memories.map((item) => item.entry.id);
  };
  assert.ok((await bundle(TODAY, 'live.json')).includes(TASK_ID), 'a live working memory stays in the JSON bundle');
  const later = await bundle('2026-11-30', 'expired.json');
  assert.ok(!later.includes(TASK_ID), 'an expired working memory is dropped from the JSON bundle');
  assert.ok(later.length > 0);
  await rm(cwd, { recursive: true, force: true });
});

test('default export bundle lands in the gitignored scope exports folder; explicit --out notes working memories', async () => {
  const { cwd, env } = await tempWorkspace('engram-working-export-default-');
  initGit(cwd);
  await runEngram(cwd, env, ['inject', '--no-skillset']);
  const saved = await runEngram(cwd, at(env, TODAY), ['take-control', '--scope', 'workspace', '--objective', SECRET_OBJECTIVE, TASK_CANDIDATE], 'A\n');
  assert.equal(saved.code, 0, saved.stderr);
  const exported = await runEngram(cwd, at(env, TODAY), ['export']);
  assert.equal(exported.code, 0, exported.stderr);
  const exportsDir = path.join(workspaceMemoryRoot(cwd), 'exports');
  const [name] = await readdir(exportsDir);
  assert.match(name, /^engram-bundle-\d{4}-\d{2}-\d{2}\.json$/u);
  assert.ok(exported.stdout.includes(path.join(exportsDir, name)), exported.stdout);
  assert.deepEqual((await readdir(cwd)).filter((file) => file.startsWith('engram-bundle-')), [], 'no bundle in the cwd');
  const ids = JSON.parse(await readFile(path.join(exportsDir, name), 'utf8')).memories.map((item) => item.entry.id);
  assert.ok(ids.includes(TASK_ID), 'the local default bundle keeps the live working memory');
  const status = spawnSync('git', ['status', '--porcelain', '-uall'], { cwd, encoding: 'utf8' }).stdout;
  assert.doesNotMatch(status, /exports|engram-bundle/u, status);

  const out = path.join(cwd, 'shared-bundle.json');
  const explicit = await runEngram(cwd, at(env, TODAY), ['export', '--out', out]);
  assert.equal(explicit.code, 0, explicit.stderr);
  assert.match(explicit.stdout, /contains 1 working \(task-scoped\) memor/u);
  await rm(cwd, { recursive: true, force: true });
});
