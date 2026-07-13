/** Versioned team policy schema and fail-closed validation diagnostics. */
import type { MemoryType, Scope } from '../runtime/types.js';

export type AutonomousMode = 'review_only' | 'autonomous';
export type EngramPolicy = {
  version: 1;
  autonomous_writes: {
    enabled: boolean; mode: AutonomousMode; allowed_types: MemoryType[]; allowed_scopes: Scope[];
    allowed_sources: string[]; confidence_threshold: 'low' | 'medium' | 'high'; daily_limit: number; rollback_retention_days: number;
  };
  review: { max_rule_lines: number; benchmark_min_recall_at_k: number; mandatory_metadata?: { context?: boolean; triggers?: boolean; role?: boolean } };
};
export const DEFAULT_POLICY: EngramPolicy = {
  version: 1,
  autonomous_writes: { enabled: false, mode: 'review_only', allowed_types: ['knowledge'], allowed_scopes: ['workspace'], allowed_sources: ['autosave'], confidence_threshold: 'high', daily_limit: 5, rollback_retention_days: 30 },
  review: { max_rule_lines: 100, benchmark_min_recall_at_k: 0.9, mandatory_metadata: { context: false, triggers: false, role: false } }
};
export type PolicyDiagnostic = { path: string; message: string };
export function validatePolicy(value: unknown): { policy?: EngramPolicy; diagnostics: PolicyDiagnostic[] } {
  if (!value || typeof value !== 'object') return { diagnostics: [{ path: '', message: 'policy must be an object' }] };
  const input = value as Record<string, any>; const diagnostics: PolicyDiagnostic[] = [];
  if (input.version !== 1) diagnostics.push({ path: 'version', message: 'version must be 1' });
  const auto = input.autonomous_writes;
  if (!auto || typeof auto !== 'object') diagnostics.push({ path: 'autonomous_writes', message: 'required object missing' });
  else {
    if (typeof auto.enabled !== 'boolean') diagnostics.push({ path: 'autonomous_writes.enabled', message: 'must be boolean' });
    if (!['review_only', 'autonomous'].includes(auto.mode)) diagnostics.push({ path: 'autonomous_writes.mode', message: 'must be review_only or autonomous' });
    if (!Array.isArray(auto.allowed_types)) diagnostics.push({ path: 'autonomous_writes.allowed_types', message: 'must be an array' });
    else for (const [index, value] of auto.allowed_types.entries()) if (!['rule', 'skill', 'workflow', 'knowledge'].includes(value)) diagnostics.push({ path: `autonomous_writes.allowed_types[${index}]`, message: 'must be rule, skill, workflow, or knowledge' });
    if (!Array.isArray(auto.allowed_scopes)) diagnostics.push({ path: 'autonomous_writes.allowed_scopes', message: 'must be an array' });
    else for (const [index, value] of auto.allowed_scopes.entries()) if (!['workspace', 'global'].includes(value)) diagnostics.push({ path: `autonomous_writes.allowed_scopes[${index}]`, message: 'must be workspace or global' });
    if (!Array.isArray(auto.allowed_sources)) diagnostics.push({ path: 'autonomous_writes.allowed_sources', message: 'must be an array' });
    else if (auto.allowed_sources.some((value: unknown) => typeof value !== 'string' || !value.trim())) diagnostics.push({ path: 'autonomous_writes.allowed_sources', message: 'entries must be non-empty strings' });
    if (!Number.isInteger(auto.daily_limit) || auto.daily_limit < 0) diagnostics.push({ path: 'autonomous_writes.daily_limit', message: 'must be a non-negative integer' });
    if (!Number.isInteger(auto.rollback_retention_days) || auto.rollback_retention_days < 0) diagnostics.push({ path: 'autonomous_writes.rollback_retention_days', message: 'must be a non-negative integer' });
    if (!['low', 'medium', 'high'].includes(auto.confidence_threshold)) diagnostics.push({ path: 'autonomous_writes.confidence_threshold', message: 'must be low, medium, or high' });
  }
  const review = input.review;
  if (!review || typeof review !== 'object') diagnostics.push({ path: 'review', message: 'required object missing' });
  else {
    if (!Number.isInteger(review.max_rule_lines) || review.max_rule_lines < 1) diagnostics.push({ path: 'review.max_rule_lines', message: 'must be a positive integer' });
    if (!Number.isFinite(review.benchmark_min_recall_at_k) || review.benchmark_min_recall_at_k < 0 || review.benchmark_min_recall_at_k > 1) diagnostics.push({ path: 'review.benchmark_min_recall_at_k', message: 'must be between 0 and 1' });
    if (review.mandatory_metadata !== undefined && (!review.mandatory_metadata || typeof review.mandatory_metadata !== 'object')) diagnostics.push({ path: 'review.mandatory_metadata', message: 'must be an object when provided' });
    else if (review.mandatory_metadata) for (const key of ['context', 'triggers', 'role']) if (review.mandatory_metadata[key] !== undefined && typeof review.mandatory_metadata[key] !== 'boolean') diagnostics.push({ path: `review.mandatory_metadata.${key}`, message: 'must be boolean' });
  }
  return diagnostics.length ? { diagnostics } : { policy: input as EngramPolicy, diagnostics };
}
