/** Shared upgrade inventory, plan, transaction, and result contracts. */
import type { Scope } from '../runtime/types.js';

export type UpgradeArtifactKind = 'memory' | 'instruction' | 'skillset' | 'config' | 'hook' | 'plugin';
export type UpgradeStatus = 'current' | 'outdated' | 'conflict' | 'invalid';
export type UpgradeStrategy = 'replace-generated' | 'update-managed-block' | 'migrate-schema' | 'install-generated' | 'manual-review';
export type UpgradeOwnership = 'managed-region' | 'generated-file' | 'unknown';
export type UpgradeForceMode = 'replace-managed-region' | 'replace-file' | 'none';

export type UpgradeInventoryItem = {
  id: string;
  scope: Scope;
  kind: UpgradeArtifactKind;
  agent?: string;
  agents?: string[];
  file: string;
  installedVersion?: string;
  targetVersion: string;
  status: UpgradeStatus;
  strategy: UpgradeStrategy;
  userEditsPreserved: boolean;
  reason: string;
  currentHash?: string;
  expectedManagedHash?: string;
  ownership: UpgradeOwnership;
  forceMode: UpgradeForceMode;
  transactionGroup: string;
};



export type UpgradeResolutionState = 'pending' | 'accept-latest' | 'edited' | 'keep-current' | 'force-latest';

export type UpgradeConflictResolution = {
  itemId: string;
  state: Exclude<UpgradeResolutionState, 'pending'>;
  sourceHash: string;
  proposedContent?: string;
  ownership?: UpgradeOwnership;
  forceMode?: UpgradeForceMode;
  updatedAt: string;
};

export type UpgradeConflictProposal = {
  itemId: string;
  kind: UpgradeArtifactKind;
  file: string;
  sourceHash: string;
  current: string;
  proposed: string;
  latest: string;
  diff: string;
  replaceable: boolean;
  ownership: UpgradeOwnership;
  forceMode: UpgradeForceMode;
  forceWarning?: string;
  reason: string;
};

export type UpgradeReviewItemState = {
  itemId: string;
  state: UpgradeResolutionState;
  stale: boolean;
  sourceHash: string;
  proposedContent?: string;
  ownership?: UpgradeOwnership;
  forceMode?: UpgradeForceMode;
};

export type UpgradeReviewSummary = {
  reviewableCount: number;
  reviewedCount: number;
  pendingReviewCount: number;
  staleCount: number;
  items: UpgradeReviewItemState[];
};

export type UpgradeInventory = {
  workspaceRoot: string;
  globalRoot?: string;
  items: UpgradeInventoryItem[];
};

export type UpgradeStatusCounts = Record<UpgradeStatus, number>;

export type UpgradePlan = {
  currentVersion: string;
  targetVersion: string;
  scannedAt: string;
  fingerprint: string;
  workspaceRoot: string;
  globalRoot?: string;
  summary: { workspace: UpgradeStatusCounts; global: UpgradeStatusCounts };
  items: UpgradeInventoryItem[];
  warnings: string[];
  review?: UpgradeReviewSummary;
};

export type UpgradeTransactionResult = {
  group: string;
  status: 'updated' | 'unchanged' | 'rolled-back' | 'failed';
  files: string[];
  message?: string;
};

export type UpgradeApplyResult = {
  planFingerprint: string;
  transactions: UpgradeTransactionResult[];
  conflicts: UpgradeInventoryItem[];
  warnings: string[];
  vectorWarnings: string[];
};
