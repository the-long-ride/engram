/** Review command: list/inspect/dismiss/verify/supersede/archive findings derived from index+graph and merged with persisted status; never exposes memory bodies or authors. */
import type { EngramContext } from '../core/memory/context.js';
import { getContext } from '../core/memory/context.js';
import { visibleEntries } from '../core/memory/routing.js';
import { deriveFindings, type ReviewFinding, type FindingKind } from '../core/review/findings.js';
import { loadReviewStore, writeReviewStore, seedAllRecords, applyPersistedStatus } from '../core/review/records.js';
import { dismissFindingAction, verifyAction, supersedeAction, archiveAction, type ActionResult, type ActionError } from '../core/review/actions.js';
import { isJsonMode, jsonOk } from '../core/cli/json-output.js';
import { EngramError } from '../core/runtime/exit-codes.js';
import { style } from '../core/cli/format.js';

type Scope = 'workspace' | 'global';

export async function cmdReview(args: string[], flags: Record<string, any> = {}): Promise<string> {
  const sub = (args[0] ?? '').toLowerCase();
  const rest = args.slice(1);
  const ctx = await getContext();
  switch (sub) {
    case 'list': return cmdReviewList(ctx, rest, flags);
    case 'inspect': return cmdReviewInspect(ctx, rest, flags);
    case 'dismiss': return cmdReviewDismiss(ctx, rest, flags);
    case 'verify': return cmdReviewVerify(ctx, rest, flags);
    case 'supersede': return cmdReviewSupersede(ctx, rest, flags);
    case 'archive': return cmdReviewArchive(ctx, rest, flags);
    case '':
    case 'help':
      return reviewHelp();
    default:
      throw new EngramError('ENG_USAGE', `review: unknown subcommand '${sub}'. Try: list, inspect, dismiss, verify, supersede, archive.`, 2);
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
  const fingerprint = rest[0];
  if (!fingerprint) throw new EngramError('ENG_USAGE', 'review inspect requires a finding id', 2);
  const findings = await gatherFindings(ctx);
  const finding = findings.find((f) => f.id === fingerprint || f.fingerprint === fingerprint);
  if (!finding) throw new EngramError('ENG_NOT_FOUND', `finding not found: ${fingerprint}`, 1);
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
  }
  return merged;
}

function countByKind(findings: ReviewFinding[]): Record<string, number> {
  return findings.reduce<Record<string, number>>((acc, f) => { acc[f.kind] = (acc[f.kind] ?? 0) + 1; return acc; }, {});
}

function throwJson(message: string): never {
  throw new EngramError('ENG_REVIEW', message, 1);
}

function reviewHelp(): string {
  return [
    style.heading('engram review — derived memory review queue'),
    '',
    'Findings are rebuilt from the index and graph; dismissals persist by fingerprint.',
    'Never exposes memory bodies or authors.',
    '',
    style.title('Commands:'),
    '  engram review list [--kind duplicate|stale|invalid_dependency|contradiction] [--json]',
    '  engram review inspect <finding-id> [--json]',
    '  engram review dismiss <finding-id> [--note text]',
    '  engram review verify <memory-id>',
    '  engram review supersede <old-id> <new-id>',
    '  engram review archive <memory-id> [--reason text]',
    '',
    style.title('Finding kinds:'),
    '  duplicate            Two memories likely cover the same fact',
    '  contradiction        Graph-detected contradiction candidate',
    '  stale                Memory past review_after or older than 180 days',
    '  invalid_dependency   depends_on references a missing memory id'
  ].join('\n');
}
