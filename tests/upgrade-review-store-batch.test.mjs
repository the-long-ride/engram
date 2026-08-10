import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { loadUpgradeReview, saveUpgradeResolution, saveUpgradeResolutions, upgradeReviewFile } from '../dist/core/upgrade/review-store.js';

function plan(root, fingerprint = 'b'.repeat(64), secondHash = 'hash-two') {
  return {
    currentVersion: '0.0.29',
    targetVersion: '0.0.30',
    scannedAt: '2026-08-09T00:00:00.000Z',
    fingerprint,
    workspaceRoot: root,
    summary: {
      workspace: { current: 0, outdated: 0, conflict: 2, invalid: 0 },
      global: { current: 0, outdated: 0, conflict: 0, invalid: 0 }
    },
    items: [
      { id: 'one', scope: 'workspace', kind: 'config', file: path.join(root, 'one.json'), targetVersion: '0.0.30', status: 'conflict', strategy: 'manual-review', userEditsPreserved: true, reason: 'edited', currentHash: 'hash-one', transactionGroup: 'workspace:one' },
      { id: 'two', scope: 'workspace', kind: 'skillset', file: path.join(root, 'two.md'), targetVersion: '0.0.30', status: 'conflict', strategy: 'manual-review', userEditsPreserved: true, reason: 'edited', currentHash: secondHash, transactionGroup: 'workspace:two' }
    ],
    warnings: []
  };
}

function resolution(itemId, sourceHash, proposedContent) {
  return { itemId, state: 'accept-latest', sourceHash, proposedContent, updatedAt: '2026-08-09T00:00:00.000Z' };
}

test('atomic review batch persists multiple resolutions and preserves unrelated decisions', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'engram-review-batch-'));
  const previous = process.env.ENGRAM_CONFIG_DIR;
  process.env.ENGRAM_CONFIG_DIR = root;
  try {
    const currentPlan = plan(root);
    await saveUpgradeResolution(currentPlan, { itemId: 'one', state: 'keep-current', sourceHash: 'hash-one', updatedAt: '2026-08-08T00:00:00.000Z' });
    const review = await saveUpgradeResolutions(currentPlan, [resolution('two', 'hash-two', '# latest\n')]);
    assert.equal(review.reviewedCount, 2);
    assert.equal(review.items.find((row) => row.itemId === 'one')?.state, 'keep-current');
    assert.equal(review.items.find((row) => row.itemId === 'two')?.state, 'accept-latest');
  } finally {
    if (previous === undefined) delete process.env.ENGRAM_CONFIG_DIR; else process.env.ENGRAM_CONFIG_DIR = previous;
    await rm(root, { recursive: true, force: true });
  }
});

test('atomic review batch writes nothing when any source hash is stale', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'engram-review-batch-stale-'));
  const previous = process.env.ENGRAM_CONFIG_DIR;
  process.env.ENGRAM_CONFIG_DIR = root;
  try {
    const currentPlan = plan(root);
    await saveUpgradeResolution(currentPlan, { itemId: 'one', state: 'keep-current', sourceHash: 'hash-one', updatedAt: '2026-08-08T00:00:00.000Z' });
    const before = await readFile(upgradeReviewFile(currentPlan), 'utf8');
    await assert.rejects(
      saveUpgradeResolutions(currentPlan, [resolution('one', 'hash-one', '{"ok":true}\n'), resolution('two', 'stale-hash', '# latest\n')]),
      /stale/i
    );
    assert.equal(await readFile(upgradeReviewFile(currentPlan), 'utf8'), before);
    const review = await loadUpgradeReview(currentPlan);
    assert.equal(review.items.find((row) => row.itemId === 'one')?.state, 'keep-current');
    assert.equal(review.items.find((row) => row.itemId === 'two')?.state, 'pending');
  } finally {
    if (previous === undefined) delete process.env.ENGRAM_CONFIG_DIR; else process.env.ENGRAM_CONFIG_DIR = previous;
    await rm(root, { recursive: true, force: true });
  }
});


test('atomic review batch preserves compatible decisions salvaged from an older preview', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'engram-review-batch-salvage-'));
  const previous = process.env.ENGRAM_CONFIG_DIR;
  process.env.ENGRAM_CONFIG_DIR = root;
  try {
    const oldPlan = plan(root, 'b'.repeat(64));
    await saveUpgradeResolutions(oldPlan, [
      { itemId: 'one', state: 'keep-current', sourceHash: 'hash-one', updatedAt: '2026-08-08T00:00:00.000Z' },
      { itemId: 'two', state: 'keep-current', sourceHash: 'hash-two', updatedAt: '2026-08-08T00:00:00.000Z' }
    ]);

    const refreshedPlan = plan(root, 'c'.repeat(64), 'hash-two-new');
    const salvaged = await loadUpgradeReview(refreshedPlan);
    assert.equal(salvaged.items.find((row) => row.itemId === 'one')?.state, 'keep-current');
    assert.equal(salvaged.items.find((row) => row.itemId === 'two')?.state, 'pending');
    assert.equal(salvaged.items.find((row) => row.itemId === 'two')?.stale, true);

    const review = await saveUpgradeResolutions(refreshedPlan, [resolution('two', 'hash-two-new', '# latest\n')]);
    assert.equal(review.reviewedCount, 2);
    assert.equal(review.items.find((row) => row.itemId === 'one')?.state, 'keep-current');
    assert.equal(review.items.find((row) => row.itemId === 'two')?.state, 'accept-latest');
  } finally {
    if (previous === undefined) delete process.env.ENGRAM_CONFIG_DIR; else process.env.ENGRAM_CONFIG_DIR = previous;
    await rm(root, { recursive: true, force: true });
  }
});
