/** Read-oriented commands: load, rebuild-index, verify, and audit. */
import { getContext, loadSummary } from '../core/memory/context.js';
import { rebuildGraph } from '../core/memory/graph.js';
import { invalidMemoryFiles, rebuildIndex } from '../core/memory/index.js';
import { loadEntries, route, visibleEntries } from '../core/memory/routing.js';
import { formatRecords, type RecordBlock } from '../core/cli/format.js';
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
  const rows: RecordBlock[] = [];
  for (const current of scopes) {
    if (!ctx.roots[current as Scope]) {
      rows.push({ title: current, fields: [['Status', 'not configured']] });
      continue;
    }
    const index = await rebuildIndex(ctx.roots[current as Scope], current as Scope, ctx.ignorePatterns);
    const graph = await rebuildGraph(ctx.roots[current as Scope], current as Scope, index, ctx.config);
    rows.push({ title: current, fields: [['Indexed', index.entries.length], ['Graph nodes', graph.nodes.length]] });
  }
  return formatRecords('engram: rebuilt indexes', rows);
}

/** Report malformed memories that rebuild-index skips. */
export async function cmdRepair(scope?: string): Promise<string> {
  const ctx = await getContext();
  const scopes = scope === 'workspace' || scope === 'global' ? [scope] : ['workspace', 'global'];
  const rows: RecordBlock[] = [];
  for (const current of scopes) {
    const root = ctx.roots[current as Scope];
    if (!root) {
      rows.push({ title: current, fields: [['Status', 'not configured']] });
      continue;
    }
    for (const item of await invalidMemoryFiles(root, current as Scope)) {
      rows.push({ title: `${item.scope}:${item.file}`, fields: [['Error', item.error]] });
    }
  }
  const invalid = rows.filter((row) => row.fields?.[0]?.[1] !== 'not configured');
  if (!invalid.length) return rows.length ? formatRecords('No invalid memory files.', rows) : 'No invalid memory files.';
  return formatRecords('Invalid memory files', rows);
}

/** Verify hashes for one or both scopes. */
export async function cmdVerify(scope?: string): Promise<string> {
  const ctx = await getContext();
  const scopes = scope === 'workspace' || scope === 'global' ? [scope] : ['workspace', 'global'];
  const rows = (await Promise.all(scopes.map((s) => ctx.roots[s as Scope] ? verifyRoot(ctx.roots[s as Scope], s as Scope) : []))).flat();
  if (!rows.length) return 'engram: no memory files to verify';
  return formatRecords('Verify memory hashes', rows.map((row) => ({ title: `${row.ok ? 'OK' : 'MISMATCH'} ${row.scope}:${row.file}` })));
}

/** Show audit rows, with simple filters. */
export async function cmdAudit(flags: Record<string, any>): Promise<string> {
  const ctx = await getContext();
  let entries = visibleEntries(ctx.index.entries, ctx.config, Boolean(flags['low-confidence']), ctx.ignorePatterns);
  if (flags.author) entries = entries.filter((e) => e.author === flags.author);
  if (flags['low-confidence']) entries = entries.filter((e) => e.confidence === 'low');
  if (flags.stale) entries = entries.filter((e) => Date.now() - Date.parse(e.updated) > 180 * 864e5);
  return entries.length ? formatRecords(`Audit memories (${entries.length})`, entries.map((entry) => ({
    title: `${entry.scope}:${entry.file}`,
    fields: [['Type', entry.type], ['Id', entry.id], ['Updated', entry.updated], ['Author', entry.author]]
  }))) : 'engram: no matching memories';
}
