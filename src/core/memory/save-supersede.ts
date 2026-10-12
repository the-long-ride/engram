/** Applies an approved SUPERSEDE verdict: retires the replaced memory through the approved-write path. */
import { entryPath, getContext } from './context.js';
import { readText } from '../system/fsx.js';
import { isWorkingPath } from '../runtime/constants.js';
import { writeApprovedMemory } from './storage.js';
import { patchReviewedMemory } from '../review/actions.js';
import type { SavePlan } from './save-plan.js';

/**
 * Call after the new memories were written: each SUPERSEDE plan marks its target `lifecycle: superseded` with
 * `superseded_by`. Only an approved preview may call this, never a `--force` or autosave path. Returns one line per plan.
 */
export async function applyApprovedSupersedes(cwd: string, plans: SavePlan[]): Promise<string[]> {
  const lines: string[] = [];
  for (const plan of plans) {
    if (plan.verdict.kind === 'SUPERSEDE' && plan.verdict.target) lines.push(await supersedeApproved(cwd, plan, plan.verdict.target));
  }
  return lines;
}

/** Same scope and tier as the new memory are guaranteed by the verdict rule; `writeApprovedMemory` rehashes, reindexes and commits global Git. */
async function supersedeApproved(cwd: string, plan: SavePlan, targetId: string): Promise<string> {
  const ctx = await getContext(cwd);
  const old = ctx.scopeIndexes[plan.scope].entries.find((entry) => entry.id === targetId && entry.scope === plan.scope && isWorkingPath(entry.file) === isWorkingPath(plan.file));
  if (!old || old.lifecycle === 'superseded') return `Supersede skipped: ${targetId} not active in ${plan.scope}`;
  const raw = await readText(entryPath(ctx, plan.scope, old.file));
  const content = patchReviewedMemory(raw, { lifecycle: 'superseded', superseded_by: plan.id });
  await writeApprovedMemory({ cwd, scope: plan.scope, file: old.file, content, message: `supersede ${old.id} -> ${plan.id}` });
  return `Superseded ${old.id} -> ${plan.id}`;
}
