/** Archive-based rollback for policy-approved autonomous write receipts. */
import { getContext } from '../memory/context.js';
import { archiveMemory, planArchiveSet } from '../memory/archive.js';
import { appendPolicyAudit, latestAuditRecord, readPolicyAudit } from './audit.js';
import { purgePolicySnapshots, readPolicySnapshot } from './snapshot.js';
import { writeApprovedMemory } from '../memory/storage.js';

export async function rollbackPolicyAudit(id: string, cwd = process.cwd()): Promise<{ id: string; archived: string[]; restored: string[] }> {
  const ctx = await getContext(cwd, { rebuild: true });
  const sources = (['workspace', 'global'] as const).flatMap((scope) => ctx.roots[scope] ? [{ scope, root: ctx.roots[scope] }] : []);
  for (const source of sources) {
    const record = latestAuditRecord(await readPolicyAudit(source.root), id);
    if (!record || record.status !== 'written') continue;
    if (record.rollback_until && Date.parse(record.rollback_until) < Date.now()) throw new Error(`policy audit rollback expired: ${id}`);
    const archived: string[] = [];
    const restored: string[] = [];
    const actions = record.actions ?? record.output_files.map((file) => ({ file, action: 'add' as const }));
    for (const action of actions) {
      if (action.action === 'update') {
        const before = await readPolicySnapshot(source.root, id, action.file);
        if (before === undefined) throw new Error(`policy rollback snapshot missing: ${action.file}`);
        restored.push(await writeApprovedMemory({ cwd, scope: record.scope, file: action.file, content: before, message: `rollback autonomous update: ${action.file}` }));
        continue;
      }
      const plans = planArchiveSet(ctx, `${record.scope}:${action.file}`, `policy rollback ${id}`);
      for (const plan of plans) archived.push(await archiveMemory(ctx, plan, `policy rollback ${id}`));
    }
    await purgePolicySnapshots(source.root, id);
    await appendPolicyAudit(source.root, { ...record, status: 'rolled_back', timestamp: new Date().toISOString(), reason: `rolled back ${id}`, output_files: record.output_files });
    return { id, archived, restored };
  }
  throw new Error(`policy audit not found or already rolled back: ${id}`);
}
