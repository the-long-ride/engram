/** Core user-facing commands: init, help, save, load, verify, and audit. */
import path from 'node:path';
import { HELP_FILE } from '../core/constants.js';
import { initWorkspace, resolveAuthor, writeApprovedMemory } from '../core/storage.js';
import { getContext, loadSummary } from '../core/context.js';
import { writeScopes } from '../core/config.js';
import { renderHelp } from '../core/help.js';
import { readText, writeText } from '../core/fsx.js';
import { draftMemory } from '../core/memory-template.js';
import { applyApprovalEdit, requestApproval } from '../core/approval.js';
import { verifyRoot } from '../core/hash.js';
import { route, loadEntries } from '../core/routing.js';
import type { MemoryType, Scope } from '../core/types.js';

/** Initialize workspace memory. */
export async function cmdInit(flags: Record<string, any>): Promise<string> {
  return (await initWorkspace(process.cwd(), Boolean(flags.force))).join('\n');
}

/** Show cached help or refresh it. */
export async function cmdHelp(topic = ''): Promise<string> {
  const ctx = await getContext();
  const file = path.join(ctx.roots.workspace, HELP_FILE);
  const help = await readText(file) || renderHelp();
  if (!topic) return help;
  const parts = help.split(/^## /m);
  const hit = parts.find((part) => part.toLowerCase().startsWith(topic.toLowerCase()));
  return hit ? `## ${hit}` : help;
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
  const text = (type === maybeType ? args.slice(1) : args).join(' ').trim();
  if (!text) throw new Error('save requires memory text');
  const ctx = await getContext();
  const scopes = flags.scope ? [flags.scope as Scope] : writeScopes(ctx.config.scope);
  const draft = draftMemory({ text, type, scope: scopes[0], author: await resolveAuthor() });
  const approval = await requestApproval(`Type: ${type}\nScope: ${scopes.join(', ')}\nFile: ${draft.file}\n\n${draft.content}`);
  if (!approval.accepted) return 'Discarded. No file written.';
  const written = [];
  for (const scope of scopes) {
    const scoped = draftMemory({ text, type, scope, author: await resolveAuthor() });
    const content = applyApprovalEdit(scoped.content, approval.edits);
    written.push(await writeApprovedMemory({ cwd: process.cwd(), scope, file: scoped.file, content, message: `add ${type}: ${scoped.id}` }));
  }
  return `Saved -> ${written.join(', ')}`;
}

/** Load routed memory for a query. */
export async function cmdLoad(args: string[], manual = true): Promise<string> {
  const ctx = await getContext();
  if (!ctx.config.enabled || ctx.config.read === 'off') return '';
  const query = args.join(' ') || 'current session';
  const entries = route(ctx.index, query, ctx.config, manual);
  const loaded = await loadEntries(process.cwd(), entries);
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
