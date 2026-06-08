/** Core user-facing commands: init, help, and completion. */
import { stdout as output } from 'node:process';
import { initWorkspace } from '../core/memory/storage.js';
import { loadConfig, parseSaveTarget, scopeRootsForConfig } from '../core/runtime/config.js';
import { renderHelpTerminal } from '../core/cli/help.js';
import { INIT_WORDMARK, renderInitWordmark } from '../core/cli/banner.js';
import { completionScript } from '../core/cli/completion.js';
import { detectCompletionTarget } from '../core/cli/completion-target.js';
import { normalizeBranchName } from '../core/vcs/git.js';
import { installSkillset, type InstallResult } from '../core/integrations/skillset.js';
import { applyGlobalRemote, applyWorkspaceSubmodule, planGlobalRemote, planWorkspaceSubmodule, resolveGlobalPath } from './init-plans.js';

/** Initialize workspace memory. */
export async function cmdInit(flags: Record<string, any>): Promise<string> {
  const prelude = initWordmarkPrelude();
  const loaded = await loadConfig();
  const globalOnly = flags['global-only'] === true;
  if (globalOnly && flags['no-global'] === true) throw new Error('global-only init requires global memory; remove --no-global or pass --global-path <path>');
  if (globalOnly && (flags.submodule === true || typeof flags['submodule-remote'] === 'string')) throw new Error('global-only init cannot configure a workspace submodule');
  const saveTarget = initSaveTarget(flags, globalOnly);
  const requestedBranch = typeof flags['global-branch'] === 'string' ? flags['global-branch'] : loaded.global_git.branch;
  const branch = normalizeBranchName(requestedBranch);
  const submodule = globalOnly ? undefined : await planWorkspaceSubmodule(flags);
  const globalPath = await resolveGlobalPath(flags, loaded.global_path);
  if (saveTarget === 'global' && !globalPath) throw new Error('init --scope global requires global memory; set ENGRAM_GLOBAL_DIR or pass --global-path <path>');
  const config = { ...loaded, global_path: globalPath, global_git: { ...loaded.global_git, branch } };
  const roots = scopeRootsForConfig(process.cwd(), config);
  const globalRemote = await planGlobalRemote(flags, roots.global, branch, config.global_git);
  const lines = await initWorkspace(process.cwd(), Boolean(flags.force), branch, globalPath, { globalOnly, saveTarget });
  if (submodule) lines.push(...await applyWorkspaceSubmodule(submodule));
  lines.push(...await applyGlobalRemote(globalRemote, roots.global, config.global_git));
  lines.push(...await maybeInstallDefaultSkillset(flags, globalOnly));
  lines.push(...initSuccessSuggestions(globalOnly));
  return `${prelude}${lines.join('\n')}`;
}

function initSaveTarget(flags: Record<string, any>, globalOnly: boolean) {
  if (typeof flags.scope !== 'string') return undefined;
  const target = parseSaveTarget(flags.scope, 'init --scope');
  if (globalOnly && target !== 'global') throw new Error('global-only init supports only --scope global');
  return target;
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

/** Generate shell completion support for Tab suggestions. */
export async function cmdCompletion(shell = 'bash'): Promise<string> {
  if (shell !== 'bash' && shell !== 'zsh' && shell !== 'powershell') throw new Error('completion supports bash, zsh, or powershell');
  return completionScript(shell);
}
