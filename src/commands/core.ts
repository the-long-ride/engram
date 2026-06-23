/** Core user-facing commands: init, help, and completion. */
import fs from 'node:fs/promises';
import { stdout as output } from 'node:process';
import path from 'node:path';
import { initWorkspace } from '../core/memory/storage.js';
import { loadConfig, parseSaveTarget, scopeRootsForConfig } from '../core/runtime/config.js';
import { renderHelpTerminal } from '../core/cli/help.js';
import { INIT_WORDMARK, renderInitWordmark } from '../core/cli/banner.js';
import { completionScript } from '../core/cli/completion.js';
import { detectCompletionTarget } from '../core/cli/completion-target.js';
import { normalizeBranchName } from '../core/vcs/git.js';
import { installSkillset, type InstallResult } from '../core/integrations/skillset.js';
import { applyGlobalRemote, applyWorkspaceSubmodule, planGlobalRemote, planWorkspaceSubmodule, resolveGlobalPath } from './init-plans.js';
import { defaultProfileLines, ensureDefaultProfile } from '../core/runtime/profile-migration.js';

/** Initialize workspace memory. */
export async function cmdInject(flags: Record<string, any>): Promise<string> {
  const wordmark = renderInitWordmark(process.stdout.isTTY);
  output.write(wordmark + '\n');

  const loaded = await loadConfig();
  const globalOnly = flags['global-only'] === true;
  if (globalOnly && flags['no-global'] === true) throw new Error('global-only inject requires global memory; remove --no-global or pass --global-path <path>');
  if (globalOnly && (flags.submodule === true || typeof flags['submodule-remote'] === 'string')) throw new Error('global-only inject cannot configure a workspace submodule');
  const saveTarget = initSaveTarget(flags, globalOnly);
  const requestedBranch = typeof flags['global-branch'] === 'string' ? flags['global-branch'] : loaded.global_git.branch;
  const branch = normalizeBranchName(requestedBranch);
  const submodule = globalOnly ? undefined : await planWorkspaceSubmodule(flags);
  const globalPath = await resolveGlobalPath(flags, loaded.global_path);
  if (saveTarget === 'global' && !globalPath) throw new Error('inject --scope global requires global memory; set ENGRAM_GLOBAL_DIR or pass --global-path <path>');
  const config = { ...loaded, global_path: globalPath, global_git: { ...loaded.global_git, branch } };
  const roots = scopeRootsForConfig(process.cwd(), config);
  const globalRemote = await planGlobalRemote(flags, roots.global, branch, config.global_git);
  await initWorkspace(process.cwd(), Boolean(flags.force), branch, globalPath, { globalOnly, saveTarget });
  if (roots.global && flags['no-global'] !== true) {
    await ensureDefaultProfile(process.cwd());
  }
  if (submodule) await applyWorkspaceSubmodule(submodule);
  await applyGlobalRemote(globalRemote, roots.global, config.global_git);
  await maybeInstallDefaultSkillset(flags, globalOnly);

  const style = injectSuggestionStyle();
  const outputLines = [
    style.success('✔ engram is injected!'),
    '',
    'To configure settings and connect AI agents, run:',
    `  ${style.command('engram entry')}`,
    ''
  ];
  return outputLines.join('\n');
}

function initSaveTarget(flags: Record<string, any>, globalOnly: boolean) {
  if (typeof flags.scope !== 'string') return undefined;
  const target = parseSaveTarget(flags.scope, 'inject --scope');
  if (globalOnly && target !== 'global') throw new Error('global-only inject supports only --scope global');
  return target;
}

async function maybeInstallDefaultSkillset(flags: Record<string, any>, globalOnly = false): Promise<string[]> {
  if (globalOnly) return ['skillset: skipped (global-only inject)'];
  const requested = typeof flags.skillset === 'string' ? flags.skillset.trim() : 'codex';
  if (flags['no-skillset'] === true || isDisabledSkillsetTarget(requested)) return ['skillset: skipped'];
  const results = await installSkillset(process.cwd(), requested, false);
  return [`skillset: ${summarizeSkillsetInstall(results)}`];
}

function injectSuggestionStyle() {
  const color = process.stdout.isTTY ? (open: string, text: string) => `${open}${text}\x1b[0m` : (_open: string, text: string) => text;
  return {
    success: (text: string) => color('\x1b[1;32m', text),
    command: (text: string) => color('\x1b[1;36m', text)
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

/** Print the packaged AI-agent usage guide. */
export async function cmdLlm(): Promise<string> {
  const binDir = path.dirname(process.argv[1] || process.cwd());
  return fs.readFile(path.resolve(binDir, '../../llm.txt'), 'utf8');
}

/** Generate shell completion support for Tab suggestions. */
export async function cmdCompletion(shell = 'bash'): Promise<string> {
  if (shell !== 'bash' && shell !== 'zsh' && shell !== 'powershell') throw new Error('completion supports bash, zsh, or powershell');
  return completionScript(shell);
}
