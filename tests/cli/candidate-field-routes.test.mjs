// D15 candidate fields (DIRECTIVE, APPLIES_TO, SCOPE) survive every write route: inbox receipts, autosave, and the web review write.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { buildReceipt, canonicalCandidateText, serializeCandidateForApply } from '../../dist/core/review/inbox.js';
import { apiReviewWrite } from '../../dist/core/web/api.js';
import { runEngram, tempWorkspace, workspaceMemoryRoot } from '../helpers.mjs';

const DIRECTIVE = 'Follow the release checklist before tagging';
const ENV_KEYS = ['ENGRAM_CONFIG_DIR', 'ENGRAM_GLOBAL_DIR', 'GIT_CONFIG_COUNT', 'GIT_CONFIG_KEY_0', 'GIT_CONFIG_VALUE_0', 'GIT_CONFIG_KEY_1', 'GIT_CONFIG_VALUE_1'];

function sha256(text) {
  return createHash('sha256').update(text).digest('hex');
}

test('receipt text gains DIRECTIVE and APPLIES_TO only when present, so existing receipt hashes are unchanged', () => {
  const legacy = { type: 'rule', text: 'Always run tests', scope: 'workspace' };
  assert.equal(canonicalCandidateText(legacy), 'TYPE: rule | TEXT: Always run tests | SCOPE: workspace');
  assert.equal(buildReceipt({ scope: 'workspace', source: 'save-session', candidate: legacy }).candidate_hash, sha256('TYPE: rule | TEXT: Always run tests | SCOPE: workspace'));
  const distilled = { ...legacy, directive: DIRECTIVE, appliesTo: ['docs/**', 'scripts/release.sh'] };
  assert.equal(canonicalCandidateText(distilled), `TYPE: rule | TEXT: Always run tests | SCOPE: workspace | APPLIES_TO: docs/**,scripts/release.sh | DIRECTIVE: ${DIRECTIVE}`);
  assert.equal(serializeCandidateForApply(distilled), `TYPE: rule | TEXT: Always run tests | APPLIES_TO: docs/**,scripts/release.sh | DIRECTIVE: ${DIRECTIVE}`);
});

test('an inbox receipt keeps DIRECTIVE and APPLIES_TO through review apply', async () => {
  const { cwd, env } = await tempWorkspace('engram-fields-inbox-');
  await runEngram(cwd, env, ['inject']);
  const root = workspaceMemoryRoot(cwd);
  await runEngram(cwd, env, ['save', 'knowledge', '--scope', 'workspace', 'Release foundation checklist lives in docs/release.md'], 'A\n');
  const corpusId = 'release-foundation-checklist-lives-in-docs-release-md';
  const deferred = await runEngram(cwd, env, ['save-session', '--scope', 'workspace', '--force', '--inbox'], `TYPE: rule | TEXT: FieldNeedleInbox must follow the release foundation checklist | APPLIES_TO: docs/**, scripts/release.sh | DIRECTIVE: ${DIRECTIVE}\n`);
  assert.equal(deferred.code, 0, deferred.stderr);
  const receiptId = deferred.stdout.match(/\br-[a-z0-9]+\b/)?.[0];
  assert.ok(receiptId, deferred.stdout);
  const receipt = JSON.parse(await readFile(path.join(root, 'inbox', `${receiptId}.json`), 'utf8'));
  assert.equal(receipt.candidate.directive, DIRECTIVE);
  assert.deepEqual(receipt.candidate.appliesTo, ['docs/**', 'scripts/release.sh']);

  const applied = await runEngram(cwd, env, ['review', 'apply', receiptId, '--depends-on', corpusId], 'A\n');
  assert.equal(applied.code, 0, applied.stderr);
  const raw = await readFile(path.join(root, 'rules', 'fieldneedleinbox-must-follow-the-release-foundation-checklist.md'), 'utf8');
  assert.match(raw, new RegExp(`^directive: "?${DIRECTIVE}"?$`, 'm'));
  assert.match(raw, /^applies_to: \["docs\/\*\*", scripts\/release\.sh\]$/m);
  await rm(cwd, { recursive: true, force: true });
});

async function autosaveWorkspace(prefix) {
  const { cwd, env } = await tempWorkspace(prefix);
  await runEngram(cwd, env, ['inject', '--no-skillset']);
  const policyFile = path.join(cwd, '.agents', 'engram.policy.json');
  await mkdir(path.dirname(policyFile), { recursive: true });
  await writeFile(policyFile, JSON.stringify({
    version: 1,
    autonomous_writes: { enabled: true, mode: 'autonomous', allowed_types: ['knowledge'], allowed_scopes: ['workspace', 'global'], allowed_sources: ['autosave'], confidence_threshold: 'high', daily_limit: 5, rollback_retention_days: 30 },
    review: { max_rule_lines: 100, benchmark_min_recall_at_k: 0.9 }
  }, null, 2));
  return { cwd, env };
}

test('autosave writes DIRECTIVE and APPLIES_TO and honours a candidate SCOPE', async () => {
  const { cwd, env } = await autosaveWorkspace('engram-fields-autosave-');
  const saved = await runEngram(cwd, env, ['autosave', '--policy', '--scope', 'workspace', '--json', `TYPE: knowledge | CONFIDENCE: high | TEXT: Ledger exports run nightly at two | APPLIES_TO: src/ledger/** | DIRECTIVE: ${DIRECTIVE}`]);
  assert.equal(saved.code, 0, saved.stderr);
  assert.equal(JSON.parse(saved.stdout).data.status, 'written', saved.stdout);
  const raw = await readFile(path.join(workspaceMemoryRoot(cwd), 'knowledge', 'ledger-exports-run-nightly-at-two.md'), 'utf8');
  assert.match(raw, new RegExp(`^directive: "?${DIRECTIVE}"?$`, 'm'));
  assert.match(raw, /^applies_to: \["src\/ledger\/\*\*"\]$/m);

  const conflict = await runEngram(cwd, env, ['autosave', '--policy', '--scope', 'workspace', '--json', 'TYPE: knowledge | CONFIDENCE: high | TEXT: Global installs use the frozen lockfile | SCOPE: global']);
  assert.equal(conflict.code, 0, conflict.stderr);
  assert.equal(JSON.parse(conflict.stdout).data.status, 'denied');
  assert.match(JSON.parse(conflict.stdout).data.reason, /SCOPE: global/);

  const global = await runEngram(cwd, env, ['autosave', '--policy', '--json', 'TYPE: knowledge | CONFIDENCE: high | TEXT: Global installs use the frozen lockfile | SCOPE: global']);
  assert.equal(global.code, 0, global.stderr);
  assert.equal(JSON.parse(global.stdout).data.status, 'written', global.stdout);
  assert.ok(existsSync(path.join(env.ENGRAM_GLOBAL_DIR, 'knowledge', 'global-installs-use-the-frozen-lockfile.md')));
  assert.equal(existsSync(path.join(workspaceMemoryRoot(cwd), 'knowledge', 'global-installs-use-the-frozen-lockfile.md')), false);
  await rm(cwd, { recursive: true, force: true });
});

test('web review write keeps DIRECTIVE and APPLIES_TO and rejects a SCOPE that contradicts the chosen scope', async () => {
  const { cwd, env } = await tempWorkspace('engram-fields-web-');
  await runEngram(cwd, env, ['inject', '--no-skillset']);
  const previous = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));
  for (const key of ENV_KEYS) process.env[key] = env[key];
  try {
    await apiReviewWrite(cwd, { confirmed: true, scope: 'workspace', proposal: `TYPE: knowledge | TEXT: Web ledger exports run nightly | APPLIES_TO: src/web/** | DIRECTIVE: ${DIRECTIVE}` });
    const raw = await readFile(path.join(workspaceMemoryRoot(cwd), 'knowledge', 'web-ledger-exports-run-nightly.md'), 'utf8');
    assert.match(raw, new RegExp(`^directive: "?${DIRECTIVE}"?$`, 'm'));
    assert.match(raw, /^applies_to: \["src\/web\/\*\*"\]$/m);
    await assert.rejects(apiReviewWrite(cwd, { confirmed: true, scope: 'workspace', proposal: 'TYPE: knowledge | TEXT: Web global fact | SCOPE: global' }), /SCOPE: global/);
  } finally {
    for (const key of ENV_KEYS) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
    await rm(cwd, { recursive: true, force: true });
  }
});
