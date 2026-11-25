import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { meaningfulWords, words } from '../../dist/core/system/text.js';
import { stem } from '../../dist/core/system/bm25.js';
import {
  buildCorpusConceptMap,
  expandConceptStems,
  hasStrongConceptOverlap
} from '../../dist/core/memory/concepts.js';
import { readUsage, recordUsageCounts } from '../../dist/core/memory/usage.js';
import { backfillUsageFromGit } from '../../dist/core/memory/usage-backfill.js';
import { mineBenchmarkCasesFromGit } from '../../dist/core/benchmark/mine-git.js';
import { parseBenchmarkDocument } from '../../dist/core/benchmark/schema.js';
import { runBenchmark } from '../../dist/core/benchmark/run.js';
import { defaultConfig } from '../../dist/core/runtime/config.js';
import { emptyIndex, rebuildIndex } from '../../dist/core/memory/index.js';
import { emptyGraph } from '../../dist/core/memory/graph.js';
import { saveHashes, sha256 } from '../../dist/core/safety/hash.js';
import { listFiles } from '../../dist/core/system/fsx.js';

function git(cwd, args) {
  execFileSync('git', args, { cwd, stdio: 'ignore' });
}

async function createWorkspaceContextFromFixture(fixtureWorkspaceDir) {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), 'engram-real-stacks-'));
  const wsRoot = path.join(tmpDir, '.agents', '.engram');
  await cp(fixtureWorkspaceDir, wsRoot, { recursive: true });
  const mdFiles = (await listFiles(wsRoot)).filter((file) => file.endsWith('.md'));
  const hashes = {};
  for (const file of mdFiles) {
    const rel = path.relative(wsRoot, file).replace(/\\/g, '/');
    hashes[rel] = sha256(await readFile(file, 'utf8'));
  }
  await saveHashes(wsRoot, hashes);
  const wsIndex = await rebuildIndex(wsRoot, 'workspace');
  const baseConfig = defaultConfig();
  const config = {
    ...baseConfig,
    scope: 'workspace',
    global_path: '',
    graph: { ...baseConfig.graph, enabled: false },
    vector: { ...baseConfig.vector, enabled: false }
  };
  const ctx = {
    cwd: tmpDir,
    config,
    roots: { workspace: wsRoot, global: '' },
    profile: {
      active: 'default',
      source: 'none',
      configured: false,
      global_path: '',
      workspace_default: '',
      user_default: '',
      workspace_allowed: true,
      profiles_path: ''
    },
    scopeIndexes: { workspace: wsIndex, global: emptyIndex() },
    index: wsIndex,
    graph: emptyGraph(),
    hiddenCount: 0,
    ignorePatterns: []
  };
  return { tmpDir, wsRoot, ctx };
}

test('words() tokenizes Unicode/Vietnamese/CJK while preserving ASCII behavior and filtering Vietnamese stopwords', () => {
  assert.deepEqual([...words('Use rate-limit on API v2')].sort(), ['api', 'rate-limit', 'use']);
  const viWords = words('fix lỗi xác thực đăng nhập của người dùng với quyền ngốn bộ nhớ');
  for (const expected of ['fix', 'lỗi', 'xác', 'thực', 'đăng', 'nhập', 'quyền', 'ngốn']) {
    assert.ok(viWords.has(expected), `expected Vietnamese token: ${expected}`);
  }
  const meaningful = meaningfulWords('của cho với trong khi chưa bên này các những được lỗi quyền');
  for (const stop of ['của', 'cho', 'với', 'trong', 'khi', 'chưa', 'bên', 'này', 'các', 'những', 'được']) {
    assert.equal(meaningful.has(stop), false, `stopword should be filtered: ${stop}`);
  }
  assert.ok(meaningful.has('lỗi'));
  assert.ok(meaningful.has('quyền'));
  const cjk = words('認証 権限 ok');
  assert.ok(cjk.has('認証'));
  assert.ok(cjk.has('権限'));
  assert.equal(cjk.has('ok'), false);
});

test('expanded concept clusters cover real stacks and bilingual bridges without broad hub leakage', () => {
  assert.ok(expandConceptStems([stem('tauri')]).has(stem('webview2')));
  assert.ok(expandConceptStems([stem('tokio')]).has(stem('deadlock')));
  assert.ok(expandConceptStems([stem('ngốn')]).has(stem('bloat')));
  assert.ok(expandConceptStems([stem('signals')]).has(stem('angular')));
  assert.ok(expandConceptStems([stem('hydration')]).has(stem('ssr')));
  assert.ok(expandConceptStems([stem('wcag')]).has(stem('aria')));
  assert.ok(expandConceptStems([stem('rls')]).has(stem('supabase')));
  assert.ok(expandConceptStems([stem('ddl')]).has(stem('migration')));
  assert.ok(expandConceptStems([stem('pgvector')]).has(stem('cosine')));
  assert.ok(expandConceptStems([stem('deno')]).has(stem('edge-function')));
  assert.ok(expandConceptStems([stem('csp')]).has(stem('xss')));
  assert.ok(expandConceptStems([stem('quyền')]).has(stem('rbac')));
  assert.ok(expandConceptStems([stem('đăng')]).has(stem('oauth')));
  assert.ok(expandConceptStems([stem('lỗi')]).has(stem('crash')));

  for (const broadHub of ['token', 'session', 'slow', 'query', 'rust', 'schema', 'policy', 'bug', 'error', 'ram', 'layout', 'async']) {
    assert.equal(expandConceptStems([stem(broadHub)]).size, 0, `broad hub should not expand: ${broadHub}`);
  }
});

test('buildCorpusConceptMap links co-occurring low-DF authored stems and ignores autoTags and small corpora', () => {
  assert.equal(buildCorpusConceptMap([
    { id: 'alpha-one', tags: ['zephyr', 'quartz'] },
    { id: 'alpha-two', tags: ['zephyr', 'quartz'] }
  ]).size, 0);

  const corpus = [
    { id: 'm1', tags: ['zephyr', 'quartz', 'commonhub'] },
    { id: 'm2', tags: ['zephyr', 'quartz', 'commonhub'] },
    { id: 'm3', tags: ['amber', 'commonhub'] },
    { id: 'm4', tags: ['cobalt', 'commonhub'] },
    { id: 'm5', tags: ['indigo', 'commonhub'] },
    { id: 'm6', tags: ['obsidian', 'auto-only-pair'], autoTags: true },
    { id: 'm7', tags: ['obsidian', 'auto-only-pair'], autoTags: true }
  ];
  const map = buildCorpusConceptMap(corpus);
  assert.ok(map.get(stem('zephyr'))?.has(stem('quartz')));
  assert.ok(map.get(stem('quartz'))?.has(stem('zephyr')));
  // commonhub appears in 5/7 (>35% DF), so it must not form bridges.
  assert.equal(map.has(stem('commonhub')), false);
  // autoTags entries must not form tag bridges.
  assert.equal(map.has(stem('obsidian')), false);

  const expanded = expandConceptStems([stem('zephyr')], map);
  assert.ok(expanded.has(stem('quartz')));
  assert.equal(
    hasStrongConceptOverlap(new Set([stem('zephyr')]), new Set([stem('quartz')]), new Set([stem('quartz')]), map),
    true
  );
});

test('recordUsageCounts batches updates atomically and backfillUsageFromGit populates usage from git log', async () => {
  const fixtureDir = path.resolve('tests/fixtures/benchmark/real-stacks-v1/memories/workspace');
  const { tmpDir, wsRoot, ctx } = await createWorkspaceContextFromFixture(fixtureDir);
  try {
    const t0 = '2026-05-21T00:00:00.000Z';
    await recordUsageCounts(wsRoot, [
      { key: 'workspace:rules/tauri-ipc-command-boundaries.md', kind: 'injected', count: 3 },
      { key: 'workspace:rules/tauri-ipc-command-boundaries.md', kind: 'applied', count: 1 },
      { key: 'workspace:rules/wcag-modal-focus-trap.md', kind: 'injected', count: 2 }
    ], t0);
    const rawAfterBatch = JSON.parse(await readFile(path.join(wsRoot, 'usage.json'), 'utf8'));
    assert.deepEqual(rawAfterBatch['workspace:rules/tauri-ipc-command-boundaries.md'], {
      injected: 3,
      fetched: 0,
      applied: 1,
      last: t0
    });
    assert.deepEqual(Object.keys(rawAfterBatch['workspace:rules/wcag-modal-focus-trap.md']).sort(), ['fetched', 'injected', 'last']);

    // Fail-open before git init
    const nonGit = await backfillUsageFromGit(ctx, { cwd: tmpDir });
    assert.equal(nonGit.commits_scanned, 0);

    // Initialize git repo and add realistic commits
    git(tmpDir, ['init']);
    git(tmpDir, ['config', 'user.name', 'Test Author']);
    git(tmpDir, ['config', 'user.email', 'test@example.com']);

    await mkdir(path.join(tmpDir, 'src-tauri', 'src'), { recursive: true });
    await writeFile(path.join(tmpDir, 'src-tauri', 'src', 'ipc.rs'), 'pub fn invoke() {}\n');
    git(tmpDir, ['add', 'src-tauri/src/ipc.rs']);
    git(tmpDir, ['commit', '-m', 'fix tauri ipc invoke command boundary']);

    await mkdir(path.join(tmpDir, 'src', 'auth'), { recursive: true });
    await writeFile(path.join(tmpDir, 'src', 'auth', 'oauth.ts'), 'export const pkce = true;\n');
    git(tmpDir, ['add', 'src/auth/oauth.ts']);
    git(tmpDir, ['commit', '-m', 'harden oauth pkce jwt bearer login']);

    const summary = await backfillUsageFromGit(ctx, { cwd: tmpDir, limit: 10 });
    assert.equal(summary.commits_scanned, 2);
    assert.ok(summary.injected_events >= 2);
    assert.ok(summary.applied_events >= 2);
    assert.ok(summary.updated_keys >= 2);

    const usage = await readUsage(wsRoot);
    assert.ok((usage['workspace:rules/tauri-ipc-command-boundaries.md']?.injected ?? 0) >= 4);
    assert.ok((usage['workspace:rules/tauri-ipc-command-boundaries.md']?.applied ?? 0) >= 2);
    assert.ok((usage['workspace:skills/oauth-pkce-login-hardening.md']?.applied ?? 0) >= 1);
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
});

test('mineBenchmarkCasesFromGit derives redacted v2 cases from commit history with zero memory bodies', async () => {
  const fixtureDir = path.resolve('tests/fixtures/benchmark/real-stacks-v1/memories/workspace');
  const { tmpDir, ctx } = await createWorkspaceContextFromFixture(fixtureDir);
  try {
    // Fail-open outside a git repository
    const emptyDoc = await mineBenchmarkCasesFromGit(ctx, { cwd: tmpDir });
    assert.deepEqual(emptyDoc, { version: 2, cases: [] });

    git(tmpDir, ['init']);
    git(tmpDir, ['config', 'user.name', 'Test Author']);
    git(tmpDir, ['config', 'user.email', 'test@example.com']);

    await mkdir(path.join(tmpDir, 'supabase', 'migrations'), { recursive: true });
    await writeFile(path.join(tmpDir, 'supabase', 'migrations', '001_init.sql'), 'ALTER TABLE projects ENABLE ROW LEVEL SECURITY;\n');
    git(tmpDir, ['add', 'supabase/migrations/001_init.sql']);
    git(tmpDir, ['commit', '-m', 'add supabase rls migration for dev@corp.example sk-abcdefghijklmnopqrstuvwxyz123456']);

    // Duplicate subject should be deduplicated
    await writeFile(path.join(tmpDir, 'supabase', 'migrations', '002_dup.sql'), 'SELECT 1;\n');
    git(tmpDir, ['add', 'supabase/migrations/002_dup.sql']);
    git(tmpDir, ['commit', '-m', 'add supabase rls migration for dev@corp.example sk-abcdefghijklmnopqrstuvwxyz123456']);

    // Path-segment stem hit (>= 2 stems: pgvector + cosine) without applies_to
    await mkdir(path.join(tmpDir, 'db', 'pgvector'), { recursive: true });
    await writeFile(path.join(tmpDir, 'db', 'pgvector', 'cosine_index.sql'), '-- hnsw\n');
    git(tmpDir, ['add', 'db/pgvector/cosine_index.sql']);
    git(tmpDir, ['commit', '-m', 'tune pgvector cosine index parameters']);

    const mined = await mineBenchmarkCasesFromGit(ctx, { cwd: tmpDir, maxCases: 10 });
    assert.equal(mined.version, 2);
    assert.equal(mined.cases.length, 2);

    const parsed = parseBenchmarkDocument(mined);
    assert.equal(parsed.diagnostics.length, 0);

    const serialized = JSON.stringify(mined);
    assert.equal(serialized.includes('dev@corp.example'), false);
    assert.equal(serialized.includes('sk-abcdefghijklmnopqrstuvwxyz123456'), false);
    assert.equal(serialized.includes('## Content'), false);

    const rlsCase = mined.cases.find((c) => c.expect.includes('supabase-rls-least-privilege'));
    assert.ok(rlsCase);
    const pgvectorCase = mined.cases.find((c) => c.expect.includes('pgvector-hnsw-cosine-tuning'));
    assert.ok(pgvectorCase);
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
});

test('real-stacks-v1 benchmark passes recall, forbidden_hits, zero_result, and telemetry-loop gates', async () => {
  const fixtureBase = path.resolve('tests/fixtures/benchmark/real-stacks-v1');
  const rawCases = JSON.parse(await readFile(path.join(fixtureBase, 'cases.json'), 'utf8'));
  const parsed = parseBenchmarkDocument(rawCases);
  assert.equal(parsed.diagnostics.length, 0, `schema diagnostics: ${JSON.stringify(parsed.diagnostics)}`);
  assert.equal(parsed.document?.cases.length, 35);

  const { tmpDir, ctx } = await createWorkspaceContextFromFixture(path.join(fixtureBase, 'memories', 'workspace'));
  try {
    const run = await runBenchmark(ctx, parsed.document.cases);
    assert.ok(run.metrics.recall_at_k >= 0.95, `expected recall_at_k >= 0.95, got ${run.metrics.recall_at_k}`);
    assert.equal(run.metrics.forbidden_hits, 0, `expected 0 forbidden_hits, got ${run.metrics.forbidden_hits}`);
    assert.equal(run.metrics.zero_result_correctness, 1, `expected zero_result_correctness === 1, got ${run.metrics.zero_result_correctness}`);
    assert.equal(run.telemetry_loop?.cases, 1);
    assert.equal(run.telemetry_loop?.noisy_demoted_rate, 1);
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
});
