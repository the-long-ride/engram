/** Read-oriented commands: load, rebuild-index, verify, audit, and rehash. */
import path from 'node:path';
import { getContext, loadSummary } from '../core/memory/context.js';
import { rebuildGraph } from '../core/memory/graph.js';
import { invalidMemoryFiles, rebuildIndex } from '../core/memory/index.js';
import { loadEntries, routeDetailed, visibleEntries, type RouteDetail } from '../core/memory/routing.js';
import { ensureVectorIndex, vectorRouteHits } from '../core/memory/vector-db.js';
import { formatRecords, type RecordBlock } from '../core/cli/format.js';
import type { Scope } from '../core/runtime/types.js';
import { loadHashes, updateHash, verifyRoot, sha256 } from '../core/safety/hash.js';
import { inside, listFiles, readText, writeJson } from '../core/system/fsx.js';
import { scopeRootsForConfig } from '../core/runtime/config.js';
import { HASH_FILE } from '../core/runtime/constants.js';

/** Load routed memory for a query. */
export async function cmdLoad(args: string[], flags: Record<string, any> = {}): Promise<string> {
  const ctx = await getContext();
  if (!ctx.config.enabled || ctx.config.read === 'off') return '';
  const query = args.join(' ') || 'current session';
  const all = flags.all === true;
  const vectorHits = all ? [] : await vectorRouteHits(ctx.roots, ctx.scopeIndexes, ctx.config, query, ctx.ignorePatterns, all);
  const routed = routeDetailed(ctx.index, query, ctx.config, all, {
    all,
    ignorePatterns: ctx.ignorePatterns,
    vectorHits,
    candidatePool: ctx.config.vector.candidate_pool
  }, ctx.graph);
  const entries = routed.entries;
  if (flags['dry-run'] === true) {
    if (!entries.length) return 'No routed memories';
    const rows: RecordBlock[] = [];
    if (routed.omitted) rows.push(refinementRecord(routed));
    rows.push(...entries.map((entry): RecordBlock => ({
      title: `${entry.scope}:${entry.file}`,
      fields: [['Type', entry.type], ['Summary', entry.summary]]
    })));
    return formatRecords(`Routed memories (${entries.length} of ${routed.candidates})`, rows);
  }
  const loaded = await loadEntries(process.cwd(), entries, ctx.config);
  const summary = loadSummary(entries, ctx.hiddenCount, routed.candidates);
  return `${summary}${routeHint(routed)}\n\n${loaded.map((row) => {
    if (!row.content) return `SKIPPED ${row.entry.file}: ${row.flagged ?? 'empty'}`;
    if (row.flagged) return `⚠ ${row.entry.file}: ${row.flagged} (run \`engram rehash ${row.entry.scope}\` to re-hash)\n\n${row.content}`;
    return row.content;
  }).join('\n\n')}`.trim();
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
    const vector = await ensureVectorIndex(ctx.roots[current as Scope], current as Scope, visibleEntries(index.entries, ctx.config, true, ctx.ignorePatterns), ctx.config, { force: true });
    rows.push({ title: current, fields: [['Indexed', index.entries.length], ['Graph nodes', graph.nodes.length], ['Vector', vector.action], ['Vector reason', vector.reason ?? '-']] });
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

function refinementRecord(routed: RouteDetail): RecordBlock {
  const tags = routed.facets.map((facet) => facet.tag).join(', ') || '-';
  return {
    title: 'Refinement',
    fields: [
      ['Candidates', routed.candidates],
      ['Selected', routed.selected],
      ['Omitted', routed.omitted],
      ['Narrow with tags', tags]
    ]
  };
}

function routeHint(routed: RouteDetail): string {
  if (!routed.omitted) return '';
  const tags = routed.facets.map((facet) => facet.tag).join(', ');
  return `\nengram: refined ${routed.selected} of ${routed.candidates} related memories${tags ? `; narrow with tags: ${tags}` : ''}`;
}

/** Recompute hashes for all memory files in one or both scopes. */
export async function cmdRehash(scope?: string): Promise<string> {
  const ctx = await getContext();
  const scopes = scope === 'workspace' || scope === 'global' ? [scope] : ['workspace', 'global'];
  const rows: RecordBlock[] = [];
  for (const current of scopes) {
    const root = ctx.roots[current as Scope];
    if (!root) {
      rows.push({ title: current, fields: [['Status', 'not configured']] });
      continue;
    }
    let updated = 0;
    let unchanged = 0;
    const files = (await listFiles(root)).filter((file) => file.endsWith('.md'));
    const newHashes: Record<string, string> = {};
    for (const file of files) {
      const rel = path.relative(root, file).replace(/\\/g, '/');
      if (!/^(rules|skills|knowledge)\//.test(rel)) continue;
      if (rel === 'HELP.md' || rel === 'README.md' || rel === 'changelog.md') continue;
      const content = await readText(file);
      const hash = sha256(content);
      newHashes[rel] = hash;
      updated += 1;
    }
    // Compare with existing hashes to report changes.
    const oldHashes = await loadHashes(root);
    let changed = 0;
    for (const [file, hash] of Object.entries(newHashes)) {
      if (oldHashes[file] !== hash) changed += 1;
    }
    // Write the full hash store.
    await writeJson(path.join(root, HASH_FILE), newHashes);
    rows.push({ title: current, fields: [['Hashed', updated], ['Changed', changed], ['Unchanged', updated - changed]] });
  }
  return formatRecords('engram: rehashed memory files', rows);
}
