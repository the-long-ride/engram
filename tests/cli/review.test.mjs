import test from 'node:test';
import assert from 'node:assert/strict';
import { rm, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { runEngram, tempWorkspace, workspaceMemoryRoot } from '../helpers.mjs';

async function writeMemoryFile(cwd, rel, raw) {
  const root = workspaceMemoryRoot(cwd);
  const file = path.join(root, rel);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, raw);
}

async function rehashAndRebuild(cwd, env) {
  await runEngram(cwd, env, ['rehash']);
  await runEngram(cwd, env, ['rebuild-index']);
}

function oldMemory(id, updated, opts = {}) {
  const dep = opts.dependsOn ? `depends_on: [${opts.dependsOn}]\n` : '';
  return `---
id: ${id}
type: knowledge
scope: workspace
tags: [${(opts.tags ?? ['test']).join(', ')}]
created: ${opts.created ?? updated}
updated: ${updated}
author: test@example.com
confidence: high
${dep}---
# Knowledge: ${id}

## Content

- ${(opts.summary ?? 'test memory').trim()}

## Example

Test example.
`;
}

test('review list shows duplicate findings', async () => {
  const { cwd, env } = await tempWorkspace('engram-review-dup-');
  await runEngram(cwd, env, ['inject', '--no-skillset']);
  await writeMemoryFile(cwd, 'knowledge/redis-a.md', oldMemory('redis-a', '2026-07-01', { summary: 'Cache invalidation strategy for Redis pubsub', tags: ['redis', 'cache'] }));
  await writeMemoryFile(cwd, 'knowledge/redis-b.md', oldMemory('redis-b', '2026-07-01', { summary: 'Cache invalidation strategy for Redis pubsub', tags: ['redis', 'cache'] }));
  await rehashAndRebuild(cwd, env);
  const result = await runEngram(cwd, env, ['review', 'list', '--json']);
  assert.equal(result.code, 0, result.stderr);
  const body = JSON.parse(result.stdout);
  assert.ok(body.ok);
  const dups = body.data.findings.filter((f) => f.kind === 'duplicate');
  assert.ok(dups.length >= 1, 'at least one duplicate finding');
  assert.ok(dups[0].memory_ids.length === 2);
  assert.ok(dups[0].safe_summary.includes('duplicate'), 'summary mentions duplicate');
  await rm(cwd, { recursive: true, force: true });
});

test('review list shows stale findings for old memories', async () => {
  const { cwd, env } = await tempWorkspace('engram-review-stale-');
  await runEngram(cwd, env, ['inject', '--no-skillset']);
  await writeMemoryFile(cwd, 'knowledge/old-fact.md', oldMemory('old-fact', '2024-01-01', { summary: 'Old deployment fact from last year', tags: ['deploy', 'old'] }));
  await rehashAndRebuild(cwd, env);
  const result = await runEngram(cwd, env, ['review', 'list', '--json']);
  assert.equal(result.code, 0, result.stderr);
  const body = JSON.parse(result.stdout);
  const stale = body.data.findings.filter((f) => f.kind === 'stale');
  assert.ok(stale.length >= 1, 'at least one stale finding');
  assert.ok(stale.some((f) => f.memory_ids.includes('old-fact')));
  await rm(cwd, { recursive: true, force: true });
});

test('review list shows invalid_dependency findings', async () => {
  const { cwd, env } = await tempWorkspace('engram-review-dep-');
  await runEngram(cwd, env, ['inject', '--no-skillset']);
  await writeMemoryFile(cwd, 'knowledge/orphan-dep.md', oldMemory('orphan-dep', '2026-07-01', {
    dependsOn: 'nonexistent-memory',
    summary: 'Memory with a broken dependency'
  }));
  await rehashAndRebuild(cwd, env);
  const result = await runEngram(cwd, env, ['review', 'list', '--json']);
  assert.equal(result.code, 0, result.stderr);
  const body = JSON.parse(result.stdout);
  const invalidDeps = body.data.findings.filter((f) => f.kind === 'invalid_dependency');
  assert.ok(invalidDeps.length >= 1, 'at least one invalid_dependency finding');
  assert.ok(invalidDeps.some((f) => f.memory_ids.includes('orphan-dep') && f.memory_ids.includes('nonexistent-memory')));
  await rm(cwd, { recursive: true, force: true });
});

test('review dismiss persists across rebuild', async () => {
  const { cwd, env } = await tempWorkspace('engram-review-dismiss-');
  await runEngram(cwd, env, ['inject', '--no-skillset']);
  await writeMemoryFile(cwd, 'knowledge/deploy-a.md', oldMemory('deploy-a', '2026-07-01', { summary: 'Deploy via GitHub Actions with pnpm cache', tags: ['deploy', 'ci'] }));
  await writeMemoryFile(cwd, 'knowledge/deploy-b.md', oldMemory('deploy-b', '2026-07-01', { summary: 'Deploy via GitHub Actions with pnpm cache', tags: ['deploy', 'ci'] }));
  await rehashAndRebuild(cwd, env);
  const listResult = await runEngram(cwd, env, ['review', 'list', '--json']);
  const body1 = JSON.parse(listResult.stdout);
  const dup = body1.data.findings.find((f) => f.kind === 'duplicate');
  assert.ok(dup, 'duplicate finding exists');
  const dismissResult = await runEngram(cwd, env, ['review', 'dismiss', dup.id, '--note', 'false positive', '--json']);
  assert.equal(dismissResult.code, 0, dismissResult.stderr);
  const dismissBody = JSON.parse(dismissResult.stdout);
  assert.ok(dismissBody.ok);
  await runEngram(cwd, env, ['rehash']);
  await runEngram(cwd, env, ['rebuild-index']);
  const relistResult = await runEngram(cwd, env, ['review', 'list', '--json']);
  const body2 = JSON.parse(relistResult.stdout);
  const dups2 = body2.data.findings.filter((f) => f.kind === 'duplicate');
  assert.equal(dups2.length, 0, 'duplicate finding should not reappear after dismiss');
  await rm(cwd, { recursive: true, force: true });
});

test('review verify sets last_verified and resolves findings', async () => {
  const { cwd, env } = await tempWorkspace('engram-review-verify-');
  await runEngram(cwd, env, ['inject', '--no-skillset']);
  await writeMemoryFile(cwd, 'knowledge/stale-mem.md', oldMemory('stale-mem', '2024-06-01', { summary: 'Stale memory needing review', tags: ['review', 'test'] }));
  await rehashAndRebuild(cwd, env);
  const verifyResult = await runEngram(cwd, env, ['review', 'verify', 'stale-mem', '--json']);
  assert.equal(verifyResult.code, 0, verifyResult.stderr);
  const body = JSON.parse(verifyResult.stdout);
  assert.ok(body.ok);
  const relistResult = await runEngram(cwd, env, ['review', 'list', '--json']);
  const relist = JSON.parse(relistResult.stdout);
  const staleFindings = relist.data.findings.filter((f) => f.kind === 'stale' && f.memory_ids.includes('stale-mem'));
  assert.equal(staleFindings.length, 0, 'stale finding should be resolved after verify');
  await rm(cwd, { recursive: true, force: true });
});

test('review supersede marks old memory as superseded', async () => {
  const { cwd, env } = await tempWorkspace('engram-review-super-');
  await runEngram(cwd, env, ['inject', '--no-skillset']);
  await writeMemoryFile(cwd, 'knowledge/old-manual-deploy.md', oldMemory('old-manual-deploy', '2026-07-01', { summary: 'Old deploy method using manual scripts and shell commands', tags: ['deploy', 'manual'] }));
  await writeMemoryFile(cwd, 'knowledge/new-auto-deploy.md', oldMemory('new-auto-deploy', '2026-07-01', { summary: 'New deploy method using automated pipeline and CI', tags: ['deploy', 'automation'] }));
  await rehashAndRebuild(cwd, env);
  const oldId = 'old-manual-deploy';
  const newId = 'new-auto-deploy';
  const result = await runEngram(cwd, env, ['review', 'supersede', oldId, newId, '--json']);
  assert.equal(result.code, 0, result.stderr);
  const body = JSON.parse(result.stdout);
  assert.ok(body.ok);
  const loadResult = await runEngram(cwd, env, ['load', '--dry-run', '--json', 'deploy method']);
  assert.equal(loadResult.code, 0, loadResult.stderr);
  const loadBody = JSON.parse(loadResult.stdout);
  const entries = loadBody.data.entries ?? [];
  assert.ok(!entries.some((e) => e.id === oldId), 'superseded memory should not appear in routing');
  await rm(cwd, { recursive: true, force: true });
});

test('archived memory excluded from routing but direct-id shows warning', async () => {
  const { cwd, env } = await tempWorkspace('engram-review-arch-');
  await runEngram(cwd, env, ['inject', '--no-skillset']);
  await writeMemoryFile(cwd, 'knowledge/archived-mem.md', oldMemory('archived-mem', '2026-07-01', {
    summary: 'Should be archived and excluded from routing',
    tags: ['archive', 'test']
  }) + '');
  const memPath = path.join(workspaceMemoryRoot(cwd), 'knowledge', 'archived-mem.md');
  const raw = await import('node:fs/promises').then((m) => m.readFile(memPath, 'utf8'));
  const withArchived = raw.replace('confidence: high', 'confidence: high\nlifecycle: archived');
  await writeFile(memPath, withArchived);
  await rehashAndRebuild(cwd, env);
  const loadResult = await runEngram(cwd, env, ['load', '--dry-run', '--json', 'archive test']);
  assert.equal(loadResult.code, 0, loadResult.stderr);
  const loadBody = JSON.parse(loadResult.stdout);
  const entries = loadBody.data.entries ?? [];
  assert.ok(!entries.some((e) => e.id === 'archived-mem'), 'archived memory excluded from routing');
  const directResult = await runEngram(cwd, env, ['load', '--id', 'archived-mem', '--dry-run']);
  assert.match(directResult.stderr ?? directResult.stdout ?? '', /archived/i);
  await rm(cwd, { recursive: true, force: true });
});

test('review list --kind filters findings by kind', async () => {
  const { cwd, env } = await tempWorkspace('engram-review-kind-');
  await runEngram(cwd, env, ['inject', '--no-skillset']);
  await writeMemoryFile(cwd, 'knowledge/redis-c.md', oldMemory('redis-c', '2026-07-01', { summary: 'Cache invalidation strategy for Redis pubsub', tags: ['redis', 'cache'] }));
  await writeMemoryFile(cwd, 'knowledge/redis-d.md', oldMemory('redis-d', '2026-07-01', { summary: 'Cache invalidation strategy for Redis pubsub', tags: ['redis', 'cache'] }));
  await writeMemoryFile(cwd, 'knowledge/very-old.md', oldMemory('very-old', '2024-01-01', { summary: 'Very old memory', tags: ['ancient'] }));
  await rehashAndRebuild(cwd, env);
  const dupResult = await runEngram(cwd, env, ['review', 'list', '--kind', 'duplicate', '--json']);
  assert.equal(dupResult.code, 0, dupResult.stderr);
  const dupBody = JSON.parse(dupResult.stdout);
  assert.ok(dupBody.data.findings.every((f) => f.kind === 'duplicate'), 'only duplicate findings');
  const staleResult = await runEngram(cwd, env, ['review', 'list', '--kind', 'stale', '--json']);
  assert.equal(staleResult.code, 0, staleResult.stderr);
  const staleBody = JSON.parse(staleResult.stdout);
  assert.ok(staleBody.data.findings.every((f) => f.kind === 'stale'), 'only stale findings');
  await rm(cwd, { recursive: true, force: true });
});

test('review inspect shows finding details', async () => {
  const { cwd, env } = await tempWorkspace('engram-review-inspect-');
  await runEngram(cwd, env, ['inject', '--no-skillset']);
  await writeMemoryFile(cwd, 'knowledge/orphan.md', oldMemory('orphan', '2026-07-01', {
    dependsOn: 'ghost-dep',
    summary: 'Orphan with broken dependency'
  }));
  await rehashAndRebuild(cwd, env);
  const listResult = await runEngram(cwd, env, ['review', 'list', '--kind', 'invalid_dependency', '--json']);
  const body = JSON.parse(listResult.stdout);
  assert.ok(body.data.findings.length >= 1);
  const finding = body.data.findings[0];
  const inspectResult = await runEngram(cwd, env, ['review', 'inspect', finding.id, '--json']);
  assert.equal(inspectResult.code, 0, inspectResult.stderr);
  const inspect = JSON.parse(inspectResult.stdout);
  assert.ok(inspect.ok);
  assert.equal(inspect.data.finding.kind, 'invalid_dependency');
  assert.ok(inspect.data.finding.memory_ids.includes('orphan'));
  assert.doesNotMatch(JSON.stringify(inspect), /author:|password|secret/i, 'no body or secrets in inspect');
  await rm(cwd, { recursive: true, force: true });
});
