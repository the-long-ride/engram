/** Inspect, validate, audit, initialize, and roll back local autonomous-write policy. */
import { EngramError } from '../core/runtime/exit-codes.js';
import { isJsonMode, jsonOk } from '../core/cli/json-output.js';
import { fail, serializeResult } from '../core/contracts/result.js';
import { loadPolicy, writeDefaultPolicy } from '../core/policy/load.js';
import { rollbackPolicyAudit } from '../core/policy/rollback.js';
import { getContext } from '../core/memory/context.js';
import { readPolicyAudit } from '../core/policy/audit.js';
export async function cmdPolicy(args: string[], flags: Record<string, any> = {}): Promise<string> {
  const cwd = typeof flags.cwd === 'string' ? flags.cwd : process.cwd();
  const action = (args[0] ?? 'show').toLowerCase(); const requestedPolicy = typeof flags.policy === 'string' ? flags.policy : undefined; const loaded = await loadPolicy(cwd, requestedPolicy);
  if (action === 'init') { if (loaded.exists) throw new EngramError('ENG_USAGE', `policy already exists: ${loaded.path}`, 2); const file = await writeDefaultPolicy(cwd, requestedPolicy); return isJsonMode(flags) ? jsonOk({ initialized: true, path: file }) : `Policy initialized -> ${file}`; }
  if (action === 'validate') {
    const valid = loaded.exists && loaded.diagnostics.length === 0;
    if (!loaded.exists) {
      const message = `Policy not configured: ${loaded.path}`;
      if (flags.strict === true) {
        const output = isJsonMode(flags) ? serializeResult(fail('ENG_POLICY', message, [{ id: 'policy.missing', severity: 'error', message, remediation: 'engram policy init' }])) : undefined;
        throw new EngramError('ENG_POLICY', message, 5, output);
      }
      return isJsonMode(flags) ? jsonOk({ valid: false, exists: false, path: loaded.path, diagnostics: [] }) : message;
    }
    if (!valid) {
      const message = [`Policy invalid: ${loaded.path}`, ...loaded.diagnostics.map((d) => `- ${d.path}: ${d.message}`)].join('\n');
      const output = isJsonMode(flags) ? serializeResult(fail('ENG_POLICY', message, loaded.diagnostics.map((d) => ({ id: `policy.${d.path}`, severity: 'error' as const, message: d.message })))) : undefined;
      throw new EngramError('ENG_POLICY', message, 5, output);
    }
    return isJsonMode(flags) ? jsonOk({ valid: true, exists: true, path: loaded.path, diagnostics: [] }) : `Policy valid: ${loaded.path}`;
  }
  if (action === 'show') return isJsonMode(flags) ? jsonOk({ exists: loaded.exists, path: loaded.path, policy: loaded.policy ?? null, diagnostics: loaded.diagnostics }) : JSON.stringify(loaded.policy ?? { enabled: false, reason: 'policy missing' }, null, 2);
  if (action === 'rollback') {
    const id = args[1];
    if (!id) throw new EngramError('ENG_USAGE', 'policy rollback requires an audit id', 2);
    const result = await rollbackPolicyAudit(id, cwd);
    return isJsonMode(flags) ? jsonOk({ rolled_back: result.id, archived: result.archived.map((file) => file.replace(/\\/g, '/')), restored: result.restored.map((file) => file.replace(/\\/g, '/')) }) : `Rolled back ${result.id}\nArchived -> ${result.archived.join(', ')}\nRestored -> ${result.restored.join(', ')}`;
  }
  if (action === 'audit') {
    const ctx = await getContext(cwd);
    const records = (['workspace', 'global'] as const).flatMap((scope) => ctx.roots[scope] ? [{ scope, root: ctx.roots[scope] }] : []);
    const rows = (await Promise.all(records.map(async ({ scope, root }) => (await readPolicyAudit(root)).map((record) => ({
      id: record.id, timestamp: record.timestamp, status: record.status, scope, type: record.type,
      candidate_hash: record.candidate_hash, output_files: record.output_files, reason: record.reason, rollback_until: record.rollback_until
    }))))).flat();
    rows.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    return isJsonMode(flags) ? jsonOk({ records: rows, total: rows.length }) : rows.length ? rows.map((row) => `${row.status} ${row.id} [${row.scope}] ${row.type} -> ${row.output_files.join(', ')}`).join('\n') : 'No policy audit records.';
  }
  throw new EngramError('ENG_USAGE', `policy: unknown action '${action}'. Try: init, show, validate.`, 2);
}
