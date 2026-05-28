/** Operational commands: health, search, quality, export, import, stats, sync. */
import path from 'node:path';
import { getContext } from '../core/memory/context.js';
import { health, scoreMemory } from '../core/analysis/quality.js';
import { duplicatePairs, searchEntries, stats } from '../core/analysis/search.js';
import { assertFormat, exportBundle, renderFormat, writeSyncTarget } from '../core/integrations/exporter.js';
import { readJson } from '../core/system/fsx.js';
import { syncGlobalMemoryGit, writeApprovedMemory } from '../core/memory/storage.js';
import { requestApproval } from '../core/safety/approval.js';
import { renderEntry } from '../core/runtime/entry.js';
import { visibleEntries } from '../core/memory/routing.js';
import { readGuardedMemory } from '../core/safety/safe-read.js';

/** Return memory health summary. */
export async function cmdHealth(): Promise<string> {
  const ctx = await getContext();
  return health(visibleEntries(ctx.index.entries, ctx.config, false, ctx.ignorePatterns));
}

/** Search the merged index. */
export async function cmdSearch(args: string[]): Promise<string> {
  const ctx = await getContext();
  const entries = visibleEntries(ctx.index.entries, ctx.config, true, ctx.ignorePatterns);
  return searchEntries(entries, args.join(' ')).map((e) => `${e.scope}:${e.file} - ${e.summary}`).join('\n') || 'No matches';
}

/** Score every indexed memory. */
export async function cmdQuality(): Promise<string> {
  const ctx = await getContext();
  const entries = visibleEntries(ctx.index.entries, ctx.config, false, ctx.ignorePatterns);
  const rows = [];
  for (const entry of entries) {
    const row = await readGuardedMemory(process.cwd(), entry, ctx.config, { render: false });
    if (row.flagged) {
      rows.push(`${entry.file} skipped: ${row.flagged}`);
      continue;
    }
    const result = scoreMemory(row.content);
    rows.push(`${entry.file} ${result.score}/100 ${result.issues.join(', ') || '-'}`);
  }
  return rows.join('\n') || 'No memories';
}

/** Show likely duplicate pairs. */
export async function cmdDeduplicate(flags: Record<string, any> = {}): Promise<string> {
  if (flags.semantic) throw new Error('deduplicate --semantic is not supported yet');
  const ctx = await getContext();
  const pairs = duplicatePairs(visibleEntries(ctx.index.entries, ctx.config, false, ctx.ignorePatterns));
  return pairs.map(([a, b, s]) => `${Math.round(s * 100)}% ${a.file} <-> ${b.file}`).join('\n') || 'No duplicate candidates';
}

/** Export to agent formats or a JSON bundle. */
export async function cmdExport(flags: Record<string, any>): Promise<string> {
  const ctx = await getContext();
  const entries = visibleEntries(ctx.index.entries, ctx.config, false, ctx.ignorePatterns);
  const format = flags.format as string | undefined;
  if (format) return renderFormat(process.cwd(), entries, format);
  const out = flags.out as string || path.join(process.cwd(), `engram-bundle-${new Date().toISOString().slice(0, 10)}.json`);
  await exportBundle(process.cwd(), entries, out);
  return `Exported -> ${out}`;
}

/** Import a JSON bundle through the approval gate. */
export async function cmdImport(args: string[]): Promise<string> {
  const file = args[0];
  if (!file) throw new Error('import requires bundle.json');
  const bundle = await readJson<any>(path.resolve(file), { memories: [] });
  let count = 0;
  for (const item of bundle.memories ?? []) {
    const approval = await requestApproval(`Import ${item.entry.scope}:${item.entry.file}\n\n${item.content}`);
    if (!approval.accepted) continue;
    await writeApprovedMemory({ cwd: process.cwd(), scope: item.entry.scope, file: item.entry.file, content: item.content, message: `import ${item.entry.id}` });
    count += 1;
  }
  return `Imported ${count} memories`;
}

/** Print index counts. */
export async function cmdStats(): Promise<string> {
  const ctx = await getContext();
  return stats(visibleEntries(ctx.index.entries, ctx.config, false, ctx.ignorePatterns));
}

/** Print resolved flags and global Git state. */
export async function cmdEntry(): Promise<string> {
  return renderEntry(process.cwd());
}

/** Render live-sync targets once. */
export async function cmdSync(): Promise<string> {
  const before = await getContext();
  const targets = before.config.live_sync.targets;
  for (const target of targets) assertFormat(target);
  const syncRows = await syncGlobalMemoryGit(process.cwd());
  if (!before.config.live_sync.enabled) return `${syncRows.join('\n')}\nLive sync disabled`;
  const ctx = await getContext(process.cwd(), { rebuild: true });
  const entries = visibleEntries(ctx.index.entries, ctx.config, false, ctx.ignorePatterns);
  const written = [];
  for (const target of targets) written.push(await writeSyncTarget(process.cwd(), target, await renderFormat(process.cwd(), entries, target)));
  return `${syncRows.join('\n')}\nSynced: ${written.join(', ')}`;
}
