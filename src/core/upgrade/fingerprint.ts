/** Deterministic upgrade artifact IDs and stale-plan fingerprints. */
import { sha256 } from '../safety/hash.js';
import type { UpgradeInventoryItem } from './types.js';

function normalizedFile(file: string): string {
  return file.replaceAll('\\', '/');
}

function canonicalAgents(item: Omit<UpgradeInventoryItem, 'id'> | UpgradeInventoryItem): string {
  return [...new Set(item.agents ?? (item.agent ? [item.agent] : []))].sort().join(',');
}

export function upgradeItemId(item: Omit<UpgradeInventoryItem, 'id'> | UpgradeInventoryItem): string {
  const legacyAgent = item.kind === 'memory' ? item.agent ?? '' : '';
  return sha256([item.scope, item.kind, legacyAgent, normalizedFile(item.file)].join('|')).slice(0, 24);
}

export function upgradePlanFingerprint(
  items: Array<Omit<UpgradeInventoryItem, 'id'> | UpgradeInventoryItem>,
  targetVersion: string,
  workspaceRoot: string,
  globalRoot?: string
): string {
  const rows = items.map((item) => [
    item.scope,
    item.kind,
    canonicalAgents(item),
    normalizedFile(item.file),
    item.installedVersion ?? '',
    item.targetVersion,
    item.status,
    item.strategy,
    item.currentHash ?? '',
    item.expectedManagedHash ?? '',
    item.ownership ?? 'unknown',
    item.forceMode ?? 'none'
  ].join('|')).sort();
  return sha256([targetVersion, normalizedFile(workspaceRoot), normalizedFile(globalRoot ?? ''), ...rows].join('\n'));
}
