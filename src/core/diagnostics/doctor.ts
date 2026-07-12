/** Doctor: composed diagnostics for config resolution, root existence, hash integrity,
 *  invalid file detection, index/graph status, and host executable detection.
 *  Does NOT verify index/graph/vector freshness, policy validity, or MCP/hook installation
 *  — those checks arrive in later milestones. */
import type { EngramContext } from '../memory/context.js';
import { verifyRoot } from '../safety/hash.js';
import { invalidMemoryFiles } from '../memory/index.js';
import { detectInstalledAgents } from '../integrations/agent-detect.js';
import { detectLinkedWorkspaceTargets } from '../integrations/skillset.js';
import { exists } from '../system/fsx.js';
import path from 'node:path';
import type { Scope } from '../runtime/types.js';
import type { Diagnostic } from '../contracts/result.js';

export type DoctorCheck = {
  id: string;
  scope: 'workspace' | 'global' | 'host' | 'policy' | 'system';
  status: 'pass' | 'warn' | 'fail' | 'skip';
  severity: 'info' | 'warning' | 'error';
  message: string;
  remediation?: string;
  metadata?: Record<string, string | number | boolean>;
};

export type DoctorResult = {
  checks: DoctorCheck[];
  passed: number;
  warned: number;
  failed: number;
  skipped: number;
};

/** Run all doctor checks and return structured results. */
export async function runDoctor(ctx: EngramContext, scope: 'workspace' | 'global' | 'all' = 'all'): Promise<DoctorResult> {
  const scopes: Scope[] = scope === 'all' ? ['workspace', 'global'] : [scope];
  const checks: DoctorCheck[] = [];

  checks.push(...checkConfig(ctx));
  for (const s of scopes) checks.push(...await checkRoot(ctx, s));
  for (const s of scopes) checks.push(...await checkHashes(ctx, s));
  for (const s of scopes) checks.push(...await checkInvalidFiles(ctx, s));
  checks.push(...checkIndexFreshness(ctx));
  checks.push(...await checkHostAdapters(ctx));

  return summarize(checks);
}

function checkConfig(ctx: EngramContext): DoctorCheck[] {
  const checks: DoctorCheck[] = [];
  checks.push({
    id: 'config.resolved',
    scope: 'system',
    status: 'pass',
    severity: 'info',
    message: `Config resolved (scope: ${ctx.config.scope}, read: ${ctx.config.read})`,
    metadata: { scope: ctx.config.scope, read: ctx.config.read, graph_enabled: ctx.config.graph.enabled }
  });
  if (ctx.profile.active) {
    checks.push({
      id: 'config.profile',
      scope: 'system',
      status: 'pass',
      severity: 'info',
      message: `Active profile: ${ctx.profile.active}`,
      metadata: { profile: ctx.profile.active }
    });
  } else {
    checks.push({
      id: 'config.profile',
      scope: 'system',
      status: 'skip',
      severity: 'info',
      message: 'No active profile (profiles are optional for workspace-only or single-global setups)'
    });
  }
  return checks;
}

async function checkRoot(ctx: EngramContext, scope: Scope): Promise<DoctorCheck[]> {
  const root = ctx.roots[scope];
  if (!root) {
    return [{
      id: `root.${scope}`,
      scope,
      status: 'skip',
      severity: 'info',
      message: `${scope} memory root not configured`,
      remediation: scope === 'global' ? 'engram inject --global-path <path>' : 'engram inject'
    }];
  }
  if (!(await exists(root))) {
    return [{
      id: `root.${scope}`,
      scope,
      status: 'fail',
      severity: 'error',
      message: `${scope} memory root does not exist: ${root}`,
      remediation: 'engram inject'
    }];
  }
  const entryCount = ctx.scopeIndexes[scope]?.entries.length ?? 0;
  return [{
    id: `root.${scope}`,
    scope,
    status: 'pass',
    severity: 'info',
    message: `${scope} memory root configured (${entryCount} entries)`,
    metadata: { entries: entryCount }
  }];
}

async function checkHashes(ctx: EngramContext, scope: Scope): Promise<DoctorCheck[]> {
  const root = ctx.roots[scope];
  if (!root) return [];
  const rows = await verifyRoot(root, scope);
  const mismatches = rows.filter((row) => !row.ok);
  if (mismatches.length) {
    return mismatches.map((row) => ({
      id: 'hash.mismatch',
      scope,
      status: 'fail' as const,
      severity: 'error' as const,
      message: `Hash mismatch: ${scope}:${row.file}`,
      remediation: `engram rehash ${scope}`
    }));
  }
  return [{
    id: `hash.${scope}`,
    scope,
    status: 'pass',
    severity: 'info',
    message: `All ${rows.length} ${scope} hashes valid`,
    metadata: { files: rows.length }
  }];
}

async function checkInvalidFiles(ctx: EngramContext, scope: Scope): Promise<DoctorCheck[]> {
  const root = ctx.roots[scope];
  if (!root) return [];
  const invalid = await invalidMemoryFiles(root, scope);
  if (invalid.length) {
    return invalid.map((item) => ({
      id: 'memory.invalid',
      scope,
      status: 'warn' as const,
      severity: 'warning' as const,
      message: `Invalid memory file: ${item.scope}:${item.file} (${item.error})`,
      remediation: 'Fix the file or run engram repair for details'
    }));
  }
  return [];
}

function checkIndexFreshness(ctx: EngramContext): DoctorCheck[] {
  const checks: DoctorCheck[] = [];
  checks.push({
    id: 'index.entries',
    scope: 'system',
    status: 'pass',
    severity: 'info',
    message: `Index has ${ctx.index.entries.length} entries (${ctx.hiddenCount} hidden)`,
    metadata: { total: ctx.index.entries.length, hidden: ctx.hiddenCount }
  });
  const depEdges = ctx.graph.edges.filter((e) => e.kind === 'depends_on');
  checks.push({
    id: 'index.graph',
    scope: 'system',
    status: depEdges.length ? 'pass' : 'skip',
    severity: 'info',
    message: depEdges.length ? `Graph has ${depEdges.length} dependency edges` : 'Graph has no dependency edges (no depends_on declared)',
    remediation: depEdges.length ? undefined : 'Add depends_on frontmatter to link related memories'
  });
  return checks;
}

async function checkHostAdapters(ctx: EngramContext): Promise<DoctorCheck[]> {
  const checks: DoctorCheck[] = [];
  const agents = detectInstalledAgents();
  if (!agents.size) {
    checks.push({
      id: 'host.executables',
      scope: 'host',
      status: 'skip',
      severity: 'info',
      message: 'No AI agent executables detected on this machine',
      remediation: 'Install an agent (Codex, Claude, Cursor, etc.) then run engram link <agent>'
    });
  } else {
    checks.push({
      id: 'host.executables',
      scope: 'host',
      status: 'pass',
      severity: 'info',
      message: `Host executables detected: ${[...agents].join(', ')}`,
      metadata: { count: agents.size }
    });
  }
  const linked = await detectLinkedWorkspaceTargets(ctx.cwd);
  if (linked.length) {
    checks.push({
      id: 'host.engram_linkage',
      scope: 'host',
      status: 'pass',
      severity: 'info',
      message: `Engram skillset linked for: ${linked.join(', ')}`,
      metadata: { targets: linked.length }
    });
  } else {
    checks.push({
      id: 'host.engram_linkage',
      scope: 'host',
      status: 'skip',
      severity: 'info',
      message: 'No Engram skillset linkage detected in this workspace',
      remediation: 'engram link <agent>'
    });
  }
  return checks;
}

function summarize(checks: DoctorCheck[]): DoctorResult {
  return {
    checks,
    passed: checks.filter((c) => c.status === 'pass').length,
    warned: checks.filter((c) => c.status === 'warn').length,
    failed: checks.filter((c) => c.status === 'fail').length,
    skipped: checks.filter((c) => c.status === 'skip').length,
  };
}

/** Convert DoctorResult to Diagnostics for contract envelopes. */
export function doctorDiagnostics(result: DoctorResult): Diagnostic[] {
  return result.checks
    .filter((c) => c.status === 'fail' || c.status === 'warn')
    .map((c) => ({
      id: c.id,
      severity: c.severity,
      message: c.message,
      ...(c.remediation ? { remediation: c.remediation } : {})
    }));
}
