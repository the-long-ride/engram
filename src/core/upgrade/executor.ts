/** Transactional application of shared upgrade plans. */
import fs from 'node:fs/promises';
import path from 'node:path';
import type { EngramConfig, Scope } from '../runtime/types.js';
import { GRAPH_FILE, HASH_FILE, INDEX_FILE, VECTOR_DB_FILE } from '../runtime/constants.js';
import { ensureDir, exists, readText } from '../system/fsx.js';
import { migrateMemorySchema } from '../memory/migrate-schema.js';
import { rebuildIndex } from '../memory/index.js';
import { rebuildGraph } from '../memory/graph.js';
import { ensureVectorIndex } from '../memory/vector-db.js';
import { previewLinkedWorkspaceSkillsets, previewRegisteredGlobalSkillsets } from '../integrations/skillset.js';
import { globalAgentHome } from '../integrations/agent-paths.js';
import { previewInstalledAgentHooks } from '../integrations/agent-hooks.js';
import { WORKSPACE_BEGIN, WORKSPACE_END } from '../integrations/skillset-render.js';
import { scanUpgradeInventory } from './inventory.js';
import { buildUpgradePlan } from './planner.js';
import type { UpgradeApplyResult, UpgradeInventoryItem, UpgradePlan, UpgradeReviewSummary, UpgradeTransactionResult } from './types.js';
import { validateConflictProposal } from './proposals.js';
import { replaceDelimitedManagedRegion } from './managed-block.js';

type Snapshot = { file: string; existed: boolean; bytes?: Uint8Array; mode?: number };

export async function validateUpgradePlan(cwd: string, config: EngramConfig, plan: UpgradePlan): Promise<UpgradePlan> {
  const inventory = await scanUpgradeInventory(cwd, config, plan.targetVersion);
  const plannedIds = new Set(plan.items.map((item) => item.id));
  const selected = { ...inventory, items: inventory.items.filter((item) => plannedIds.has(item.id)) };
  const fresh = buildUpgradePlan(selected, plan.targetVersion);
  if (fresh.fingerprint !== plan.fingerprint) throw new Error('Upgrade preview is stale; refresh the preview before applying changes.');
  return fresh;
}

export async function applyUpgradePlan(
  cwd: string,
  config: EngramConfig,
  plan: UpgradePlan,
  options: { confirmed: boolean; review?: UpgradeReviewSummary; _ensureVectorIndex?: typeof ensureVectorIndex; _rebuildGraph?: typeof rebuildGraph }
): Promise<UpgradeApplyResult> {
  if (!options.confirmed) throw new Error('Upgrade confirmation required.');
  const fresh = await validateUpgradePlan(cwd, config, plan);
  const blockers = fresh.items.filter((item) => item.status === 'conflict' || item.status === 'invalid');
  const reviewById = new Map((options.review?.items ?? []).map((item) => [item.itemId, item]));
  const reviewedContent = new Map<string, string>();
  const forceIds = new Set<string>();
  const conflicts: UpgradeInventoryItem[] = [];
  for (const item of blockers) {
    const review = reviewById.get(item.id);
    if (!review || review.state === 'pending' || review.stale || review.sourceHash !== (item.currentHash ?? '')) {
      throw new Error(`Upgrade requires review: ${blockers.length} conflict file(s). Run engram upgrade --latest --review.`);
    }
    if (review.state === 'keep-current') { conflicts.push(item); continue; }
    if (review.state === 'force-latest') {
      if (item.forceMode === 'none' || review.ownership !== item.ownership || review.forceMode !== item.forceMode) {
        throw new Error(`Force upgrade ownership changed for ${item.file}; refresh and review it again.`);
      }
      forceIds.add(item.id);
      continue;
    }
    if (item.strategy === 'manual-review') {
      throw new Error(`Upgrade review policy changed for ${item.file}; refresh and review it again before applying.`);
    }
    if (item.kind !== 'config' && item.kind !== 'instruction' && item.kind !== 'skillset') {
      throw new Error(`${item.kind} conflict can only be resolved with keep-current.`);
    }
    if (review.proposedContent === undefined) throw new Error(`Reviewed content is missing for ${item.file}`);
    const validation = validateConflictProposal({ kind: item.kind }, review.proposedContent);
    if (!validation.valid) throw new Error(validation.error ?? `Invalid reviewed content for ${item.file}`);
    reviewedContent.set(item.id, review.proposedContent);
  }
  const warnings: string[] = [];
  const vectorWarnings: string[] = [];
  const transactions: UpgradeTransactionResult[] = [];
  const vectorBuilder = options._ensureVectorIndex ?? ensureVectorIndex;
  const graphBuilder = options._rebuildGraph ?? rebuildGraph;
  const groups = new Map<string, UpgradeInventoryItem[]>();
  const writable = fresh.items.filter((row) => row.status === 'outdated' || reviewedContent.has(row.id) || forceIds.has(row.id));
  const physicalFiles = new Set<string>();
  for (const item of writable) {
    const key = path.resolve(item.file);
    if (physicalFiles.has(key)) throw new Error(`Upgrade plan contains more than one write intent for ${item.file}`);
    physicalFiles.add(key);
    groups.set(item.transactionGroup, [...(groups.get(item.transactionGroup) ?? []), item]);
  }
  for (const [group, items] of groups) {
    if (!items.length) continue;
    let transaction: UpgradeTransactionResult;
    if (items.every((item) => item.kind === 'memory')) {
      const applied = await applyMemoryGroup(fresh, config, group, items, vectorBuilder, graphBuilder);
      transaction = applied.transaction;
      if (applied.vectorWarning) vectorWarnings.push(applied.vectorWarning);
    } else {
      transaction = await applyIntegrationGroup(cwd, group, items, reviewedContent, forceIds);
    }
    transactions.push(transaction);
    if (transaction.status === 'failed' || transaction.status === 'rolled-back') {
      throw new Error(`Upgrade transaction ${group} ${transaction.status}: ${transaction.message ?? transaction.files.join(', ')}`);
    }
  }
  await verifyUpgradeConvergence(cwd, config, fresh, writable);
  return { planFingerprint: fresh.fingerprint, transactions, conflicts, warnings, vectorWarnings };
}

export async function verifyUpgradeConvergence(cwd: string, config: EngramConfig, plan: UpgradePlan, expectedUpdated: UpgradeInventoryItem[]): Promise<void> {
  const inventory = await scanUpgradeInventory(cwd, config, plan.targetVersion);
  const freshByPhysical = new Map(inventory.items.map((item) => [physicalIdentity(item), item]));
  for (const item of expectedUpdated) {
    const after = freshByPhysical.get(physicalIdentity(item));
    if (!after) continue;
    if (after.status !== 'current') {
      throw new Error(`Upgrade did not converge for ${item.file}: ${after.status} (${after.reason})`);
    }
  }
}

function physicalIdentity(item: UpgradeInventoryItem): string {
  return `${item.scope}|${item.kind}|${path.resolve(item.file)}`;
}

async function applyMemoryGroup(
  plan: UpgradePlan,
  config: EngramConfig,
  group: string,
  items: UpgradeInventoryItem[],
  vectorBuilder: typeof ensureVectorIndex,
  graphBuilder: typeof rebuildGraph
): Promise<{ transaction: UpgradeTransactionResult; vectorWarning?: string }> {
  const scope = items[0].scope as Scope;
  const root = scope === 'workspace' ? plan.workspaceRoot : plan.globalRoot;
  if (!root) return { transaction: { group, status: 'failed', files: [], message: 'memory root is unavailable' } };
  const memorySnapshots = await capture(items.map((item) => item.file));
  const sidecarSnapshots = await capture(memorySidecars(root));
  try {
    await writeBackups(memorySnapshots, plan.targetVersion);
    const selectedFiles = items.map((item) => path.relative(root, item.file).replace(/\\/g, '/'));
    const result = await migrateMemorySchema(root, scope, { files: selectedFiles });
    if (result.failed > 0) throw new Error(`${result.failed} memory migration file(s) failed`);
    const index = await rebuildIndex(root, scope);
    await graphBuilder(root, scope, index, config);
    const vectorWarning = await rebuildOptionalVector(root, scope, index.entries, config, vectorBuilder);
    return {
      transaction: { group, status: result.migrated > 0 ? 'updated' : 'unchanged', files: items.map((item) => item.file) },
      vectorWarning
    };
  } catch (error) {
    await restore([...memorySnapshots, ...sidecarSnapshots]);
    return {
      transaction: { group, status: 'rolled-back', files: items.map((item) => item.file), message: messageOf(error) }
    };
  }
}

function memorySidecars(root: string): string[] {
  return [HASH_FILE, INDEX_FILE, GRAPH_FILE, VECTOR_DB_FILE, `${VECTOR_DB_FILE}-wal`, `${VECTOR_DB_FILE}-shm`]
    .map((file) => path.join(root, file));
}

async function rebuildOptionalVector(
  root: string,
  scope: Scope,
  entries: Parameters<typeof ensureVectorIndex>[2],
  config: EngramConfig,
  vectorBuilder: typeof ensureVectorIndex
): Promise<string | undefined> {
  try {
    const status = await vectorBuilder(root, scope, entries, config, { force: true });
    if (status.action !== 'skipped' || !status.reason?.startsWith('vector index degraded:')) return undefined;
    return `${scope}: ${status.reason}`;
  } catch (error) {
    return `${scope}: vector index degraded: ${messageOf(error)}`;
  }
}

async function applyIntegrationGroup(
  cwd: string,
  group: string,
  items: UpgradeInventoryItem[],
  reviewedContent: Map<string, string>,
  forceIds: Set<string>
): Promise<UpgradeTransactionResult> {
  const scope = items[0].scope;
  const previews = scope === 'workspace'
    ? await previewLinkedWorkspaceSkillsets(cwd)
    : await previewRegisteredGlobalSkillsets(globalAgentHome(), cwd);
  const hookPreviews = await previewInstalledAgentHooks({ global: scope === 'global', cwd });
  const expectedByFile = new Map([
    ...previews.filter((row) => row.safe).map((row) => [normalized(scope, cwd, row.file), row.expected] as const),
    ...hookPreviews.filter((row) => row.safe).map((row) => [path.resolve(row.file), row.expected] as const)
  ]);
  for (const item of items) {
    const reviewed = reviewedContent.get(item.id);
    if (reviewed !== undefined) expectedByFile.set(path.resolve(item.file), reviewed);
    if (forceIds.has(item.id)) expectedByFile.set(path.resolve(item.file), await forceExpectedContent(cwd, item, previews));
  }
  const snapshots = await capture(items.map((item) => item.file));
  try {
    await writeBackups(snapshots, items[0].targetVersion);
    let changed = false;
    for (const item of items) {
      const expected = expectedByFile.get(path.resolve(item.file));
      if (expected === undefined) throw new Error(`No safe generated replacement available for ${item.file}`);
      const current = await readText(item.file).catch(() => '');
      if (current === expected) continue;
      const snapshot = snapshots.find((row) => path.resolve(row.file) === path.resolve(item.file));
      await writeAtomic(item.file, expected, snapshot?.mode);
      const verify = await readText(item.file);
      if (verify !== expected) throw new Error(`Validation failed after writing ${item.file}`);
      changed = true;
    }
    return { group, status: changed ? 'updated' : 'unchanged', files: items.map((item) => item.file) };
  } catch (error) {
    await restore(snapshots);
    return { group, status: 'rolled-back', files: items.map((item) => item.file), message: messageOf(error) };
  }
}

async function forceExpectedContent(cwd: string, item: UpgradeInventoryItem, previews: Awaited<ReturnType<typeof previewLinkedWorkspaceSkillsets>>): Promise<string> {
  const rows = previews.filter((row) => normalized(item.scope, cwd, row.file) === path.resolve(item.file));
  if (!rows.length) throw new Error(`No canonical Engram renderer is available for ${item.file}`);
  if (item.forceMode === 'replace-file') {
    const candidates = [...new Set(rows.map((row) => row.latest ?? row.expected).filter(Boolean))];
    if (candidates.length !== 1) throw new Error(`Engram registrations disagree on force content for ${item.file}`);
    return candidates[0];
  }
  if (item.forceMode === 'replace-managed-region') {
    const candidates = [...new Set(rows.map((row) => row.expected).filter(Boolean))];
    if (candidates.length !== 1) throw new Error(`Engram registrations disagree on managed-region content for ${item.file}`);
    const current = await readText(item.file);
    const expected = candidates[0];
    if (current.includes(WORKSPACE_BEGIN) || expected.includes(WORKSPACE_BEGIN)) {
      return replaceDelimitedManagedRegion(current, WORKSPACE_BEGIN, WORKSPACE_END, expected);
    }
    return replaceDelimitedManagedRegion(current, '<!-- BEGIN ENGRAM GLOBAL SKILLSET -->', '<!-- END ENGRAM GLOBAL SKILLSET -->', expected);
  }
  throw new Error(`Force upgrade is unavailable for ${item.file}`);
}


async function writeAtomic(file: string, content: string, mode?: number): Promise<void> {
  await ensureDir(path.dirname(file));
  const temp = path.join(path.dirname(file), `.${path.basename(file)}.${process.pid}.engram-upgrade.tmp`);
  await fs.writeFile(temp, content, mode ? { mode } : undefined);
  if (mode) await fs.chmod(temp, mode).catch(() => undefined);
  await fs.rename(temp, file);
  if (mode) await fs.chmod(file, mode).catch(() => undefined);
}

function normalized(scope: Scope, cwd: string, file: string): string {
  return path.resolve(scope === 'workspace' && !path.isAbsolute(file) ? path.join(cwd, file) : file);
}

async function capture(files: string[]): Promise<Snapshot[]> {
  const unique = [...new Set(files.map((file) => path.resolve(file)))];
  const rows: Snapshot[] = [];
  for (const file of unique) {
    const existed = await exists(file);
    if (!existed) { rows.push({ file, existed: false }); continue; }
    const stat = await fs.stat(file);
    rows.push({ file, existed: true, bytes: await fs.readFile(file), mode: stat.mode & 0o777 });
  }
  return rows;
}

async function writeBackups(rows: Snapshot[], targetVersion: string): Promise<void> {
  const suffix = targetVersion.replace(/[^A-Za-z0-9._-]/g, '_');
  for (const row of rows) {
    if (!row.existed || !row.bytes) continue;
    const backup = `${row.file}.engram-upgrade-${suffix}.bak`;
    try {
      await fs.writeFile(backup, row.bytes, { flag: 'wx', mode: row.mode });
      if (row.mode) await fs.chmod(backup, row.mode).catch(() => undefined);
    } catch (error: any) {
      if (error?.code !== 'EEXIST') throw error;
    }
  }
}

async function restore(rows: Snapshot[]): Promise<void> {
  for (const row of rows) {
    if (!row.existed) {
      await fs.rm(row.file, { force: true }).catch(() => undefined);
      continue;
    }
    await ensureDir(path.dirname(row.file));
    await fs.writeFile(row.file, row.bytes as Uint8Array, row.mode ? { mode: row.mode } : undefined);
    if (row.mode) await fs.chmod(row.file, row.mode).catch(() => undefined);
  }
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
