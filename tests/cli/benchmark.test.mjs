import test from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { runEngram, tempWorkspace, workspaceMemoryRoot } from '../helpers.mjs';
import { testMemory } from './fixtures.mjs';

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

test('benchmark max_tokens constrains routed payloads', async () => {
  const { cwd, env } = await tempWorkspace('engram-benchmark-budget-');
  await runEngram(cwd, env, ['inject', '--no-skillset']);
  const memory = path.join(workspaceMemoryRoot(cwd), 'knowledge', 'budget-benchmark.md');
  await mkdir(path.dirname(memory), { recursive: true });
  await writeFile(memory, testMemory({
    id: 'budget-benchmark',
    tags: ['budgetbenchmark'],
    content: `BENCHMARK_BUDGET_SENTINEL ${'payload '.repeat(300)}`
  }));
  await runEngram(cwd, env, ['rebuild-index']);
  await runEngram(cwd, env, ['rehash', 'workspace']);
  const cases = path.join(cwd, 'cases.json');
  const report = path.join(cwd, 'report.json');
  await writeFile(cases, JSON.stringify({
    version: 2,
    cases: [{ id: 'budget', query: 'budgetbenchmark', expect: ['budget-benchmark'], forbid: [], depends_on: [], max_tokens: 200 }]
  }));

  const result = await runEngram(cwd, env, ['benchmark', cases, '--json', '--write-report', report]);
  assert.equal(result.code, 0, result.stderr);
  // The oversized body cannot be expanded, so it is routed as a fetchable card within the cap.
  const [budgetCase] = JSON.parse(await readFile(report, 'utf8')).cases;
  assert.deepEqual(budgetCase.routed, ['workspace:knowledge/budget-benchmark.md']);
  assert.ok(budgetCase.tokens <= 200, `tokens ${budgetCase.tokens}`);
});

test('benchmark uses the same budget overhead as compact CLI rendering', async () => {
  const { cwd, env } = await tempWorkspace('engram-benchmark-render-parity-');
  await runEngram(cwd, env, ['inject', '--no-skillset']);
  const memory = path.join(workspaceMemoryRoot(cwd), 'knowledge', 'render-parity.md');
  await mkdir(path.dirname(memory), { recursive: true });
  await writeFile(memory, testMemory({
    id: 'render-parity',
    tags: ['renderparity'],
    content: `RENDER_PARITY_SENTINEL ${'payload '.repeat(160)}`
  }));
  await runEngram(cwd, env, ['rebuild-index']);
  await runEngram(cwd, env, ['rehash', 'workspace']);
  const cases = path.join(cwd, 'cases.json');
  const report = path.join(cwd, 'report.json');
  await writeFile(cases, JSON.stringify({
    version: 2,
    cases: [{ id: 'render-parity', query: 'renderparity', expect: ['render-parity'], forbid: [], depends_on: [], max_tokens: 200 }]
  }));

  const compact = await runEngram(cwd, env, ['load', '--budget-tokens', '200', 'renderparity']);
  assert.equal(compact.code, 0, compact.stderr);
  assert.doesNotMatch(compact.stdout, /^### render-parity/m);
  assert.match(compact.stdout, /^- render-parity \[knowledge\]/m);

  const benchmark = await runEngram(cwd, env, ['benchmark', cases, '--json', '--write-report', report]);
  assert.equal(benchmark.code, 0, benchmark.stderr);
  const [parityCase] = JSON.parse(await readFile(report, 'utf8')).cases;
  assert.deepEqual(parityCase.routed, ['workspace:knowledge/render-parity.md']);
  assert.equal(parityCase.tokens, Math.ceil(compact.stdout.trim().length / 4));
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

const routingFixture = path.resolve('tests/fixtures/benchmark/routing-v2');

// Build a workspace and global store from the routing-v2 fixture, then index it.
async function routingWorkspace(prefix) {
  const { cwd, env } = await tempWorkspace(prefix);
  const init = await runEngram(cwd, env, ['inject', '--no-skillset']);
  assert.equal(init.code, 0, init.stderr);
  await cp(path.join(routingFixture, 'memories', 'workspace'), workspaceMemoryRoot(cwd), { recursive: true });
  await cp(path.join(routingFixture, 'memories', 'global'), env.ENGRAM_GLOBAL_DIR, { recursive: true });
  for (const args of [['rehash'], ['rebuild-index']]) {
    const step = await runEngram(cwd, env, args);
    assert.equal(step.code, 0, step.stderr);
  }
  return { cwd, env };
}

test('benchmark reports token metrics', async () => {
  const { cwd, env } = await routingWorkspace('engram-benchmark-tokens-');
  const result = await runEngram(cwd, env, ['benchmark', path.join(routingFixture, 'cases.json'), '--json']);
  assert.equal(result.code, 0, result.stderr);
  const { metrics } = JSON.parse(result.stdout).data;
  assert.ok(metrics.tokens_mean > 0, `tokens_mean=${metrics.tokens_mean}`);
  assert.ok(metrics.tokens_p95 >= metrics.tokens_mean, `p95=${metrics.tokens_p95} mean=${metrics.tokens_mean}`);
});

test('routing-v2 does not regress vs baseline', async () => {
  const { cwd, env } = await routingWorkspace('engram-benchmark-routing-v2-');
  const baselineFile = path.join(routingFixture, 'baseline.json');
  const baseline = JSON.parse(await readFile(baselineFile, 'utf8'));
  // The baseline is generated from the current code; recall may sit below 1, so it is the floor.
  const result = await runEngram(cwd, env, [
    'benchmark', path.join(routingFixture, 'cases.json'), '--json',
    '--baseline', baselineFile, '--fail-on', 'recall,forbidden', '--min-recall', String(baseline.metrics.recall_at_k)
  ]);
  assert.equal(result.code, 0, result.stdout || result.stderr);
  const { metrics } = JSON.parse(result.stdout).data;
  assert.ok(metrics.recall_at_k >= baseline.metrics.recall_at_k);
  assert.equal(metrics.forbidden_hits, 0);
  assert.ok(metrics.tokens_mean <= baseline.metrics.tokens_mean, `tokens_mean rose: ${metrics.tokens_mean} > ${baseline.metrics.tokens_mean}`);
  assert.ok(metrics.hook_tokens_mean <= baseline.metrics.hook_tokens_mean, `hook_tokens_mean rose: ${metrics.hook_tokens_mean} > ${baseline.metrics.hook_tokens_mean}`);
});

const pathsFixture = path.resolve('tests/fixtures/benchmark/paths-v1');

// Build a workspace from the paths-v1 fixture (applies_to memories plus expired working-tier memories), then index it.
async function pathsWorkspace(prefix) {
  const { cwd, env } = await tempWorkspace(prefix);
  const init = await runEngram(cwd, env, ['inject', '--no-skillset']);
  assert.equal(init.code, 0, init.stderr);
  await cp(path.join(pathsFixture, 'memories', 'workspace'), workspaceMemoryRoot(cwd), { recursive: true });
  for (const args of [['rehash'], ['rebuild-index']]) {
    const step = await runEngram(cwd, env, args);
    assert.equal(step.code, 0, step.stderr);
  }
  return { cwd, env };
}

test('paths-v1 path-trigger and working-expired cases do not regress vs baseline', async () => {
  const { cwd, env } = await pathsWorkspace('engram-benchmark-paths-v1-');
  const baseline = JSON.parse(await readFile(path.join(pathsFixture, 'baseline.json'), 'utf8'));
  const result = await runEngram(cwd, env, ['benchmark', path.join(pathsFixture, 'cases.json'), '--json', '--fail-on', 'forbidden']);
  assert.equal(result.code, 0, result.stdout || result.stderr);
  const { path_trigger, lifecycle } = JSON.parse(result.stdout).data;
  assert.equal(path_trigger.cases, baseline.path_trigger.cases);
  assert.ok(path_trigger.recall_at_k >= baseline.path_trigger.recall_at_k, `path_trigger recall ${path_trigger.recall_at_k}`);
  assert.equal(path_trigger.forbidden_hits, 0);
  assert.equal(lifecycle.omitted_correctness, 1);
});

test('benchmark path-trigger cases do not move routed metrics', async () => {
  const { cwd, env } = await routingWorkspace('engram-benchmark-separate-');
  const routedCases = JSON.parse(await readFile(path.join(routingFixture, 'cases.json'), 'utf8'));
  const extraCases = JSON.parse(await readFile(path.join(pathsFixture, 'cases.json'), 'utf8'));
  const routedOnly = path.join(cwd, 'routed-only.json');
  const combined = path.join(cwd, 'combined.json');
  await writeFile(routedOnly, JSON.stringify(routedCases));
  await writeFile(combined, JSON.stringify({ ...routedCases, cases: [...routedCases.cases, ...extraCases.cases] }));
  const first = await runEngram(cwd, env, ['benchmark', routedOnly, '--json']);
  const second = await runEngram(cwd, env, ['benchmark', combined, '--json']);
  assert.equal(first.code, 0, first.stderr);
  assert.equal(second.code, 0, second.stderr);
  const before = JSON.parse(first.stdout).data;
  const after = JSON.parse(second.stdout).data;
  assert.deepEqual(after.metrics, before.metrics);
  assert.equal(after.path_trigger.cases, 4);
  assert.equal(after.lifecycle.cases, 2);
  assert.equal(before.path_trigger, undefined);
});

test('benchmark hook simulation counts each body once per session', async () => {
  const { cwd, env } = await tempWorkspace('engram-benchmark-hook-sim-');
  await runEngram(cwd, env, ['inject', '--no-skillset']);
  const memory = path.join(workspaceMemoryRoot(cwd), 'knowledge', 'hook-sim.md');
  await mkdir(path.dirname(memory), { recursive: true });
  await writeFile(memory, testMemory({ id: 'hook-sim', tags: ['hooksimulation'], content: `HOOK_SIM_SENTINEL ${'payload '.repeat(100)}` }));
  await runEngram(cwd, env, ['rebuild-index']);
  await runEngram(cwd, env, ['rehash', 'workspace']);
  const cases = path.join(cwd, 'cases.json');
  const report = path.join(cwd, 'report.json');
  await writeFile(cases, JSON.stringify({ version: 2, cases: [{ id: 'hook-sim', query: 'hooksimulation', expect: ['hook-sim'], forbid: [], depends_on: [] }] }));
  const result = await runEngram(cwd, env, ['benchmark', cases, '--json', '--write-report', report]);
  assert.equal(result.code, 0, result.stderr);
  const [row] = JSON.parse(await readFile(report, 'utf8')).cases;
  assert.ok(row.tokens > 150, `single-turn tokens ${row.tokens}`);
  // The body is injected once; the repeat turns add only proof and `already loaded:` lines.
  assert.ok(row.hook_tokens >= row.tokens, `hook_tokens ${row.hook_tokens} < tokens ${row.tokens}`);
  assert.ok(row.hook_tokens < row.tokens * 2, `hook_tokens ${row.hook_tokens} vs tokens ${row.tokens}`);
});

test('benchmark rejects an absolute path-trigger query', async () => {
  const { cwd, env } = await tempWorkspace('engram-benchmark-abs-path-');
  await runEngram(cwd, env, ['inject', '--no-skillset']);
  const cases = path.join(cwd, 'cases.json');
  await writeFile(cases, JSON.stringify({ version: 2, cases: [{ id: 'abs', category: 'path-trigger', query: '/etc/passwd' }] }));
  const result = await runEngram(cwd, env, ['benchmark', cases, '--json']);
  assert.notEqual(result.code, 0);
  const body = JSON.parse(result.stdout);
  assert.equal(body.ok, false);
  assert.equal(body.error.code, 'ENG_USAGE');
  assert.match(body.error.message, /path-trigger query must be a workspace-relative path/);
});
