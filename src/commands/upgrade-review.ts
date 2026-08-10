/** Interactive, resumable review of upgrade conflicts shared with Web semantics. */
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import type { EngramConfig } from '../core/runtime/types.js';
import { launchEditor, resolveEditorCommand } from '../core/system/editor.js';
import { getConflictProposal, validateConflictProposal } from '../core/upgrade/proposals.js';
import { loadUpgradeReview, saveUpgradeResolution } from '../core/upgrade/review-store.js';
import type { UpgradePlan, UpgradeReviewSummary } from '../core/upgrade/types.js';

export type UpgradeReviewRun = { review: UpgradeReviewSummary; applyNow: boolean; summary: string };

export async function reviewUpgradeConflicts(cwd: string, config: EngramConfig, plan: UpgradePlan): Promise<UpgradeReviewRun> {
  let review = await loadUpgradeReview(plan);
  if (!review.reviewableCount) return { review, applyNow: false, summary: 'No conflicts require review.' };
  output.write(`\nConfiguration upgrade review\n${'─'.repeat(28)}\nAutomatic updates: ${plan.items.filter((item) => item.status === 'outdated').length}\nNeeds review:       ${review.pendingReviewCount}\n`);
  const interactive = Boolean(input.isTTY && output.isTTY);
  const rl = interactive ? createInterface({ input, output }) : undefined;
  const pipedAnswers = interactive ? [] : await readPipedAnswers();
  const ask = async (prompt: string) => {
    if (rl) return rl.question(prompt);
    output.write(prompt);
    return pipedAnswers.shift() ?? '';
  };
  try {
    for (;;) {
      const pending = plan.items.find((item) => {
        if (item.status !== 'conflict' && item.status !== 'invalid') return false;
        return review.items.find((row) => row.itemId === item.id)?.state === 'pending';
      });
      if (!pending) break;
      const proposal = await getConflictProposal(cwd, config, plan, pending.id);
      output.write(`\n[${review.reviewedCount + 1}/${review.reviewableCount}] ${pending.kind} · ${pending.agent ?? pending.scope}\n${pending.file}\nStatus: ${pending.reason}\n`);
      output.write(proposal.replaceable ? '\n[V] View diff\n[E] Edit proposed content\n[L] Accept latest proposal\n[K] Keep current\n[Q] Save and quit\n' : '\n[V] View current/diff\n[K] Keep current\n[Q] Save and quit\n');
      const choice = (await ask('Choice: ')).trim().toLowerCase();
      if (choice === 'q') return { review, applyNow: false, summary: formatReviewSummary(review, false) };
      if (choice === 'v') { output.write(`\n${proposal.diff}\n`); continue; }
      if (choice === 'k') {
        review = await saveUpgradeResolution(plan, { itemId: pending.id, state: 'keep-current', sourceHash: proposal.sourceHash, updatedAt: new Date().toISOString() });
        continue;
      }
      if (choice === 'l') {
        if (!proposal.replaceable) { output.write('No safe generated replacement is available; choose Keep current.\n'); continue; }
        review = await saveUpgradeResolution(plan, { itemId: pending.id, state: 'accept-latest', sourceHash: proposal.sourceHash, proposedContent: proposal.proposed, updatedAt: new Date().toISOString() });
        continue;
      }
      if (choice === 'e') {
        if (!proposal.replaceable) { output.write('This artifact cannot be edited as a generated replacement; choose Keep current.\n'); continue; }
        const edited = await editProposal(pending.file, proposal.proposed);
        const validation = validateConflictProposal(proposal, edited);
        if (!validation.valid) { output.write(`${validation.error ?? 'Edited proposal is invalid.'}\n`); continue; }
        review = await saveUpgradeResolution(plan, { itemId: pending.id, state: 'edited', sourceHash: proposal.sourceHash, proposedContent: edited, updatedAt: new Date().toISOString() });
        continue;
      }
      output.write('Choose V, E, L, K, or Q.\n');
    }
    const summary = formatReviewSummary(review, true);
    output.write(`\n${summary}\n`);
    const answer = (await ask('Apply upgrade now? [y/N] ')).trim();
    return { review, applyNow: /^y(es)?$/i.test(answer), summary };
  } finally {
    rl?.close();
  }
}


async function readPipedAnswers(): Promise<string[]> {
  let text = '';
  for await (const chunk of input) text += String(chunk);
  return text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

export async function confirmReviewedUpgrade(review: UpgradeReviewSummary, yes: boolean): Promise<boolean> {
  if (review.pendingReviewCount > 0 || review.staleCount > 0) return false;
  if (!review.reviewableCount || yes) return true;
  if (!input.isTTY || !output.isTTY) throw new Error('Reviewed conflicts are ready. Re-run with --yes to apply them non-interactively.');
  const rl = createInterface({ input, output });
  try {
    const answer = (await rl.question('All conflicts are reviewed. Apply upgrade? [y/N] ')).trim();
    return /^y(es)?$/i.test(answer);
  } finally {
    rl.close();
  }
}

function formatReviewSummary(review: UpgradeReviewSummary, complete: boolean): string {
  const latest = review.items.filter((item) => item.state === 'accept-latest').length;
  const edited = review.items.filter((item) => item.state === 'edited').length;
  const force = review.items.filter((item) => item.state === 'force-latest').length;
  const keep = review.items.filter((item) => item.state === 'keep-current').length;
  return [complete ? 'Review complete' : 'Review saved', '────────────────────────────', `Accept latest:    ${latest}`, `Edited proposals: ${edited}`, `Force latest:     ${force}`, `Keep current:     ${keep}`, `Pending:          ${review.pendingReviewCount}`].join('\n');
}

async function editProposal(sourceFile: string, content: string): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'engram-upgrade-review-'));
  const extension = path.extname(sourceFile);
  const file = path.join(dir, `proposal${extension || '.txt'}`);
  try {
    await fs.writeFile(file, content, { mode: 0o600 });
    const editor = resolveEditorCommand({ web: false });
    await launchEditor(editor, file, { wait: true, stdio: 'inherit' });
    return await fs.readFile(file, 'utf8');
  } finally {
    await fs.rm(dir, { recursive: true, force: true }).catch(() => undefined);
  }
}
