/** Core user-facing commands: init, help, save, load, verify, and audit. */
import path from 'node:path';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { HELP_FILE } from '../core/constants.js';
import { initWorkspace, resolveAuthor, syncGlobalMemoryGit, writeApprovedMemory } from '../core/storage.js';
import { getContext, loadSummary } from '../core/context.js';
import { defaultConfig, scopeRoots, writeScopes } from '../core/config.js';
import { renderHelp, renderHelpTerminal } from '../core/help.js';
import { readText, writeText } from '../core/fsx.js';
import { applyApprovalEdit, requestApproval, requestGeneratedKnowledgeApproval } from '../core/approval.js';
import { verifyRoot } from '../core/hash.js';
import { route, loadEntries } from '../core/routing.js';
import { configureGlobalRemote, globalGitInfo, isValidGitRemoteUrl, normalizeBranchName } from '../core/git.js';
import { planMemorySave, previewSavePlans } from '../core/save-plan.js';
import { configureWorkspaceSubmodule } from '../core/submodule.js';
import type { MemoryType, Scope } from '../core/types.js';

/** Initialize workspace memory. */
export async function cmdInit(flags: Record<string, any>): Promise<string> {
  const config = defaultConfig().global_git;
  const requestedBranch = typeof flags['global-branch'] === 'string' ? flags['global-branch'] : config.branch;
  const branch = normalizeBranchName(requestedBranch);
  const lines = await initWorkspace(process.cwd(), Boolean(flags.force), branch);
  lines.push(...await maybeConfigureWorkspaceSubmodule(flags));
  const remote = typeof flags['global-remote'] === 'string' ? flags['global-remote'].trim() : '';
  if (remote) {
    lines.push(...await configureGlobalRemote(scopeRoots().global, remote, branch, config.remote));
    lines.push(...await syncGlobalMemoryGit(process.cwd()));
  } else {
    lines.push(...await maybeConfigureGlobalRemote(branch));
  }
  return lines.join('\n');
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

/** Draft, approve, and write a memory. */
export async function cmdSave(args: string[], flags: Record<string, any>): Promise<string> {
  const maybeType = args[0] as MemoryType | undefined;
  const type: MemoryType = ['rule', 'skill', 'knowledge'].includes(maybeType ?? '') ? maybeType as MemoryType : 'knowledge';
  let text = (type === maybeType ? args.slice(1) : args).join(' ').trim();
  const ctx = await getContext();
  const scopes = flags.scope ? [flags.scope as Scope] : writeScopes(ctx.config.scope);
  const author = await resolveAuthor();
  let approval;
  if (!text && maybeType === 'knowledge') {
    const captured = await requestGeneratedKnowledgeApproval(async (generated) => previewSave(generated, type, scopes, author, ctx));
    if (!captured) return 'Discarded. No file written.';
    text = captured.text;
    approval = captured.approval;
  } else {
    if (!text) throw new Error('save requires memory text');
    approval = await requestApproval(await previewSave(text, type, scopes, author, ctx));
  }
  if (!approval.accepted) return 'Discarded. No file written.';
  const plans = await planMemorySave({ ctx, text, type, scopes, author });
  const written = [];
  for (const plan of plans) {
    const content = applyApprovalEdit(plan.content, approval.edits);
    written.push(await writeApprovedMemory({ cwd: process.cwd(), scope: plan.scope, file: plan.file, content, message: plan.message }));
  }
  return `Saved -> ${written.join(', ')}`;
}

async function previewSave(text: string, type: MemoryType, scopes: Scope[], author: string, ctx: Awaited<ReturnType<typeof getContext>>): Promise<string> {
  return previewSavePlans(await planMemorySave({ ctx, text, type, scopes, author }));
}

/** Load routed memory for a query. */
export async function cmdLoad(args: string[], manual = true): Promise<string> {
  const ctx = await getContext();
  if (!ctx.config.enabled || ctx.config.read === 'off') return '';
  const query = args.join(' ') || 'current session';
  const entries = route(ctx.index, query, ctx.config, manual);
  const loaded = await loadEntries(process.cwd(), entries, ctx.config);
  const summary = loadSummary(entries, ctx.hiddenCount);
  return `${summary}\n\n${loaded.map((row) => row.flagged ? `SKIPPED ${row.entry.file}: ${row.flagged}` : row.content).join('\n\n')}`.trim();
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
  let entries = ctx.index.entries;
  if (flags.author) entries = entries.filter((e) => e.author === flags.author);
  if (flags['low-confidence']) entries = entries.filter((e) => e.confidence === 'low');
  if (flags.stale) entries = entries.filter((e) => Date.now() - Date.parse(e.updated) > 180 * 864e5);
  return entries.map((e) => `${e.scope} ${e.type} ${e.id} ${e.updated} ${e.author}`).join('\n') || 'engram: no matching memories';
}

async function maybeConfigureGlobalRemote(branch: string): Promise<string[]> {
  const root = scopeRoots().global;
  const config = defaultConfig().global_git;
  const info = await globalGitInfo(root, { ...config, branch });
  if (info.remoteUrl) return [];
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    return [
      'global git: no origin remote configured',
      `To share global memory, run: engram init --global-remote <git-url> --global-branch ${branch}`
    ];
  }
  const rl = createInterface({ input, output });
  try {
    const yes = (await rl.question('Add a Git origin remote for shared global memory? [y/N] ')).trim();
    if (!/^y(es)?$/i.test(yes)) return ['global git: skipped origin remote setup'];
    const remoteUrl = await promptRemoteUrl(rl);
    const chosen = (await rl.question(`Branch [${info.branch || branch}]: `)).trim() || info.branch || branch;
    normalizeBranchName(chosen);
    const lines = await configureGlobalRemote(root, remoteUrl, chosen, config.remote);
    return [...lines, ...await syncGlobalMemoryGit(process.cwd())];
  } finally {
    rl.close();
  }
}

async function maybeConfigureWorkspaceSubmodule(flags: Record<string, any>): Promise<string[]> {
  const branch = normalizeBranchName(typeof flags['submodule-branch'] === 'string' ? flags['submodule-branch'] : 'main');
  const remoteUrl = typeof flags['submodule-remote'] === 'string' ? flags['submodule-remote'].trim() : '';
  if (remoteUrl && !isValidGitRemoteUrl(remoteUrl)) throw new Error('invalid submodule remote URL');
  if (flags['no-submodule']) return ['workspace submodule: skipped'];
  if (flags.submodule || remoteUrl) return configureWorkspaceSubmodule(process.cwd(), { branch, remoteUrl });
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    return ['workspace submodule: skipped (run engram init --submodule to enable)'];
  }
  const rl = createInterface({ input, output });
  try {
    const yes = (await rl.question('Add .engram as a Git submodule? [y/N] ')).trim();
    if (!/^y(es)?$/i.test(yes)) return ['workspace submodule: skipped'];
    const chosenRemote = await promptOptionalRemoteUrl(rl, 'Submodule origin URL (optional): ');
    return configureWorkspaceSubmodule(process.cwd(), { branch, remoteUrl: chosenRemote });
  } finally {
    rl.close();
  }
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
