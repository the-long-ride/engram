// Inbox receipt CLI tests: save-session --inbox writes receipts, review inspect/apply/cleanup operate on them.
import test from 'node:test';
import assert from 'node:assert/strict';
import { rm, readFile, writeFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { runEngram, tempWorkspace, workspaceMemoryRoot } from '../helpers.mjs';

const CORPUS_MEMORY = 'Release foundation checklist lives in docs/release.md';
const CORPUS_ID = 'release-foundation-checklist-lives-in-docs-release-md';
const READY_CANDIDATE = 'TYPE: knowledge | TEXT: Smoke test dashboard URL is https://grafana.example.test';
const DEFERRED_CANDIDATE = 'TYPE: rule | TEXT: DeferredNeedleInbox must follow the release foundation checklist';
const DEFERRED_DIR = 'rules';
const DEFERRED_FILE_NAME = 'deferredneedleinbox-must-follow-the-release-foundation-checklist.md';

async function prepareWorkspace(prefix) {
  const { cwd, env } = await tempWorkspace(prefix);
  await runEngram(cwd, env, ['inject']);
  await runEngram(cwd, env, ['save', 'knowledge', '--scope', 'workspace', CORPUS_MEMORY], 'A\n');
  return { cwd, env };
}

async function inboxRoot(cwd) {
  return path.join(workspaceMemoryRoot(cwd), 'inbox');
}

async function listInboxFiles(cwd) {
  const dir = await inboxRoot(cwd);
  try { return (await readdir(dir)).filter((f) => f.endsWith('.json')); } catch { return []; }
}

async function readFirstReceipt(cwd) {
  const files = await listInboxFiles(cwd);
  if (!files.length) return null;
  const file = path.join(await inboxRoot(cwd), files[0]);
  return { id: files[0].replace(/\.json$/, ''), json: JSON.parse(await readFile(file, 'utf8')), file };
}

test('save-session --inbox writes a receipt for the deferred candidate', async () => {
  const { cwd, env } = await prepareWorkspace('engram-inbox-write-');
  const result = await runEngram(cwd, env, [
    'save-session', '--scope', 'workspace', '--force', '--inbox',
    [READY_CANDIDATE, DEFERRED_CANDIDATE].join('\n')
  ]);
  assert.equal(result.code, 0, result.stderr);
  assert.match(result.stdout, /Forced save-session candidates/);
  assert.match(result.stdout, /Deferred candidates not written/);
  assert.match(result.stdout, /Receipt: engram review inspect r-/);
  assert.match(result.stdout, /Apply:\s+engram review apply r-/);
  const receipt = await readFirstReceipt(cwd);
  assert.ok(receipt, 'a receipt file was written');
  assert.match(receipt.id, /^r-/, 'receipt id starts with r-');
  assert.equal(receipt.json.source, 'save-session');
  assert.equal(receipt.json.scope, 'workspace');
  assert.deepEqual(receipt.json.related_ids, [CORPUS_ID]);
  assert.equal(receipt.json.candidate.type, 'rule');
  assert.match(receipt.json.candidate.text, /DeferredNeedleInbox/);
  assert.ok(receipt.json.candidate_hash && receipt.json.candidate_hash.length === 64, 'sha256 hash present');
  assert.ok(new Date(receipt.json.expires_at).getTime() > new Date(receipt.json.created_at).getTime(), 'expires after created');
  await rm(cwd, { recursive: true, force: true });
});

test('receipt content has no related-memory body, summary, author, or frontmatter', async () => {
  const { cwd, env } = await prepareWorkspace('engram-inbox-leak-');
  await runEngram(cwd, env, [
    'save-session', '--scope', 'workspace', '--force', '--inbox',
    [READY_CANDIDATE, DEFERRED_CANDIDATE].join('\n')
  ]);
  const receipt = await readFirstReceipt(cwd);
  assert.ok(receipt, 'receipt written');
  const serialized = JSON.stringify(receipt.json);
  assert.doesNotMatch(serialized, /docs\/release\.md/, 'no related-memory body');
  assert.doesNotMatch(serialized, /author:/i, 'no author field');
  assert.doesNotMatch(serialized, /---\n/, 'no memory frontmatter block');
  assert.match(serialized, /release-foundation-checklist-lives-in-docs-release-md/, 'related id retained');
  await rm(cwd, { recursive: true, force: true });
});

test('review inbox and review inspect <receipt-id> expose receipt metadata only', async () => {
  const { cwd, env } = await prepareWorkspace('engram-inbox-inspect-');
  await runEngram(cwd, env, [
    'save-session', '--scope', 'workspace', '--force', '--inbox',
    [READY_CANDIDATE, DEFERRED_CANDIDATE].join('\n')
  ]);
  const receipt = await readFirstReceipt(cwd);
  assert.ok(receipt);
  const listResult = await runEngram(cwd, env, ['review', 'inbox', '--json']);
  assert.equal(listResult.code, 0, listResult.stderr);
  const listBody = JSON.parse(listResult.stdout);
  assert.ok(listBody.ok);
  assert.ok(listBody.data.receipts.length >= 1, 'inbox lists pending receipts');
  assert.equal(listBody.data.receipts[0].id, receipt.id);
  const inspectResult = await runEngram(cwd, env, ['review', 'inspect', receipt.id, '--json']);
  assert.equal(inspectResult.code, 0, inspectResult.stderr);
  const inspectBody = JSON.parse(inspectResult.stdout);
  assert.ok(inspectBody.ok);
  assert.equal(inspectBody.data.receipt.id, receipt.id);
  assert.equal(inspectBody.data.receipt.candidate.type, 'rule');
  assert.deepEqual(inspectBody.data.receipt.related_ids, [CORPUS_ID]);
  assert.doesNotMatch(JSON.stringify(inspectBody), /docs\/release\.md/, 'no related body in inspect');
  await rm(cwd, { recursive: true, force: true });
});

test('review apply --force blocks when relation choice is missing', async () => {
  const { cwd, env } = await prepareWorkspace('engram-inbox-apply-block-');
  await runEngram(cwd, env, [
    'save-session', '--scope', 'workspace', '--force', '--inbox',
    [READY_CANDIDATE, DEFERRED_CANDIDATE].join('\n')
  ]);
  const receipt = await readFirstReceipt(cwd);
  assert.ok(receipt);
  const applyResult = await runEngram(cwd, env, ['review', 'apply', receipt.id, '--force', '--json']);
  assert.equal(applyResult.code, 0, applyResult.stderr);
  const applyBody = JSON.parse(applyResult.stdout);
  assert.ok(applyBody.ok);
  assert.equal(applyBody.data.applied, null);
  assert.equal(applyBody.data.status, 'blocked');
  assert.deepEqual(applyBody.data.related_ids, [CORPUS_ID]);
  assert.match(applyBody.data.guidance, /DEPENDS_ON/);
  const remaining = await listInboxFiles(cwd);
  assert.equal(remaining.length, 1, 'receipt preserved after blocked apply');
  const savedPath = path.join(workspaceMemoryRoot(cwd), DEFERRED_DIR, DEFERRED_FILE_NAME);
  await assert.rejects(() => readFile(savedPath, 'utf8'), /ENOENT/, 'no file written when blocked');
  await rm(cwd, { recursive: true, force: true });
});

test('review apply <receipt-id> --force writes the memory and purges the receipt with --depends-on', async () => {
  const { cwd, env } = await prepareWorkspace('engram-inbox-apply-');
  await runEngram(cwd, env, [
    'save-session', '--scope', 'workspace', '--force', '--inbox',
    [READY_CANDIDATE, DEFERRED_CANDIDATE].join('\n')
  ]);
  const receipt = await readFirstReceipt(cwd);
  assert.ok(receipt);
  const applyResult = await runEngram(cwd, env, ['review', 'apply', receipt.id, '--depends-on', CORPUS_ID, '--force', '--json']);
  assert.equal(applyResult.code, 0, applyResult.stderr);
  const applyBody = JSON.parse(applyResult.stdout);
  assert.ok(applyBody.ok);
  assert.equal(applyBody.data.applied, receipt.id);
  assert.deepEqual(applyBody.data.related_ids, [CORPUS_ID]);
  const remaining = await listInboxFiles(cwd);
  assert.equal(remaining.length, 0, 'receipt was purged after apply');
  const savedPath = path.join(workspaceMemoryRoot(cwd), DEFERRED_DIR, DEFERRED_FILE_NAME);
  const saved = await readFile(savedPath, 'utf8');
  assert.match(saved, /^id: deferredneedleinbox-must-follow-the-release-foundation-checklist$/m);
  assert.match(saved, /DeferredNeedleInbox/);
  assert.match(saved, /depends_on:\s*\[release-foundation-checklist-lives-in-docs-release-md\]/);
  await rm(cwd, { recursive: true, force: true });
});

test('review apply reuses receipt role and writes role frontmatter', async () => {
  const { cwd, env } = await prepareWorkspace('engram-inbox-role-');
  await runEngram(cwd, env, [
    'save-session', '--scope', 'workspace', '--role', 'frontend', '--force', '--inbox',
    [READY_CANDIDATE, DEFERRED_CANDIDATE].join('\n')
  ]);
  const receipt = await readFirstReceipt(cwd);
  assert.ok(receipt);
  assert.deepEqual(receipt.json.candidate.role, ['frontend']);
  const applyResult = await runEngram(cwd, env, ['review', 'apply', receipt.id, '--depends-on', CORPUS_ID, '--force', '--json']);
  assert.equal(applyResult.code, 0, applyResult.stderr);
  const applyBody = JSON.parse(applyResult.stdout);
  assert.ok(applyBody.ok);
  assert.equal(applyBody.data.applied, receipt.id);
  const savedPath = path.join(workspaceMemoryRoot(cwd), DEFERRED_DIR, DEFERRED_FILE_NAME);
  const saved = await readFile(savedPath, 'utf8');
  assert.match(saved, /role:\s*\[frontend\]/);
  assert.match(saved, /depends_on:\s*\[release-foundation-checklist-lives-in-docs-release-md\]/);
  await rm(cwd, { recursive: true, force: true });
});

test('review apply keeps receipt after discard', async () => {
  const { cwd, env } = await prepareWorkspace('engram-inbox-discard-');
  await runEngram(cwd, env, ['save-session', '--scope', 'workspace', '--force', '--inbox', [READY_CANDIDATE, DEFERRED_CANDIDATE].join('\n')]);
  const receipt = await readFirstReceipt(cwd);
  assert.ok(receipt);
  const result = await runEngram(cwd, env, ['review', 'apply', receipt.id, '--depends-on', CORPUS_ID], 'D\n');
  assert.equal(result.code, 0, result.stderr);
  assert.match(result.stdout, /Discarded\. No file written\./);
  assert.equal((await listInboxFiles(cwd)).length, 1);
  await rm(cwd, { recursive: true, force: true });
});

test('review cleanup removes expired receipts and leaves non-expired ones', async () => {
  const { cwd, env } = await prepareWorkspace('engram-inbox-cleanup-');
  await runEngram(cwd, env, [
    'save-session', '--scope', 'workspace', '--force', '--inbox',
    [READY_CANDIDATE, DEFERRED_CANDIDATE].join('\n')
  ]);
  const liveReceipt = await readFirstReceipt(cwd);
  assert.ok(liveReceipt);
  const now = new Date();
  const past = new Date(now.getTime() - 60_000).toISOString();
  const expired = {
    id: 'r-expired1',
    scope: 'workspace',
    source: 'save-session',
    candidate: { type: 'rule', text: 'expired receipt', scope: 'workspace' },
    candidate_hash: 'x'.repeat(64),
    related_ids: [],
    created_at: new Date(now.getTime() - 30 * 86_400_000).toISOString(),
    expires_at: past
  };
  const inboxDir = await inboxRoot(cwd);
  await writeFile(path.join(inboxDir, 'r-expired1.json'), `${JSON.stringify(expired, null, 2)}\n`);
  const cleanupResult = await runEngram(cwd, env, ['review', 'cleanup', '--json']);
  assert.equal(cleanupResult.code, 0, cleanupResult.stderr);
  const cleanupBody = JSON.parse(cleanupResult.stdout);
  assert.ok(cleanupBody.ok);
  assert.ok(cleanupBody.data.receipts_removed >= 1, 'at least one expired receipt removed');
  const remaining = await listInboxFiles(cwd);
  assert.ok(remaining.includes(`${liveReceipt.id}.json`), 'live receipt preserved');
  assert.ok(!remaining.includes('r-expired1.json'), 'expired receipt removed');
  await rm(cwd, { recursive: true, force: true });
});

test('review inbox shows empty on a fresh workspace with no receipts', async () => {
  const { cwd, env } = await tempWorkspace('engram-inbox-empty-');
  await runEngram(cwd, env, ['inject', '--no-skillset']);
  const result = await runEngram(cwd, env, ['review', 'inbox', '--json']);
  assert.equal(result.code, 0, result.stderr);
  const body = JSON.parse(result.stdout);
  assert.ok(body.ok);
  assert.equal(body.data.total_receipts, 0);
  assert.deepEqual(body.data.receipts, []);
  await rm(cwd, { recursive: true, force: true });
});
