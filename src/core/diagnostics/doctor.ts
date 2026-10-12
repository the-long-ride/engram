/** Doctor: per-scope composed diagnostics for config, roots, hash integrity, invalid files, index/graph status, policy, and host executables. */
import path from 'node:path';
import type { EngramContext } from '../memory/context.js';
import { verifyRoot } from '../safety/hash.js';
import { committedWorkingRefs, invalidMemoryFiles, staleWorkingEntries } from '../memory/index.js';
import { scanWorkingFiles } from '../memory/working-tier.js';
import { strayBackups } from '../memory/backups.js';
import { detectInstalledAgents } from '../integrations/agent-detect.js';
import { detectLinkedWorkspaceTargets } from '../integrations/skillset.js';
import { globalAgentHome } from '../integrations/agent-paths.js';
import { CHAIN_WARN_RATIO, codexAgentsChain, codexDocMaxBytes, codexHome } from './agents-chain.js';
import { exists, readJson } from '../system/fsx.js';
import { validateGeneratedSkills } from './skill-files.js';
import type { Scope } from '../runtime/types.js';
import type { Diagnostic } from '../contracts/result.js';
import { loadPolicy } from '../policy/load.js';
import { ensureVectorIndex } from '../memory/vector-db.js';

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
  checks.push(await checkPolicy());
  for (const s of scopes) checks.push(...await checkRoot(ctx, s));
  for (const s of scopes) checks.push(...await checkHashes(ctx, s));
  for (const s of scopes) checks.push(...await checkInvalidFiles(ctx, s));
  for (const s of scopes) checks.push(...await checkStrayBackups(ctx, s));
  for (const s of scopes) checks.push(...checkIndexFreshness(ctx, s));
  for (const s of scopes) checks.push(...await checkWorkingTier(ctx, s));
  for (const s of scopes) checks.push(await checkVectorFreshness(ctx, s));
  checks.push(...await checkHostAdapters(ctx));

  return summarize(checks);
}

async function checkPolicy(): Promise<DoctorCheck> {
  const loaded = await loadPolicy();
  if (!loaded.exists) return { id: 'policy.configured', scope: 'policy', status: 'skip', severity: 'info', message: 'No policy configured; autonomous writes remain disabled', remediation: 'engram policy init' };
  if (loaded.diagnostics.length) return { id: 'policy.invalid', scope: 'policy', status: 'warn', severity: 'warning', message: `Policy invalid (${loaded.diagnostics.length} diagnostic${loaded.diagnostics.length === 1 ? '' : 's'})`, remediation: 'engram policy validate --json' };
  return { id: 'policy.valid', scope: 'policy', status: 'pass', severity: 'info', message: 'Local policy is valid' };
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

async function checkStrayBackups(ctx: EngramContext, scope: Scope): Promise<DoctorCheck[]> {
  const root = ctx.roots[scope];
  if (!root || !(await exists(root))) return [];
  const stray = await strayBackups(root);
  if (!stray.length) return [];
  return [{
    id: 'memory.stray_backups',
    scope,
    status: 'warn',
    severity: 'warning',
    message: `${stray.length} backup file(s) beside ${scope} memories (rules|skills|knowledge)`,
    remediation: `engram repair ${scope} --move-backups --confirm`,
    metadata: { count: stray.length }
  }];
}

function checkIndexFreshness(ctx: EngramContext, scope: Scope): DoctorCheck[] {
  const checks: DoctorCheck[] = [];
  const scopeIndex = ctx.scopeIndexes[scope];
  const scopeEntries = scopeIndex.entries.length;
  const scopeHidden = scopeIndex.entries.filter((entry) => entry.ignored).length;
  const hasRoot = Boolean(ctx.roots[scope]);
  checks.push({
    id: `index.entries.${scope}`,
    scope,
    status: scopeEntries > 0 ? 'pass' : 'skip',
    severity: 'info',
    message: scopeEntries > 0
      ? `${scope} index has ${scopeEntries} entries (${scopeHidden} hidden)`
      : `${scope} index empty${hasRoot ? '' : ' (root not configured)'}`,
    ...(scopeEntries > 0 ? { metadata: { total: scopeEntries, hidden: scopeHidden } } : {})
  });
  const depEdgesForScope = ctx.graph.edges.filter((e) => e.kind === 'depends_on' &&
    (e.from.includes(`:${scope}:`) || e.to.includes(`:${scope}:`)));
  checks.push({
    id: `index.graph.${scope}`,
    scope,
    status: depEdgesForScope.length ? 'pass' : 'skip',
    severity: 'info',
    message: depEdgesForScope.length
      ? `${scope} graph has ${depEdgesForScope.length} dependency edges`
      : `${scope} graph has no dependency edges`,
    remediation: depEdgesForScope.length ? undefined : 'Add depends_on frontmatter to link related memories'
  });
  return checks;
}

/**
 * D16 working tier: stale working entries (left in the committed index by an older build, or whose file is gone)
 * need a rebuild, and working files without `valid_until` never expire or get pruned.
 */
async function checkWorkingTier(ctx: EngramContext, scope: Scope): Promise<DoctorCheck[]> {
  const root = ctx.roots[scope];
  if (!root || !(await exists(root))) return [];
  const checks: DoctorCheck[] = [];
  const stale = await staleWorkingEntries(root);
  const refs = await committedWorkingRefs(root);
  if (stale.length || refs.hashes.length || refs.graphNodes.length) {
    const parts = [
      stale.length ? `${stale.length} stale working index entr${stale.length === 1 ? 'y' : 'ies'}` : '',
      refs.hashes.length ? `${refs.hashes.length} working hash key${refs.hashes.length === 1 ? '' : 's'} in the committed hash store` : '',
      refs.graphNodes.length ? `${refs.graphNodes.length} working node${refs.graphNodes.length === 1 ? '' : 's'} in the committed graph` : ''
    ].filter(Boolean);
    checks.push({
      id: `index.working.${scope}`,
      scope,
      status: 'warn',
      severity: 'warning',
      message: `${scope} sidecars hold ${parts.join(', ')} (written by an older build or file missing)`,
      remediation: 'engram rebuild-index',
      metadata: { stale: stale.length, hashes: refs.hashes.length, graph_nodes: refs.graphNodes.length }
    });
  }
  for (const file of (await scanWorkingFiles(root, '')).undated) {
    checks.push({
      id: 'working.no-expiry',
      scope,
      status: 'warn',
      severity: 'warning',
      message: `Working memory ${scope}:${file} has no valid_until; it never expires and working prune keeps it`,
      remediation: 'engram promote <id> to keep it, or delete the file'
    });
  }
  return checks;
}

async function checkVectorFreshness(ctx: EngramContext, scope: Scope): Promise<DoctorCheck> {
  const root = ctx.roots[scope];
  if (!root) return { id: `vector.${scope}`, scope, status: 'skip', severity: 'info', message: `${scope} vector index skipped (root not configured)` };
  // E18: the hashed vector layer is experimental and off unless the config says true.
  if (!ctx.config.vector.enabled) return { id: `vector.${scope}`, scope, status: 'skip', severity: 'info', message: `${scope} vector: off (experimental)` };
  const entries = ctx.scopeIndexes[scope].entries.filter((entry) => !entry.ignored);
  const status = await ensureVectorIndex(root, scope, entries, ctx.config, { readOnly: true });
  const experimental = 'Hashed vectors are experimental; set vector.enabled to false in .agents/.engram/engram.config.json to drop the sidecar.';
  if (status.action === 'ready' || status.action === 'rebuilt') return { id: `vector.${scope}`, scope, status: 'pass', severity: 'info', message: `${scope} vector index ${status.action} (${status.entries} entries)`, remediation: experimental, metadata: { entries: status.entries } };
  const unavailable = status.reason?.includes('runtime unavailable') === true;
  return { id: `vector.${scope}`, scope, status: unavailable ? 'warn' : 'skip', severity: unavailable ? 'warning' : 'info', message: `${scope} vector index skipped: ${status.reason ?? 'not required'}`, remediation: unavailable ? 'Install optional sqlite-vec runtime or use lexical routing.' : experimental };
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
  checks.push(await checkAgentsChain(ctx));
  checks.push(...await checkGeminiTrust(ctx));
  checks.push(...await checkSkillFrontmatter(ctx));
  return checks;
}

/** Engram-generated SKILL.md files must satisfy the Agent Skills spec (plus Claude Code extensions); user-authored skills are never judged. */
async function checkSkillFrontmatter(ctx: EngramContext): Promise<DoctorCheck[]> {
  const { checked, invalid } = await validateGeneratedSkills(ctx.cwd);
  if (!checked) return [{ id: 'host.skill_frontmatter', scope: 'host', status: 'skip', severity: 'info', message: 'No Engram-generated SKILL.md files found' }];
  const checks: DoctorCheck[] = invalid.flatMap(({ file, issues }) => issues.map((issue): DoctorCheck => ({
    id: 'host.skill_frontmatter',
    scope: 'host',
    status: 'warn',
    severity: 'warning',
    message: `${file}: ${issue.field} ${issue.message}`,
    remediation: 'engram link <agent> --force replaces the file (or engram upgrade --latest)',
    metadata: { file, field: issue.field }
  })));
  if (!invalid.length) checks.push({ id: 'host.skill_frontmatter', scope: 'host', status: 'pass', severity: 'info', message: `Engram SKILL.md files valid: ${checked}`, metadata: { count: checked } });
  return checks;
}

/** Codex stops adding AGENTS.md files once the chain reaches project_doc_max_bytes; warn before guidance gets dropped. */
async function checkAgentsChain(ctx: EngramContext): Promise<DoctorCheck> {
  const home = codexHome();
  const files = await codexAgentsChain(ctx.cwd, home);
  if (!files.length) return { id: 'host.agents_md_chain', scope: 'host', status: 'skip', severity: 'info', message: 'No AGENTS.md files in the Codex instruction chain' };
  const total = files.reduce((sum, file) => sum + file.bytes, 0);
  const max = await codexDocMaxBytes(home);
  const warn = total >= max * CHAIN_WARN_RATIO;
  return {
    id: 'host.agents_md_chain',
    scope: 'host',
    status: warn ? 'warn' : 'pass',
    severity: warn ? 'warning' : 'info',
    message: `AGENTS.md chain ${total} of ${max} bytes (${files.length} file${files.length === 1 ? '' : 's'})${total > max ? '; Codex drops files past the limit' : ''}`,
    remediation: warn ? 'Move long guidance into Engram memories (engram take-control) or raise project_doc_max_bytes' : undefined,
    metadata: { bytes: total, limit: max, files: files.length }
  };
}

/** Warn when a Gemini `mcpServers.engram` entry sets `trust: true`: Gemini would then run engram_commit without confirmation. */
async function checkGeminiTrust(ctx: EngramContext): Promise<DoctorCheck[]> {
  const files = [path.join(ctx.cwd, '.gemini', 'settings.json'), path.join(globalAgentHome(), '.gemini', 'settings.json')];
  const checks: DoctorCheck[] = [];
  for (const file of [...new Set(files.map((item) => path.resolve(item)))]) {
    const settings = await readJson<any>(file, {});
    if (settings?.mcpServers?.engram?.trust !== true) continue;
    checks.push({
      id: 'host.gemini_trust',
      scope: 'host',
      status: 'warn',
      severity: 'warning',
      message: 'gemini mcpServers.engram has trust: true; engram_commit would run without confirmation',
      remediation: `Remove "trust": true from mcpServers.engram in ${file}`,
      metadata: { file }
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
