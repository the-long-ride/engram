/** Read-oriented commands: load, rebuild-index, verify, and audit. */
import { getContext, loadSummary } from '../core/memory/context.js';
import { rebuildGraph } from '../core/memory/graph.js';
import { invalidMemoryFiles, rebuildIndex } from '../core/memory/index.js';
import { loadEntries, route, visibleEntries } from '../core/memory/routing.js';
import type { Scope } from '../core/runtime/types.js';
import { verifyRoot } from '../core/safety/hash.js';

/** Load routed memory for a query. */
export async function cmdLoad(args: string[], flags: Record<string, any> = {}): Promise<string> {
  const ctx = await getContext();
  if (!ctx.config.enabled || ctx.config.read === 'off') return '';
  const query = args.join(' ') || 'current session';
  const all = flags.all === true;
  const entries = route(ctx.index, query, ctx.config, all, { all, ignorePatterns: ctx.ignorePatterns }, ctx.graph);
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
    if (!ctx.roots[current as Scope]) {
      rows.push(`${current}: not configured`);
      continue;
    }
    const index = await rebuildIndex(ctx.roots[current as Scope], current as Scope, ctx.ignorePatterns);
    const graph = await rebuildGraph(ctx.roots[current as Scope], current as Scope, index, ctx.config);
    rows.push(`${current}: ${index.entries.length} indexed, ${graph.nodes.length} graph nodes`);
  }
  return `engram: rebuilt indexes\n${rows.join('\n')}`;
}

/** Report malformed memories that rebuild-index skips. */
export async function cmdRepair(scope?: string): Promise<string> {
  const ctx = await getContext();
  const scopes = scope === 'workspace' || scope === 'global' ? [scope] : ['workspace', 'global'];
  const rows = [];
  for (const current of scopes) {
    const root = ctx.roots[current as Scope];
    if (!root) {
      rows.push(`${current}: not configured`);
      continue;
    }
    for (const item of await invalidMemoryFiles(root, current as Scope)) {
      rows.push(`${item.scope}:${item.file} - ${item.error}`);
    }
  }
  const invalid = rows.filter((row) => !row.endsWith(': not configured'));
  if (!invalid.length) return rows.length ? `No invalid memory files.\n${rows.join('\n')}` : 'No invalid memory files.';
  return `Invalid memory files:\n${rows.join('\n')}`;
}

/** Verify hashes for one or both scopes. */
export async function cmdVerify(scope?: string): Promise<string> {
  const ctx = await getContext();
  const scopes = scope === 'workspace' || scope === 'global' ? [scope] : ['workspace', 'global'];
  const rows = (await Promise.all(scopes.map((s) => ctx.roots[s as Scope] ? verifyRoot(ctx.roots[s as Scope], s as Scope) : []))).flat();
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
