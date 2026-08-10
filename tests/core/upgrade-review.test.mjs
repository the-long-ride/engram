import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { defaultConfig } from '../../dist/core/runtime/config.js';
import { scanUpgradeInventory } from '../../dist/core/upgrade/inventory.js';
import { buildUpgradePlan } from '../../dist/core/upgrade/planner.js';
import { getConflictProposal, renderUnifiedDiff, selectConflictPreview, validateConflictProposal } from '../../dist/core/upgrade/proposals.js';

async function fixture() {
  const cwd = await mkdtemp(path.join(os.tmpdir(), 'engram-upgrade-review-'));
  await mkdir(path.join(cwd, '.agents'), { recursive: true });
  await writeFile(path.join(cwd, 'AGENTS.md'), '# Human intro\n\n<!-- engram:start -->\nOLD\n<!-- engram:end -->\n\nHuman tail\n');
  await writeFile(path.join(cwd, '.agents', 'engram.md'), '# My custom guide\n');
  await mkdir(path.join(cwd, '.cursor', 'rules'), { recursive: true });
  await writeFile(path.join(cwd, '.cursor', 'rules', 'engram.mdc'), '---\ndescription: Engram\n---\n\n<!-- engram:start -->\nOLD\n<!-- engram:end -->\n');
  await writeFile(path.join(cwd, '.cursor', 'mcp.json'), '{ invalid json but user wants to repair it\n');
  const config = { ...defaultConfig(), global_path: '' };
  const plan = buildUpgradePlan(await scanUpgradeInventory(cwd, config, '0.0.30'), '0.0.30');
  return { cwd, config, plan };
}



test('preview selection requires compatible target identity when paths collide', () => {
  const file = path.resolve('/tmp/shared/AGENTS.md');
  const item = {
    id: 'instruction', scope: 'global', kind: 'instruction', agent: 'codex', agents: ['codex'], file,
    targetVersion: '0.0.30', status: 'conflict', strategy: 'manual-review', userEditsPreserved: true,
    reason: 'test', ownership: 'managed-region', forceMode: 'replace-managed-region', transactionGroup: 'global:test'
  };
  const rows = [
    { target: 'claude', file, mode: 'file', renderTarget: 'slash', current: 'same', expected: 'SKILLSET', latest: 'SKILLSET', safe: true, userEditsPreserved: false },
    { target: 'codex', file, mode: 'block', renderTarget: 'agents-md', current: 'same', expected: 'INSTRUCTIONS', latest: 'INSTRUCTIONS', safe: true, userEditsPreserved: true }
  ];
  assert.equal(selectConflictPreview(process.cwd(), item, rows)?.latest, 'INSTRUCTIONS');
});
test('instruction proposal preserves human text outside the Engram managed block', async () => {
  const f = await fixture();
  const item = f.plan.items.find((row) => row.kind === 'instruction' && row.file.endsWith('AGENTS.md'));
  assert.ok(item);
  const proposal = await getConflictProposal(f.cwd, f.config, f.plan, item.id);
  assert.equal(proposal.current.includes('# Human intro'), true);
  assert.equal(proposal.proposed.includes('# Human intro'), true);
  assert.equal(proposal.proposed.includes('Human tail'), true);
  assert.equal(proposal.proposed.includes('\nOLD\n'), false);
  assert.equal(proposal.kind, 'instruction');
  await rm(f.cwd, { recursive: true, force: true });
});

test('human-authored workspace guide never gains force ownership from path alone', async () => {
  const f = await fixture();
  const item = f.plan.items.find((row) => row.kind === 'skillset' && row.status === 'conflict' && row.file.endsWith(path.join('.agents', 'engram.md')));
  assert.ok(item, JSON.stringify(f.plan.items, null, 2));
  const proposal = await getConflictProposal(f.cwd, f.config, f.plan, item.id);
  assert.equal(proposal.current, '# My custom guide\n');
  assert.notEqual(proposal.proposed, proposal.current);
  assert.equal(proposal.replaceable, false);
  assert.equal(proposal.ownership, 'unknown');
  assert.equal(proposal.forceMode, 'none');
  assert.equal(proposal.forceWarning, undefined);
  await rm(f.cwd, { recursive: true, force: true });
});

test('invalid config conflict still exposes an editable latest proposal and validates edits', async () => {
  const f = await fixture();
  const item = f.plan.items.find((row) => row.kind === 'config' && row.status === 'conflict' && row.file.endsWith(path.join('.cursor', 'mcp.json')));
  assert.ok(item, JSON.stringify(f.plan.items, null, 2));
  const proposal = await getConflictProposal(f.cwd, f.config, f.plan, item.id);
  assert.equal(proposal.kind, 'config');
  assert.notEqual(proposal.proposed, proposal.current);
  assert.doesNotThrow(() => JSON.parse(proposal.proposed));
  assert.equal(validateConflictProposal(proposal, '{ nope').valid, false);
  assert.equal(validateConflictProposal(proposal, proposal.proposed).valid, true);
  const diff = renderUnifiedDiff(proposal.current, proposal.proposed);
  assert.match(diff, /^--- current\n\+\+\+ proposed\n/m);
  assert.match(diff, /^-/m);
  assert.match(diff, /^\+/m);
  await rm(f.cwd, { recursive: true, force: true });
});

import { stat } from 'node:fs/promises';
import { loadUpgradeReview, saveUpgradeResolution, upgradeReviewFile } from '../../dist/core/upgrade/review-store.js';
import { sha256 } from '../../dist/core/safety/hash.js';

function reviewPlan(root, fingerprint = 'a'.repeat(64), changed = false) {
  const configFile = path.join(root, 'config.json');
  const skillFile = path.join(root, 'SKILL.md');
  return {
    currentVersion: '0.0.29', targetVersion: '0.0.30', scannedAt: new Date().toISOString(), fingerprint,
    workspaceRoot: root,
    summary: { workspace: { current: 0, outdated: 0, conflict: 2, invalid: 0 }, global: { current: 0, outdated: 0, conflict: 0, invalid: 0 } },
    items: [
      { id: 'config-review', scope: 'workspace', kind: 'config', file: configFile, targetVersion: '0.0.30', status: 'conflict', strategy: 'manual-review', userEditsPreserved: true, reason: 'edited', currentHash: changed ? sha256('changed') : sha256('config'), ownership: 'unknown', forceMode: 'none', transactionGroup: 'workspace:cursor' },
      { id: 'skill-review', scope: 'workspace', kind: 'skillset', file: skillFile, targetVersion: '0.0.30', status: 'conflict', strategy: 'manual-review', userEditsPreserved: true, reason: 'edited', currentHash: sha256('skill'), ownership: 'generated-file', forceMode: 'replace-file', transactionGroup: 'workspace:codex' }
    ], warnings: []
  };
}

test('review store persists explicit decisions with restrictive permissions and resumes them', async () => {
  const stateRoot = await mkdtemp(path.join(os.tmpdir(), 'engram-review-state-'));
  const previous = process.env.ENGRAM_CONFIG_DIR;
  process.env.ENGRAM_CONFIG_DIR = stateRoot;
  try {
    const plan = reviewPlan(stateRoot);
    let summary = await loadUpgradeReview(plan);
    assert.equal(summary.pendingReviewCount, 2);
    await saveUpgradeResolution(plan, { itemId: 'config-review', state: 'edited', sourceHash: sha256('config'), proposedContent: '{"mcp":{}}', updatedAt: new Date().toISOString() });
    await saveUpgradeResolution(plan, { itemId: 'skill-review', state: 'keep-current', sourceHash: sha256('skill'), updatedAt: new Date().toISOString() });
    summary = await loadUpgradeReview(plan);
    assert.equal(summary.reviewedCount, 2);
    assert.equal(summary.pendingReviewCount, 0);
    assert.equal(summary.items.find((row) => row.itemId === 'config-review')?.state, 'edited');
    assert.equal(summary.items.find((row) => row.itemId === 'skill-review')?.state, 'keep-current');
    if (process.platform !== 'win32') {
      const mode = (await stat(upgradeReviewFile(plan))).mode & 0o777;
      assert.equal(mode, 0o600);
    }
  } finally {
    if (previous === undefined) delete process.env.ENGRAM_CONFIG_DIR; else process.env.ENGRAM_CONFIG_DIR = previous;
    await rm(stateRoot, { recursive: true, force: true });
  }
});

test('review store accepts force only when ownership evidence matches the current item', async () => {
  const stateRoot = await mkdtemp(path.join(os.tmpdir(), 'engram-review-force-'));
  const previous = process.env.ENGRAM_CONFIG_DIR;
  process.env.ENGRAM_CONFIG_DIR = stateRoot;
  try {
    const plan = reviewPlan(stateRoot);
    await assert.rejects(
      saveUpgradeResolution(plan, { itemId: 'skill-review', state: 'force-latest', sourceHash: sha256('skill'), ownership: 'managed-region', forceMode: 'replace-managed-region', updatedAt: new Date().toISOString() }),
      /ownership evidence/i
    );
    const summary = await saveUpgradeResolution(plan, { itemId: 'skill-review', state: 'force-latest', sourceHash: sha256('skill'), ownership: 'generated-file', forceMode: 'replace-file', updatedAt: new Date().toISOString() });
    const saved = summary.items.find((row) => row.itemId === 'skill-review');
    assert.equal(saved?.state, 'force-latest');
    assert.equal(saved?.ownership, 'generated-file');
    assert.equal(saved?.forceMode, 'replace-file');
  } finally {
    if (previous === undefined) delete process.env.ENGRAM_CONFIG_DIR; else process.env.ENGRAM_CONFIG_DIR = previous;
    await rm(stateRoot, { recursive: true, force: true });
  }
});

test('compatible preview invalidates a saved force decision when ownership evidence changes', async () => {
  const stateRoot = await mkdtemp(path.join(os.tmpdir(), 'engram-review-force-stale-'));
  const previous = process.env.ENGRAM_CONFIG_DIR;
  process.env.ENGRAM_CONFIG_DIR = stateRoot;
  try {
    const oldPlan = reviewPlan(stateRoot, 'd'.repeat(64));
    await saveUpgradeResolution(oldPlan, { itemId: 'skill-review', state: 'force-latest', sourceHash: sha256('skill'), ownership: 'generated-file', forceMode: 'replace-file', updatedAt: new Date().toISOString() });
    const nextPlan = reviewPlan(stateRoot, 'e'.repeat(64));
    nextPlan.items[1] = { ...nextPlan.items[1], ownership: 'unknown', forceMode: 'none' };
    const summary = await loadUpgradeReview(nextPlan);
    const saved = summary.items.find((row) => row.itemId === 'skill-review');
    assert.equal(saved?.state, 'pending');
    assert.equal(saved?.stale, true);
  } finally {
    if (previous === undefined) delete process.env.ENGRAM_CONFIG_DIR; else process.env.ENGRAM_CONFIG_DIR = previous;
    await rm(stateRoot, { recursive: true, force: true });
  }
});

test('new plan fingerprint salvages unchanged decisions but invalidates only a changed source hash', async () => {
  const stateRoot = await mkdtemp(path.join(os.tmpdir(), 'engram-review-stale-'));
  const previous = process.env.ENGRAM_CONFIG_DIR;
  process.env.ENGRAM_CONFIG_DIR = stateRoot;
  try {
    const oldPlan = reviewPlan(stateRoot, 'b'.repeat(64));
    await saveUpgradeResolution(oldPlan, { itemId: 'config-review', state: 'accept-latest', sourceHash: sha256('config'), proposedContent: '{"mcp":{}}', updatedAt: new Date().toISOString() });
    await saveUpgradeResolution(oldPlan, { itemId: 'skill-review', state: 'keep-current', sourceHash: sha256('skill'), updatedAt: new Date().toISOString() });
    const newPlan = reviewPlan(stateRoot, 'c'.repeat(64), true);
    const summary = await loadUpgradeReview(newPlan);
    assert.equal(summary.items.find((row) => row.itemId === 'config-review')?.state, 'pending');
    assert.equal(summary.items.find((row) => row.itemId === 'config-review')?.stale, true);
    assert.equal(summary.items.find((row) => row.itemId === 'skill-review')?.state, 'keep-current');
    assert.equal(summary.pendingReviewCount, 1);
  } finally {
    if (previous === undefined) delete process.env.ENGRAM_CONFIG_DIR; else process.env.ENGRAM_CONFIG_DIR = previous;
    await rm(stateRoot, { recursive: true, force: true });
  }
});

import { applyUpgradePlan } from '../../dist/core/upgrade/executor.js';

async function applyFixture() {
  const cwd = await mkdtemp(path.join(os.tmpdir(), 'engram-upgrade-review-apply-'));
  await mkdir(path.join(cwd, '.agents'), { recursive: true });
  await writeFile(path.join(cwd, 'AGENTS.md'), '# Human intro\n\n<!-- engram:start -->\nOLD\n<!-- engram:end -->\n\nHuman tail\n');
  await writeFile(path.join(cwd, '.agents', 'engram.md'), '# My custom guide\n');
  const config = { ...defaultConfig(), global_path: '' };
  const plan = buildUpgradePlan(await scanUpgradeInventory(cwd, config, '0.0.30'), '0.0.30');
  const conflict = plan.items.find((row) => row.kind === 'skillset' && row.status === 'conflict');
  assert.ok(conflict, JSON.stringify(plan.items, null, 2));
  return { cwd, config, plan, conflict };
}

test('final apply is blocked while any conflict is unresolved', async () => {
  const f = await applyFixture();
  await assert.rejects(() => applyUpgradePlan(f.cwd, f.config, f.plan, { confirmed: true }), /requires review/i);
  await rm(f.cwd, { recursive: true, force: true });
});

test('keep-current explicitly resolves a conflict without writing that file', async () => {
  const f = await applyFixture();
  const before = await readFile(f.conflict.file, 'utf8');
  const review = {
    reviewableCount: 1, reviewedCount: 1, pendingReviewCount: 0, staleCount: 0,
    items: [{ itemId: f.conflict.id, state: 'keep-current', stale: false, sourceHash: f.conflict.currentHash ?? '' }]
  };
  const result = await applyUpgradePlan(f.cwd, f.config, f.plan, { confirmed: true, review });
  assert.equal(await readFile(f.conflict.file, 'utf8'), before);
  assert.ok(result.conflicts.some((row) => row.id === f.conflict.id));
  assert.doesNotMatch(await readFile(path.join(f.cwd, 'AGENTS.md'), 'utf8'), /\nOLD\n/);
  await rm(f.cwd, { recursive: true, force: true });
});

test('legacy accept-latest decision for a newly manual-review artifact is rejected for re-review', async () => {
  const f = await applyFixture();
  const proposal = await getConflictProposal(f.cwd, f.config, f.plan, f.conflict.id);
  const review = {
    reviewableCount: 1, reviewedCount: 1, pendingReviewCount: 0, staleCount: 0,
    items: [{ itemId: f.conflict.id, state: 'accept-latest', stale: false, sourceHash: proposal.sourceHash, proposedContent: proposal.proposed }]
  };
  await assert.rejects(() => applyUpgradePlan(f.cwd, f.config, f.plan, { confirmed: true, review }), /review policy changed/i);
  await rm(f.cwd, { recursive: true, force: true });
});
