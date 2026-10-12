/** MCP save approval: the chat approval_token flow, plus elicitation (legacy request, 2026-07-28 input_required) that fails closed. */
import { commitApprovedCandidates, type PlannedCandidate } from '../commands/write.js';
import type { EngramContext } from '../core/memory/context.js';
import { pinVerdicts, type PinnedVerdict, type SavePlan } from '../core/memory/save-plan.js';
import type { NoteWritten } from '../core/memory/working-note.js';
import {
  APPROVAL_TTL_MS, issueToken, redeemTokenHash, revokeTokenHash, tokenHash, type RedeemError, type SaveTarget
} from './approval-tokens.js';
import {
  ELICITATION_KEY, MAX_CHOICES, approvalForm, argsDigest, choiceTitle, cwdDigest, elicitationTimeoutMs, openRequestState, parseElicitResult,
  sealRequestState, stateExpiry, stateTooLarge, supportsFormElicitation, type ApprovalChoice, type ElicitOutcome
} from './elicitation.js';
import { OutboundAborted, RPC, type Era, type McpSession } from './protocol.js';

/** A tool answer whose human-readable text and machine-readable data travel separately. */
export class StructuredOutput {
  constructor(readonly text: string, readonly data: Record<string, unknown>) {}
}

/** A 2026-07-28 `input_required` tool result: the form to show and the sealed state the retry must echo. */
export class InputRequired {
  constructor(readonly result: { resultType: 'input_required'; inputRequests: Record<string, unknown>; requestState: string }) {}
}

/** Thrown for protocol-level rejection (forged or expired requestState); `handleModern` maps it to a JSON-RPC error. */
export class McpProtocolError extends Error {
  constructor(readonly code: number, message: string) {
    super(message);
  }
}

/** Per-call context: the era, the stdio session, and (modern only) what `params` carried. Never read from tool `arguments`. */
export type ToolCall = {
  era: Era;
  session: McpSession;
  clientCapabilities?: Record<string, unknown>;
  inputResponses?: unknown;
  requestState?: unknown;
  signal?: AbortSignal;
};

export const REDEEM_ERRORS: Record<RedeemError, string> = {
  unknown: 'unknown approval token for this workspace; propose the candidates again',
  used: 'approval token already used; propose the candidates again',
  expired: 'approval token expired (30 minutes); propose the candidates again',
  mismatch: 'approval token hash mismatch: pending candidates changed after the proposal; propose them again',
  revoked: 'approval was declined in the approval dialog; propose the candidates again'
};

/** The token flow when the client cannot (or must not) show a dialog; also the fallback when a dialog is dismissed. */
export function approvalMode(call: ToolCall): 'legacy-elicit' | 'modern-elicit' | 'token' {
  if (call.session.elicitation === false) return 'token';
  if (call.era === 'legacy' && call.session.request && supportsFormElicitation(call.session.legacyClientCapabilities)) return 'legacy-elicit';
  if (call.era === 'modern' && supportsFormElicitation(call.clientCapabilities)) return 'modern-elicit';
  return 'token';
}

/** D12: park the exact candidates behind a token so an MCP-only host can commit them after the human approves. `reuse` keeps an already issued token. */
export async function withApprovalToken(cwd: string, preview: string, candidates: PlannedCandidate[], target: SaveTarget, verdicts: PinnedVerdict[], reuse?: { token: string; note?: string }): Promise<StructuredOutput> {
  const token = reuse?.token ?? await issueToken(cwd, candidates, target, new Date(), verdicts);
  const body = `${preview}\n\n${mcpAgentApprovalFooter(token)}`;
  const text = reuse?.note ? `${reuse.note}\n\n${body}` : body;
  return new StructuredOutput(text, { text, approval_token: token, candidate_count: candidates.length, expires_in_minutes: APPROVAL_TTL_MS / 60000, verdicts });
}

/** Short reference; the full protocol lives in the Engram guide, the token line serves MCP-only hosts without it. */
function mcpAgentApprovalFooter(token: string): string {
  return [
    'AI-agent chat approval required: these candidates are NOT saved until the human approves.',
    'See approval protocol in the Engram guide.',
    `After the human approves in chat, call engram_commit with approval_token: ${token} and approve: "all" or the approved candidate numbers (single use, expires in 30 minutes).`
  ].join('\n');
}

/**
 * Proposal tail shared by engram_save and engram_save_session: the token text, or an approval dialog when the client
 * can show one. Nothing is written here; only an explicit accept reaches `commitApprovedCandidates`.
 */
export async function approve(call: ToolCall, tool: string, args: unknown, ctx: EngramContext, preview: string, candidates: PlannedCandidate[], plans: SavePlan[], target: SaveTarget): Promise<StructuredOutput | InputRequired> {
  const cwd = ctx.cwd;
  const verdicts = pinVerdicts(plans);
  const mode = candidates.length > MAX_CHOICES ? 'token' : approvalMode(call);
  if (mode === 'token') return withApprovalToken(cwd, preview, candidates, target, verdicts);
  const choices = candidateChoices(plans, candidates.length);
  const scopes = scopeChoices(target, ctx);
  const form = approvalForm(choices, scopes, target, tool);
  const token = await issueToken(cwd, candidates, target, new Date(), verdicts);
  const hash = tokenHash(token);
  if (mode === 'modern-elicit') {
    const requestState = sealRequestState({ v: 1, th: hash, cwd: cwdDigest(cwd), tool, args: argsDigest(args), exp: stateExpiry(), choices, scopes });
    if (stateTooLarge(requestState)) return withApprovalToken(cwd, preview, candidates, target, verdicts, { token });
    return new InputRequired({ resultType: 'input_required', inputRequests: { [ELICITATION_KEY]: { method: 'elicitation/create', params: form } }, requestState });
  }
  let raw: unknown;
  try {
    raw = await call.session.request!('elicitation/create', form, { timeoutMs: elicitationTimeoutMs(), signal: call.signal });
  } catch (error) {
    if (error instanceof OutboundAborted) {
      // The client cancelled the call (or closed stdin): no response is sent, and the proposal must not stay redeemable.
      await revokeTokenHash(cwd, hash).catch(() => false);
      return new StructuredOutput('The approval dialog was cancelled; nothing was saved.', { approval: 'cancel', committed: false });
    }
    return withApprovalToken(cwd, preview, candidates, target, verdicts, { token, note: 'The approval dialog was not completed; nothing was saved.' });
  }
  return settleApproval(cwd, hash, parseElicitResult(raw, choices, scopes), preview, () => withApprovalToken(cwd, preview, candidates, target, verdicts, { token, note: 'The approval dialog was dismissed; nothing was saved.' }));
}

/** accept: redeem and commit; decline or invalid: revoke; cancel: the token fallback (legacy, via `onCancel`) or revoke (modern). */
async function settleApproval(cwd: string, hash: string, outcome: ElicitOutcome, preview: string, onCancel?: () => Promise<StructuredOutput>): Promise<StructuredOutput> {
  if (outcome.action === 'cancel' && onCancel) return onCancel();
  const lead = preview ? `${preview}\n\n` : '';
  if (outcome.action !== 'accept') {
    await revokeTokenHash(cwd, hash);
    const reason = outcome.action === 'invalid' ? `the approval response was invalid (${outcome.reason})` : `the human chose ${outcome.action} in the approval dialog`;
    return new StructuredOutput(`${lead}Nothing was saved: ${reason}.`, { approval: outcome.action, committed: false });
  }
  const redeemed = await redeemTokenHash(cwd, hash, new Date(), (pending) => {
    if (outcome.approve.some((n) => n > pending.length)) throw new Error('approval selection is out of range');
  });
  if ('error' in redeemed) throw new Error(REDEEM_ERRORS[redeemed.error]);
  const sink = { notes: [] as NoteWritten[] };
  const written = await commitApprovedCandidates(cwd, outcome.approve.map((n) => redeemed.candidates[n - 1]), outcome.scope, outcome.approve, redeemed.verdicts, sink);
  // An approved engram_note also reports where the note landed.
  const [note] = sink.notes;
  const noted = note ? { id: note.id, file: note.file, valid_until: note.valid_until } : {};
  return new StructuredOutput(`${lead}Approved in the Engram approval dialog.\n${written}`, { approval: 'accept', committed: true, approved: outcome.approve, scope: outcome.scope, ...noted });
}

/** The retry of a 2026-07-28 proposal. Runs before planning: it commits the pending, hash-verified candidates, never re-planned ones. */
export async function completeModernApproval(call: ToolCall, tool: string, args: unknown): Promise<StructuredOutput | InputRequired> {
  const cwd = process.cwd();
  if (approvalMode(call) !== 'modern-elicit') throw new McpProtocolError(RPC.INVALID_PARAMS, 'requestState is not valid here: this client did not declare form elicitation, or elicitation is disabled');
  const sealed = openRequestState(call.requestState, { tool, cwd, args });
  if (!sealed) throw new McpProtocolError(RPC.INVALID_PARAMS, 'invalid or expired requestState; propose the candidates again');
  const responses = call.inputResponses;
  const response = responses && typeof responses === 'object' ? (responses as Record<string, unknown>)[ELICITATION_KEY] : undefined;
  if (response === undefined) {
    // Spec: ask again rather than fail; the same sealed state stays valid until it expires.
    return new InputRequired({ resultType: 'input_required', inputRequests: { [ELICITATION_KEY]: { method: 'elicitation/create', params: approvalForm(sealed.choices, sealed.scopes, sealed.scopes[0], tool) } }, requestState: call.requestState as string });
  }
  return settleApproval(cwd, sealed.th, parseElicitResult(response, sealed.choices, sealed.scopes), '');
}

/** One entry per candidate number: its plans grouped as `ADD workspace:<id>`; a candidate without a plan is just `Candidate N`. */
function candidateChoices(plans: SavePlan[], count: number): ApprovalChoice[] {
  return Array.from({ length: count }, (_, index) => {
    const number = index + 1;
    // The label is the verdict the human approves: `SUPERSEDE workspace:<new> (replaces <old>)`, `NOOP workspace:<id> (duplicate of <old>)`.
    const label = plans.filter((plan) => (plan.candidateIndex ?? 1) === number).map(verdictLabel).join(', ');
    return { number, title: choiceTitle(number, label) };
  });
}

function verdictLabel(plan: SavePlan): string {
  const { kind, target } = plan.verdict;
  const note = !target || kind === 'ADD' ? '' : kind === 'SUPERSEDE' ? ` (replaces ${target})` : kind === 'NOOP' ? ` (duplicate of ${target})` : '';
  return `${kind} ${plan.scope}:${plan.id}${note}`;
}

/** The human may narrow `both` to one scope, never widen a proposal. */
function scopeChoices(target: SaveTarget, ctx: EngramContext): SaveTarget[] {
  if (target !== 'both') return [target];
  return ctx.roots.workspace && ctx.roots.global ? ['both', 'workspace', 'global'] : ['both'];
}
