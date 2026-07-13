/** Private, user-local before-images for reversible autonomous updates. */
import path from 'node:path';
import fs from 'node:fs/promises';
import { userConfigDir } from '../runtime/config.js';
import { ensureDir, exists, inside, readText, writeText } from '../system/fsx.js';
import type { SavePlan } from '../memory/save-plan.js';
import { sha256 } from '../safety/hash.js';

function snapshotRoot(memoryRoot: string, auditId: string): string {
  if (!/^autosave-[a-z0-9-]+$/i.test(auditId)) throw new Error(`invalid autosave audit id: ${auditId}`);
  const rootId = sha256(path.resolve(memoryRoot)).slice(0, 16);
  return path.join(userConfigDir(), 'policy-rollbacks', rootId, auditId);
}

function snapshotFile(memoryRoot: string, auditId: string, file: string): string {
  return inside(snapshotRoot(memoryRoot, auditId), file);
}

export async function stagePolicySnapshots(memoryRoot: string, auditId: string, plans: SavePlan[]): Promise<void> {
  for (const plan of plans) {
    if (plan.action !== 'update') continue;
    if (plan.previousContent === undefined) throw new Error(`missing rollback before-image: ${plan.file}`);
    const file = snapshotFile(memoryRoot, auditId, plan.file);
    await ensureDir(path.dirname(file));
    await writeText(file, plan.previousContent);
  }
}

export async function readPolicySnapshot(memoryRoot: string, auditId: string, file: string): Promise<string | undefined> {
  const snapshot = snapshotFile(memoryRoot, auditId, file);
  return await exists(snapshot) ? readText(snapshot) : undefined;
}

export async function purgePolicySnapshots(memoryRoot: string, auditId: string): Promise<void> {
  await fs.rm(snapshotRoot(memoryRoot, auditId), { recursive: true, force: true });
}
