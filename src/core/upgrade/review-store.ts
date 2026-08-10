/** Persist resumable upgrade conflict decisions without writing managed artifacts. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { userConfigDir } from '../runtime/config.js';
import type { UpgradeConflictResolution, UpgradePlan, UpgradeReviewItemState, UpgradeReviewSummary } from './types.js';

type ReviewFile = {
  version: 1;
  planFingerprint: string;
  targetVersion: string;
  workspaceRoot: string;
  updatedAt: string;
  resolutions: Record<string, UpgradeConflictResolution>;
};

function reviewDir(): string {
  return path.join(userConfigDir(), 'upgrade-reviews');
}

export function upgradeReviewFile(plan: UpgradePlan): string {
  return path.join(reviewDir(), `${plan.fingerprint}.json`);
}

export async function loadUpgradeReview(plan: UpgradePlan): Promise<UpgradeReviewSummary> {
  const blockers = plan.items.filter((item) => item.status === 'conflict' || item.status === 'invalid');
  const exact = await readReviewFile(upgradeReviewFile(plan));
  const candidates = exact ? [exact] : await compatibleReviewFiles(plan);
  const items: UpgradeReviewItemState[] = blockers.map((item) => {
    let stale = false;
    let accepted: UpgradeConflictResolution | undefined;
    for (const file of candidates) {
      const resolution = file.resolutions[item.id];
      if (!resolution) continue;
      if ((item.currentHash ?? '') === resolution.sourceHash) {
        if (resolution.state === 'force-latest' && (item.forceMode === 'none' || resolution.ownership !== item.ownership || resolution.forceMode !== item.forceMode)) {
          stale = true;
          continue;
        }
        accepted = resolution;
        break;
      }
      stale = true;
    }
    return accepted
      ? { itemId: item.id, state: accepted.state, stale: false, sourceHash: accepted.sourceHash, proposedContent: accepted.proposedContent, ownership: accepted.ownership, forceMode: accepted.forceMode }
      : { itemId: item.id, state: 'pending', stale, sourceHash: item.currentHash ?? '' };
  });
  const reviewedCount = items.filter((item) => item.state !== 'pending').length;
  const staleCount = items.filter((item) => item.stale).length;
  return {
    reviewableCount: items.length,
    reviewedCount,
    pendingReviewCount: items.length - reviewedCount,
    staleCount,
    items
  };
}

export async function saveUpgradeResolutions(plan: UpgradePlan, resolutions: UpgradeConflictResolution[]): Promise<UpgradeReviewSummary> {
  if (!resolutions.length) throw new Error('At least one upgrade resolution is required.');
  const itemIds = new Set<string>();
  for (const resolution of resolutions) {
    if (itemIds.has(resolution.itemId)) throw new Error(`Duplicate upgrade conflict resolution: ${resolution.itemId}`);
    itemIds.add(resolution.itemId);
    const item = plan.items.find((row) => row.id === resolution.itemId && (row.status === 'conflict' || row.status === 'invalid'));
    if (!item) throw new Error(`Upgrade conflict not found: ${resolution.itemId}`);
    if ((item.currentHash ?? '') !== resolution.sourceHash) throw new Error('Upgrade review is stale; refresh this conflict before confirming it.');
    if ((resolution.state === 'accept-latest' || resolution.state === 'edited') && resolution.proposedContent === undefined) {
      throw new Error(`${resolution.state} requires proposed content.`);
    }
    if (resolution.state === 'force-latest') {
      if (!resolution.ownership || !resolution.forceMode || resolution.forceMode === 'none') {
        throw new Error('force-latest requires current ownership evidence.');
      }
      if (resolution.ownership !== item.ownership || resolution.forceMode !== item.forceMode) {
        throw new Error('force-latest ownership evidence no longer matches the current upgrade item.');
      }
    }
  }
  const file = upgradeReviewFile(plan);
  const current = await readReviewFile(file);
  const now = new Date().toISOString();
  const salvagedResolutions: Record<string, UpgradeConflictResolution> = {};
  if (!current) {
    const compatible = await loadUpgradeReview(plan);
    for (const item of compatible.items) {
      if (item.state === 'pending' || item.stale) continue;
      salvagedResolutions[item.itemId] = {
        itemId: item.itemId,
        state: item.state,
        sourceHash: item.sourceHash,
        proposedContent: item.proposedContent,
        ownership: item.ownership,
        forceMode: item.forceMode,
        updatedAt: now
      };
    }
  }
  const next: ReviewFile = current
    ? { ...current, resolutions: { ...current.resolutions } }
    : {
      version: 1,
      planFingerprint: plan.fingerprint,
      targetVersion: plan.targetVersion,
      workspaceRoot: path.resolve(plan.workspaceRoot),
      updatedAt: now,
      resolutions: salvagedResolutions
    };
  next.planFingerprint = plan.fingerprint;
  next.targetVersion = plan.targetVersion;
  next.workspaceRoot = path.resolve(plan.workspaceRoot);
  next.updatedAt = now;
  for (const resolution of resolutions) {
    next.resolutions[resolution.itemId] = { ...resolution, updatedAt: resolution.updatedAt || now };
  }
  await writeReviewFile(file, next);
  return loadUpgradeReview(plan);
}

export async function saveUpgradeResolution(plan: UpgradePlan, resolution: UpgradeConflictResolution): Promise<UpgradeReviewSummary> {
  return saveUpgradeResolutions(plan, [resolution]);
}

export async function clearUpgradeReview(plan: UpgradePlan): Promise<void> {
  await fs.rm(upgradeReviewFile(plan), { force: true }).catch(() => undefined);
}

async function compatibleReviewFiles(plan: UpgradePlan): Promise<ReviewFile[]> {
  let names: string[] = [];
  try { names = await fs.readdir(reviewDir()); } catch { return []; }
  const rows: ReviewFile[] = [];
  for (const name of names) {
    if (!name.endsWith('.json')) continue;
    const row = await readReviewFile(path.join(reviewDir(), name));
    if (!row) continue;
    if (row.targetVersion !== plan.targetVersion) continue;
    if (path.resolve(row.workspaceRoot) !== path.resolve(plan.workspaceRoot)) continue;
    rows.push(row);
  }
  return rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

async function readReviewFile(file: string): Promise<ReviewFile | undefined> {
  try {
    const parsed = JSON.parse(await fs.readFile(file, 'utf8')) as ReviewFile;
    if (parsed?.version !== 1 || !parsed.resolutions || typeof parsed.resolutions !== 'object') return undefined;
    return parsed;
  } catch {
    return undefined;
  }
}

async function writeReviewFile(file: string, value: ReviewFile): Promise<void> {
  const dir = path.dirname(file);
  await fs.mkdir(dir, { recursive: true, mode: 0o700 });
  await fs.chmod(dir, 0o700).catch(() => undefined);
  const temp = `${file}.${process.pid}.tmp`;
  await fs.writeFile(temp, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  await fs.chmod(temp, 0o600).catch(() => undefined);
  await fs.rename(temp, file);
  await fs.chmod(file, 0o600).catch(() => undefined);
}
