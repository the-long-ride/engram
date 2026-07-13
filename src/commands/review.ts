/** Review command: list/inspect/dismiss/verify/supersede/archive findings derived from index+graph and merged with persisted status; inspect/apply also handle deferred-save inbox receipts; never exposes memory bodies or authors. */
import type { EngramContext } from '../core/memory/context.js';
import { getContext } from '../core/memory/context.js';
import { visibleEntries } from '../core/memory/routing.js';
import { deriveFindings, type ReviewFinding, type FindingKind } from '../core/review/findings.js';
import { loadReviewStore, writeReviewStore, seedAllRecords, applyPersistedStatus } from '../core/review/records.js';
import { dismissFindingAction, verifyAction, supersedeAction, archiveAction, type ActionResult, type ActionError } from '../core/review/actions.js';
import { isReceiptId, loadReceipt, listReceipts, cleanupExpired, purgeReceipt, serializeCandidateForApply } from '../core/review/inbox.js';
import { isJsonMode, jsonOk } from '../core/cli/json-output.js';
import { EngramError } from '../core/runtime/exit-codes.js';
import { style } from '../core/cli/format.js';
import { planMemorySave, previewSavePlans, type SavePlan } from '../core/memory/save-plan.js';
import { parseMemoryCandidate, type MemoryCandidate } from '../core/memory/memory-candidate.js';
import { requestApproval, applyApprovalEdit } from '../core/safety/approval.js';
import { resolveAuthor, writeApprovedMemory } from '../core/memory/storage.js';
import { flagValues } from '../cli/args.js';

type Scope = 'workspace' | 'global';

export async function cmdReview(args: string[], flags: Record<string, any> = {}): Promise<string> {
  const sub = (args[0] ?? '').toLowerCase();
  const rest = args.slice(1);
  const ctx = await getContext(typeof flags.cwd === 'string' ? flags.cwd : process.cwd());
  switch (sub) {
    case 'list': return cmdReviewList(ctx, rest, flags);
    case 'inspect': return cmdReviewInspect(ctx, rest, flags);
    case 'dismiss': return cmdReviewDismiss(ctx, rest, flags);
    case 'verify': return cmdReviewVerify(ctx, rest, flags);
    case 'supersede': return cmdReviewSupersede(ctx, rest, flags);
    case 'archive': return cmdReviewArchive(ctx, rest, flags);
    case 'apply': return await cmdReviewApply(ctx, rest, flags);
    case 'cleanup': return await cmdReviewCleanup(ctx, rest, flags);
    case 'inbox': return await cmdReviewInbox(ctx, rest, flags);
    case '':
    case 'help':
      return reviewHelp();
    default:
      throw new EngramError('ENG_USAGE', `review: unknown subcommand '${sub}'. Try: list, inspect, dismiss, verify, supersede, archive, apply, inbox, cleanup.`, 2);
  }
}

async function cmdReviewList(ctx: EngramContext, rest: string[], flags: Record<string, any>): Promise<string> {
  const findings = await gatherFindings(ctx);
  const kindFilter = typeof flags.kind === 'string' ? flags.kind as FindingKind : undefined;
  const filtered = kindFilter ? findings.filter((f) => f.kind === kindFilter) : findings;
  const pending = filtered.filter((f) => f.status === 'pending');
  if (isJsonMode(flags)) {
    return jsonOk({ findings: pending, total_findings: pending.length, kinds: countByKind(pending) });
  }
  if (!pending.length) return style.heading('Review queue') + '\n\nNo pending findings.';
  const lines = [style.heading(`Review queue (${pending.length} pending)`), ''];
  for (const f of pending) {
    lines.push(`${style.label(f.kind)} ${f.id}  [${f.scope}]`);
    lines.push(`  ${style.muted(f.safe_summary)}`);
  }
  return lines.join('\n');
}

async function cmdReviewInspect(ctx: EngramContext, rest: string[], flags: Record<string, any>): Promise<string> {
  const id = rest[0];
  if (!id) throw new EngramError('ENG_USAGE', 'review inspect requires a finding id or receipt id', 2);
  if (isReceiptId(id)) return await cmdReviewInspectReceipt(ctx, id, flags);
  const findings = await gatherFindings(ctx);
  const finding = findings.find((f) => f.id === id || f.fingerprint === id);
  if (!finding) throw new EngramError('ENG_NOT_FOUND', `finding not found: ${id}`, 1);
  if (isJsonMode(flags)) return jsonOk({ finding });
  return [
    style.heading(`Finding: ${finding.id}`),
    `${style.label('Kind:')} ${finding.kind}`,
    `${style.label('Status:')} ${finding.status}`,
    `${style.label('Scope:')} ${finding.scope}`,
    `${style.label('Memory IDs:')} ${finding.memory_ids.join(', ')}`,
    `${style.label('Created:')} ${finding.created_at}`,
    `${style.label('Updated:')} ${finding.updated_at}`,
    '',
    finding.safe_summary
  ].join('\n');
}

async function cmdReviewInspectReceipt(ctx: EngramContext, id: string, flags: Record<string, any>): Promise<string> {
  const receipt = await findReceipt(ctx, id);
  if (!receipt) throw new EngramError('ENG_NOT_FOUND', `receipt not found or expired: ${id}`, 1);
  const candidate = serializeCandidateForApply(receipt.candidate);
  if (isJsonMode(flags)) return jsonOk({ receipt });
  return [
    style.heading(`Receipt: ${receipt.id}`),
    `${style.label('Source:')} ${receipt.source}`,
    `${style.label('Scope:')} ${receipt.scope}`,
    `${style.label('Created:')} ${receipt.created_at}`,
    `${style.label('Expires:')} ${receipt.expires_at}`,
    `${style.label('Candidate hash:')} ${receipt.candidate_hash.slice(0, 12)}\u2026`,
    `${style.label('Related IDs:')} ${receipt.related_ids.join(', ') || '(none)'}`,
    '',
    style.title('Candidate:'),
    candidate,
    '',
    style.muted(`Apply with: engram review apply ${receipt.id}`)
  ].join('\n');
}

async function cmdReviewDismiss(ctx: EngramContext, rest: string[], flags: Record<string, any>): Promise<string> {
  const fingerprint = rest[0];
  if (!fingerprint) throw new EngramError('ENG_USAGE', 'review dismiss requires a finding id', 2);
  const note = typeof flags.note === 'string' ? flags.note : undefined;
  const result = await dismissFindingAction(ctx, fingerprint, note);
  if (isJsonMode(flags)) {
    return result.ok ? jsonOk({ dismissed: fingerprint }) : throwJson(result.message);
  }
  return result.ok ? result.message : result.message;
}

async function cmdReviewVerify(ctx: EngramContext, rest: string[], flags: Record<string, any>): Promise<string> {
  const memoryId = rest[0];
  if (!memoryId) throw new EngramError('ENG_USAGE', 'review verify requires a memory id', 2);
  const result = await verifyAction(ctx, memoryId);
  if (isJsonMode(flags)) {
    return result.ok ? jsonOk({ verified: memoryId }) : throwJson(result.message);
  }
  return result.ok ? result.message : result.message;
}

async function cmdReviewSupersede(ctx: EngramContext, rest: string[], flags: Record<string, any>): Promise<string> {
  const oldId = rest[0];
  const newId = rest[1];
  if (!oldId || !newId) throw new EngramError('ENG_USAGE', 'review supersede requires old-id and new-id', 2);
  const result = await supersedeAction(ctx, oldId, newId);
  if (isJsonMode(flags)) {
    return result.ok ? jsonOk({ superseded: oldId, by: newId }) : throwJson(result.message);
  }
  return result.ok ? result.message : result.message;
}

async function cmdReviewArchive(ctx: EngramContext, rest: string[], flags: Record<string, any>): Promise<string> {
  const memoryId = rest[0];
  if (!memoryId) throw new EngramError('ENG_USAGE', 'review archive requires a memory id', 2);
  const reason = typeof flags.reason === 'string' ? flags.reason : rest.slice(1).join(' ').trim();
  const result = await archiveAction(ctx, memoryId, reason);
  if (isJsonMode(flags)) {
    return result.ok ? jsonOk({ archived: memoryId }) : throwJson(result.message);
  }
  return result.ok ? result.message : result.message;
}

async function gatherFindings(ctx: EngramContext): Promise<ReviewFinding[]> {
  const entries = visibleEntries(ctx.index.entries, ctx.config);
  const derived = deriveFindings(entries, ctx.graph);
  const merged: ReviewFinding[] = [];
  for (const scope of ['workspace', 'global'] as Scope[]) {
    const root = ctx.roots[scope];
    if (!root) continue;
    const store = await loadReviewStore(root);
    const seeded = seedAllRecords(store, derived.filter((f) => f.scope === scope));
    await writeReviewStore(root, seeded);
    const forScope = derived.filter((f) => f.scope === scope);
    merged.push(...applyPersistedStatus(forScope, seeded));
    await cleanupExpired(root);
  }
  return merged;
}

async function findReceipt(ctx: EngramContext, id: string) {
  for (const scope of ['workspace', 'global'] as Scope[]) {
    const root = ctx.roots[scope];
    if (!root) continue;
    const receipt = await loadReceipt(root, id);
    if (receipt) return receipt;
  }
  return undefined;
}

function unresolvedHintGuides(candidate: MemoryCandidate, plan: SavePlan): string[] {
  const guides: string[] = [];
  const dependsOn = new Set((candidate.dependsOn ?? []).map((ref) => ref.trim().toLowerCase()));
  const updateId = candidate.updateId?.trim().toLowerCase();
  for (const hint of plan.related ?? []) {
    if (hint.action === 'possible-duplicate' && !updateId) {
      guides.push(`Possible duplicate ${hint.id}: add UPDATE: ${hint.id}.`);
    } else if (hint.action === 'suggested-dependency' && !dependsOn.has(hint.id.trim().toLowerCase())) {
      guides.push(`Suggested dependency ${hint.id}: add DEPENDS_ON: ${hint.id}.`);
    }
  }
  return guides;
}

function relationValues(flags: Record<string, any>, name: string): string[] {
  return flagValues(flags, name).flatMap((value) => value.split(',').map((item) => item.trim()).filter(Boolean));
}

async function cmdReviewApply(ctx: EngramContext, rest: string[], flags: Record<string, any>): Promise<string> {
  const id = rest[0];
  if (!id) throw new EngramError('ENG_USAGE', 'review apply requires a receipt id', 2);
  if (!isReceiptId(id)) throw new EngramError('ENG_USAGE', `review apply expects a receipt id (short alnum starting with 'r-'); got: ${id}`, 2);
  const receipt = await findReceipt(ctx, id);
  if (!receipt) throw new EngramError('ENG_NOT_FOUND', `receipt not found or expired: ${id}`, 1);
  const candidateText = serializeCandidateForApply(receipt.candidate);
  const parsedCandidate = parseMemoryCandidate(candidateText);
  const dependsOn = [...new Set([...(parsedCandidate.dependsOn ?? []), ...relationValues(flags, 'depends-on')])];
  const updateValues = relationValues(flags, 'update');
  const candidate: MemoryCandidate = {
    ...parsedCandidate,
    dependsOn,
    ...(updateValues.length ? { updateId: updateValues[updateValues.length - 1] } : {})
  };
  const author = await resolveAuthor();
  const roleValue = typeof flags.role === 'string' ? flags.role : typeof flags.roles === 'string' ? flags.roles : '';
  const role = candidate.role?.length ? candidate.role : roleValue ? roleValue.split(',').map((r: string) => r.trim()).filter(Boolean) : undefined;
  const force = flags.force === true || flags.f === true;
  const plans = await planMemorySave({
    ctx, text: candidate.text, type: candidate.type, scopes: [receipt.candidate.scope], author, role,
    context: candidate.context, triggers: candidate.triggers,
    dependsOn: candidate.dependsOn, level: candidate.level,
    updateId: candidate.updateId, variants: candidate.variants
  });
  const relatedIds = [...new Set(plans.flatMap((plan) => plan.related?.map((hint) => hint.id) ?? []))];
  const unresolved = plans.flatMap((plan) => unresolvedHintGuides(candidate, plan));
  if (unresolved.length) {
    const guidance = ['Apply blocked: the candidate still needs a relation choice.', ...unresolved, '', 'Update the receipt candidate or pass a corrected one, then rerun apply.'].join('\n');
    if (isJsonMode(flags)) return jsonOk({ applied: null, status: 'blocked', guidance, related_ids: relatedIds });
    return guidance;
  }
  const approval = force ? { accepted: true } : await requestApproval(previewSavePlans(plans));
  if (!approval.accepted) {
    if (isJsonMode(flags)) return jsonOk({ applied: null, status: 'discarded' });
    return 'Discarded. No file written.';
  }
  const written: string[] = [];
  for (const plan of plans) {
    const content = applyApprovalEdit(plan.content, approval.edits);
    const saved = await writeApprovedMemory({ cwd: process.cwd(), scope: plan.scope, file: plan.file, content, message: plan.message });
    written.push(saved);
  }
  const saveResult = `Saved -> ${written.join(', ')}`;
  const root = ctx.roots[receipt.candidate.scope];
  if (root) await purgeReceipt(root, id);
  const relatedSummary = relatedIds.length ? `\nRelated IDs: ${relatedIds.join(', ')}` : '';
  if (isJsonMode(flags)) return jsonOk({ applied: id, save_output: saveResult, related_ids: relatedIds });
  return `Applied receipt ${id}.\n\n${saveResult}${relatedSummary}`;
}

async function cmdReviewCleanup(ctx: EngramContext, _rest: string[], flags: Record<string, any>): Promise<string> {
  let removed = 0;
  for (const scope of ['workspace', 'global'] as Scope[]) {
    const root = ctx.roots[scope];
    if (root) removed += await cleanupExpired(root);
  }
  if (isJsonMode(flags)) return jsonOk({ receipts_removed: removed });
  return removed ? `Removed ${removed} expired receipt${removed === 1 ? '' : 's'}.` : 'No expired receipts to remove.';
}

async function cmdReviewInbox(ctx: EngramContext, _rest: string[], flags: Record<string, any>): Promise<string> {
  const receipts: Array<{ scope: Scope; receipt: Awaited<ReturnType<typeof loadReceipt>> }> = [];
  for (const scope of ['workspace', 'global'] as Scope[]) {
    const root = ctx.roots[scope];
    if (!root) continue;
    for (const receipt of await listReceipts(root)) receipts.push({ scope, receipt });
  }
  const valid = receipts.filter((r): r is { scope: Scope; receipt: NonNullable<typeof r.receipt> } => Boolean(r.receipt));
  if (isJsonMode(flags)) return jsonOk({ receipts: valid.map((r) => r.receipt), total_receipts: valid.length });
  if (!valid.length) return style.heading('Inbox') + '\n\nNo pending receipts.';
  const lines = [style.heading(`Inbox (${valid.length} pending receipts)`), ''];
  for (const entry of valid) {
    lines.push(`${style.label(entry.receipt.id)}  [${entry.scope}]`);
    lines.push(`  ${style.muted(`${entry.receipt.source} \u2192 ${entry.receipt.candidate.type}: ${entry.receipt.candidate.text.slice(0, 80)}`)}`);
  }
  return lines.join('\n');
}

function countByKind(findings: ReviewFinding[]): Record<string, number> {
  return findings.reduce<Record<string, number>>((acc, f) => { acc[f.kind] = (acc[f.kind] ?? 0) + 1; return acc; }, {});
}

function throwJson(message: string): never {
  throw new EngramError('ENG_REVIEW', message, 1);
}

function reviewHelp(): string {
  return [
    style.heading('engram review — derived memory review queue and diary'),
    '',
    'Findings are rebuilt from the index and graph; dismissals persist by fingerprint.',
    'Inbox receipts are opt-in (save-session --inbox) and never expose memory bodies or authors.',
    '',
    style.title('Commands:'),
    '  engram review list [--kind duplicate|stale|invalid_dependency|contradiction] [--json]',
    '  engram review inbox [--json]            List pending deferred-save receipts',
    '  engram review inspect <id> [--json]     Finding fingerprint OR receipt id (r-xxxxx)',
    '  engram review apply <receipt-id> [--force]   Rerun the candidate through the save flow',
    '  engram review dismiss <finding-id> [--note text]',
    '  engram review verify <memory-id>',
    '  engram review supersede <old-id> <new-id>',
    '  engram review archive <memory-id> [--reason text]',
    '  engram review cleanup                  Remove expired receipts (both scopes)',
    '',
    style.title('Finding kinds:'),
    '  duplicate            Two memories likely cover the same fact',
    '  contradiction        Graph-detected contradiction candidate',
    '  stale                Memory past review_after or older than 180 days',
    '  invalid_dependency   depends_on references a missing memory id',
    '',
    style.title('Inbox:'),
    '  Opt-in: engram save-session --inbox writes a receipt per deferred candidate.',
    `  Receipts live under .agents/.engram/inbox/<id>.json and expire after ${14} days.`,
    '  apply reruns the candidate via the normal save approval flow (no bypass).'
  ].join('\n');
}
