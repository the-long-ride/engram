/** Elicitation-backed save approval: the approval form, result parsing, and HMAC-sealed MRTR requestState. */
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import path from 'node:path';
import { redactSensitive, scanInjection } from '../core/safety/security.js';
import { sha256 } from '../core/safety/hash.js';
import { APPROVAL_TTL_MS, canonicalJson, type SaveTarget } from './approval-tokens.js';

export const ELICITATION_KEY = 'engram_approval';
export const ELICITATION_TIMEOUT_MS = 60_000;
const MAX_STATE_CHARS = 8192;
/** More candidates than this keep the chat token flow: the form and the sealed state stay small. */
export const MAX_CHOICES = 20;
const SAVE_TARGETS: readonly string[] = ['both', 'workspace', 'global'];
/** Per-process key: a restarted server rejects old state (fail closed; the client re-proposes). */
const STATE_KEY = randomBytes(32);

export type ApprovalChoice = { number: number; title: string };
export type ElicitOutcome =
  | { action: 'accept'; approve: number[]; scope: SaveTarget }
  | { action: 'decline' | 'cancel' }
  | { action: 'invalid'; reason: string };
/** `th` is the approval token hash; `cwd` and `args` are digests, so the state is bound to the proposal that issued it. */
export type SealedApproval = { v: 1; th: string; cwd: string; tool: string; args: string; exp: number; choices: ApprovalChoice[]; scopes: SaveTarget[] };

/** `{}` means form mode only (2025-11-25); otherwise an explicit `form` object is required. */
export function supportsFormElicitation(capabilities: unknown): boolean {
  const elicitation = (capabilities as any)?.elicitation;
  if (!elicitation || typeof elicitation !== 'object' || Array.isArray(elicitation)) return false;
  return Object.keys(elicitation).length === 0 || Boolean(elicitation.form && typeof elicitation.form === 'object');
}

/** Titles only: an action/scope/id line. Redacted and injection-scanned; a label either step would change becomes `Candidate N`. */
export function choiceTitle(number: number, label: string): string {
  const clean = label.replace(/[\u0000-\u001f\u007f]/gu, ' ').trim();
  if (!clean || redactSensitive(clean) !== clean || scanInjection(clean).length) return `Candidate ${number}`;
  return `${number}. ${clean}`.slice(0, 120);
}

export function approvalForm(choices: ApprovalChoice[], scopes: SaveTarget[], defaultScope: SaveTarget, tool?: string) {
  return {
    mode: 'form',
    // A working note is one yes/cancel: accept writes the gitignored, expiring note; decline or cancel writes nothing.
    message: tool === 'engram_note'
      ? 'Engram: save this working note? It is written to the gitignored working tier and expires; accept writes it, decline or cancel writes nothing.'
      : `Engram: save ${choices.length} memory candidate(s) proposed in this chat? Selected candidates are written to project memory.`,
    requestedSchema: {
      type: 'object',
      properties: {
        approve: { type: 'array', title: 'Candidates to save', minItems: 1, items: { anyOf: choices.map((c) => ({ const: String(c.number), title: c.title })) }, default: choices.map((c) => String(c.number)) },
        scope: { type: 'string', title: 'Save scope', enum: scopes, default: defaultScope }
      },
      required: ['approve', 'scope']
    }
  };
}

/** Validate the client's ElicitResult against what was offered; anything else is `invalid` (nothing is written). */
export function parseElicitResult(raw: unknown, choices: ApprovalChoice[], scopes: SaveTarget[]): ElicitOutcome {
  const action = (raw as any)?.action;
  if (action === 'decline' || action === 'cancel') return { action };
  if (action !== 'accept') return { action: 'invalid', reason: 'unknown elicitation action' };
  const content = (raw as any).content;
  if (!content || typeof content !== 'object') return { action: 'invalid', reason: 'approve must list offered candidate numbers' };
  const offered = new Set(choices.map((c) => c.number));
  const picked: number[] = Array.isArray(content.approve) ? content.approve.map((v: unknown) => (typeof v === 'string' || typeof v === 'number' ? Number(v) : NaN)) : [];
  if (!picked.length || picked.some((n) => !Number.isInteger(n) || !offered.has(n))) return { action: 'invalid', reason: 'approve must list offered candidate numbers' };
  if (typeof content.scope !== 'string' || !scopes.includes(content.scope as SaveTarget)) return { action: 'invalid', reason: 'scope was not offered' };
  return { action: 'accept', approve: [...new Set(picked)].sort((a, b) => a - b), scope: content.scope as SaveTarget };
}

export function argsDigest(args: unknown): string {
  return sha256(canonicalJson(args ?? {}));
}

export function cwdDigest(cwd: string): string {
  return sha256(path.resolve(cwd));
}

/** `v1.<base64url payload>.<hmac>`: an opaque string for the client, integrity-protected for the server. */
export function sealRequestState(payload: SealedApproval): string {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `v1.${body}.${mac(body)}`;
}

/** True when a sealed state would exceed what `openRequestState` accepts, so the caller falls back to the token flow. */
export function stateTooLarge(state: string): boolean {
  return state.length > MAX_STATE_CHARS;
}

/** Attacker-controlled input: size cap, MAC check (constant time), then expiry, tool, cwd, and args binding. */
export function openRequestState(state: unknown, expected: { tool: string; cwd: string; args: unknown }, now = Date.now()): SealedApproval | undefined {
  if (typeof state !== 'string' || state.length > MAX_STATE_CHARS) return undefined;
  const parts = state.split('.');
  if (parts.length !== 3) return undefined;
  const [version, body, tag] = parts;
  if (version !== 'v1' || !body || !tag) return undefined;
  const want = Buffer.from(mac(body));
  const got = Buffer.from(tag);
  if (want.length !== got.length || !timingSafeEqual(want, got)) return undefined;
  let payload: SealedApproval;
  try {
    payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch {
    return undefined;
  }
  if (payload?.v !== 1 || typeof payload.th !== 'string' || !Number.isFinite(payload.exp) || now > payload.exp) return undefined;
  if (payload.tool !== expected.tool || payload.cwd !== cwdDigest(expected.cwd) || payload.args !== argsDigest(expected.args)) return undefined;
  if (!Array.isArray(payload.choices) || !payload.choices.length || payload.choices.length > MAX_CHOICES) return undefined;
  if (!payload.choices.every((c) => c && Number.isInteger(c.number) && typeof c.title === 'string')) return undefined;
  if (!Array.isArray(payload.scopes) || !payload.scopes.length || !payload.scopes.every((s) => SAVE_TARGETS.includes(s))) return undefined;
  return payload;
}

export function stateExpiry(now = Date.now()): number {
  return now + APPROVAL_TTL_MS;
}

function mac(body: string): string {
  return createHmac('sha256', STATE_KEY).update(body).digest('base64url');
}

/** Test seam: NODE_ENV=test may shorten the legacy wait (mirrors the ENGRAM_TODAY convention). */
export function elicitationTimeoutMs(): number {
  const raw = Number(process.env.ENGRAM_MCP_ELICITATION_TIMEOUT_MS);
  return process.env.NODE_ENV === 'test' && Number.isSafeInteger(raw) && raw > 0 ? raw : ELICITATION_TIMEOUT_MS;
}
