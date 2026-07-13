/** Load and initialize repository-local versioned autonomous-write policy. */
import path from 'node:path';
import { exists, inside, readJson, writeJson } from '../system/fsx.js';
import { DEFAULT_POLICY, validatePolicy, type EngramPolicy, type PolicyDiagnostic } from './schema.js';
export function policyPath(cwd = process.cwd(), requested?: string): string { return requested ? inside(cwd, requested) : path.join(cwd, '.agents', 'engram.policy.json'); }
export async function loadPolicy(cwd = process.cwd(), requested?: string): Promise<{ path: string; exists: boolean; policy?: EngramPolicy; diagnostics: PolicyDiagnostic[] }> {
  const file = policyPath(cwd, requested); if (!(await exists(file))) return { path: file, exists: false, diagnostics: [] };
  const result = validatePolicy(await readJson<unknown>(file, undefined)); return { path: file, exists: true, policy: result.policy, diagnostics: result.diagnostics };
}
export async function writeDefaultPolicy(cwd = process.cwd(), requested?: string): Promise<string> { const file = policyPath(cwd, requested); await writeJson(file, DEFAULT_POLICY); return file; }
