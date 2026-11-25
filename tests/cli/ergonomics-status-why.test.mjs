import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { initGit, runEngram, tempWorkspace, workspaceMemoryRoot } from '../helpers.mjs';
import { testMemory } from './fixtures.mjs';

function stripAnsi(text) {
  return text.replace(/\x1b\[[0-9;]*m/g, '');
}

async function seedMemory(cwd, env, { id, tags, content }) {
  const root = workspaceMemoryRoot(cwd);
  const file = path.join(root, 'knowledge', `${id}.md`);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, testMemory({ id, tags, content }), 'utf8');
  const rebuild = await runEngram(cwd, env, ['rebuild-index', 'workspace']);
  assert.equal(rebuild.code, 0, rebuild.stderr);
  const rehash = await runEngram(cwd, env, ['rehash', 'workspace']);
  assert.equal(rehash.code, 0, rehash.stderr);
  return file;
}

test('status renders dashboard text and structured JSON (including stat alias)', async () => {
  const { cwd, env } = await tempWorkspace('engram-status-');
  try {
    const init = await runEngram(cwd, env, ['inject', '--no-skillset', '--scope', 'workspace']);
    assert.equal(init.code, 0, init.stderr);
    await seedMemory(cwd, env, {
      id: 'pnpm-package-manager',
      tags: ['pnpm', 'packages', 'install'],
      content: 'Always use pnpm for dependency installs in this workspace.'
    });

    const text = await runEngram(cwd, env, ['status']);
    assert.equal(text.code, 0, text.stderr);
    const plain = stripAnsi(text.stdout);
    assert.match(plain, /Engram status/);
    assert.match(plain, /Profile:/);
    assert.match(plain, /Memories:\s+1 durable/);
    assert.match(plain, /Review:/);
    assert.match(plain, /Health:/);
    assert.match(plain, /Hooks:/);

    // Trigger an actionable Next hint via a pending inbox receipt.
    const receiptFile = path.join(workspaceMemoryRoot(cwd), 'inbox', 'r-status1.json');
    await mkdir(path.dirname(receiptFile), { recursive: true });
    await writeFile(receiptFile, JSON.stringify({
      id: 'r-status1',
      source: 'session-learning',
      scope: 'workspace',
      created_at: new Date().toISOString(),
      expires_at: '2099-12-31T00:00:00Z',
      candidate_hash: 'sha256:0000',
      related_ids: [],
      candidate: { type: 'knowledge', scope: 'workspace', text: 'Status pending receipt test.', tags: ['status'], confidence: 'high' }
    }), 'utf8');
    const withNext = await runEngram(cwd, env, ['status']);
    assert.equal(withNext.code, 0, withNext.stderr);
    assert.match(stripAnsi(withNext.stdout), /Next:/);
    assert.match(stripAnsi(withNext.stdout), /review triage/);

    const jsonRes = await runEngram(cwd, env, ['stat', '--json']);
    assert.equal(jsonRes.code, 0, jsonRes.stderr);
    const parsed = JSON.parse(jsonRes.stdout);
    assert.equal(parsed.ok, true);
    assert.equal(parsed.data.memories.durable.total, 1);
    assert.equal(parsed.data.memories.durable.workspace, 1);
    assert.equal(parsed.data.memories.working.active, 0);
    assert.equal(parsed.data.memories.working.expired, 0);
    assert.equal(parsed.data.review.pending_findings, 0);
    assert.equal(parsed.data.review.inbox_receipts, 1);
    assert.equal(parsed.data.review.session_learning_receipts, 1);
    assert.equal(parsed.data.health.stale_sources, 0);
    assert.equal(parsed.data.health.noisy_memories, 0);
    assert.ok(Array.isArray(parsed.data.hooks.linked));
    assert.ok(Array.isArray(parsed.data.next));
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

test('why explains expanded_body, rejected_no_anchor, not_found, and usage error', async () => {
  const { cwd, env } = await tempWorkspace('engram-why-');
  try {
    const init = await runEngram(cwd, env, ['inject', '--no-skillset', '--scope', 'workspace']);
    assert.equal(init.code, 0, init.stderr);
    await seedMemory(cwd, env, {
      id: 'pnpm-install-policy',
      tags: ['pnpm', 'packages', 'install'],
      content: 'Use pnpm install instead of npm install for all workspace dependencies.'
    });

    const usage = await runEngram(cwd, env, ['why']);
    assert.equal(usage.code, 2);

    const matched = await runEngram(cwd, env, ['why', 'pnpm-install-policy', 'install pnpm packages', '--json']);
    assert.equal(matched.code, 0, matched.stderr);
    const matchedData = JSON.parse(matched.stdout).data;
    assert.equal(matchedData.status, 'expanded_body');
    assert.ok(matchedData.matched_stems.includes('pnpm'));
    assert.ok(matchedData.rank >= 1);
    assert.ok(typeof matchedData.hint === 'string' && matchedData.hint.length > 0);

    const text = await runEngram(cwd, env, ['why', 'pnpm-install-policy', 'install pnpm packages']);
    assert.equal(text.code, 0, text.stderr);
    assert.match(stripAnsi(text.stdout), /Status:\s+expanded_body/);
    assert.match(stripAnsi(text.stdout), /Hint:/);

    const missed = await runEngram(cwd, env, ['why', 'pnpm-install-policy', 'kubernetes terraform cluster', '--json']);
    assert.equal(missed.code, 0, missed.stderr);
    const missedData = JSON.parse(missed.stdout).data;
    assert.equal(missedData.status, 'rejected_no_anchor');
    assert.ok(missedData.missing_stems.length > 0);

    const missing = await runEngram(cwd, env, ['why', 'nonexistent-memory-id', 'pnpm', '--json']);
    assert.equal(missing.code, 0, missing.stderr);
    const missingData = JSON.parse(missing.stdout).data;
    assert.equal(missingData.status, 'not_found');
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

test('help --compact shows short grouped view while -h preserves full usage signatures', async () => {
  const { cwd, env } = await tempWorkspace('engram-help-compact-');
  try {
    const compact = await runEngram(cwd, env, ['help', '--compact']);
    assert.equal(compact.code, 0, compact.stderr);
    const compactPlain = stripAnsi(compact.stdout);
    assert.match(compactPlain, /## Daily/);
    assert.match(compactPlain, /## Learn & Maintain/);
    assert.match(compactPlain, /## Configure & Connect/);
    assert.ok(compactPlain.trim().split(/\r?\n/).length <= 30);

    const full = await runEngram(cwd, env, ['-h']);
    assert.equal(full.code, 0, full.stderr);
    const fullPlain = stripAnsi(full.stdout);
    assert.match(fullPlain, /engram load \[--id id\[,id\]\]/);
    assert.match(fullPlain, /\[--from claude-auto-memory\|codex-memories\]/);
    assert.ok(fullPlain.split(/\r?\n/).length > compactPlain.split(/\r?\n/).length);
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

test('graph link wires parent DEPENDS_ON into child memory and is idempotent', async () => {
  const { cwd, env } = await tempWorkspace('engram-graph-link-');
  try {
    const init = await runEngram(cwd, env, ['inject', '--no-skillset', '--scope', 'workspace']);
    assert.equal(init.code, 0, init.stderr);
    await seedMemory(cwd, env, {
      id: 'release-foundation',
      tags: ['release', 'foundation'],
      content: 'Release foundation defines the required verification gates.'
    });
    const childFile = await seedMemory(cwd, env, {
      id: 'deploy-checklist',
      tags: ['deploy', 'release'],
      content: 'Run smoke tests immediately after production deployment.'
    });

    const first = await runEngram(cwd, env, ['graph', 'link', 'release-foundation', 'deploy-checklist', '--json']);
    assert.equal(first.code, 0, first.stderr);
    const firstData = JSON.parse(first.stdout).data;
    assert.equal(firstData.parent, 'release-foundation');
    assert.equal(firstData.updated, 1);
    assert.equal(firstData.skipped, 0);
    const updatedContent = await readFile(childFile, 'utf8');
    assert.match(updatedContent, /depends_on:.*release-foundation/s);

    const second = await runEngram(cwd, env, ['graph', 'link', 'release-foundation', 'deploy-checklist', '--json']);
    assert.equal(second.code, 0, second.stderr);
    const secondData = JSON.parse(second.stdout).data;
    assert.equal(secondData.updated, 0);
    assert.equal(secondData.skipped, 1);
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

test('review triage processes piped stdin a/d/q across inbox receipts', async () => {
  const { cwd, env } = await tempWorkspace('engram-review-triage-');
  try {
    const init = await runEngram(cwd, env, ['inject', '--no-skillset', '--scope', 'workspace']);
    assert.equal(init.code, 0, init.stderr);
    const inboxDir = path.join(workspaceMemoryRoot(cwd), 'inbox');
    await mkdir(inboxDir, { recursive: true });
    const now = new Date();
    const expires = new Date(now.getTime() + 7 * 864e5).toISOString();
    const receipts = [
      { id: 'r-triage0001', text: 'Always run database migrations in a transaction before deploying.' },
      { id: 'r-triage0002', text: 'Temporary note that should be dismissed during triage.' },
      { id: 'r-triage0003', text: 'Third receipt left untouched after quitting triage.' }
    ];
    for (const item of receipts) {
      await writeFile(
        path.join(inboxDir, `${item.id}.json`),
        JSON.stringify({
          id: item.id,
          scope: 'workspace',
          source: 'session-learning',
          candidate: { type: 'knowledge', text: item.text, scope: 'workspace' },
          candidate_hash: `hash-${item.id}`,
          related_ids: [],
          created_at: now.toISOString(),
          expires_at: expires
        }, null, 2),
        'utf8'
      );
    }

    const triage = await runEngram(cwd, env, ['review', 'triage', '--json'], 'a\nd\nq\n');
    assert.equal(triage.code, 0, triage.stderr);
    const data = JSON.parse(triage.stdout).data;
    assert.equal(data.approved, 1);
    assert.equal(data.dismissed, 1);
    assert.equal(data.skipped, 0);

    const remaining = await runEngram(cwd, env, ['review', 'inbox', '--json']);
    assert.equal(remaining.code, 0, remaining.stderr);
    const remainingData = JSON.parse(remaining.stdout).data;
    assert.equal(remainingData.total_receipts, 1);
    assert.equal(remainingData.receipts[0].id, 'r-triage0003');
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

test('stats --backfill --json and benchmark --from-git --out operate on git history', async () => {
  const { cwd, env } = await tempWorkspace('engram-git-telemetry-');
  try {
    const gitInit = initGit(cwd);
    assert.equal(gitInit.status, 0, gitInit.stderr);
    const init = await runEngram(cwd, env, ['inject', '--no-skillset', '--scope', 'workspace']);
    assert.equal(init.code, 0, init.stderr);
    await seedMemory(cwd, env, {
      id: 'auth-token-refresh',
      tags: ['auth', 'token', 'refresh'],
      content: 'Refresh OAuth tokens before expiry in auth middleware.'
    });
    await writeFile(path.join(cwd, 'auth.ts'), 'export function refreshToken() { return true; }\n', 'utf8');
    spawnSync('git', ['add', 'auth.ts'], { cwd, env, encoding: 'utf8' });
    const commit = spawnSync('git', ['commit', '-m', 'fix auth token refresh flow'], { cwd, env, encoding: 'utf8' });
    assert.equal(commit.status, 0, commit.stderr);

    const backfill = await runEngram(cwd, env, ['stats', '--backfill', '--json']);
    assert.equal(backfill.code, 0, backfill.stderr);
    const backfillParsed = JSON.parse(backfill.stdout);
    assert.equal(backfillParsed.ok, true);
    assert.equal(typeof backfillParsed.data.backfill.commits_scanned, 'number');
    assert.equal(typeof backfillParsed.data.backfill.injected_events, 'number');
    assert.equal(typeof backfillParsed.data.backfill.applied_events, 'number');

    const outPath = path.join(cwd, 'mined-cases.json');
    const mined = await runEngram(cwd, env, ['benchmark', '--from-git', '--out', outPath, '--json']);
    assert.equal(mined.code, 0, mined.stderr);
    const minedParsed = JSON.parse(mined.stdout);
    assert.equal(minedParsed.ok, true);
    assert.ok(Array.isArray(minedParsed.data.cases));
    const diskDoc = JSON.parse(await readFile(outPath, 'utf8'));
    assert.ok(Array.isArray(diskDoc.cases));
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});
