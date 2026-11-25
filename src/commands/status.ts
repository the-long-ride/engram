/** Unified one-screen workspace and memory status dashboard. */
import { getContext } from '../core/memory/context.js';
import { visibleEntries } from '../core/memory/routing.js';
import { isWorkingPath } from '../core/runtime/constants.js';
import { isExpired } from '../core/memory/memory-ref.js';
import { today } from '../core/system/text.js';
import { deriveFindings, type ReviewFinding } from '../core/review/findings.js';
import { applyPersistedStatus, loadReviewStore } from '../core/review/records.js';
import { listReceipts } from '../core/review/inbox.js';
import { readStale } from '../core/memory/freshness.js';
import { noisyMemories, readUsage } from '../core/memory/usage.js';
import { detectInstalledHookTargets } from '../core/integrations/agent-hooks.js';
import { isJsonMode, jsonOk } from '../core/cli/json-output.js';
import { style } from '../core/cli/format.js';
import type { InboxReceipt, Scope } from '../core/runtime/types.js';

/** Render a unified one-screen workspace and memory status dashboard. */
export async function cmdStatus(flags: Record<string, any> = {}): Promise<string> {
  const cwd = typeof flags.cwd === 'string' ? flags.cwd : process.cwd();
  const ctx = await getContext(cwd);
  const entries = visibleEntries(ctx.index.entries, ctx.config, false, ctx.ignorePatterns);
  const day = today();

  const durable = entries.filter((entry) => !isWorkingPath(entry.file));
  const working = entries.filter((entry) => isWorkingPath(entry.file));
  const workingActive = working.filter((entry) => !isExpired(entry.validUntil, day));
  const workingExpired = working.filter((entry) => isExpired(entry.validUntil, day));

  const derived = deriveFindings(entries, ctx.graph);
  const mergedFindings: ReviewFinding[] = [];
  const activeReceipts: InboxReceipt[] = [];
  for (const scope of ['workspace', 'global'] as Scope[]) {
    const root = ctx.roots[scope];
    if (!root) continue;
    const store = await loadReviewStore(root);
    mergedFindings.push(...applyPersistedStatus(derived.filter((f) => f.scope === scope), store));
    activeReceipts.push(...await listReceipts(root));
  }
  const pendingFindings = mergedFindings.filter((f) => f.status === 'pending');
  const sessionLearningReceipts = activeReceipts.filter((r) => r.source === 'session-learning').length;

  const staleMap = await readStale(ctx.roots.workspace);
  const staleKeys = Object.keys(staleMap).sort();

  const usage = ctx.roots.workspace ? await readUsage(ctx.roots.workspace) : {};
  const noisy = noisyMemories(usage);

  const workspaceHooks = await detectInstalledHookTargets({ cwd, includeStale: true });
  const globalHooks = await detectInstalledHookTargets({ global: true, includeStale: true });
  const linkedHooks = [...new Set([...workspaceHooks, ...globalHooks])];

  const next: string[] = [];
  if (activeReceipts.length > 0) {
    next.push(`engram review triage  (${activeReceipts.length} pending inbox ${activeReceipts.length === 1 ? 'receipt' : 'receipts'})`);
  }
  if (pendingFindings.length > 0) {
    next.push(`engram review list  (${pendingFindings.length} pending ${pendingFindings.length === 1 ? 'finding' : 'findings'})`);
  }
  if (workingExpired.length > 0) {
    next.push(`engram working prune  (${workingExpired.length} expired working ${workingExpired.length === 1 ? 'memory' : 'memories'})`);
  }
  if (staleKeys.length > 0) {
    next.push(`engram take-control --refresh  (${staleKeys.length} stale source ${staleKeys.length === 1 ? 'memory' : 'memories'})`);
  }
  if (noisy.length > 0) {
    next.push(`engram stats --usage  (${noisy.length} noisy ${noisy.length === 1 ? 'memory' : 'memories'})`);
  }
  if (linkedHooks.length === 0) {
    next.push('engram link all  (no agent hooks linked)');
  }

  const durableWorkspace = durable.filter((entry) => entry.scope === 'workspace').length;
  const durableGlobal = durable.filter((entry) => entry.scope === 'global').length;

  const data = {
    profile: {
      active: ctx.profile.active || null,
      source: ctx.profile.source,
      scope: ctx.config.scope
    },
    memories: {
      durable: {
        total: durable.length,
        workspace: durableWorkspace,
        global: durableGlobal
      },
      working: {
        active: workingActive.length,
        expired: workingExpired.length
      },
      hidden: ctx.hiddenCount
    },
    review: {
      pending_findings: pendingFindings.length,
      inbox_receipts: activeReceipts.length,
      session_learning_receipts: sessionLearningReceipts
    },
    health: {
      stale_sources: staleKeys.length,
      stale_keys: staleKeys,
      noisy_memories: noisy.length,
      noisy_keys: noisy.map((item) => item.key)
    },
    hooks: {
      workspace: workspaceHooks,
      global: globalHooks,
      linked: linkedHooks
    },
    next
  };

  if (isJsonMode(flags)) return jsonOk(data);

  const profileLabel = ctx.profile.active
    ? `${ctx.profile.active} (${ctx.profile.source}, scope: ${ctx.config.scope})`
    : `default (scope: ${ctx.config.scope})`;
  const receiptSuffix = sessionLearningReceipts > 0 ? `, ${sessionLearningReceipts} session-learning` : '';
  const hookLabel = linkedHooks.length ? linkedHooks.join(', ') : 'none';

  const lines = [
    style.heading('Engram status'),
    `  ${style.label('Profile:')}  ${style.value(profileLabel)}`,
    `  ${style.label('Memories:')} ${style.number(String(durable.length))} durable (${durableWorkspace} workspace, ${durableGlobal} global) | ${style.number(String(workingActive.length))} working active, ${style.number(String(workingExpired.length))} expired${ctx.hiddenCount ? ` | ${ctx.hiddenCount} hidden` : ''}`,
    `  ${style.label('Review:')}   ${style.number(String(pendingFindings.length))} pending findings | ${style.number(String(activeReceipts.length))} inbox receipts${receiptSuffix}`,
    `  ${style.label('Health:')}   ${style.number(String(staleKeys.length))} stale sources | ${style.number(String(noisy.length))} noisy memories`,
    `  ${style.label('Hooks:')}    ${linkedHooks.length ? style.value(hookLabel) : style.muted(hookLabel)}`
  ];

  if (next.length > 0) {
    lines.push('', style.title('Next:'));
    for (const item of next) lines.push(`  ${item}`);
  }

  return lines.join('\n');
}
