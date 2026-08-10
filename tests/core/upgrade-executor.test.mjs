import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { defaultConfig } from '../../dist/core/runtime/config.js';
import { scanUpgradeInventory } from '../../dist/core/upgrade/inventory.js';
import { buildUpgradePlan } from '../../dist/core/upgrade/planner.js';
import { applyUpgradePlan } from '../../dist/core/upgrade/executor.js';
import { loadIndex } from '../../dist/core/memory/index.js';
import { loadGraph } from '../../dist/core/memory/graph.js';

async function fixture() {
  const cwd = await mkdtemp(path.join(os.tmpdir(), 'engram-upgrade-executor-'));
  const root = path.join(cwd, '.agents', '.engram');
  await mkdir(path.join(root, 'knowledge'), { recursive: true });
  await writeFile(path.join(root, 'knowledge', 'old.md'), `---\nid: old\ntype: knowledge\nscope: workspace\ntags: [old]\ncreated: 2025-01-01\nauthor: old@example.com\nconfidence: medium\n---\n# Old\n\n## Content\n\nOld.\n`);
  await writeFile(path.join(cwd, 'AGENTS.md'), '# User intro\n\n<!-- engram:start -->\n# Engram\nOLD\n<!-- engram:end -->\n\nUser tail\n');
  const config = { ...defaultConfig(), global_path: '' };
  const inventory = await scanUpgradeInventory(cwd, config, '0.0.29');
  const plan = buildUpgradePlan(inventory, '0.0.29');
  return { cwd, root, config, inventory, plan };
}

test('apply requires explicit confirmation', async () => {
  const f = await fixture();
  await assert.rejects(() => applyUpgradePlan(f.cwd, f.config, f.plan, { confirmed: false }), /confirmation required/i);
  await rm(f.cwd, { recursive: true, force: true });
});

test('stale plan is rejected when affected file changes after preview', async () => {
  const f = await fixture();
  await writeFile(path.join(f.cwd, 'AGENTS.md'), '# changed after preview\n');
  await assert.rejects(() => applyUpgradePlan(f.cwd, f.config, f.plan, { confirmed: true }), /preview is stale/i);
  await rm(f.cwd, { recursive: true, force: true });
});

test('safe upgrade preserves user-authored bytes around managed block and becomes idempotent', async () => {
  const f = await fixture();
  const result = await applyUpgradePlan(f.cwd, f.config, f.plan, { confirmed: true });
  const agents = await readFile(path.join(f.cwd, 'AGENTS.md'), 'utf8');
  assert.ok(agents.startsWith('# User intro\n\n'));
  assert.ok(agents.endsWith('\n\nUser tail\n'));
  assert.ok(!agents.includes('\nOLD\n'));
  assert.ok(result.transactions.some((row) => row.status === 'updated'));
  const next = buildUpgradePlan(await scanUpgradeInventory(f.cwd, f.config, '0.0.29'), '0.0.29');
  assert.equal(next.items.filter((row) => row.status === 'outdated').length, 0);
  await rm(f.cwd, { recursive: true, force: true });
});


test('memory migration refreshes index and graph through the shared executor', async () => {
  const f = await fixture();
  const result = await applyUpgradePlan(f.cwd, f.config, f.plan, { confirmed: true });
  const index = await loadIndex(f.root);
  const graph = await loadGraph(f.root);
  assert.ok(index.entries.some((entry) => entry.id === 'old'));
  assert.ok(graph.nodes.some((node) => node.memoryId === 'old'));
  assert.ok(result.transactions.some((row) => row.group === 'workspace:memory' && row.status === 'updated'));
  await rm(f.cwd, { recursive: true, force: true });
});

test('vector degradation is reported but does not roll back durable memory migration', async () => {
  const f = await fixture();
  const result = await applyUpgradePlan(f.cwd, f.config, f.plan, {
    confirmed: true,
    _ensureVectorIndex: async (root, scope, entries) => ({
      scope,
      file: path.join(root, 'memory.vec.sqlite'),
      action: 'skipped',
      entries: entries.length,
      reason: 'vector index degraded: forced test failure'
    })
  });
  assert.ok(result.transactions.some((row) => row.group === 'workspace:memory' && row.status === 'updated'));
  assert.deepEqual(result.vectorWarnings, ['workspace: vector index degraded: forced test failure']);
  const migrated = await readFile(path.join(f.root, 'knowledge', 'old.md'), 'utf8');
  assert.match(migrated, /schema_version: 3/);
  await rm(f.cwd, { recursive: true, force: true });
});



test('durable graph rebuild failure rolls memory migration back and rejects the whole apply', async () => {
  const f = await fixture();
  const file = path.join(f.root, 'knowledge', 'old.md');
  const before = await readFile(file, 'utf8');
  await assert.rejects(() => applyUpgradePlan(f.cwd, f.config, f.plan, {
    confirmed: true,
    _rebuildGraph: async () => { throw new Error('forced graph rebuild failure'); }
  }), /rolled-back|forced graph rebuild failure/i);
  assert.equal(await readFile(file, 'utf8'), before);
  const index = await loadIndex(f.root);
  assert.equal(index.entries.length, 0);
  await rm(f.cwd, { recursive: true, force: true });
});



test('executor migrates only memory files included in a partial plan', async () => {
  const f = await fixture();
  const second = path.join(f.root, 'knowledge', 'second.md');
  const secondRaw = `---\nid: second\ntype: knowledge\nscope: workspace\ntags: [old]\ncreated: 2025-01-01\nauthor: old@example.com\nconfidence: medium\n---\n# Second\n\n## Content\n\nSecond.\n`;
  await writeFile(second, secondRaw);
  const inventory = await scanUpgradeInventory(f.cwd, f.config, '0.0.29');
  const partial = buildUpgradePlan({
    ...inventory,
    items: inventory.items.filter((item) => item.kind !== 'memory' || item.file.endsWith('/old.md'))
  }, '0.0.29');
  const result = await applyUpgradePlan(f.cwd, f.config, partial, { confirmed: true });
  assert.ok(result.transactions.some((row) => row.group === 'workspace:memory' && row.status === 'updated'));
  assert.match(await readFile(path.join(f.root, 'knowledge', 'old.md'), 'utf8'), /schema_version: 3/);
  assert.equal(await readFile(second, 'utf8'), secondRaw);
  await rm(f.cwd, { recursive: true, force: true });
});

test('reviewed keep-current invalid memory does not block a separate safe memory migration', async () => {
  const f = await fixture();
  const invalid = path.join(f.root, 'knowledge', 'invalid.md');
  const invalidRaw = `---
id: invalid
type: knowledge
scope: workspace
---
# Invalid
`;
  await writeFile(invalid, invalidRaw);
  const inventory = await scanUpgradeInventory(f.cwd, f.config, '0.0.29');
  const plan = buildUpgradePlan(inventory, '0.0.29');
  const invalidItem = plan.items.find((item) => item.file === invalid && item.status === 'invalid');
  assert.ok(invalidItem);
  const review = {
    reviewableCount: 1, reviewedCount: 1, pendingReviewCount: 0, staleCount: 0,
    items: [{ itemId: invalidItem.id, state: 'keep-current', stale: false, sourceHash: invalidItem.currentHash ?? '' }]
  };
  const result = await applyUpgradePlan(f.cwd, f.config, plan, { confirmed: true, review });
  assert.ok(result.conflicts.some((item) => item.file === invalid && item.status === 'invalid'));
  assert.ok(result.transactions.some((row) => row.group === 'workspace:memory' && row.status === 'updated'));
  assert.match(await readFile(path.join(f.root, 'knowledge', 'old.md'), 'utf8'), /schema_version: 3/);
  assert.equal(await readFile(invalid, 'utf8'), invalidRaw);
  await rm(f.cwd, { recursive: true, force: true });
});

test('filtered plans validate only the explicitly previewed inventory items', async () => {
  const f = await fixture();
  const withoutMemories = buildUpgradePlan({
    ...f.inventory,
    items: f.inventory.items.filter((item) => item.kind !== 'memory')
  }, '0.0.29');
  const result = await applyUpgradePlan(f.cwd, f.config, withoutMemories, { confirmed: true });
  assert.ok(!result.transactions.some((row) => row.group === 'workspace:memory'));
  const legacy = await readFile(path.join(f.root, 'knowledge', 'old.md'), 'utf8');
  assert.doesNotMatch(legacy, /schema_version: 3/);
  await rm(f.cwd, { recursive: true, force: true });
});
