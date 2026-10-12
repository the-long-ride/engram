/** D12 approval tokens: single-use, 30-minute, cwd-bound handles on proposed candidates in the gitignored `pending-approvals.json`. */
// The candidate sha256 is tamper-evident only, not an auth boundary (issued_at/used_at are not covered). Every read-modify-write
// of the pending file runs under a cross-process file lock and fails closed: a lock timeout or failed write throws before any
// memory is written, and a redeem re-reads the file inside the lock, so one token is consumed at most once.
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { loadConfig, profileResolutionForConfig, scopeRootsForConfig, writeScopes } from '../core/runtime/config.js';
import type { EngramConfig } from '../core/runtime/types.js';
import { exists, readJsonForUpdate, withFileLock, writeJsonAtomic } from '../core/system/fsx.js';
import { ensureScopeGitignore } from '../core/memory/scope-gitignore.js';
import { sha256 } from '../core/safety/hash.js';
import type { PlannedCandidate } from '../commands/write.js';
import type { PinnedVerdict } from '../core/memory/save-plan.js';

export type SaveTarget = EngramConfig['scope'];
/** A proposed candidate with the role and task type its preview used. */
export type PendingCandidate = PlannedCandidate;
export type RedeemError = 'unknown' | 'expired' | 'used' | 'mismatch' | 'revoked';
/** `verdicts` are the save verdicts the proposal previewed (absent on tokens issued before verdicts were pinned). */
export type Redeemed = { candidates: PendingCandidate[]; scope: SaveTarget; verdicts?: PinnedVerdict[] } | { error: RedeemError };

export const PENDING_APPROVALS_FILE = 'pending-approvals.json';
export const APPROVAL_TTL_MS = 30 * 60 * 1000;
/** Token issue/redeem waits this long for the pending-file lock, then fails closed. */
const APPROVAL_LOCK_TIMEOUT_MS = 5000;

/** Only the sha256 of the token is stored, so reading the file never yields a redeemable token. */
type PendingApproval = {
  token_hash: string;
  cwd: string;
  scope: SaveTarget;
  candidates: PendingCandidate[];
  /** Additive: the verdicts previewed with the proposal; covered by `hash` only when present, so older records still verify. */
  verdicts?: PinnedVerdict[];
  hash: string;
  issued_at: string;
  used_at?: string;
  /** Set with `used_at` when the human declined the approval dialog; such a proposal can never be redeemed. */
  revoked_at?: string;
};
type PendingFile = { approvals: PendingApproval[] };

/** The stored form of a token: sha256 hex. Elicitation seals this (never the token) into its requestState. */
export function tokenHash(token: string): string {
  return sha256(token);
}

/** Record a proposal (with the verdicts its preview showed) and return the unguessable token that later authorizes writing it. */
export async function issueToken(cwd: string, candidates: PendingCandidate[], scope: SaveTarget, now: Date = new Date(), verdicts?: PinnedVerdict[]): Promise<string> {
  const root = await pendingRoot(cwd, scope);
  if (!root) throw new Error('approval token needs an Engram memory root; run engram inject first');
  const token = randomBytes(32).toString('base64url');
  const boundCwd = path.resolve(cwd);
  const file = path.join(root, PENDING_APPROVALS_FILE);
  await ensureScopeGitignore(root);
  await lockPending(file, async () => {
    const pending = await readPending(file);
    const live = pending.approvals.filter((item) => !isExpired(item, now));
    live.push({ token_hash: tokenHash(token), cwd: boundCwd, scope, candidates, ...(verdicts ? { verdicts } : {}), hash: candidateHash(boundCwd, scope, candidates, verdicts), issued_at: now.toISOString() });
    await writeJsonAtomic(file, { approvals: live });
  });
  return token;
}

/**
 * Consume a token once: unknown, used, expired, or tampered records never yield candidates.
 * `validate` may throw to reject the request (e.g. a bad selection) without consuming the token.
 */
export async function redeemToken(cwd: string, token: string, now: Date = new Date(), validate?: (candidates: PendingCandidate[]) => void): Promise<Redeemed> {
  return redeemTokenHash(cwd, tokenHash(token), now, validate);
}

/** Same lock, TTL, and hash checks as `redeemToken`; the stored token hash is the lookup key (checks run revoked, used, expired, mismatch). */
export async function redeemTokenHash(cwd: string, hash: string, now: Date = new Date(), validate?: (candidates: PendingCandidate[]) => void): Promise<Redeemed> {
  const boundCwd = path.resolve(cwd);
  for (const root of await candidateRoots(cwd)) {
    const file = path.join(root, PENDING_APPROVALS_FILE);
    if (!(await exists(file))) continue;
    // The read happens inside the lock, so a concurrent redeem of the same token sees `used_at` and is refused.
    const redeemed = await lockPending(file, async (): Promise<Redeemed | undefined> => {
      const pending = await readPending(file);
      const record = pending.approvals.find((item) => item.token_hash === hash && item.cwd === boundCwd);
      if (!record) return undefined;
      if (record.revoked_at) return { error: 'revoked' };
      if (record.used_at) return { error: 'used' };
      if (isExpired(record, now)) return { error: 'expired' };
      if (candidateHash(boundCwd, record.scope, record.candidates, record.verdicts) !== record.hash) return { error: 'mismatch' };
      validate?.(record.candidates);
      record.used_at = now.toISOString();
      await writeJsonAtomic(file, pending);
      return { candidates: record.candidates, scope: record.scope, ...(record.verdicts ? { verdicts: record.verdicts } : {}) };
    });
    if (redeemed) return redeemed;
  }
  return { error: 'unknown' };
}

/**
 * Make a proposal unusable (the human declined the approval dialog). A proposal that was already redeemed is left
 * as it is. Like issue and redeem, a lock timeout throws; returns true when the proposal was found.
 */
export async function revokeTokenHash(cwd: string, hash: string, now: Date = new Date()): Promise<boolean> {
  const boundCwd = path.resolve(cwd);
  for (const root of await candidateRoots(cwd)) {
    const file = path.join(root, PENDING_APPROVALS_FILE);
    if (!(await exists(file))) continue;
    const found = await lockPending(file, async (): Promise<boolean> => {
      const pending = await readPending(file);
      const record = pending.approvals.find((item) => item.token_hash === hash && item.cwd === boundCwd);
      if (!record) return false;
      if (!record.used_at) {
        record.used_at = record.revoked_at = now.toISOString();
        await writeJsonAtomic(file, pending);
      }
      return true;
    });
    if (found) return true;
  }
  return false;
}

/** Fail closed: a lock timeout throws, so no token is issued or consumed and no memory is written. */
function lockPending<T>(file: string, fn: () => Promise<T>): Promise<T> {
  return withFileLock(file, fn, { timeoutMs: APPROVAL_LOCK_TIMEOUT_MS });
}

/** Pending approvals live with the first scope the proposal targets (workspace for `both`). */
async function pendingRoot(cwd: string, scope: SaveTarget): Promise<string> {
  const config = await loadConfig(cwd);
  const roots = activeRoots(cwd, config);
  const first = writeScopes(scope, config).find((current) => Boolean(roots[current]));
  return first ? roots[first] : '';
}

async function candidateRoots(cwd: string): Promise<string[]> {
  const roots = activeRoots(cwd, await loadConfig(cwd));
  return [...new Set([roots.workspace, roots.global].filter(Boolean))];
}

function activeRoots(cwd: string, config: EngramConfig): Record<'workspace' | 'global', string> {
  const roots = scopeRootsForConfig(cwd, config);
  return profileResolutionForConfig(config).workspace_allowed ? roots : { ...roots, workspace: '' };
}

function isExpired(record: PendingApproval, now: Date): boolean {
  const issued = Date.parse(record.issued_at);
  return !Number.isFinite(issued) || now.getTime() - issued > APPROVAL_TTL_MS;
}

/** sha256 over cwd, save target, the canonical (key-sorted) candidate JSON, and the pinned verdicts when the record has them. */
function candidateHash(cwd: string, scope: SaveTarget, candidates: PendingCandidate[], verdicts?: PinnedVerdict[]): string {
  return sha256(canonicalJson(verdicts ? { cwd, scope, candidates, verdicts } : { cwd, scope, candidates }));
}

/** Key-sorted JSON; also used for the elicitation args digest. */
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).filter(([, item]) => item !== undefined).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

async function readPending(file: string): Promise<PendingFile> {
  const raw = await readJsonForUpdate<unknown>(file, {});
  const approvals = (raw as Partial<PendingFile> | null)?.approvals;
  return { approvals: Array.isArray(approvals) ? approvals.filter((item) => item && typeof item === 'object' && typeof item.token_hash === 'string') : [] };
}
