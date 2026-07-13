import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { runEngram, tempWorkspace } from '../helpers.mjs';

test('benchmark emits versioned metrics and writes a safe report', async () => {
  const { cwd, env } = await tempWorkspace('engram-benchmark-contract-');
  await runEngram(cwd, env, ['inject', '--no-skillset']);
  const saved = await runEngram(cwd, env, ['save', 'knowledge', '--scope', 'workspace', 'Release workflow validates artifacts'], 'A\n');
  assert.equal(saved.code, 0, saved.stderr);
  const cases = path.join(cwd, 'cases.json');
  const report = path.join(cwd, 'report.json');
  await writeFile(cases, JSON.stringify({ version: 1, cases: [{ id: 'release', query: 'release workflow', expect: ['knowledge/release-workflow-validates-artifacts.md'], forbid: ['knowledge/other.md'] }] }));
  const result = await runEngram(cwd, env, ['benchmark', cases, '--json', '--write-report', report]);
  assert.equal(result.code, 0, result.stderr);
  const body = JSON.parse(result.stdout);
  assert.equal(body.contract_version, '1');
  assert.equal(body.data.version, 1);
  assert.equal(typeof body.data.metrics.recall_at_k, 'number');
  const written = JSON.parse(await readFile(report, 'utf8'));
  assert.equal(written.version, 1);
  assert.doesNotMatch(JSON.stringify(written), /Release workflow validates artifacts/);
});

test('benchmark fail-on forbidden returns stable regression error', async () => {
  const { cwd, env } = await tempWorkspace('engram-benchmark-fail-');
  await runEngram(cwd, env, ['inject', '--no-skillset']);
  const cases = path.join(cwd, 'cases.json');
  await writeFile(cases, JSON.stringify({ version: 1, cases: [{ id: 'forbidden', query: 'current session', expect: [], forbid: ['knowledge/missing.md'] }] }));
  const result = await runEngram(cwd, env, ['benchmark', cases, '--json', '--fail-on', 'forbidden']);
  assert.equal(result.code, 0);
  assert.equal(JSON.parse(result.stdout).data.metrics.forbidden_hits, 0);
});

test('benchmark loads recall threshold from an explicit policy path', async () => {
  const { cwd, env } = await tempWorkspace('engram-benchmark-custom-policy-');
  await runEngram(cwd, env, ['inject', '--no-skillset']);
  const cases = path.join(cwd, 'cases.json');
  const policy = path.join(cwd, 'config', 'team-policy.json');
  await mkdir(path.dirname(policy), { recursive: true });
  await writeFile(cases, JSON.stringify({ version: 1, cases: [{ id: 'missing', query: 'custom policy benchmark marker', expect: ['knowledge/not-present.md'] }] }));
  await writeFile(policy, JSON.stringify({
    version: 1,
    autonomous_writes: { enabled: false, mode: 'review_only', allowed_types: ['knowledge'], allowed_scopes: ['workspace'], allowed_sources: ['autosave'], confidence_threshold: 'high', daily_limit: 5, rollback_retention_days: 30 },
    review: { max_rule_lines: 100, benchmark_min_recall_at_k: 1 }
  }));
  const result = await runEngram(cwd, env, ['benchmark', cases, '--policy', 'config/team-policy.json', '--json']);
  assert.notEqual(result.code, 0);
  const body = JSON.parse(result.stdout);
  assert.equal(body.ok, false);
  assert.match(body.error.message, /benchmark regression/i);
});
