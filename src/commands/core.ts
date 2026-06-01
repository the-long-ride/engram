/** Core user-facing commands: init, help, save, load, verify, and audit. */
import path from 'node:path';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { HELP_FILE } from '../core/runtime/constants.js';
import { initWorkspace, resolveAuthor, writeApprovedMemory } from '../core/memory/storage.js';
import { entryPath, getContext } from '../core/memory/context.js';
import { loadConfig, scopeRootsForConfig, writeScopes } from '../core/runtime/config.js';
import { renderHelp, renderHelpTerminal } from '../core/cli/help.js';
import { INIT_WORDMARK, renderInitWordmark } from '../core/cli/banner.js';
import { completionScript } from '../core/cli/command-registry.js';
import { detectCompletionTarget } from '../core/cli/completion-target.js';
import { readText, writeText } from '../core/system/fsx.js';
import { applyApprovalEdit, requestApproval, requestGeneratedMemoryApproval, requestGeneratedSelectionApproval, requestGeneratedSelectionText, requestSelectionApproval, type SelectionApproval } from '../core/safety/approval.js';
import { normalizeBranchName } from '../core/vcs/git.js';
import { planMemorySave, previewSavePlans, type SavePlan } from '../core/memory/save-plan.js';
import { parseMemory } from '../core/memory/schema.js';
import type { MemorySourceMeta } from '../core/memory/memory-template.js';
import { installSkillset, type InstallResult } from '../core/integrations/skillset.js';
import { generatedMemoryGuidance, inferMemoryType, normalizeMemoryType, parseMemoryCandidate, parseMemoryCandidates, saveSessionGuidance } from '../core/memory/memory-candidate.js';
import { discoverTakeControlSources, planTakeControlSources, renderTakeControlPlan, takeControlGuidance } from '../core/memory/take-control.js';
import { applyGlobalRemote, applyWorkspaceSubmodule, planGlobalRemote, planWorkspaceSubmodule, resolveGlobalPath } from './init-plans.js';
import type { MemoryType, Scope } from '../core/runtime/types.js';

/** Initialize workspace memory. */
export async function cmdInit(flags: Record<string, any>): Promise<string> {
  const prelude = initWordmarkPrelude();
  const loaded = await loadConfig();
  const globalOnly = flags['global-only'] === true;
  if (globalOnly && flags['no-global'] === true) throw new Error('global-only init requires global memory; remove --no-global or pass --global-path <path>');
  if (globalOnly && (flags.submodule === true || typeof flags['submodule-remote'] === 'string')) throw new Error('global-only init cannot configure a workspace submodule');
  const requestedBranch = typeof flags['global-branch'] === 'string' ? flags['global-branch'] : loaded.global_git.branch;
  const branch = normalizeBranchName(requestedBranch);
  const submodule = globalOnly ? undefined : await planWorkspaceSubmodule(flags);
  const globalPath = await resolveGlobalPath(flags, loaded.global_path);
  const config = { ...loaded, global_path: globalPath, global_git: { ...loaded.global_git, branch } };
  const roots = scopeRootsForConfig(process.cwd(), config);
  const globalRemote = await planGlobalRemote(flags, roots.global, branch, config.global_git);
  const lines = await initWorkspace(process.cwd(), Boolean(flags.force), branch, globalPath, { globalOnly });
  if (submodule) lines.push(...await applyWorkspaceSubmodule(submodule));
  lines.push(...await applyGlobalRemote(globalRemote, roots.global, config.global_git));
  lines.push(...await maybeInstallDefaultSkillset(flags, globalOnly));
  lines.push(...initSuccessSuggestions(globalOnly));
  return `${prelude}${lines.join('\n')}`;
}
function initWordmarkPrelude(): string {
  if (process.stdout.isTTY) {
    output.write(`${renderInitWordmark(true)}\n`);
    return '';
  }
  return `${INIT_WORDMARK}\n`;
}

async function maybeInstallDefaultSkillset(flags: Record<string, any>, globalOnly = false): Promise<string[]> {
  if (globalOnly) return ['skillset: skipped (global-only init)'];
  const requested = typeof flags.skillset === 'string' ? flags.skillset.trim() : 'codex';
  if (flags['no-skillset'] === true || isDisabledSkillsetTarget(requested)) return ['skillset: skipped'];
  const results = await installSkillset(process.cwd(), requested, false);
  return [`skillset: ${summarizeSkillsetInstall(results)}`];
}

function initSuccessSuggestions(globalOnly: boolean): string[] {
  const style = initSuggestionStyle();
  return [
    '',
    style.heading('Keep Engram useful:'),
    `${style.label('Priority:')} workspace memory loads first; global memory is fallback for personal/team context across repos.`,
    `- ${style.title('Use slash command in AI chat')}`,
    `  ${style.label('Use for what:')} run Engram features directly through agents without leaving chat.`,
    `  ${style.label('How to use:')} ${style.command('/engram load "<task>"')}, ${style.command('/engram save-session')}, or ${style.command('/engram take-control --all')}.`,
    `  ${style.label('Best example:')} start each session with ${style.command('/engram load "<current task>"')} and save durable lessons before you leave.`,
    `- ${style.title('Install agent skillset')}`,
    `  ${style.label('Use for what:')} teach your agent how to load, search, save, and maintain Engram memory.`,
    `  ${style.label('How to use:')} ${style.command('engram help install-skillset')}, then ${style.command('engram install-skillset <your-agent>')}.`,
    `  ${style.label('Best example:')} run this after init so future sessions know the Engram protocol.`,
    `- ${style.title('Rule strict level')}`,
    `  ${style.label('Use for what:')} tune how strongly loaded rules steer agents.`,
    `  ${style.label('How to use:')} ${style.command('engram set-rule-variant strict|balanced|light|off')}.`,
    `  ${style.label('Best example:')} use strict for smaller automation models, balanced or light for stronger reasoning models.`,
    `- ${style.title('Save session')}`,
    `  ${style.label('Use for what:')} capture several durable memories from a long session.`,
    `  ${style.label('How to use:')} ${style.command('engram save-session')}, ${style.command('engram ss')}, or ${style.command('engram ss -a')} when the human explicitly approves all.`,
    `  ${style.label('Best example:')} end a feature session by saving its new rules, facts, and workflow.`,
    `- ${style.title('Take control')}`,
    `  ${style.label('Use for what:')} migrate existing AGENTS.md, CLAUDE.md, Cursor rules, docs, or notes into Engram memory.`,
    `  ${style.label('How to use:')} ${style.command('engram take-control --all')}, or preview with ${style.command('engram take-control --plan')}.`,
    `  ${style.label('Best example:')} adopt Engram in a repo that already has scattered agent guidance or docs.`,
    `- ${style.title('Maintenance')}`,
    `  ${style.label('Use for what:')} keep memory healthy as it grows.`,
    `  ${style.label('How to use:')} ${style.command('engram verify')}, ${style.command('engram repair')}, ${style.command('engram graph')}, ${style.command('engram quality-check')}, then ${style.command('engram archive --reason <why> <id|file>')}.`,
    `  ${style.label('Best example:')} run verify/repair before commits and use graph + quality-check before archiving stale or contradictory memory.`,
    ...(globalOnly ? [
      `- ${style.title('Global-only saves')}`,
      `  ${style.label('Use for what:')} keep memory across projects without a workspace install.`,
      `  ${style.label('How to use:')} ${style.command('engram save rule "Use pnpm for package management."')}`,
      `  ${style.label('Best example:')} save personal agent preferences once and load them anywhere.`
    ] : [
      `- ${style.title('Global memory')}`,
      `  ${style.label('Use for what:')} keep memory across projects.`,
      `  ${style.label('How to use:')} ${style.command('engram init --global-only --global-path <path>')}, then ${style.command('engram save --scope global "Use pnpm for package management."')}`,
      `  ${style.label('Best example:')} keep personal or team-wide preferences outside one repo.`
    ]),
    '',
    `${style.label('Completion:')} run ${style.command(`engram completion ${detectCompletionTarget()}`)} and add it to your shell profile.`,
    `${style.label('More help:')} run ${style.command('engram -h')} for all commands, or ${style.command('engram help <command>')} for deeper examples.`
  ];
}

function initSuggestionStyle(): Record<'heading' | 'title' | 'label' | 'command', (text: string) => string> {
  const color = process.stdout.isTTY ? (open: string, text: string) => `${open}${text}\x1b[0m` : (_open: string, text: string) => text;
  return {
    heading: (text) => color('\x1b[1;36m', text),
    title: (text) => color('\x1b[1;33m', text),
    label: (text) => color('\x1b[90m', text),
    command: (text) => color('\x1b[1;36m', text)
  };
}

function isDisabledSkillsetTarget(target: string): boolean {
  return ['none', 'off', 'false', '0'].includes(target.toLowerCase());
}

function summarizeSkillsetInstall(results: InstallResult[]): string {
  const written = results.filter((result) => result.action === 'written').map((result) => result.file);
  const skipped = results.filter((result) => result.action === 'skipped').map((result) => result.file);
  const parts = [];
  if (written.length) parts.push(`written ${written.join(', ')}`);
  if (skipped.length) parts.push(`skipped ${skipped.join(', ')}`);
  return parts.join('; ') || 'no changes';
}

/** Show cached help or refresh it. */
export async function cmdHelp(topic = ''): Promise<string> {
  return renderHelpTerminal(topic);
}

/** Regenerate workspace HELP.md. */
export async function cmdUpdateHelp(): Promise<string> {
  const ctx = await getContext();
  await writeText(path.join(ctx.roots.workspace, HELP_FILE), renderHelp());
  return 'engram: HELP.md refreshed';
}

/** Generate shell completion support for Tab suggestions. */
export async function cmdCompletion(shell = 'bash'): Promise<string> {
  if (shell !== 'bash' && shell !== 'zsh' && shell !== 'powershell') throw new Error('completion supports bash, zsh, or powershell');
  return completionScript(shell);
}

/** Draft, approve, and write a memory. */
export async function cmdSave(args: string[], flags: Record<string, any>): Promise<string> {
  const explicitType = normalizeMemoryType(args[0]);
  let type: MemoryType = explicitType ?? inferMemoryType(args.join(' '));
  let text = (explicitType ? args.slice(1) : args).join(' ').trim();
  if (!explicitType && await shouldSwitchToSaveSession(text)) return cmdSaveSession([text], flags);
  const ctx = await getContext();
  const scopes = flags.scope ? [flags.scope as Scope] : writeScopes(ctx.config.scope, ctx.config);
  const author = await resolveAuthor();
  const role = rolesFromFlags(flags);
  let approval;
  let plans: SavePlan[] = [];
  if (!text) {
    const captured = await requestGeneratedMemoryApproval(async (generated) => {
      const candidate = parseMemoryCandidate(generated, { explicitType });
      type = candidate.type;
      text = candidate.text;
      plans = await planMemorySave({ ctx, text, type, scopes, author, role });
      return previewSavePlans(plans);
    }, { explicitType, guidance: generatedMemoryGuidance(explicitType) });
    if (!captured) return 'Discarded. No file written.';
    approval = captured.approval;
  } else {
    const candidate = parseMemoryCandidate(text, { explicitType });
    type = candidate.type;
    text = candidate.text;
    plans = await planMemorySave({ ctx, text, type, scopes, author, role });
    approval = await requestApproval(previewSavePlans(plans));
  }
  if (!approval.accepted) return 'Discarded. No file written.';
  return writeSavePlans(plans, approval.edits);
}

/** Propose multiple memories from a long session summary or agent brainstorm. */
export async function cmdSaveSession(args: string[], flags: Record<string, any> = {}): Promise<string> {
  const ctx = await getContext();
  const scopes = flags.scope ? [flags.scope as Scope] : writeScopes(ctx.config.scope, ctx.config);
  const author = await resolveAuthor();
  const role = rolesFromFlags(flags);
  const acceptAll = flags['accept-all'] === true;
  let text = await saveSessionInput(args, flags);
  let plans: SavePlan[] = [];
  let approval: SelectionApproval | undefined = acceptAll ? { accepted: true } : undefined;
  if (!text) {
    if (acceptAll) {
      text = await requestGeneratedSelectionText({ guidance: saveSessionGuidance(), acceptAll }) ?? '';
      if (!text) return 'Discarded. No file written.';
    }
    else {
      const captured = await requestGeneratedSelectionApproval(async (generated) => {
        text = generated;
        plans = await planSaveSessionCandidates(ctx, generated, scopes, author, role);
        return previewSavePlans(plans);
      }, { guidance: saveSessionGuidance() });
      if (!captured) return 'Discarded. No file written.';
      approval = captured.approval;
    }
  } else {
    plans = await planSaveSessionCandidates(ctx, text, scopes, author, role);
    if (!acceptAll) approval = await requestSelectionApproval(previewSavePlans(plans));
  }
  if (acceptAll && text && !plans.length) plans = await planSaveSessionCandidates(ctx, text, scopes, author, role);
  if (!plans.length) return 'No memory candidates detected.';
  if (!approval?.accepted) return 'Discarded. No file written.';
  if (approval.selected?.length) plans = plans.filter((plan) => plan.candidateIndex === undefined || approval.selected?.includes(plan.candidateIndex));
  if (!plans.length) return 'Discarded. No selected candidates written.';
  const saved = await writeSavePlans(plans, approval.edits);
  return acceptAll ? `Accepted all save-session candidates (--accept-all).\n${saved}` : saved;
}

/** Convert existing workspace guidance into approved Engram memories with agent help. */
export async function cmdTakeControl(args: string[], flags: Record<string, any> = {}): Promise<string> {
  const ctx = await getContext();
  const sourceHashes = await importedSourceHashes(ctx);
  const takeControlFlags = { ...flags, 'known-source-hashes': sourceHashes };
  if (flags.plan === true) return renderTakeControlPlan(await planTakeControlSources(process.cwd(), ctx.ignorePatterns, takeControlFlags));
  const acceptAll = flags['accept-all'] === true;
  const sources = await discoverTakeControlSources(process.cwd(), ctx.ignorePatterns, takeControlFlags);
  const guidance = takeControlGuidance(sources, { acceptAll });
  if (flags['dry-run']) return guidance;
  if (!sources.length && !args.join(' ').trim()) return 'No workspace guidance files found. Try engram take-control --all or --file <path>.';
  const scopes = flags.scope ? [flags.scope as Scope] : writeScopes(ctx.config.scope, ctx.config);
  const author = await resolveAuthor();
  const role = rolesFromFlags(flags);
  let text = args.join(' ').trim();
  let plans: SavePlan[] = [];
  let approval: SelectionApproval | undefined = acceptAll ? { accepted: true } : undefined;
  const source = takeControlSourceMeta(sources);
  if (!text) {
    if (acceptAll) text = await requestGeneratedSelectionText({ guidance, acceptAll }) ?? '';
    else {
      const captured = await requestGeneratedSelectionApproval(async (generated) => {
        text = generated;
        plans = await planSaveSessionCandidates(ctx, generated, scopes, author, role, source);
        return previewSavePlans(plans);
      }, { guidance });
      if (!captured) return 'Discarded. No file written.';
      approval = captured.approval;
    }
  } else {
    plans = await planSaveSessionCandidates(ctx, text, scopes, author, role, source);
    if (!acceptAll) approval = await requestSelectionApproval(previewSavePlans(plans));
  }
  if (acceptAll && text && !plans.length) plans = await planSaveSessionCandidates(ctx, text, scopes, author, role, source);
  if (!plans.length) return 'No memory candidates detected.';
  if (!approval?.accepted) return 'Discarded. No file written.';
  if (approval.selected?.length) plans = plans.filter((plan) => plan.candidateIndex === undefined || approval.selected?.includes(plan.candidateIndex));
  if (!plans.length) return 'Discarded. No selected candidates written.';
  const saved = await writeSavePlans(plans, approval.edits);
  const prefix = acceptAll ? 'Take-control accepted all candidates (--accept-all).' : `Take-control consumed ${sources.length} source file${sources.length === 1 ? '' : 's'}.`;
  return `${prefix}\n${saved}`;
}

async function planSaveSessionCandidates(ctx: Awaited<ReturnType<typeof getContext>>, text: string, scopes: Scope[], author: string, role?: string[], source?: MemorySourceMeta): Promise<SavePlan[]> {
  const plans: SavePlan[] = [];
  let candidateIndex = 1;
  for (const candidate of parseMemoryCandidates(text)) {
    const candidatePlans = await planMemorySave({ ctx, text: candidate.text, type: candidate.type, scopes, author, role, source });
    plans.push(...candidatePlans.map((plan) => ({ ...plan, candidateIndex })));
    candidateIndex += 1;
  }
  return plans;
}

async function importedSourceHashes(ctx: Awaited<ReturnType<typeof getContext>>): Promise<Set<string>> {
  const hashes = new Set<string>();
  for (const entry of ctx.index.entries) {
    try {
      const raw = await readText(entryPath(ctx, entry.scope, entry.file));
      const doc = parseMemory(raw);
      for (const hash of frontmatterStrings(doc.frontmatter.source_hashes)) hashes.add(hash);
    } catch {
      continue;
    }
  }
  return hashes;
}

function takeControlSourceMeta(sources: Awaited<ReturnType<typeof discoverTakeControlSources>>): MemorySourceMeta | undefined {
  if (!sources.length) return undefined;
  return {
    source: 'take-control',
    sourceFiles: sources.map((source) => source.file),
    sourceHashes: sources.map((source) => source.hash)
  };
}

function frontmatterStrings(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string' && Boolean(item.trim()));
  return typeof value === 'string' && value.trim() ? [value] : [];
}

async function saveSessionInput(args: string[], flags: Record<string, any>): Promise<string> {
  const files = [
    ...(Array.isArray(flags.file) ? flags.file : typeof flags.file === 'string' ? [flags.file] : []),
    ...(typeof flags.f === 'string' ? [flags.f] : [])
  ];
  if (files.length > 1) throw new Error('save-session accepts only one --file');
  const file = files[0] ?? '';
  const inline = args.join(' ').trim();
  if (!file) return inline;
  if (inline) throw new Error('save-session accepts either --file or inline text, not both');
  return readText(path.resolve(file));
}

async function writeSavePlans(plans: SavePlan[], edits?: string): Promise<string> {
  const written = [];
  for (const plan of plans) {
    const content = applyApprovalEdit(plan.content, edits);
    written.push(await writeApprovedMemory({ cwd: process.cwd(), scope: plan.scope, file: plan.file, content, message: plan.message }));
  }
  return `Saved -> ${written.join(', ')}`;
}

async function shouldSwitchToSaveSession(text: string): Promise<boolean> {
  if (!text || !process.stdin.isTTY || !process.stdout.isTTY || !looksLikeLongSession(text)) return false;
  const rl = createInterface({ input, output });
  try {
    const answer = (await rl.question('This looks like a long session. Use engram save-session to propose multiple memories? [y/N] ')).trim();
    return /^y(es)?$/i.test(answer);
  } finally {
    rl.close();
  }
}

function looksLikeLongSession(text: string): boolean {
  return text.length > 800 || text.split(/\r?\n/).filter(Boolean).length >= 8;
}

function rolesFromFlags(flags: Record<string, any>): string[] | undefined {
  const value = typeof flags.role === 'string' ? flags.role : typeof flags.roles === 'string' ? flags.roles : '';
  const roles = value.split(',').map((role) => role.trim()).filter(Boolean);
  return roles.length ? roles : undefined;
}
