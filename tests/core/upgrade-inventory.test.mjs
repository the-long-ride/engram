import test from 'node:test';
import assert from 'node:assert/strict';
import { upgradeItemId, upgradePlanFingerprint } from '../../dist/core/upgrade/fingerprint.js';
import { buildUpgradePlan } from '../../dist/core/upgrade/planner.js';

const baseItem = {
  scope: 'workspace',
  kind: 'instruction',
  agent: 'codex',
  file: '/repo/AGENTS.md',
  installedVersion: '0.0.28',
  targetVersion: '0.0.29',
  status: 'outdated',
  strategy: 'update-managed-block',
  userEditsPreserved: true,
  reason: 'managed block is older than installed Engram',
  currentHash: 'abc',
  expectedManagedHash: 'def',
  ownership: 'managed-region',
  forceMode: 'replace-managed-region',
  transactionGroup: 'workspace:artifact:abc'
};

test('upgrade item IDs are stable and artifact-identity based', () => {
  assert.equal(upgradeItemId(baseItem), upgradeItemId({ ...baseItem, reason: 'different presentation text' }));
  assert.notEqual(upgradeItemId(baseItem), upgradeItemId({ ...baseItem, file: '/repo/OTHER.md' }));
});


test('integration IDs ignore host aliases while fingerprints canonicalize agent order', () => {
  const a = { ...baseItem, agent: 'codex', agents: ['gemini', 'codex', 'claude'] };
  const b = { ...baseItem, agent: 'claude', agents: ['claude', 'codex', 'gemini'] };
  assert.equal(upgradeItemId(a), upgradeItemId(b));
  assert.equal(
    upgradePlanFingerprint([a], '0.0.29', '/repo', '/global'),
    upgradePlanFingerprint([b], '0.0.29', '/repo', '/global')
  );
});

test('plan fingerprint changes when an affected current hash changes', () => {
  const a = upgradePlanFingerprint([baseItem], '0.0.29', '/repo', '/global');
  const b = upgradePlanFingerprint([{ ...baseItem, currentHash: 'changed' }], '0.0.29', '/repo', '/global');
  assert.notEqual(a, b);
});

test('planner produces separate workspace/global status counts', () => {
  const plan = buildUpgradePlan({
    workspaceRoot: '/repo', globalRoot: '/global', items: [baseItem, {
      ...baseItem,
      scope: 'global',
      kind: 'memory',
      agent: undefined,
      file: '/global/memories/a.md',
      status: 'conflict',
      strategy: 'manual-review',
      transactionGroup: 'global:memory'
    }]
  }, '0.0.29');
  assert.equal(plan.summary.workspace.outdated, 1);
  assert.equal(plan.summary.global.conflict, 1);
  assert.match(plan.fingerprint, /^[a-f0-9]{64}$/);
});

import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { scanMemoryUpgrades } from '../../dist/core/upgrade/memory-scanner.js';
import { scanIntegrationUpgrades } from '../../dist/core/upgrade/integration-scanner.js';

function legacyMemory(id='legacy') {
  return `---\nid: ${id}\ntype: knowledge\nscope: workspace\ntags: [legacy]\ncreated: 2025-01-01\nauthor: old@example.com\nconfidence: medium\n---\n# Legacy\n\n## Content\n\nOld content.\n`;
}

test('memory scanner distinguishes legacy and current schema files', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'engram-upgrade-memory-'));
  await mkdir(path.join(root, 'knowledge'), { recursive: true });
  await writeFile(path.join(root, 'knowledge', 'legacy.md'), legacyMemory());
  const items = await scanMemoryUpgrades(root, 'workspace', '0.0.29');
  assert.equal(items.length, 1);
  assert.equal(items[0].status, 'outdated');
  assert.equal(items[0].strategy, 'migrate-schema');
  await rm(root, { recursive: true, force: true });
});

test('workspace integration scanner detects linked old managed instructions without crawling home', async () => {
  const cwd = await mkdtemp(path.join(os.tmpdir(), 'engram-upgrade-integration-'));
  await writeFile(path.join(cwd, 'AGENTS.md'), '<!-- engram:start -->\n# Engram\nOLD CONTENT\n<!-- engram:end -->\n');
  const items = await scanIntegrationUpgrades(cwd, 'workspace', '0.0.29');
  const instruction = items.find((row) => row.kind === 'instruction' && row.file.endsWith('AGENTS.md'));
  assert.ok(instruction);
  assert.equal(instruction.status, 'outdated');
  assert.equal(instruction.strategy, 'update-managed-block');
  assert.equal(instruction.userEditsPreserved, false);
  await rm(cwd, { recursive: true, force: true });
});
