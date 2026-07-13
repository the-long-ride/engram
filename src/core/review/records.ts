/** Persist dismiss/resolved review-record status by fingerprint under .agents/.engram/review/<scope>.json; deleting records only loses status annotations, never approved memory. */
import path from 'node:path';
import type { Scope } from '../runtime/types.js';
import type { ReviewFinding, FindingStatus } from './findings.js';
import { fingerprintOf, type FindingKind } from './findings.js';
import { readJson, writeJson, ensureDir } from '../system/fsx.js';
import { REVIEW_DIR } from '../runtime/constants.js';

export type ReviewRecord = {
  fingerprint: string;
  kind: FindingKind;
  memory_ids: string[];
  status: FindingStatus;
  updated_at: string;
  note?: string;
};

export type ReviewStore = {
  records: Record<string, ReviewRecord>;
};

const EMPTY_STORE: ReviewStore = { records: {} };

/** Load persisted review status for a scope root. */
export async function loadReviewStore(root: string): Promise<ReviewStore> {
  return readJson<ReviewStore>(path.join(root, REVIEW_DIR, 'records.json'), EMPTY_STORE);
}

/** Persist review status for a scope root. */
export async function writeReviewStore(root: string, store: ReviewStore): Promise<void> {
  const dir = path.join(root, REVIEW_DIR);
  await ensureDir(dir);
  await writeJson(path.join(dir, 'records.json'), store);
}

/** Merge derived findings with persisted status: dismissed/resolved
 *  findings keep their status; new findings inherit pending. */
export function applyPersistedStatus(findings: ReviewFinding[], store: ReviewStore): ReviewFinding[] {
  return findings.map((finding) => {
    const record = store.records[finding.fingerprint];
    if (!record) return finding;
    return { ...finding, status: record.status, updated_at: record.updated_at };
  });
}

/** Mark a finding dismissed with an optional note. Returns updated store and finding snapshot. */
export function dismissFinding(store: ReviewStore, fingerprint: string, note: string | undefined, now: string): { store: ReviewStore; record?: ReviewRecord } {
  const record = store.records[fingerprint];
  if (!record) return { store };
  const updated: ReviewRecord = { ...record, status: 'dismissed', updated_at: now, ...(note ? { note } : {}) };
  return { store: { records: { ...store.records, [fingerprint]: updated } }, record: updated };
}

/** Mark a finding resolved (after verify/supersede/archive). */
export function resolveFinding(store: ReviewStore, fingerprint: string, note: string | undefined, now: string): { store: ReviewStore; record?: ReviewRecord } {
  const record = store.records[fingerprint];
  if (!record) return { store };
  const updated: ReviewRecord = { ...record, status: 'resolved', updated_at: now, ...(note ? { note } : {}) };
  return { store: { records: { ...store.records, [fingerprint]: updated } }, record: updated };
}

/** Seed a record for a newly discovered finding so future dismissals can find it. */
export function seedRecord(store: ReviewStore, finding: ReviewFinding): ReviewStore {
  if (store.records[finding.fingerprint]) return store;
  return {
    records: {
      ...store.records,
      [finding.fingerprint]: {
        fingerprint: finding.fingerprint,
        kind: finding.kind,
        memory_ids: finding.memory_ids,
        status: 'pending',
        updated_at: finding.updated_at
      }
    }
  };
}

/** Seed records for all findings that aren't yet tracked. */
export function seedAllRecords(store: ReviewStore, findings: ReviewFinding[]): ReviewStore {
  let next = store;
  for (const finding of findings) next = seedRecord(next, finding);
  return next;
}

export { fingerprintOf };
