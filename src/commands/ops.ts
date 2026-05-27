/** Operational commands: health, search, quality, export, import, stats, sync. */
import path from 'node:path';
import { getContext, entryPath } from '../core/context.js';
import { health, scoreMemory } from '../core/quality.js';
import { duplicatePairs, searchEntries, stats } from '../core/search.js';
import { exportBundle, renderFormat, writeSyncTarget } from '../core/exporter.js';
import { readJson, readText, writeText } from '../core/fsx.js';
import { writeApprovedMemory } from '../core/storage.js';
import { requestApproval } from '../core/approval.js';

/** Return memory health summary. */
export async function cmdHealth(): Promise<string> {
  const ctx = await getContext();
  return health(ctx.index.entries);
}

/** Search the merged index. */
export async function cmdSearch(args: string[]): Promise<string> {
  const ctx = await getContext();
  return searchEntries(ctx.index.entries, args.join(' ')).map((e) => `${e.scope}:${e.file} - ${e.summary}`).join('\n') || 'No matches';
}

/** Score every indexed memory. */
export async function cmdQuality(): Promise<string> {
  const ctx = await getContext();
  const rows = [];
  for (const entry of ctx.index.entries) {
    const result = scoreMemory(await readText(entryPath(ctx, entry.scope, entry.file)));
    rows.push(`${entry.file} ${result.score}/100 ${result.issues.join(', ') || '-'}`);
  }
  return rows.join('\n') || 'No memories';
}

/** Show likely duplicate pairs. */
export async function cmdDeduplicate(): Promise<string> {
  const ctx = await getContext();
  const pairs = duplicatePairs(ctx.index.entries);
  return pairs.map(([a, b, s]) => `${Math.round(s * 100)}% ${a.file} <-> ${b.file}`).join('\n') || 'No duplicate candidates';
}

/** Export to agent formats or a JSON bundle. */
export async function cmdExport(flags: Record<string, any>): Promise<string> {
  const ctx = await getContext();
  const format = flags.format as string | undefined;
  if (format) return renderFormat(process.cwd(), ctx.index.entries, format);
  const out = flags.out as string || path.join(process.cwd(), `engram-bundle-${new Date().toISOString().slice(0, 10)}.json`);
  await exportBundle(process.cwd(), ctx.index.entries, out);
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
  return stats(ctx.index.entries);
}

/** Render live-sync targets once. */
export async function cmdSync(): Promise<string> {
  const ctx = await getContext();
  const targets = ctx.config.live_sync.targets;
  const written = [];
  for (const target of targets) written.push(await writeSyncTarget(process.cwd(), target, await renderFormat(process.cwd(), ctx.index.entries, target)));
  return `Synced: ${written.join(', ')}`;
}
