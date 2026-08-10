// Shared frontend types for the Engram React control panel.
import type { ReactNode } from 'react';

export type TabName = 'recall' | 'review' | 'maintain' | 'connect' | 'config' | 'author' | 'upgrade';


export type UpgradeArtifactKindDto = 'memory' | 'instruction' | 'skillset' | 'config' | 'hook' | 'plugin';
export type UpgradeStatusDto = 'current' | 'outdated' | 'conflict' | 'invalid';
export type UpgradeStrategyDto = 'replace-generated' | 'update-managed-block' | 'migrate-schema' | 'install-generated' | 'manual-review';
export interface UpgradeInventoryItemDto {
  id: string;
  scope: 'workspace' | 'global';
  kind: UpgradeArtifactKindDto;
  agent?: string;
  agents?: string[];
  file: string;
  installedVersion?: string;
  targetVersion: string;
  status: UpgradeStatusDto;
  strategy: UpgradeStrategyDto;
  userEditsPreserved: boolean;
  reason: string;
  currentHash?: string;
  expectedManagedHash?: string;
  ownership: 'managed-region' | 'generated-file' | 'unknown';
  forceMode: 'replace-managed-region' | 'replace-file' | 'none';
  transactionGroup: string;
}
export type UpgradeResolutionStateDto = 'pending' | 'accept-latest' | 'edited' | 'keep-current' | 'force-latest';
export interface UpgradeReviewItemStateDto { itemId: string; state: UpgradeResolutionStateDto; stale: boolean; sourceHash: string; proposedContent?: string; ownership?: UpgradeInventoryItemDto['ownership']; forceMode?: UpgradeInventoryItemDto['forceMode']; }
export interface UpgradeReviewSummaryDto { reviewableCount: number; reviewedCount: number; pendingReviewCount: number; staleCount: number; items: UpgradeReviewItemStateDto[]; }
export interface UpgradeConflictProposalDto { itemId: string; kind: UpgradeArtifactKindDto; file: string; sourceHash: string; current: string; proposed: string; latest: string; diff: string; replaceable: boolean; ownership: UpgradeInventoryItemDto['ownership']; forceMode: UpgradeInventoryItemDto['forceMode']; forceWarning?: string; reason: string; }
export interface UpgradeReviewResponseDto { plan: UpgradePlanDto; proposal: UpgradeConflictProposalDto; review: UpgradeReviewSummaryDto; saved: UpgradeReviewItemStateDto; }
export interface UpgradeStatusCountsDto { current: number; outdated: number; conflict: number; invalid: number; }
export interface UpgradePlanDto {
  currentVersion: string;
  targetVersion: string;
  scannedAt: string;
  fingerprint: string;
  workspaceRoot: string;
  globalRoot?: string;
  summary: { workspace: UpgradeStatusCountsDto; global: UpgradeStatusCountsDto };
  items: UpgradeInventoryItemDto[];
  warnings: string[];
  review?: UpgradeReviewSummaryDto;
}
export interface UpgradeTransactionResultDto { group: string; status: 'updated' | 'unchanged' | 'rolled-back' | 'failed'; files: string[]; message?: string; }
export interface UpgradeApplyResultDto {
  planFingerprint: string;
  transactions: UpgradeTransactionResultDto[];
  conflicts: UpgradeInventoryItemDto[];
  warnings: string[];
  vectorWarnings: string[];
}

export interface AuthorProfileDto { name: string; email: string; }
export interface ResolvedAuthorDto extends AuthorProfileDto { source: 'workspace' | 'global' | 'git' | 'unresolved'; complete: boolean; }
export interface AuthorStateDto { global: AuthorProfileDto | null; workspace: AuthorProfileDto | null; git: AuthorProfileDto | null; resolved: ResolvedAuthorDto; }
export interface AuthorMigrationFileDto { scope: 'workspace' | 'global'; file: string; action: 'migrate' | 'migrated' | 'current' | 'skipped' | 'invalid' | 'failed'; backup?: string; reason?: string; source?: ResolvedAuthorDto['source']; }
export interface AuthorMigrationDto { scope: 'workspace' | 'global' | 'both'; scanned: number; eligible: number; current: number; skipped: number; invalid: number; migrated?: number; files: AuthorMigrationFileDto[]; }

export interface ConfigField {
  key: string;
  label: string;
  group: string;
  docsAnchor: string;
  description?: string;
  input?: 'toggle' | 'select' | 'number' | 'roles' | 'text' | 'textarea' | string;
  options?: string[];
  min?: number;
  max?: number;
  step?: number;
  risk?: string;
}

export interface PanelData {
  cwd?: string;
  version?: string;
  latestVersion?: string;
  sqliteAvailable?: boolean;
  isInitialized?: boolean;
  config?: Record<string, any>;
  configFields?: ConfigField[];
  author?: AuthorStateDto;
  upgradePlan?: UpgradePlanDto;
  policy?: {
    path: string;
    exists: boolean;
    policy?: {
      version: 1;
      autonomous_writes: {
        enabled: boolean;
        mode: 'review_only' | 'autonomous';
        allowed_types: string[];
        allowed_scopes: string[];
        allowed_sources: string[];
        confidence_threshold: 'low' | 'medium' | 'high';
        daily_limit: number;
        rollback_retention_days: number;
      };
      review: { max_rule_lines: number; benchmark_min_recall_at_k: number; mandatory_metadata?: Record<string, boolean> };
    };
    diagnostics: Array<{ path: string; message: string }>;
  };
  runtime?: Array<{ group: string; rows: Array<[string, any]> }>;
  profiles?: any[];
  workspaces?: any[];
  entry?: Array<{ group: string; rows: Array<[string, any]> }>;
}

export interface ToastState { message: string; ok: boolean; id: number; }
export interface ModalState { title?: string; content: ReactNode; actions?: ReactNode; className?: string; copyContent?: string; copyLabel?: string; onKeyDown?: (event: KeyboardEvent) => void; }
export interface ModalController { open: (modal: ModalState) => void; close: () => void; }
export interface ApiResult<T = any> { ok?: boolean; message?: string; data?: T; error?: string; issues?: Array<{ key: string; message: string }>; riskyKeys?: string[]; content?: string; }
export type ShowToast = (message: string, ok?: boolean) => void;
