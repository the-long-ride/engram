/** Opt-in inbox receipts for deferred save-session candidates: short alnum id per receipt, persisted under .agents/.engram/inbox/. JSON files only (no related-memory bodies — ids only). */
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import type { InboxReceipt, InboxCandidate } from '../runtime/types.js';
import { INBOX_DIR, INBOX_DEFAULT_TTL_DAYS } from '../runtime/constants.js';
import { ensureDir, readJson } from '../system/fsx.js';
import { sha256 } from '../safety/hash.js';

/** Compute the canonical single-line representation of a candidate for hashing. */
export function canonicalCandidateText(candidate: InboxCandidate): string {
  const parts: string[] = [
    `TYPE: ${candidate.type}`,
    `TEXT: ${candidate.text}`,
    `SCOPE: ${candidate.scope}`
  ];
  if (candidate.role?.length) parts.push(`ROLE: ${candidate.role.join(',')}`);
  if (candidate.context) parts.push(`ORIGIN: ${candidate.context}`);
  if (candidate.triggers?.length) parts.push(`TRIGGERS: ${candidate.triggers.join(',')}`);
  if (candidate.dependsOn?.length) parts.push(`DEPENDS_ON: ${candidate.dependsOn.join(',')}`);
  if (candidate.level) parts.push(`LEVEL: ${candidate.level}`);
  if (candidate.updateId) parts.push(`UPDATE: ${candidate.updateId}`);
  return parts.join(' | ');
}

/** Render a candidate back to the `TYPE: ... | TEXT: ...` form accepted by parseMemoryCandidate. */
export function serializeCandidateForApply(candidate: InboxCandidate): string {
  const parts: string[] = [`TYPE: ${candidate.type} | TEXT: ${candidate.text}`];
  if (candidate.role?.length) parts.push(`ROLE: ${candidate.role.join(',')}`);
  if (candidate.context) parts.push(`ORIGIN: ${candidate.context}`);
  if (candidate.triggers?.length) parts.push(`TRIGGERS: ${candidate.triggers.join(',')}`);
  if (candidate.dependsOn?.length) parts.push(`DEPENDS_ON: ${candidate.dependsOn.join(',')}`);
  if (candidate.level) parts.push(`LEVEL: ${candidate.level}`);
  if (candidate.updateId) parts.push(`UPDATE: ${candidate.updateId}`);
  return parts.join(' | ');
}

/** Generate a short lowercase alnum receipt id. */
export function nextReceiptId(): string {
  const ts = Date.now().toString(36).slice(-6);
  const rnd = randomBytes(4).toString('hex');
  return `r-${ts}${rnd}`.slice(0, 14);
}

/** Detect whether a string looks like a receipt id (not a finding fingerprint). */
export function isReceiptId(value: string): boolean {
  return /^r-[a-z0-9]{4,}$/i.test(value.trim());
}

/** Build a new receipt with deterministic defaults. Does NOT persist. */
export function buildReceipt(input: {
  scope: InboxReceipt['scope'];
  source: InboxReceipt['source'];
  candidate: InboxCandidate;
  related_ids?: string[];
  ttl_days?: number;
  now?: Date;
}): InboxReceipt {
  const now = input.now ?? new Date();
  const ttlDays = input.ttl_days ?? INBOX_DEFAULT_TTL_DAYS;
  const expires = new Date(now.getTime() + ttlDays * 24 * 60 * 60 * 1000);
  return {
    id: nextReceiptId(),
    scope: input.scope,
    source: input.source,
    candidate: input.candidate,
    candidate_hash: sha256(canonicalCandidateText(input.candidate)),
    related_ids: input.related_ids ?? [],
    created_at: now.toISOString(),
    expires_at: expires.toISOString()
  };
}

function receiptDir(root: string): string {
  return path.join(root, INBOX_DIR);
}

function receiptFile(root: string, id: string): string {
  return path.join(receiptDir(root), `${id}.json`);
}

/** Persist a receipt under <root>/inbox/<id>.json. */
export async function writeReceipt(root: string, receipt: InboxReceipt): Promise<string> {
  const dir = receiptDir(root);
  await ensureDir(dir);
  await fs.writeFile(receiptFile(root, receipt.id), `${JSON.stringify(receipt, null, 2)}\n`);
  return receipt.id;
}

/** Read (and verify non-expired) a receipt; missing or expired returns undefined and removes an expired file. */
export async function loadReceipt(root: string, id: string, now: Date = new Date()): Promise<InboxReceipt | undefined> {
  const file = receiptFile(root, id);
  if (!existsSync(file)) return undefined;
  const receipt = await readJson<InboxReceipt | undefined>(file, undefined);
  if (!receipt) return undefined;
  if (new Date(receipt.expires_at).getTime() <= now.getTime()) {
    await fs.rm(file, { force: true });
    return undefined;
  }
  return receipt;
}

/** List all non-expired receipts, opportunistically deleting expired files. */
export async function listReceipts(root: string, now: Date = new Date()): Promise<InboxReceipt[]> {
  const dir = receiptDir(root);
  if (!existsSync(dir)) return [];
  const out: InboxReceipt[] = [];
  const entries = await fs.readdir(dir).catch(() => [] as string[]);
  for (const name of entries) {
    if (!name.endsWith('.json')) continue;
    const file = path.join(dir, name);
    if (!existsSync(file)) continue;
    const receipt = await readJson<InboxReceipt | undefined>(file, undefined);
    if (!receipt) continue;
    if (new Date(receipt.expires_at).getTime() <= now.getTime()) {
      await fs.rm(file, { force: true });
      continue;
    }
    out.push(receipt);
  }
  return out;
}

/** Delete all expired receipt files. Returns the removed count. */
export async function cleanupExpired(root: string, now: Date = new Date()): Promise<number> {
  const dir = receiptDir(root);
  if (!existsSync(dir)) return 0;
  let removed = 0;
  const entries = await fs.readdir(dir).catch(() => [] as string[]);
  for (const name of entries) {
    if (!name.endsWith('.json')) continue;
    const file = path.join(dir, name);
    if (!existsSync(file)) continue;
    const receipt = await readJson<InboxReceipt | undefined>(file, undefined);
    if (!receipt) continue;
    if (new Date(receipt.expires_at).getTime() <= now.getTime()) {
      await fs.rm(file, { force: true });
      removed++;
    }
  }
  return removed;
}

/** Remove one receipt file (used after a successful apply). No-op if missing. */
export async function purgeReceipt(root: string, id: string): Promise<void> {
  await fs.rm(receiptFile(root, id), { force: true });
}
