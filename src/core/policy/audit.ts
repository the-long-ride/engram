/** Append-only local audit receipts for policy decisions and rollback-safe writes. */
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { ensureDir, exists, readText } from '../system/fsx.js';

export type PolicyAuditRecord = {
  id: string;
  timestamp: string;
  status: 'written' | 'denied' | 'rolled_back';
  scope: 'workspace' | 'global';
  type: string;
  candidate_hash: string;
  output_files: string[];
  reason: string;
  rollback_until?: string;
  actions?: Array<{ file: string; action: 'add' | 'update' }>;
};

export function policyAuditPath(root: string): string { return path.join(root, 'policy-audit.jsonl'); }

export function candidateHash(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex');
}

export async function readPolicyAudit(root: string): Promise<PolicyAuditRecord[]> {
  const file = policyAuditPath(root);
  if (!(await exists(file))) return [];
  const raw = await readText(file);
  return raw.split(/\r?\n/).filter(Boolean).flatMap((line) => {
    try {
      const value = JSON.parse(line) as PolicyAuditRecord;
      return value && typeof value.id === 'string' ? [value] : [];
    } catch { return []; }
  });
}

export async function appendPolicyAudit(root: string, record: PolicyAuditRecord): Promise<void> {
  await ensureDir(root);
  await fs.appendFile(policyAuditPath(root), `${JSON.stringify(record)}\n`, 'utf8');
}

export function countWrittenToday(records: PolicyAuditRecord[], now = new Date()): number {
  const day = now.toISOString().slice(0, 10);
  return records.filter((record) => record.status === 'written' && record.timestamp.slice(0, 10) === day).length;
}

export function latestAuditRecord(records: PolicyAuditRecord[], id: string): PolicyAuditRecord | undefined {
  return [...records].reverse().find((record) => record.id === id);
}
