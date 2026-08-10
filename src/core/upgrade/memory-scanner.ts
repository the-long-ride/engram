/** Convert active memory-schema migration state into shared upgrade inventory items. */
import path from 'node:path';
import { planMemorySchemaMigration } from '../memory/migrate-schema.js';
import { readText } from '../system/fsx.js';
import { sha256 } from '../safety/hash.js';
import type { Scope } from '../runtime/types.js';
import { upgradeItemId } from './fingerprint.js';
import type { UpgradeInventoryItem } from './types.js';

export async function scanMemoryUpgrades(root: string, scope: Scope, targetVersion: string): Promise<UpgradeInventoryItem[]> {
  const result = await planMemorySchemaMigration(root, scope);
  const items: UpgradeInventoryItem[] = [];
  for (const row of result.files) {
    const file = path.join(root, row.file);
    const raw = await readText(file).catch(() => '');
    const status = row.action === 'current' ? 'current' : row.action === 'migrate' ? 'outdated' : 'invalid';
    const strategy = status === 'invalid' ? 'manual-review' : 'migrate-schema';
    const base: Omit<UpgradeInventoryItem, 'id'> = {
      scope,
      kind: 'memory',
      file,
      installedVersion: row.fromVersion ? `schema-v${row.fromVersion}` : undefined,
      targetVersion,
      status,
      strategy,
      userEditsPreserved: true,
      reason: status === 'current'
        ? 'memory already uses schema v3'
        : status === 'outdated'
          ? `memory uses schema v${row.fromVersion ?? 'legacy'}`
          : row.reason ?? 'memory is invalid and requires review',
      currentHash: raw ? sha256(raw) : undefined,
      ownership: 'unknown',
      forceMode: 'none',
      transactionGroup: `${scope}:memory`
    };
    items.push({ ...base, id: upgradeItemId(base) });
  }
  return items;
}
