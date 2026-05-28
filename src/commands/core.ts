/** Core user-facing commands: init, help, save, load, verify, and audit. */
import path from 'node:path';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { HELP_FILE } from '../core/runtime/constants.js';
import { initWorkspace, resolveAuthor, syncGlobalMemoryGit, writeApprovedMemory } from '../core/memory/storage.js';
import { getContext, loadSummary } from '../core/memory/context.js';
import { defaultConfig, defaultGlobalPath, loadConfig, scopeRootsForConfig, writeScopes } from '../core/runtime/config.js';
import { renderHelp, renderHelpTerminal } from '../core/cli/help.js';
import { INIT_WORDMARK } from '../core/cli/banner.js';
import { completionScript } from '../core/cli/command-registry.js';
import { readText, writeText } from '../core/system/fsx.js';
import { applyApprovalEdit, requestApproval, requestGeneratedMemoryApproval, requestGeneratedSelectionApproval, requestGeneratedSelectionText, requestSelectionApproval, type SelectionApproval } from '../core/safety/approval.js';
import { verifyRoot } from '../core/safety/hash.js';
import { route, loadEntries, visibleEntries } from '../core/memory/routing.js';
import { configureGlobalRemote, globalGitInfo, isValidGitRemoteUrl, normalizeBranchName } from '../core/vcs/git.js';
import { planMemorySave, previewSavePlans, type SavePlan } from '../core/memory/save-plan.js';
import { configureWorkspaceSubmodule } from '../core/vcs/submodule.js';
import { rebuildIndex } from '../core/memory/index.js';
import { installSkillset, type InstallResult } from '../core/integrations/skillset.js';
import { autosaveGuidance, generatedMemoryGuidance, inferMemoryType, normalizeMemoryType, parseMemoryCandidate, parseMemoryCandidates } from '../core/memory/memory-candidate.js';
import type { MemoryType, Scope } from '../core/runtime/types.js';

type SubmodulePlan = { lines?: string[]; branch: string; remoteUrl: string; enabled: boolean };
type GlobalRemotePlan = { lines?: string[]; branch: string; remoteUrl: string };

/** Initialize workspace memory. */
export async function cmdInit(flags: Record<string, any>): Promise<string> {
  const prelude = initWordmarkPrelude();
  const loaded = await loadConfig();
  const requestedBranch = typeof flags['global-branch'] === 'string' ? flags['global-branch'] : loaded.global_git.branch;
  const branch = normalizeBranchName(requestedBranch);
  const submodule = await planWorkspaceSubmodule(flags);
  const globalPath = await resolveGlobalPath(flags, loaded.global_path);
  const config = { ...loaded, global_path: globalPath, global_git: { ...loaded.global_git, branch } };
  const roots = scopeRootsForConfig(process.cwd(), config);
  const globalRemote = await planGlobalRemote(flags, roots.global, branch, config.global_git);
  const lines = await initWorkspace(process.cwd(), Boolean(flags.force), branch, globalPath);
  lines.push(...await applyWorkspaceSubmodule(submodule));
  lines.push(...await applyGlobalRemote(globalRemote, roots.global, config.global_git));
  lines.push(...await maybeInstallDefaultSkillset(flags));
  return `${prelude}${lines.join('\n')}`;
}

function initWordmarkPrelude(): string {
  if (process.stdout.isTTY) {
    output.write(`${INIT_WORDMARK}\n`);
    return '';
  }
  return `${INIT_WORDMARK}\n`;
}

async function resolveGlobalPath(flags: Record<string, any>, current = ''): Promise<string> {
  const flagged = typeof flags['global-path'] === 'string' ? flags['global-path'].trim() : '';
  if (flagged) return normalizeGlobalPath(flagged);
  const fallback = current || defaultGlobalPath();
  if (!process.stdin.isTTY || !process.stdout.isTTY) return fallback;
  const rl = createInterface({ input, output });
  try {
    const answer = (await rl.question(`Global Engram path [${fallback}]: `)).trim();
    return normalizeGlobalPath(answer || fallback);
  } finally {
    rl.close();
  }
}

function normalizeGlobalPath(value: string): string {
  if (!value.trim()) return defaultGlobalPath();
  return path.resolve(value.trim());
}

async function maybeInstallDefaultSkillset(flags: Record<string, any>): Promise<string[]> {
  const requested = typeof flags.skillset === 'string' ? flags.skillset.trim() : 'codex';
  if (flags['no-skillset'] === true || isDisabledSkillsetTarget(requested)) return ['skillset: skipped'];
  const results = await installSkillset(process.cwd(), requested, false);
  return [`skillset: ${summarizeSkillsetInstall(results)}`];
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
  if (!explicitType && await shouldSwitchToAutosave(text)) return cmdAutosave([text], flags);
  const ctx = await getContext();
  const scopes = flags.scope ? [flags.scope as Scope] : writeScopes(ctx.config.scope);
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
export async function cmdAutosave(args: string[], flags: Record<string, any> = {}): Promise<string> {
  const ctx = await getContext();
  const scopes = flags.scope ? [flags.scope as Scope] : writeScopes(ctx.config.scope);
  const author = await resolveAuthor();
  const role = rolesFromFlags(flags);
  const acceptAll = flags['accept-all'] === true;
  let text = await autosaveInput(args, flags);
  let plans: SavePlan[] = [];
  let approval: SelectionApproval | undefined = acceptAll ? { accepted: true } : undefined;
  if (!text) {
    if (acceptAll) {
      text = await requestGeneratedSelectionText({ guidance: autosaveGuidance() }) ?? '';
      if (!text) return 'Discarded. No file written.';
    }
    else {
      const captured = await requestGeneratedSelectionApproval(async (generated) => {
        text = generated;
        plans = await planAutosaveCandidates(ctx, generated, scopes, author, role);
        return previewSavePlans(plans);
      }, { guidance: autosaveGuidance() });
      if (!captured) return 'Discarded. No file written.';
      approval = captured.approval;
    }
  } else {
    plans = await planAutosaveCandidates(ctx, text, scopes, author, role);
    if (!acceptAll) approval = await requestSelectionApproval(previewSavePlans(plans));
  }
  if (acceptAll && text && !plans.length) plans = await planAutosaveCandidates(ctx, text, scopes, author, role);
  if (!plans.length) return 'No memory candidates detected.';
  if (!approval?.accepted) return 'Discarded. No file written.';
  if (approval.selected?.length) plans = plans.filter((plan) => plan.candidateIndex === undefined || approval.selected?.includes(plan.candidateIndex));
  if (!plans.length) return 'Discarded. No selected candidates written.';
  const saved = await writeSavePlans(plans, approval.edits);
  return acceptAll ? `Accepted all autosave candidates (--accept-all).\n${saved}` : saved;
}

async function planAutosaveCandidates(ctx: Awaited<ReturnType<typeof getContext>>, text: string, scopes: Scope[], author: string, role?: string[]): Promise<SavePlan[]> {
  const plans: SavePlan[] = [];
  let candidateIndex = 1;
  for (const candidate of parseMemoryCandidates(text)) {
    const candidatePlans = await planMemorySave({ ctx, text: candidate.text, type: candidate.type, scopes, author, role });
    plans.push(...candidatePlans.map((plan) => ({ ...plan, candidateIndex })));
    candidateIndex += 1;
  }
  return plans;
}

async function autosaveInput(args: string[], flags: Record<string, any>): Promise<string> {
  const file = typeof flags.file === 'string' ? flags.file : typeof flags.f === 'string' ? flags.f : '';
  const inline = args.join(' ').trim();
  if (!file) return inline;
  if (inline) throw new Error('autosave accepts either --file or inline text, not both');
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

async function shouldSwitchToAutosave(text: string): Promise<boolean> {
  if (!text || !process.stdin.isTTY || !process.stdout.isTTY || !looksLikeLongSession(text)) return false;
  const rl = createInterface({ input, output });
  try {
    const answer = (await rl.question('This looks like a long session. Use engram autosave to propose multiple memories? [y/N] ')).trim();
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

/** Load routed memory for a query. */
export async function cmdLoad(args: string[], flags: Record<string, any> = {}): Promise<string> {
  const ctx = await getContext();
  if (!ctx.config.enabled || ctx.config.read === 'off') return '';
  const query = args.join(' ') || 'current session';
  const all = flags.all === true;
  const entries = route(ctx.index, query, ctx.config, all, { all, ignorePatterns: ctx.ignorePatterns });
  const loaded = await loadEntries(process.cwd(), entries, ctx.config);
  const summary = loadSummary(entries, ctx.hiddenCount);
  return `${summary}\n\n${loaded.map((row) => row.flagged ? `SKIPPED ${row.entry.file}: ${row.flagged}` : row.content).join('\n\n')}`.trim();
}

/** Explicitly rebuild one or both indexes from memory files. */
export async function cmdRebuildIndex(scope?: string): Promise<string> {
  const ctx = await getContext();
  const scopes = scope === 'workspace' || scope === 'global' ? [scope] : ['workspace', 'global'];
  const rows = [];
  for (const current of scopes) {
    const index = await rebuildIndex(ctx.roots[current as Scope], current as Scope, ctx.ignorePatterns);
    rows.push(`${current}: ${index.entries.length} indexed`);
  }
  return `engram: rebuilt indexes\n${rows.join('\n')}`;
}

/** Verify hashes for one or both scopes. */
export async function cmdVerify(scope?: string): Promise<string> {
  const ctx = await getContext();
  const scopes = scope === 'workspace' || scope === 'global' ? [scope] : ['workspace', 'global'];
  const rows = (await Promise.all(scopes.map((s) => verifyRoot(ctx.roots[s as Scope], s as Scope)))).flat();
  if (!rows.length) return 'engram: no memory files to verify';
  return rows.map((row) => `${row.ok ? 'OK' : 'MISMATCH'} ${row.scope}:${row.file}`).join('\n');
}

/** Show audit rows, with simple filters. */
export async function cmdAudit(flags: Record<string, any>): Promise<string> {
  const ctx = await getContext();
  let entries = visibleEntries(ctx.index.entries, ctx.config, Boolean(flags['low-confidence']), ctx.ignorePatterns);
  if (flags.author) entries = entries.filter((e) => e.author === flags.author);
  if (flags['low-confidence']) entries = entries.filter((e) => e.confidence === 'low');
  if (flags.stale) entries = entries.filter((e) => Date.now() - Date.parse(e.updated) > 180 * 864e5);
  return entries.map((e) => `${e.scope} ${e.type} ${e.id} ${e.updated} ${e.author}`).join('\n') || 'engram: no matching memories';
}

async function planGlobalRemote(flags: Record<string, any>, root: string, branch: string, config: ReturnType<typeof defaultConfig>['global_git']): Promise<GlobalRemotePlan> {
  const remote = typeof flags['global-remote'] === 'string' ? flags['global-remote'].trim() : '';
  if (remote) {
    if (!isValidGitRemoteUrl(remote)) throw new Error('invalid global remote URL');
    return { branch, remoteUrl: remote };
  }
  const info = await globalGitInfo(root, { ...config, branch });
  if (info.remoteUrl) return { branch: info.branch || branch, remoteUrl: '' };
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    return { branch, remoteUrl: '', lines: [
      'global git: no origin remote configured',
      `To share global memory, run: engram init --global-remote <git-url> --global-branch ${branch}`
    ] };
  }
  const rl = createInterface({ input, output });
  try {
    const yes = (await rl.question('Add a Git origin remote for shared global memory? [y/N] ')).trim();
    if (!/^y(es)?$/i.test(yes)) return { branch, remoteUrl: '', lines: ['global git: skipped origin remote setup'] };
    const remoteUrl = await promptRemoteUrl(rl);
    const chosen = (await rl.question(`Branch [${info.branch || branch}]: `)).trim() || info.branch || branch;
    return { branch: normalizeBranchName(chosen), remoteUrl };
  } finally {
    rl.close();
  }
}

async function applyGlobalRemote(plan: GlobalRemotePlan, root: string, config: ReturnType<typeof defaultConfig>['global_git']): Promise<string[]> {
  if (!plan.remoteUrl) return plan.lines ?? [];
  const lines = await configureGlobalRemote(root, plan.remoteUrl, plan.branch, config.remote);
  return [...lines, ...await syncGlobalMemoryGit(process.cwd())];
}

async function planWorkspaceSubmodule(flags: Record<string, any>): Promise<SubmodulePlan> {
  const branch = normalizeBranchName(typeof flags['submodule-branch'] === 'string' ? flags['submodule-branch'] : 'main');
  const remoteUrl = typeof flags['submodule-remote'] === 'string' ? flags['submodule-remote'].trim() : '';
  if (remoteUrl && !isValidGitRemoteUrl(remoteUrl)) throw new Error('invalid submodule remote URL');
  if (flags['no-submodule']) return { branch, remoteUrl: '', enabled: false, lines: ['workspace submodule: skipped'] };
  if (flags.submodule || remoteUrl) return { branch, remoteUrl, enabled: true };
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    return { branch, remoteUrl: '', enabled: false, lines: ['workspace submodule: skipped (run engram init --submodule to enable)'] };
  }
  const rl = createInterface({ input, output });
  try {
    const yes = (await rl.question('Add ./.engram at this folder as a Git submodule? [y/N] ')).trim();
    if (!/^y(es)?$/i.test(yes)) return { branch, remoteUrl: '', enabled: false, lines: ['workspace submodule: skipped'] };
    const chosenRemote = await promptOptionalRemoteUrl(rl, 'Submodule origin URL (optional): ');
    return { branch, remoteUrl: chosenRemote, enabled: true };
  } finally {
    rl.close();
  }
}

async function applyWorkspaceSubmodule(plan: SubmodulePlan): Promise<string[]> {
  if (!plan.enabled) return plan.lines ?? [];
  return configureWorkspaceSubmodule(process.cwd(), { branch: plan.branch, remoteUrl: plan.remoteUrl });
}

async function promptRemoteUrl(rl: { question(query: string): Promise<string> }): Promise<string> {
  for (;;) {
    const remoteUrl = (await rl.question('Remote origin URL: ')).trim();
    if (isValidGitRemoteUrl(remoteUrl)) return remoteUrl;
    output.write('Invalid Git remote URL. Paste an https, ssh, git, file, or git@host:path URL.\n');
  }
}

async function promptOptionalRemoteUrl(rl: { question(query: string): Promise<string> }, question: string): Promise<string> {
  for (;;) {
    const remoteUrl = (await rl.question(question)).trim();
    if (!remoteUrl || isValidGitRemoteUrl(remoteUrl)) return remoteUrl;
    output.write('Invalid Git remote URL. Paste an https, ssh, git, file, or git@host:path URL, or leave blank.\n');
  }
}
