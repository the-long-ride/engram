/** Deterministic upgrade-plan construction and per-scope status summaries. */
import { VERSION } from '../runtime/constants.js';
import { upgradeItemId, upgradePlanFingerprint } from './fingerprint.js';
import type { UpgradeInventory, UpgradePlan, UpgradeStatusCounts, UpgradeInventoryItem } from './types.js';

function zeroCounts(): UpgradeStatusCounts {
  return { current: 0, outdated: 0, conflict: 0, invalid: 0 };
}

function sorted(items: UpgradeInventoryItem[]): UpgradeInventoryItem[] {
  const withIds = items.map((item) => ({ ...item, id: item.id || upgradeItemId(item) }));
  return withIds.sort((a, b) => [a.scope, a.kind, a.agent ?? '', a.file].join('|').localeCompare([b.scope, b.kind, b.agent ?? '', b.file].join('|')));
}

export function buildUpgradePlan(inventory: UpgradeInventory, targetVersion: string): UpgradePlan {
  const items = sorted(inventory.items);
  const summary = { workspace: zeroCounts(), global: zeroCounts() };
  for (const item of items) summary[item.scope][item.status] += 1;
  return {
    currentVersion: VERSION,
    targetVersion,
    scannedAt: new Date().toISOString(),
    fingerprint: upgradePlanFingerprint(items, targetVersion, inventory.workspaceRoot, inventory.globalRoot),
    workspaceRoot: inventory.workspaceRoot,
    globalRoot: inventory.globalRoot,
    summary,
    items,
    warnings: []
  };
}
