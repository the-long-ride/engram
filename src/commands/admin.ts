/** Admin and roadmap commands: ignore, roles, conflicts, hooks, proposals, dashboard. */
import path from 'node:path';
import { getContext } from '../core/context.js';
import { isIgnored } from '../core/ignore.js';
import { readText, writeJson, writeText } from '../core/fsx.js';
import { findConflicts, resolveConflicts } from '../core/conflict.js';
import { installSkillset, skillsetTargets } from '../core/skillset.js';
import type { RuleVariant } from '../core/types.js';

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
  return `Ignore source: ${ctx.config.ignore.source}\nAlso ignore: ${ctx.config.ignore.also_ignore.join(', ')}\nHidden: ${ctx.hiddenCount}`;
}

/** Persist local developer roles in config. */
export async function cmdSetRole(args: string[]): Promise<string> {
  const ctx = await getContext();
  ctx.config.roles = args;
  await writeJson(path.join(ctx.roots.workspace, 'engram.config.json'), ctx.config);
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
  await writeJson(path.join(ctx.roots.workspace, 'engram.config.json'), ctx.config);
  return ruleVariantStatus(ctx.config.rule_variants);
}

/** Resolve or preview .engram-only merge conflicts. */
export async function cmdResolveConflicts(flags: Record<string, any> = {}): Promise<string> {
  const conflicts = await findConflicts(process.cwd());
  if (!conflicts.length) return 'No .engram merge conflicts found';
  if (flags['dry-run']) return conflicts.map((c) => `DRY-RUN ${c.kind} ${c.file} - ${c.summary}`).join('\n');
  const results = await resolveConflicts(process.cwd(), false);
  return results.map((c) => `RESOLVED ${c.kind} ${c.file} - ${c.decision}${c.staged ? ' [staged]' : ' [stage skipped]'}`).join('\n');
}

/** Install opt-in Git hooks that call Engram commands. */
export async function cmdInstallHooks(): Promise<string> {
  const hookDir = path.join(process.cwd(), '.git', 'hooks');
  await writeText(path.join(hookDir, 'post-merge'), '#!/bin/sh\nnpx @the-long-ride/engram resolve-conflicts --auto\n');
  await writeText(path.join(hookDir, 'prepare-commit-msg'), '#!/bin/sh\ncase "$2" in merge|squash) exit 0;; esac\n');
  return 'Installed opt-in Engram Git hooks';
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
  const byAuthor = ctx.index.entries.reduce<Record<string, number>>((acc, e) => {
    acc[e.author] = (acc[e.author] ?? 0) + 1;
    return acc;
  }, {});
  return Object.entries(byAuthor).map(([author, count]) => `${author}: ${count} memories`).join('\n') || 'No team memory yet';
}

/** Install agent-host instruction files for Engram skillset integration. */
export async function cmdInstallSkillset(args: string[], flags: Record<string, any> = {}): Promise<string> {
  if (args[0] === 'list') return skillsetTargets().join('\n');
  const target = args[0] ?? 'all';
  const results = await installSkillset(process.cwd(), target, Boolean(flags.force));
  return results.map((r) => `${r.action.toUpperCase()} ${r.target}: ${r.file}`).join('\n');
}

function isRuleVariant(value: string): value is RuleVariant {
  return ['light', 'balanced', 'strict'].includes(value);
}

function ruleVariantStatus(config: { enabled: boolean; active: RuleVariant }): string {
  return `Rule variants: ${config.enabled ? config.active : 'off (balanced default)'}`;
}
