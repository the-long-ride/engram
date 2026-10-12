/** Append-only local audit receipts for policy decisions and rollback-safe writes. */
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { ensureDir, exists, readText } from '../system/fsx.js';
import { WORKING_DIR, isWorkingPath } from '../runtime/constants.js';

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

/** D16: receipts that only touch working-tier files stay in the gitignored working/ tree. */
export function workingPolicyAuditPath(root: string): string { return path.join(root, WORKING_DIR, 'policy-audit.jsonl'); }

/** Read the committed and working-tier receipts, oldest first. */
export async function readPolicyAudit(root: string): Promise<PolicyAuditRecord[]> {
  const records = [...await readAuditFile(policyAuditPath(root)), ...await readAuditFile(workingPolicyAuditPath(root))];
  return records.map((record, index) => ({ record, index }))
    .sort((a, b) => String(a.record.timestamp).localeCompare(String(b.record.timestamp)) || a.index - b.index)
    .map(({ record }) => record);
}

export async function appendPolicyAudit(root: string, record: PolicyAuditRecord): Promise<void> {
  const file = isWorkingOnly(record) ? workingPolicyAuditPath(root) : policyAuditPath(root);
  await ensureDir(path.dirname(file));
  await fs.appendFile(file, `${JSON.stringify(record)}\n`, 'utf8');
}

function isWorkingOnly(record: PolicyAuditRecord): boolean {
  const files = [...(record.output_files ?? []), ...(record.actions ?? []).map((action) => action.file)];
  return files.length > 0 && files.every((file) => isWorkingPath(file));
}

async function readAuditFile(file: string): Promise<PolicyAuditRecord[]> {
  if (!(await exists(file))) return [];
  const raw = await readText(file);
  return raw.split(/\r?\n/).filter(Boolean).flatMap((line) => {
    try {
      const value = JSON.parse(line) as PolicyAuditRecord;
      return value && typeof value.id === 'string' ? [value] : [];
    } catch { return []; }
  });
}

export function countWrittenToday(records: PolicyAuditRecord[], now = new Date()): number {
  const day = now.toISOString().slice(0, 10);
  return records.filter((record) => record.status === 'written' && record.timestamp.slice(0, 10) === day).length;
}

export function latestAuditRecord(records: PolicyAuditRecord[], id: string): PolicyAuditRecord | undefined {
  return [...records].reverse().find((record) => record.id === id);
}
