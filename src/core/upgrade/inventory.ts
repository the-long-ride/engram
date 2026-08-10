/** Workspace/global coordinator for memory and connected-agent upgrade inventory. */
import type { EngramConfig } from '../runtime/types.js';
import { scopeRootsForConfig } from '../runtime/config.js';
import { scanMemoryUpgrades } from './memory-scanner.js';
import { scanIntegrationUpgrades } from './integration-scanner.js';
import type { UpgradeInventory } from './types.js';

export async function scanUpgradeInventory(cwd: string, config: EngramConfig, targetVersion: string): Promise<UpgradeInventory> {
  const roots = scopeRootsForConfig(cwd, config);
  const workspace = [
    ...await scanMemoryUpgrades(roots.workspace, 'workspace', targetVersion),
    ...await scanIntegrationUpgrades(cwd, 'workspace', targetVersion)
  ];
  const global = roots.global
    ? [
        ...await scanMemoryUpgrades(roots.global, 'global', targetVersion),
        ...await scanIntegrationUpgrades(cwd, 'global', targetVersion)
      ]
    : [];
  const items = [...workspace, ...global].sort((a, b) => [a.scope, a.kind, a.agent ?? '', a.file].join('|').localeCompare([b.scope, b.kind, b.agent ?? '', b.file].join('|')));
  return { workspaceRoot: roots.workspace, globalRoot: roots.global || undefined, items };
}
