/** Admin and roadmap commands: ignore, roles, conflicts, hooks, skillsets, upgrade. */
import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { textArg } from '../cli/args.js';
import { cmdMetacognize } from './metacognize.js';
import { getContext } from '../core/memory/context.js';
import { updateGlobalFolder } from '../core/memory/global-folder.js';
import { createScope, initWorkspace } from '../core/memory/storage.js';
import { migrateMemorySchema, planMemorySchemaMigration, type MemorySchemaMigrationResult } from '../core/memory/migrate-schema.js';
import { rebuildIndex } from '../core/memory/index.js';
import { rebuildGraph } from '../core/memory/graph.js';
import { ensureVectorIndex } from '../core/memory/vector-db.js';
import { loadConfig, parseSaveTarget, scopeRootsForConfig, workspaceRoot, writeConfig } from '../core/runtime/config.js';
import { DEFAULT_LOAD_LIMIT, MAX_LOAD_LIMIT, MIN_LOAD_LIMIT, parseLoadLimit } from '../core/runtime/load-limit.js';
import { defaultProfileLines, ensureDefaultProfile } from '../core/runtime/profile-migration.js';
import { VERSION } from '../core/runtime/constants.js';
import { isIgnored } from '../core/safety/ignore.js';
import { ensureDir, exists, readText, writeText } from '../core/system/fsx.js';
import { findConflicts, resolveConflicts } from '../core/vcs/conflict.js';
import {
  detectLinkedWorkspaceTargets,
  installDetectedWorkspaceSkillsets,
  installGlobalSkillset,
  overwriteLinkedWorkspaceSkillsets,
  readGlobalSkillsetRegistry,
  refreshGeneratedWorkspaceSkillsets,
  refreshGlobalSkillsets,
  type InstallResult
} from '../core/integrations/skillset.js';
import { applyAgentHookAction, detectInstalledHookTargets, normalizeTarget, refreshInstalledAgentHooks } from '../core/integrations/agent-hooks.js';
import type { AgentHookHost } from '../core/integrations/agent-hooks.js';
import { runAgentHook } from '../core/integrations/agent-hook-runtime.js';
import { git } from '../core/vcs/git.js';
import { formatRecords, type RecordBlock } from '../core/cli/format.js';
import { installResultRecords } from './skillset-link.js';
import { needsMigration, runMigration, formatMigrationResult } from '../core/config-db/migrate.js';
import type { RuleVariant, Scope } from '../core/runtime/types.js';
import { scanUpgradeInventory } from '../core/upgrade/inventory.js';
import { buildUpgradePlan } from '../core/upgrade/planner.js';
import { applyUpgradePlan } from '../core/upgrade/executor.js';
import type { UpgradeApplyResult, UpgradeArtifactKind, UpgradePlan } from '../core/upgrade/types.js';
import { loadUpgradeReview } from '../core/upgrade/review-store.js';
import { confirmReviewedUpgrade, reviewUpgradeConflicts } from './upgrade-review.js';
/** Inspect or update ignore patterns. */
export async function cmdIgnore(args: string[]): Promise<string> {
  const ctx = await getContext();
  const [sub, value] = args;
  if (sub === 'check') return isIgnored(value ?? '', ctx.ignorePatterns) ? 'ignored' : 'visible';
  if (sub === 'add' && value) {
    const file = path.join(process.cwd(), '.engramignore');
    await writeText(file, `${(await readText(file)).trimEnd()}\n${value}\n`);
    return `Added ignore pattern: ${value}`;
  }
  return formatRecords('Ignore status', [{
    title: ctx.config.ignore.source,
    fields: [['Also ignore', ctx.config.ignore.also_ignore.join(', ') || '(none)'], ['Hidden', ctx.hiddenCount]]
  }]);
}
/** Persist local developer roles in config. */
export async function cmdSetRole(args: string[]): Promise<string> {
  const ctx = await getContext();
  ctx.config.roles = args;
  await writeConfig(process.cwd(), ctx.config);
  return configUpdateResult(`Roles: ${args.join(', ') || '(none)'}`);
}
/** Configure where normal save writes by default. */
export async function cmdSetSaveTarget(args: string[]): Promise<string> {
  const ctx = await getContext();
  const value = (args[0] ?? 'status').toLowerCase();
  if (value === 'status') return saveTargetStatus(ctx.config.scope, Boolean(ctx.roots.global));
  const target = parseSaveTarget(value, 'set-save-target');
  if (target === 'global' && !ctx.roots.global) {
    throw new Error('set-save-target global requires global memory; set ENGRAM_GLOBAL_DIR or run engram inject --global-path <path>');
  }
  ctx.config.scope = target;
  await writeConfig(process.cwd(), ctx.config);
  return saveTargetStatus(ctx.config.scope, Boolean(ctx.roots.global));
}
/** Configure the compact `engram load` memory cap. */
export async function cmdSetLoadLimit(args: string[]): Promise<string> {
  const ctx = await getContext();
  const value = (args[0] ?? 'status').toLowerCase();
  if (value === 'status') return loadLimitStatus(ctx.config.load.limit);
  if (['default', 'reset'].includes(value)) {
    ctx.config.load.limit = DEFAULT_LOAD_LIMIT;
  } else {
    ctx.config.load.limit = parseLoadLimit(value, 'set-load-limit');
  }
  await writeConfig(process.cwd(), ctx.config);
  return loadLimitStatus(ctx.config.load.limit);
}
/** Enable, disable, or inspect rule variant rendering. */
export async function cmdSetRuleVariant(args: string[]): Promise<string> {
  const ctx = await getContext();
  const value = (args[0] ?? 'status').toLowerCase();
  if (value === 'status') return ruleVariantStatus(ctx.config.rule_variants);
  if (['off', 'disable', 'disabled'].includes(value)) {
    ctx.config.rule_variants = { enabled: false, active: 'balanced' };
  } else if (isRuleVariant(value)) {
    ctx.config.rule_variants = { enabled: true, active: value };
  } else {
    throw new Error('set-rule-variant expects off, light, balanced, strict, or status');
  }
  await writeConfig(process.cwd(), ctx.config);
  return configUpdateResult(ruleVariantStatus(ctx.config.rule_variants));
}
/** Configure how and when engram load is used. */
export async function cmdSetRead(args: string[]): Promise<string> {
  const ctx = await getContext();
  const value = (args[0] ?? 'status').toLowerCase();
  if (value === 'status') return readStatus(ctx.config.read);
  if (['startup', 'auto', 'manual', 'off', 'always'].includes(value)) {
    ctx.config.read = value as 'startup' | 'auto' | 'manual' | 'off' | 'always';
  } else {
    throw new Error('set-read expects startup, auto, manual, off, always, or status');
  }
  await writeConfig(process.cwd(), ctx.config);
  return readStatus(ctx.config.read);
}

function readStatus(value: string): string {
  return `Read behavior: ${value}`;
}

/** Configure whether supported hooks append compact per-turn Engram proof. */
export async function cmdSetProof(args: string[]): Promise<string> {
  const ctx = await getContext();
  const value = (args[0] ?? 'status').toLowerCase();
  if (value === 'status') return proofStatus(ctx.config.proof);
  if (['off', 'compact'].includes(value)) {
    ctx.config.proof = value as 'off' | 'compact';
  } else {
    throw new Error('set-proof expects off, compact, or status');
  }
  await writeConfig(process.cwd(), ctx.config);
  return proofStatus(ctx.config.proof);
}

function proofStatus(value: string): string {
  return `Proof behavior: ${value}`;
}
/** Update the configured global memory folder, optionally moving the old root. */
export async function cmdUpdateGlobalFolder(args: string[], flags: Record<string, any> = {}): Promise<string> {
  const target = textArg(args);
  if (!target) throw new Error('update-global-folder requires <new-path>');
  if (flags['move-from-path'] === true) throw new Error('update-global-folder --move-from-path requires a path');
  const moveFromPath = typeof flags['move-from-path'] === 'string' ? flags['move-from-path'] : undefined;
  return (await updateGlobalFolder(process.cwd(), target, { moveFromPath })).join('\n');
}

/** Resolve or preview workspace memory merge conflicts. */
export async function cmdResolveConflicts(args: string[] = [], flags: Record<string, any> = {}): Promise<string> {
  if (flags.auto) throw new Error('resolve-conflicts --auto is not supported; use --dry-run or resolve-conflicts');
  const conflicts = await findConflicts(process.cwd());
  const sections = [];
  if (!conflicts.length) sections.push('No workspace Engram merge conflicts found');
  else if (flags['dry-run']) {
    sections.push(formatRecords('Conflict dry-run', conflicts.map((conflict) => ({
      title: `DRY-RUN ${conflict.kind} ${conflict.file}`,
      fields: [['Summary', conflict.summary]]
    }))));
  } else {
    const results = await resolveConflicts(process.cwd(), false);
    sections.push(formatRecords('Resolved conflicts', results.map((conflict) => ({
      title: `RESOLVED ${conflict.kind} ${conflict.file}`,
      fields: [['Decision', conflict.decision], ['Stage', conflict.staged ? 'staged' : 'stage skipped']]
    }))));
  }
  if (flags.metacognize === true) sections.push(await cmdMetacognize(['workspace', ...args], { ...flags, workspace: true }));
  return sections.join('\n\n');
}

/** Install opt-in Git hooks that call Engram commands. */
export async function cmdInstallHooks(): Promise<string> {
  const hookDir = await gitHookDir(process.cwd());
  await ensureDir(hookDir);
  const results = [];
  results.push(await writeGeneratedHook(path.join(hookDir, 'post-merge'), '#!/bin/sh\nnpx @the-long-ride/engram resolve-conflicts\n'));
  results.push(await writeGeneratedHook(path.join(hookDir, 'pre-commit'), '#!/bin/sh\nnpx @the-long-ride/engram verify workspace\n'));
  return formatRecords('Engram Git hooks', results.map((result) => ({ title: result })));
}

/** Install opt-in AI agent hooks that inject routed Engram context. */
export async function cmdInstallAgentHooks(args: string[] = [], flags: Record<string, any> = {}): Promise<string> {
  return applyAgentHookAction('install', args[0] ?? 'all', {
    global: flags.global === true,
    plan: flags.plan === true,
    force: flags.force === true
  });
}

/** Remove only Engram-managed AI agent hook entries. */
export async function cmdUninstallAgentHooks(args: string[] = [], flags: Record<string, any> = {}): Promise<string> {
  return applyAgentHookAction('uninstall', args[0] ?? 'all', {
    global: flags.global === true
  });
}

/** Internal hook runtime used by host hook JSON configs. */
export async function cmdAgentHook(flags: Record<string, any> = {}, stdin = ''): Promise<string> {
  const hostFlag = typeof flags.host === 'string' ? flags.host : '';
  const normalized = normalizeTarget(hostFlag);
  if (typeof normalized !== 'string') return '{}';
  return runAgentHook(normalized, stdin);
}

async function writeGeneratedHook(file: string, body: string): Promise<string> {
  const existing = await readText(file);
  if (existing && !existing.includes('Generated by Engram')) return `SKIPPED ${path.basename(file)}: human-authored file exists`;
  const script = body.startsWith('#!')
    ? body.replace(/\r?\n/, '\n# Generated by Engram. Edit with care.\n')
    : `# Generated by Engram. Edit with care.\n${body}`;
  await writeText(file, script);
  await fs.chmod(file, 0o755).catch(() => undefined);
  return `WRITTEN ${path.basename(file)}`;
}

async function gitHookDir(cwd: string): Promise<string> {
  try {
    const hookDir = (await git(['-C', cwd, 'rev-parse', '--git-path', 'hooks'])).trim();
    return path.isAbsolute(hookDir) ? hookDir : path.join(cwd, hookDir);
  } catch {
    throw new Error('install-hooks requires a Git repository');
  }
}

/** Upgrade Engram package guidance, generated workspace assets, global memory scaffold, and registered global skillsets. */
export async function cmdUpgrade(args: string[] = [], flags: Record<string, any> = {}): Promise<string> {
  if (flags['memory-only'] === true && flags['global-skillsets-only'] === true) throw new Error('upgrade cannot use --memory-only and --global-skillsets-only together');
  if (flags['configs-only'] === true && (flags['memory-only'] === true || flags['global-skillsets-only'] === true)) throw new Error('upgrade cannot use --configs-only with --memory-only or --global-skillsets-only');
  if (flags['migrate-memories'] === true && flags['no-migrate-memories'] === true) throw new Error('upgrade cannot use --migrate-memories and --no-migrate-memories together');
  if (flags['migrate-memories'] === true && flags['configs-only'] === true) throw new Error('--migrate-memories cannot be used with --configs-only');
  if (flags['migrate-memories'] === true && flags['global-skillsets-only'] === true) throw new Error('--migrate-memories cannot be used with --global-skillsets-only');
  if (flags['migrate-memories'] === true && flags['db-migrate'] === true) throw new Error('--migrate-memories cannot be used with --db-migrate');
  const plan = flags.plan === true || flags['dry-run'] === true;
  const dbMigrate = flags['db-migrate'] === true;
  const overwriteLinked = flags.latest === true;
  const configsOnly = flags['configs-only'] === true;
  const migrateMemories = !configsOnly && !dbMigrate && flags['global-skillsets-only'] !== true
    && flags['no-migrate-memories'] !== true
    && (overwriteLinked || flags['migrate-memories'] === true);
  const target = upgradeTarget(args, flags);
  const records: RecordBlock[] = [];
  if (isSharedLatestUpgrade(args, flags)) {
    return await runSharedLatestUpgrade(flags, plan);
  }
  if (!configsOnly) records.push(await upgradePackageRecord(flags, plan));
  if (flags['global-skillsets-only'] !== true && !dbMigrate) {
    if (configsOnly) {
      // configs-only: refresh workspace agent config files only.
      records.push(await workspaceSkillsetUpgradeRecord(plan, overwriteLinked));
      if (overwriteLinked) records.push(await workspaceDetectedSkillsetUpgradeRecord(plan));
    } else {
      if (migrateMemories) records.push(await memorySchemaUpgradeRecord(workspaceRoot(process.cwd()), 'workspace', plan));
      records.push(await workspaceMemoryUpgradeRecord(plan, Boolean(flags.force)));
      records.push(await workspaceSkillsetUpgradeRecord(plan, overwriteLinked));
      if (overwriteLinked) records.push(await workspaceHookUpgradeRecord(plan));
      if (migrateMemories) records.push(...await globalMemorySchemaUpgradeRecords(plan));
      records.push(...await globalMemoryUpgradeRecords(plan, Boolean(flags.force)));
      // Re-install skillsets for any installed agent that isn't already linked in this workspace.
      if (overwriteLinked) records.push(await workspaceDetectedSkillsetUpgradeRecord(plan));
    }
  }
  if (flags['memory-only'] !== true && !dbMigrate && !configsOnly) {
    records.push(...await globalSkillsetUpgradeRecords(target, flags, plan, overwriteLinked));
    if (overwriteLinked) records.push(await globalHookUpgradeRecord(target, plan));
  }

  // DB migration via --db-migrate flag
  if (dbMigrate) {
    const dryRun = flags['dry-run'] === true;
    if (dryRun || flags.force) {
      const workspacePaths = typeof flags['workspace-path'] === 'string'
        ? [flags['workspace-path']]
        : Array.isArray(flags['workspace-path']) ? flags['workspace-path'] : undefined;
      const result = await runMigration({ dryRun, force: Boolean(flags.force), workspacePaths });
      records.push({ title: formatMigrationResult(result, dryRun), fields: [] });
    } else if (await needsMigration()) {
      records.push({
        title: 'SQLite config DB migration available',
        fields: [
          ['Action', 'Run `engram upgrade --db-migrate --dry-run` to preview'],
          ['Apply', 'Run `engram upgrade --db-migrate --force` to migrate'],
          ['Workspace path', 'Pass --workspace-path <path> to include specific workspaces']
        ]
      });
    } else {
      records.push({ title: 'SQLite config DB migration', fields: [['Status', 'No JSON configs to migrate']] });
    }
  }

  return [
    formatRecords(plan ? 'Upgrade plan' : 'Upgrade', records),
    '',
    'Quick update:',
    '  npm install -g @the-long-ride/engram@latest',
    '  engram upgrade --latest'
  ].join('\n');
}


function isSharedLatestUpgrade(args: string[], flags: Record<string, any>): boolean {
  return flags.latest === true
    && flags['db-migrate'] !== true
    && flags['configs-only'] !== true
    && flags['memory-only'] !== true
    && flags['global-skillsets-only'] !== true
    && !upgradeTarget(args, flags);
}

async function runSharedLatestUpgrade(flags: Record<string, any>, previewOnly: boolean): Promise<string> {
  const cwd = process.cwd();
  const config = await loadConfig(cwd);
  let inventory = await scanUpgradeInventory(cwd, config, VERSION);
  if (flags['no-migrate-memories'] === true) inventory = { ...inventory, items: inventory.items.filter((item) => item.kind !== 'memory') };
  const basePlan = buildUpgradePlan(inventory, VERSION);
  let sharedPlan: UpgradePlan = { ...basePlan, review: await loadUpgradeReview(basePlan) };
  if (previewOnly) return flags.json === true ? JSON.stringify(sharedPlan, null, 2) : formatSharedUpgradePlan(sharedPlan);
  if (flags.review === true) {
    if (flags.json === true) throw new Error('`--review` is interactive and cannot be combined with `--json`.');
    const reviewed = await reviewUpgradeConflicts(cwd, config, sharedPlan);
    sharedPlan = { ...sharedPlan, review: reviewed.review };
    if (!reviewed.applyNow) return reviewed.summary;
  }
  const review = sharedPlan.review ?? await loadUpgradeReview(sharedPlan);
  if (review.pendingReviewCount > 0 || review.staleCount > 0) {
    throw new Error(`Upgrade requires review: ${review.pendingReviewCount} conflict file(s). Run engram upgrade --latest --review.`);
  }
  if (flags.review !== true && !(await confirmReviewedUpgrade(review, flags.yes === true))) return 'Upgrade cancelled. Reviewed decisions were preserved.';
  const result = await applyUpgradePlan(cwd, config, sharedPlan, { confirmed: true, review });
  const durableFailure = result.transactions.find((row) => row.status === 'failed' || row.status === 'rolled-back');
  if (durableFailure) throw new Error(`upgrade transaction ${durableFailure.group} ${durableFailure.status}${durableFailure.message ? `: ${durableFailure.message}` : ''}`);
  return flags.json === true ? JSON.stringify(result, null, 2) : formatSharedUpgradeResult(sharedPlan, result);
}

function scopeLines(sharedPlan: UpgradePlan, scope: Scope): string[] {
  return sharedPlan.items.filter((item) => item.scope === scope).map((item) => `${item.status.toUpperCase()} ${item.kind}${item.agent ? ` ${item.agent}` : ''}: ${item.file} — ${item.reason}`);
}

const UPGRADE_KIND_ORDER: ReadonlyArray<{ kind: UpgradeArtifactKind; label: string }> = [
  { kind: 'config', label: 'Config' },
  { kind: 'instruction', label: 'Instructions' },
  { kind: 'memory', label: 'Memories' },
  { kind: 'skillset', label: 'Skillsets' },
  { kind: 'hook', label: 'Hooks' },
  { kind: 'plugin', label: 'Plugins' }
];

function kindRecords(sharedPlan: UpgradePlan): RecordBlock[] {
  return UPGRADE_KIND_ORDER.flatMap(({ kind, label }) => {
    const items = sharedPlan.items.filter((item) => item.kind === kind && item.status !== 'current');
    if (!items.length) return [];
    const workspace = items.filter((item) => item.scope === 'workspace').length;
    const global = items.filter((item) => item.scope === 'global').length;
    return [{
      title: label,
      fields: [['Workspace', workspace], ['Global', global]],
      lines: items.map((item) => `${item.scope.toUpperCase()} ${item.status.toUpperCase()} ${item.kind}${item.agent ? ` ${item.agent}` : ''}: ${item.file} — ${item.reason}`)
    }];
  });
}

function formatSharedUpgradePlan(sharedPlan: UpgradePlan): string {
  const conflicts = sharedPlan.items.filter((item) => item.status === 'conflict' || item.status === 'invalid');
  const records: RecordBlock[] = [
    { title: 'Workspace', fields: [['Outdated', sharedPlan.summary.workspace.outdated], ['Conflicts', sharedPlan.summary.workspace.conflict], ['Invalid', sharedPlan.summary.workspace.invalid]] },
    { title: 'Global', fields: [['Outdated', sharedPlan.summary.global.outdated], ['Conflicts', sharedPlan.summary.global.conflict], ['Invalid', sharedPlan.summary.global.invalid]] },
    { title: 'Review', fields: [['Reviewed', sharedPlan.review?.reviewedCount ?? 0], ['Pending review', sharedPlan.review?.pendingReviewCount ?? conflicts.length], ['Stale', sharedPlan.review?.staleCount ?? 0]], lines: conflicts.length ? ['Run `engram upgrade --latest --review` to resolve conflict files.'] : [] },
    ...kindRecords(sharedPlan)
  ];
  const workspaceMemories = sharedPlan.items.filter((item) => item.scope === 'workspace' && item.kind === 'memory' && item.status === 'outdated');
  const globalMemories = sharedPlan.items.filter((item) => item.scope === 'global' && item.kind === 'memory' && item.status === 'outdated');
  if (workspaceMemories.length) records.push({ title: 'PLAN workspace memory schema', fields: [['Eligible', workspaceMemories.length]], lines: workspaceMemories.map((item) => `MIGRATE ${item.file}`) });
  if (globalMemories.length) records.push({ title: 'PLAN global memory schema', fields: [['Eligible', globalMemories.length]], lines: globalMemories.map((item) => `MIGRATE ${item.file}`) });
  if (sharedPlan.items.some((item) => item.scope === 'workspace' && item.kind !== 'memory' && item.kind !== 'hook' && item.kind !== 'plugin' && item.status === 'outdated')) records.push({ title: 'PLAN workspace skillsets', fields: [['Action', 'upgrade safe Engram-managed workspace artifacts']] });
  if (sharedPlan.items.some((item) => item.scope === 'workspace' && (item.kind === 'hook' || item.kind === 'plugin') && item.status === 'outdated')) records.push({ title: 'PLAN workspace agent hooks', fields: [['Action', 'upgrade safe Engram-managed hooks']] });
  if (sharedPlan.items.some((item) => item.scope === 'global' && item.kind !== 'memory' && item.kind !== 'hook' && item.kind !== 'plugin' && item.status === 'outdated')) records.push({ title: 'PLAN global skillsets', fields: [['Action', 'upgrade safe Engram-managed global artifacts']] });
  if (sharedPlan.items.some((item) => item.scope === 'global' && (item.kind === 'hook' || item.kind === 'plugin') && item.status === 'outdated')) records.push({ title: 'PLAN global agent hooks', fields: [['Action', 'upgrade safe Engram-managed hooks']] });
  records.push(
    { title: 'Conflicts', fields: [['Count', conflicts.length]], lines: conflicts.map((item) => `${item.kind}${item.agent ? ` ${item.agent}` : ''}: ${item.file}`) },
    { title: 'Warnings', fields: [['Count', sharedPlan.warnings.length]], lines: sharedPlan.warnings },
    { title: 'Vector index', fields: [['Behavior', 'rebuilds are disposable and fail open; vector-only errors never abort durable upgrades']] }
  );
  return formatRecords('Upgrade plan', records);
}

function formatSharedUpgradeResult(sharedPlan: UpgradePlan, result: UpgradeApplyResult): string {
  const updatedGroups = new Set(result.transactions.filter((row) => row.status === 'updated').map((row) => row.group));
  const records: RecordBlock[] = [
    { title: 'Workspace', fields: [['Outdated planned', sharedPlan.summary.workspace.outdated], ['Conflicts preserved', sharedPlan.summary.workspace.conflict]], lines: scopeLines(sharedPlan, 'workspace') },
    { title: 'Global', fields: [['Outdated planned', sharedPlan.summary.global.outdated], ['Conflicts preserved', sharedPlan.summary.global.conflict]], lines: scopeLines(sharedPlan, 'global') }
  ];
  const workspaceMemories = sharedPlan.items.filter((item) => item.scope === 'workspace' && item.kind === 'memory' && item.status === 'outdated');
  const globalMemories = sharedPlan.items.filter((item) => item.scope === 'global' && item.kind === 'memory' && item.status === 'outdated');
  if (workspaceMemories.length && updatedGroups.has('workspace:memory')) records.push({ title: 'MIGRATED workspace memory schema', fields: [['Migrated', workspaceMemories.length]] });
  if (globalMemories.length && updatedGroups.has('global:memory')) records.push({ title: 'MIGRATED global memory schema', fields: [['Migrated', globalMemories.length]] });
  if ([...updatedGroups].some((group) => group.startsWith('workspace:') && !group.endsWith(':hooks') && group !== 'workspace:memory')) records.push({ title: 'UPDATED workspace skillsets', fields: [['Status', 'safe managed artifacts upgraded']] });
  if ([...updatedGroups].some((group) => group.startsWith('workspace:') && group.endsWith(':hooks'))) records.push({ title: 'UPDATED workspace agent hooks', fields: [['Status', 'safe managed hooks upgraded']] });
  if ([...updatedGroups].some((group) => group.startsWith('global:') && !group.endsWith(':hooks') && group !== 'global:memory')) records.push({ title: 'UPDATED global skillsets', fields: [['Status', 'safe managed artifacts upgraded']] });
  if ([...updatedGroups].some((group) => group.startsWith('global:') && group.endsWith(':hooks'))) records.push({ title: 'UPDATED global agent hooks', fields: [['Status', 'safe managed hooks upgraded']] });
  records.push(
    { title: 'Conflicts', fields: [['Count', result.conflicts.length]], lines: result.conflicts.map((item) => `${item.kind}${item.agent ? ` ${item.agent}` : ''}: ${item.file}`) },
    { title: 'Transactions', fields: [['Count', result.transactions.length]], lines: result.transactions.map((row) => `${row.status.toUpperCase()} ${row.group}: ${row.files.join(', ')}${row.message ? ` — ${row.message}` : ''}`) },
    { title: 'Warnings', fields: [['Count', result.warnings.length]], lines: result.warnings },
    { title: 'Vector index', fields: [['Status', result.vectorWarnings.length ? 'degraded' : 'ready or not required']], lines: result.vectorWarnings }
  );
  return formatRecords('Upgrade', records);
}

async function globalMemorySchemaUpgradeRecords(plan: boolean): Promise<RecordBlock[]> {
  const config = await loadConfig(process.cwd());
  const roots = scopeRootsForConfig(process.cwd(), config);
  if (!roots.global) {
    return [{ title: 'SKIPPED global memory schema', fields: [['Reason', 'global memory is not configured']] }];
  }
  return [await memorySchemaUpgradeRecord(roots.global, 'global', plan)];
}

async function memorySchemaUpgradeRecord(root: string, scope: Scope, plan: boolean): Promise<RecordBlock> {
  if (!(await exists(root))) {
    return { title: `SKIPPED ${scope} memory schema`, fields: [['Reason', 'memory root does not exist']] };
  }
  const result = plan
    ? await planMemorySchemaMigration(root, scope)
    : await migrateMemorySchema(root, scope);
  if (!plan && result.migrated > 0) await rebuildMigratedScope(root, scope);
  const title = plan
    ? `PLAN ${scope} memory schema`
    : result.migrated > 0
      ? `MIGRATED ${scope} memory schema`
      : `CHECKED ${scope} memory schema`;
  return {
    title,
    fields: migrationFields(result, root),
    lines: result.files
      .filter((row) => row.action !== 'current')
      .map((row) => `${row.action.toUpperCase()} ${row.file}${row.reason ? `: ${row.reason}` : ''}`)
  };
}

async function rebuildMigratedScope(root: string, scope: Scope): Promise<void> {
  const config = await loadConfig(process.cwd());
  const index = await rebuildIndex(root, scope);
  await rebuildGraph(root, scope, index, config);
  await ensureVectorIndex(root, scope, index.entries, config, { force: true });
}

function migrationFields(result: MemorySchemaMigrationResult, root: string): Array<[string, string | number]> {
  return [
    ['Path', root],
    ['Scanned', result.scanned],
    ['Eligible', result.eligible],
    ['Migrated', result.migrated],
    ['Current', result.current],
    ['Failed', result.failed],
    ['Backup', '<memory>.pre-v3.bak']
  ];
}

async function workspaceMemoryUpgradeRecord(plan: boolean, force: boolean): Promise<RecordBlock> {
  const root = workspaceRoot(process.cwd());
  if (!(await exists(root))) {
    return { title: 'SKIPPED workspace memory', fields: [['Reason', 'workspace memory is not initialized; run engram inject']] };
  }
  if (plan) {
    return {
      title: 'PLAN workspace memory',
      fields: [
        ['Path', root],
        ['Action', 'refresh generated HELP.md and reconcile indexes, graph files, and vector sidecars for release schema changes']
      ]
    };
  }
  const config = { ...await loadConfig(process.cwd()), version: VERSION };
  const result = await createScope(root, config, 'workspace', force);
  const reconciled = [
    result.files ? 'generated files' : '',
    result.config ? 'config' : '',
    result.migrated ? 'legacy dirs' : '',
    result.index ? 'index/graph/vector' : ''
  ].filter(Boolean).join(', ') || 'already current';
  return { title: 'UPDATED workspace memory', fields: [['Path', root], ['Reconciled', reconciled]] };
}

async function workspaceSkillsetUpgradeRecord(plan: boolean, overwriteLinked: boolean): Promise<RecordBlock> {
  const results = overwriteLinked
    ? await overwriteLinkedWorkspaceSkillsets(process.cwd(), { plan })
    : await refreshGeneratedWorkspaceSkillsets(process.cwd(), { plan });
  if (!results.length) {
    return { title: 'SKIPPED workspace skillsets', fields: [['Reason', overwriteLinked ? 'no linked workspace skillset files need overwrite' : 'no generated workspace skillset files need refresh']] };
  }
  return {
    title: plan ? 'PLAN workspace skillsets' : 'UPDATED workspace skillsets',
    fields: [['Files', [...new Set(results.map((result) => result.file))].join(', ')]],
    lines: results.map((result) => `${result.action.toUpperCase()} ${result.target}: ${result.file}`)
  };
}

/** Install skillsets for agents detected on this device that are not yet linked in the current workspace. */
async function workspaceDetectedSkillsetUpgradeRecord(plan: boolean): Promise<RecordBlock> {
  const results = await installDetectedWorkspaceSkillsets(process.cwd(), { plan });
  if (!results.length) {
    return { title: 'SKIPPED detected agent skillsets', fields: [['Reason', 'all installed agents already have workspace skillsets linked']] };
  }
  return {
    title: plan ? 'PLAN detected agent skillsets' : 'INSTALLED detected agent skillsets',
    fields: [['Targets', [...new Set(results.map((result) => result.target))].join(', ')]],
    lines: results.map((result) => `${result.action.toUpperCase()} ${result.target}: ${result.file}`)
  };
}

async function workspaceHookUpgradeRecord(plan: boolean): Promise<RecordBlock> {
  const hookTargets = await workspaceHookTargets();
  if (!hookTargets.length) {
    return { title: 'SKIPPED workspace agent hooks', fields: [['Reason', 'no managed workspace agent hooks need refresh']] };
  }
  const results = [];
  for (const target of hookTargets) {
    results.push(...await refreshInstalledAgentHooks(target, { cwd: process.cwd(), plan, force: true, installMissing: true }));
  }
  return {
    title: plan ? 'PLAN workspace agent hooks' : 'UPDATED workspace agent hooks',
    fields: [['Hosts', [...new Set(results.map((result) => result.host))].join(', ')]],
    lines: results.map((result) => `${result.status} ${result.host}: ${result.file ?? '<unknown>'}`)
  };
}

async function workspaceHookTargets(): Promise<string[]> {
  const linkedTargets = hookTargetsForLinkedSkillsets(await detectLinkedWorkspaceTargets(process.cwd()));
  const installedTargets = new Set(await detectInstalledHookTargets({ cwd: process.cwd(), includeStale: true }));
  for (const target of linkedTargets) installedTargets.add(target);
  return [...installedTargets];
}
async function upgradePackageRecord(flags: Record<string, any>, plan: boolean): Promise<RecordBlock> {
  const latest = await latestVersion(flags);
  if (flags.self === true && !plan) {
    const result = await runNpm(['install', '-g', '@the-long-ride/engram@latest'], 120000).catch((error) => `failed: ${error.message}`);
    return { title: 'PACKAGE self update', fields: [['Current', VERSION], ['Latest', latest], ['Result', compact(result)]] };
  }
  return {
    title: flags.self === true ? 'PLAN package self update' : 'PACKAGE recommendation',
    fields: [
      ['Current', VERSION],
      ['Latest', latest],
      ['Command', 'npm install -g @the-long-ride/engram@latest']
    ]
  };
}

async function globalMemoryUpgradeRecords(plan: boolean, force: boolean): Promise<RecordBlock[]> {
  const config = await loadConfig(process.cwd());
  const roots = scopeRootsForConfig(process.cwd(), config);
  if (!roots.global) return [{ title: 'SKIPPED global memory', fields: [['Reason', 'global memory is not configured; run engram inject --global-only --global-path <path>']] }];
  if (plan) return [{ title: 'PLAN global memory', fields: [['Path', roots.global], ['Action', 'reconcile global-only scaffold']] }];
  const lines = await initWorkspace(process.cwd(), force, config.global_git.branch, roots.global, { globalOnly: true });
  lines.push(...defaultProfileLines(await ensureDefaultProfile(process.cwd())));
  return [{ title: 'UPDATED global memory', fields: [['Path', roots.global]], lines }];
}

async function globalSkillsetUpgradeRecords(target: string, flags: Record<string, any>, plan: boolean, overwriteLinked: boolean): Promise<RecordBlock[]> {
  const registry = await readGlobalSkillsetRegistry();
  if (!target && !Object.keys(registry.installs).length) {
    return [{
      title: 'SKIPPED global skillsets',
      fields: [
        ['Reason', 'no registered global skillsets yet'],
        ['Start with', 'engram link --global codex']
      ]
    }];
  }
  const force = overwriteLinked || Boolean(flags.force);
  const results = target
    ? await installGlobalSkillset(target, { force, plan })
    : await refreshGlobalSkillsets('', { force, plan });
  return installResultRecords(results);
}

async function globalHookUpgradeRecord(target: string, plan: boolean): Promise<RecordBlock> {
  const hookTargets = await globalHookTargets(target);
  if (!hookTargets.length) {
    return { title: 'SKIPPED global agent hooks', fields: [['Reason', 'no linked global agent hooks need refresh']] };
  }
  const results = [];
  for (const current of hookTargets) {
    results.push(...await refreshInstalledAgentHooks(current, { global: true, plan, force: true, installMissing: true }));
  }
  return {
    title: plan ? 'PLAN global agent hooks' : 'UPDATED global agent hooks',
    fields: [['Hosts', [...new Set(results.map((result) => result.host))].join(', ')]],
    lines: results.map((result) => `${result.status} ${result.host}: ${result.file ?? '<unknown>'}`)
  };
}

async function globalHookTargets(target: string): Promise<string[]> {
  if (target) return [...hookTargetsForLinkedSkillsets([target])];
  const registry = await readGlobalSkillsetRegistry();
  return [...hookTargetsForLinkedSkillsets(Object.keys(registry.installs))];
}

function hookTargetsForLinkedSkillsets(linkedTargets: string[]): Set<AgentHookHost> {
  const targets = new Set<AgentHookHost>();
  const linked = new Set(linkedTargets.map((item) => item.toLowerCase()));
  if (linked.has('claude')) targets.add('claude');
  if (linked.has('cursor')) targets.add('cursor');
  if (linked.has('gemini') || linked.has('antigravity') || linked.has('antigravity-cli')) targets.add('gemini');
  if (linked.has('opencode') || linked.has('open-code')) targets.add('opencode');
  if (linked.has('windsurf') || linked.has('cascade')) targets.add('windsurf');
  if (linked.has('codex') || (linked.has('agents-md') && linked.has('agent-skill'))) targets.add('codex');
  return targets;
}

function upgradeTarget(args: string[], flags: Record<string, any>): string {
  return typeof flags.target === 'string' ? flags.target : args[0] ?? '';
}

async function latestVersion(flags: Record<string, any>): Promise<string> {
  if (flags['no-version-check'] === true) return 'not checked';
  if (process.env.ENGRAM_LATEST_VERSION?.trim()) return process.env.ENGRAM_LATEST_VERSION.trim();
  if (flags.latest !== true && flags.self !== true) return 'not checked (use --latest to query npm)';
  return compact(await runNpm(['view', '@the-long-ride/engram', 'version', '--silent'], 5000).catch((error) => `unavailable: ${error.message}`));
}

function runNpm(args: string[], timeout: number): Promise<string> {
  const command = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  return new Promise((resolve, reject) => {
    execFile(command, args, { encoding: 'utf8', timeout }, (error: any, stdout: string, stderr: string) => {
      if (error) reject(new Error(compact(stderr || error.message)));
      else resolve(stdout.trim());
    });
  });
}

function compact(value: string): string {
  return value.trim().replace(/\s+/g, ' ') || '-';
}

function configUpdateResult(statusLine: string): string {
  return `${statusLine}\n${agentReloadAction()}`;
}

function agentReloadAction(): string {
  return 'Agent action: rerun `engram load "<current task/request>"` now and replace prior Engram-loaded context for the rest of this conversation. Keep any non-Engram host or system instructions unchanged.';
}

function isRuleVariant(value: string): value is RuleVariant {
  return ['light', 'balanced', 'strict'].includes(value);
}

function ruleVariantStatus(config: { enabled: boolean; active: RuleVariant }): string {
  return `Rule variants: ${config.enabled ? config.active : 'off (balanced default)'}`;
}

function saveTargetStatus(scope: string, hasGlobal: boolean): string {
  const fallback = scope === 'both' && !hasGlobal ? ' (global memory not configured; saves write workspace only until configured)' : '';
  return `Save target: ${scope}${fallback}`;
}

function loadLimitStatus(limit: number): string {
  return `Load limit: ${limit} (default ${DEFAULT_LOAD_LIMIT}, range ${MIN_LOAD_LIMIT}-${MAX_LOAD_LIMIT})`;
}













