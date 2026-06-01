/** Admin and roadmap commands: ignore, roles, conflicts, hooks, proposals, dashboard. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { getContext } from '../core/memory/context.js';
import { writeConfig } from '../core/runtime/config.js';
import { isIgnored } from '../core/safety/ignore.js';
import { ensureDir, readText, writeText } from '../core/system/fsx.js';
import { findConflicts, resolveConflicts } from '../core/vcs/conflict.js';
import { installSkillset, skillsetTargets } from '../core/integrations/skillset.js';
import { visibleEntries } from '../core/memory/routing.js';
import { git } from '../core/vcs/git.js';
import { formatRecords, type RecordBlock } from '../core/cli/format.js';
import type { RuleVariant } from '../core/runtime/types.js';

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
  return `Roles: ${args.join(', ') || '(none)'}`;
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
  return ruleVariantStatus(ctx.config.rule_variants);
}

/** Resolve or preview workspace memory merge conflicts. */
export async function cmdResolveConflicts(flags: Record<string, any> = {}): Promise<string> {
  if (flags.auto) throw new Error('resolve-conflicts --auto is not supported; use --dry-run or resolve-conflicts');
  const conflicts = await findConflicts(process.cwd());
  if (!conflicts.length) return 'No workspace Engram merge conflicts found';
  if (flags['dry-run']) return formatRecords('Conflict dry-run', conflicts.map((conflict) => ({
    title: `DRY-RUN ${conflict.kind} ${conflict.file}`,
    fields: [['Summary', conflict.summary]]
  })));
  const results = await resolveConflicts(process.cwd(), false);
  return formatRecords('Resolved conflicts', results.map((conflict) => ({
    title: `RESOLVED ${conflict.kind} ${conflict.file}`,
    fields: [['Decision', conflict.decision], ['Stage', conflict.staged ? 'staged' : 'stage skipped']]
  })));
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

/** Create a prompt-assisted PR proposal body. */
export async function cmdPropose(args: string[]): Promise<string> {
  const file = args[0];
  if (!file) throw new Error('propose requires a memory file');
  const content = await readText(path.resolve(file));
  return `# [engram] propose: ${path.basename(file)}\n\n## Memory Preview\n\n${content}\n\n## Review\nApprove this proposal before merging.`;
}

/** Summarize ownership and stale memory for teams. */
export async function cmdTeamDashboard(): Promise<string> {
  const ctx = await getContext();
  const entries = visibleEntries(ctx.index.entries, ctx.config, false, ctx.ignorePatterns);
  const byAuthor = entries.reduce<Record<string, number>>((acc, e) => {
    acc[e.author] = (acc[e.author] ?? 0) + 1;
    return acc;
  }, {});
  const rows = Object.entries(byAuthor).sort(([a], [b]) => a.localeCompare(b));
  return rows.length ? formatRecords('Team memory', rows.map(([author, count]) => ({ title: author, fields: [['Memories', count]] }))) : 'No team memory yet';
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

/** Install agent-host instruction files for Engram skillset integration. */
export async function cmdInstallSkillset(args: string[], flags: Record<string, any> = {}): Promise<string> {
  if (args[0] === 'list') return skillsetTargets().join('\n');
  const target = args[0] ?? 'all';
  const results = await installSkillset(process.cwd(), target, Boolean(flags.force));
  const records: RecordBlock[] = results.map((result) => ({ title: `${result.action.toUpperCase()} ${result.target}: ${result.file}` }));
  return [
    formatRecords('Skillset install', records),
    ...skillsetInstallHints(results)
  ].join('\n');
}

function skillsetInstallHints(results: Awaited<ReturnType<typeof installSkillset>>): string[] {
  if (!results.some((result) => result.target === 'slash')) return [];
  return [
    'Hint: if /engram is not visible in an already-open chat, restart or reload the agent chat after the new slash files are written.',
    'Claude paths: .claude/commands/engram.md and .claude/skills/engram/SKILL.md'
  ];
}

function isRuleVariant(value: string): value is RuleVariant {
  return ['light', 'balanced', 'strict'].includes(value);
}

function ruleVariantStatus(config: { enabled: boolean; active: RuleVariant }): string {
  return `Rule variants: ${config.enabled ? config.active : 'off (balanced default)'}`;
}
