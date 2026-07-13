/** Pure allowlist evaluation for policy-controlled autonomous candidates. */
import type { Confidence, MemoryType, Scope } from '../runtime/types.js';
import type { EngramPolicy } from './schema.js';
export type PolicyCandidate = { type: MemoryType; scope: Scope; source: string; confidence: Confidence; text?: string; context?: string; triggers?: string[]; role?: string[] };
export type PolicyDecision = { allowed: boolean; reason: string };
export function evaluatePolicy(policy: EngramPolicy | undefined, candidate: PolicyCandidate): PolicyDecision {
  if (!policy) return { allowed: false, reason: 'policy missing: autonomous writes disabled' };
  if (!policy.autonomous_writes.enabled) return { allowed: false, reason: 'policy disabled autonomous writes' };
  if (policy.autonomous_writes.mode !== 'autonomous') return { allowed: false, reason: 'policy mode is review_only' };
  if (!policy.autonomous_writes.allowed_types.includes(candidate.type)) return { allowed: false, reason: `type not allowed: ${candidate.type}` };
  if (!policy.autonomous_writes.allowed_scopes.includes(candidate.scope)) return { allowed: false, reason: `scope not allowed: ${candidate.scope}` };
  if (!policy.autonomous_writes.allowed_sources.includes(candidate.source)) return { allowed: false, reason: `source not allowed: ${candidate.source}` };
  const confidenceRank = { low: 0, medium: 1, high: 2 } as const;
  if (confidenceRank[candidate.confidence] < confidenceRank[policy.autonomous_writes.confidence_threshold]) return { allowed: false, reason: `confidence below policy threshold: ${candidate.confidence} < ${policy.autonomous_writes.confidence_threshold}` };
  const mandatory = policy.review.mandatory_metadata ?? {};
  if (mandatory.context && !candidate.context?.trim()) return { allowed: false, reason: 'mandatory metadata missing: context' };
  if (mandatory.triggers && !candidate.triggers?.length) return { allowed: false, reason: 'mandatory metadata missing: triggers' };
  if (mandatory.role && !candidate.role?.length) return { allowed: false, reason: 'mandatory metadata missing: role' };
  if (candidate.type === 'rule' && candidate.text && candidate.text.split(/\r?\n/).length > policy.review.max_rule_lines) return { allowed: false, reason: `rule exceeds policy max_rule_lines (${policy.review.max_rule_lines})` };
  return { allowed: true, reason: 'policy allows candidate' };
}
