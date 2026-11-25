/** Diagnostic trace explaining why a memory matched, demoted, or missed a query. */
import { getContext } from '../core/memory/context.js';
import { planLoad } from '../core/memory/load-plan.js';
import { isExpired, matchesMemoryRef, memoryKey } from '../core/memory/memory-ref.js';
import { isIgnored } from '../core/safety/ignore.js';
import { stem } from '../core/system/bm25.js';
import { meaningfulWords, today } from '../core/system/text.js';
import { DEFAULT_MAX_TOKENS, parseMaxTokens } from '../core/runtime/load-limit.js';
import { isJsonMode, jsonOk } from '../core/cli/json-output.js';
import { EngramError, ExitCode } from '../core/runtime/exit-codes.js';
import { style } from '../core/cli/format.js';
import type { MemoryEntry } from '../core/runtime/types.js';

export type WhyStatus =
  | 'expanded_body'
  | 'card'
  | 'omitted_budget'
  | 'omitted_limit'
  | 'rejected_no_anchor'
  | 'excluded_lifecycle'
  | 'not_found';

/** Explain why a memory matched, was demoted to a card, or missed a query. */
export async function cmdWhy(args: string[], flags: Record<string, any> = {}): Promise<string> {
  const rawId = (args[0] ?? '').trim();
  if (!rawId) {
    throw new EngramError('ENG_USAGE', 'why requires a memory id: engram why <memory-id> [query]', ExitCode.UsageError);
  }
  const query = args.slice(1).join(' ').trim() || 'current session';
  const cwd = typeof flags.cwd === 'string' ? flags.cwd : process.cwd();
  const ctx = await getContext(cwd);
  const budgetTokens = flags['budget-tokens'] === undefined
    ? (ctx.config.load?.max_tokens ?? DEFAULT_MAX_TOKENS)
    : parseMaxTokens(flags['budget-tokens'], '--budget-tokens');

  const queryStems = uniqueStems(query);
  const target = ctx.index.entries.find((entry) => matchesMemoryRef(entry, rawId));

  if (!target) {
    const result = {
      id: rawId,
      key: null,
      scope: null,
      type: null,
      query,
      status: 'not_found' as WhyStatus,
      rank: null,
      score: null,
      matched_stems: [] as string[],
      missing_stems: queryStems,
      budget: { max: budgetTokens, used: null },
      hint: `Memory '${rawId}' was not found in the index; run 'engram search <term>' or 'engram rebuild-index'.`
    };
    return isJsonMode(flags) ? jsonOk(result) : renderWhy(result);
  }

  const key = memoryKey(target);
  const targetStems = new Set(entryStems(target));
  const matchedStems = queryStems.filter((item) => targetStems.has(item));
  const missingStems = queryStems.filter((item) => !targetStems.has(item));

  const lifecycleReason = exclusionReason(target, ctx.ignorePatterns, today());
  if (lifecycleReason) {
    const result = {
      id: target.id,
      key,
      scope: target.scope,
      type: target.type,
      query,
      status: 'excluded_lifecycle' as WhyStatus,
      lifecycle_reason: lifecycleReason,
      rank: null,
      score: null,
      matched_stems: matchedStems,
      missing_stems: missingStems,
      budget: { max: budgetTokens, used: null },
      hint: lifecycleHint(target.id, lifecycleReason)
    };
    return isJsonMode(flags) ? jsonOk(result) : renderWhy(result);
  }

  const plan = await planLoad(ctx, query, { budgetTokens, forAgents: true });
  const routed = plan.routeDetail;
  const fused = plan.fused_rank.find((row) => row.key === key);
  const reason = routed?.reasons?.find((row) => row.key === key);
  const routedIndex = routed?.entries ? routed.entries.findIndex((entry) => memoryKey(entry) === key) : -1;
  const rank = fused?.rank ?? (routedIndex >= 0 ? routedIndex + 1 : null);
  const rawScore = fused?.score ?? reason?.score;
  const score = typeof rawScore === 'number' && Number.isFinite(rawScore) ? Math.round(rawScore * 1000) / 1000 : null;

  let status: WhyStatus;
  if (plan.payload_rows.some((row) => memoryKey(row.entry) === key)) {
    status = 'expanded_body';
  } else if (plan.card_rows.some((row) => memoryKey(row.entry) === key)) {
    status = 'card';
  } else if (plan.omitted.some((item) => item.key === key && item.reason === 'budget')) {
    status = 'omitted_budget';
  } else if (plan.omitted.some((item) => item.key === key && item.reason === 'lifecycle')) {
    status = 'excluded_lifecycle';
  } else if (
    (routed?.candidateEntries ?? []).some((entry) => memoryKey(entry) === key)
    || (routed?.relevantEntries ?? []).some((entry) => memoryKey(entry) === key)
    || plan.omitted.some((item) => item.key === key && item.reason === 'low-relevance')
  ) {
    status = 'omitted_limit';
  } else {
    status = 'rejected_no_anchor';
  }

  const budget = { max: plan.token_budget.max, used: plan.token_budget.used };
  const hint = statusHint(status, target.id, query, rank, missingStems, budget, ctx.config.load.limit);

  const result = {
    id: target.id,
    key,
    scope: target.scope,
    type: target.type,
    query,
    status,
    rank,
    score,
    matched_stems: matchedStems,
    missing_stems: missingStems,
    budget,
    hint
  };

  return isJsonMode(flags) ? jsonOk(result) : renderWhy(result);
}

function uniqueStems(text: string): string[] {
  return [...new Set([...meaningfulWords(text)].map((word) => stem(word)))];
}

function entryStems(entry: MemoryEntry): string[] {
  const combined = [
    entry.id,
    entry.summary,
    entry.directive ?? '',
    ...(entry.tags ?? []),
    ...(entry.routingTerms ?? []),
    ...(entry.appliesTo ?? [])
  ].join(' ');
  return uniqueStems(combined);
}

function exclusionReason(entry: MemoryEntry, ignorePatterns: string[], day: string): string | undefined {
  if (entry.lifecycle === 'archived') return 'archived';
  if (entry.lifecycle === 'superseded') return 'superseded';
  if (entry.ignored || isIgnored(entry.file, ignorePatterns)) return 'ignored';
  if (isExpired(entry.validUntil, day)) return 'expired';
  return undefined;
}

function lifecycleHint(id: string, reason: string): string {
  if (reason === 'expired') return `Working memory '${id}' expired; re-save it or run 'engram working prune'.`;
  if (reason === 'ignored') return `Memory '${id}' is hidden by ignore rules; inspect with 'engram ignore status'.`;
  return `Memory '${id}' is ${reason}; fetch explicitly with 'engram load --id ${id}'.`;
}

function statusHint(
  status: WhyStatus,
  id: string,
  query: string,
  rank: number | null,
  missingStems: string[],
  budget: { max: number; used: number | null },
  loadLimit: number
): string {
  switch (status) {
    case 'expanded_body':
      return `Expanded as a full body at rank #${rank ?? '?'} within the ${budget.max}-token budget.`;
    case 'card':
      return `Demoted to a one-line card at rank #${rank ?? '?'}; fetch full body with 'engram load --id ${id}' or raise --budget-tokens.`;
    case 'omitted_budget':
      return `Matched query but shed by token budget (${budget.used ?? '?'}/${budget.max}); fetch with 'engram load --id ${id}'.`;
    case 'omitted_limit':
      return `Matched query below load limit (${loadLimit}); narrow the query or fetch with 'engram load --id ${id}'.`;
    case 'excluded_lifecycle':
      return `Excluded by lifecycle policy; inspect metadata or fetch with 'engram load --id ${id}'.`;
    case 'rejected_no_anchor':
      return `No routing anchor matched '${query}' (missing stems: ${missingStems.slice(0, 5).join(', ') || 'none'}); add matching tags or terms.`;
    case 'not_found':
      return `Memory '${id}' was not found in the index.`;
  }
}

function renderWhy(result: {
  id: string;
  key: string | null;
  query: string;
  status: WhyStatus;
  lifecycle_reason?: string;
  rank: number | null;
  score: number | null;
  matched_stems: string[];
  missing_stems: string[];
  budget: { max: number; used: number | null };
  hint: string;
}): string {
  const statusText = result.lifecycle_reason ? `${result.status} (${result.lifecycle_reason})` : result.status;
  const rankText = result.rank !== null ? `#${result.rank}` : '-';
  const scoreText = result.score !== null ? String(result.score) : '-';
  const budgetText = result.budget.used !== null ? `${result.budget.used}/${result.budget.max} tokens` : `max ${result.budget.max} tokens`;
  return [
    style.heading(`Why: ${result.id}`),
    `  ${style.label('Key:')}           ${result.key ? style.value(result.key) : style.muted('-')}`,
    `  ${style.label('Query:')}         ${result.query}`,
    `  ${style.label('Status:')}        ${statusText}`,
    `  ${style.label('Rank / Score:')}  ${rankText} / ${scoreText}`,
    `  ${style.label('Matched stems:')} ${result.matched_stems.join(', ') || '-'}`,
    `  ${style.label('Missing stems:')} ${result.missing_stems.join(', ') || '-'}`,
    `  ${style.label('Budget:')}        ${budgetText}`,
    `  ${style.label('Hint:')}          ${result.hint}`
  ].join('\n');
}
