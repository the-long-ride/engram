/** Policy-gated autonomous candidate writes with dry-run, quota, audit, and rollback guidance. */
import { EngramError } from '../core/runtime/exit-codes.js';
import { isJsonMode, jsonOk } from '../core/cli/json-output.js';
import { loadPolicy } from '../core/policy/load.js';
import { evaluatePolicy } from '../core/policy/evaluate.js';
import { parseMemoryCandidate } from '../core/memory/memory-candidate.js';
import path from 'node:path';
import { getContext } from '../core/memory/context.js';
import { appendPolicyAudit, candidateHash, countWrittenToday, readPolicyAudit } from '../core/policy/audit.js';
import { planMemorySave } from '../core/memory/save-plan.js';
import { resolveAuthor, writeApprovedMemory } from '../core/memory/storage.js';
import { classifyTaskType } from '../core/memory/task-classifier.js';
import { stagePolicySnapshots } from '../core/policy/snapshot.js';
export async function cmdAutosave(args: string[], flags: Record<string, any> = {}): Promise<string> {
  if (!flags.policy) throw new EngramError('ENG_USAGE', 'autosave requires --policy', 2);
  const candidate = parseMemoryCandidate(args.join(' ')); const scope = flags.scope === 'global' ? 'global' : 'workspace'; const requestedPolicy = typeof flags.policy === 'string' ? flags.policy : undefined; const loaded = await loadPolicy(process.cwd(), requestedPolicy);
  const confidence = candidate.confidence ?? 'low';
  const decision = evaluatePolicy(loaded.policy, { type: candidate.type, scope, source: 'autosave', confidence, text: candidate.text, context: candidate.context, triggers: candidate.triggers, role: candidate.role });
  if (!decision.allowed || loaded.diagnostics.length) { const reason = loaded.diagnostics.length ? 'policy invalid: ' + loaded.diagnostics.map((d) => `${d.path} ${d.message}`).join('; ') : decision.reason; return isJsonMode(flags) ? jsonOk({ allowed: false, status: 'denied', reason }) : `Autosave denied: ${reason}`; }
  const ctx = await getContext();
  const root = ctx.roots[scope];
  if (!root) return isJsonMode(flags) ? jsonOk({ allowed: false, status: 'denied', reason: `scope unavailable: ${scope}` }) : `Autosave denied: scope unavailable: ${scope}`;
  const plans = await planMemorySave({
    ctx,
    text: candidate.text,
    type: candidate.type,
    scopes: [scope],
    author: await resolveAuthor(),
    role: candidate.role,
    context: candidate.context,
    triggers: candidate.triggers,
    dependsOn: candidate.dependsOn,
    level: candidate.level,
    updateId: candidate.updateId,
    variants: candidate.variants,
    confidence,
    source: { source: 'autosave' },
    taskType: classifyTaskType(candidate.text).taskType
  });
  const implicitUpdate = plans.some((plan) => plan.action === 'update' && !candidate.updateId);
  const possibleDuplicate = plans.some((plan) => (plan.related ?? []).some((hint) => hint.action === 'possible-duplicate') && !candidate.updateId);
  if (implicitUpdate || possibleDuplicate) {
    const reason = 'deferred: autonomous writes require an explicit UPDATE target for related or duplicate memories';
    return isJsonMode(flags) ? jsonOk({ allowed: true, status: 'deferred', reason, related_ids: plans.flatMap((plan) => (plan.related ?? []).map((hint) => hint.id)) }) : `Autosave deferred: ${reason}`;
  }
  const audit = await readPolicyAudit(root);
  const used = countWrittenToday(audit);
  const dailyLimit = loaded.policy?.autonomous_writes.daily_limit ?? 0;
  if (used >= dailyLimit) {
    const reason = `daily policy quota exhausted (${used}/${dailyLimit})`;
    return isJsonMode(flags) ? jsonOk({ allowed: false, status: 'denied', reason, quota: { used, limit: dailyLimit } }) : `Autosave denied: ${reason}`;
  }
  if (flags['dry-run']) return isJsonMode(flags) ? jsonOk({ allowed: true, status: 'dry-run', candidate: { type: candidate.type, scope }, quota: { used, limit: dailyLimit } }) : `Autosave allowed (dry-run): ${candidate.type} ${scope} (${used}/${dailyLimit} used)`;
  const timestamp = new Date().toISOString();
  const id = `autosave-${timestamp.replace(/\D/g, '').slice(0, 17)}-${candidateHash(candidate.text).slice(0, 12)}`;
  await stagePolicySnapshots(root, id, plans);
  const written: string[] = [];
  for (const plan of plans) written.push(await writeApprovedMemory({ cwd: process.cwd(), scope: plan.scope, file: plan.file, content: plan.content, message: plan.message }));
  const result = `Saved -> ${written.join(', ')}`;
  const files = written.map((item) => path.relative(root, item).replace(/\\/g, '/'));
  await appendPolicyAudit(root, {
    id, timestamp, status: 'written', scope, type: candidate.type, candidate_hash: candidateHash(candidate.text), output_files: files,
    reason: 'policy-approved autonomous write', rollback_until: new Date(Date.now() + (loaded.policy?.autonomous_writes.rollback_retention_days ?? 0) * 86400000).toISOString(),
    actions: plans.map((plan) => ({ file: plan.file, action: plan.action }))
  });
  const payload = { allowed: true, status: 'written', audit_id: id, rollback: `engram policy rollback ${id}`, result };
  return isJsonMode(flags) ? jsonOk(payload) : `${result}\nAudit: ${id}\nRollback: engram policy rollback ${id}`;
}
