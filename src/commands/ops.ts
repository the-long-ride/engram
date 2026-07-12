/** Operational commands: health, search, quality, export, import, stats, sync. */
import path from 'node:path';
import { getContext } from '../core/memory/context.js';
import { health, scoreMemory } from '../core/analysis/quality.js';
import type { MemoryLimits } from '../core/memory/schema.js';
import { duplicatePairs, searchEntries, semanticDuplicatePairs, semanticSearchEntries, stats, statsData } from '../core/analysis/search.js';
import { healthData } from '../core/analysis/quality.js';
import { assertFormat, exportBundle, renderFormat, writeSyncTarget } from '../core/integrations/exporter.js';
import { readJson, readText } from '../core/system/fsx.js';
import { resolveAuthor, syncGlobalMemoryGit, writeApprovedMemory } from '../core/memory/storage.js';
import { applyApprovalEdit, requestApproval } from '../core/safety/approval.js';
import { launchEntryUi } from '../core/web/entry-server.js';
import { route, visibleEntries } from '../core/memory/routing.js';
import { vectorRouteHits } from '../core/memory/vector-db.js';
import { readGuardedMemory } from '../core/safety/safe-read.js';
import { contradictionEdges, renderGraphReport } from '../core/memory/graph.js';
import { archiveMemory, planArchiveSet } from '../core/memory/archive.js';
import { planMemorySave, previewSavePlans, type SavePlan } from '../core/memory/save-plan.js';
import { normalizeMemoryType } from '../core/memory/memory-candidate.js';
import { parseSaveTarget, writeScopes } from '../core/runtime/config.js';
import { normalizeLoadLimit } from '../core/runtime/load-limit.js';
import { isJsonMode, jsonOk } from '../core/cli/json-output.js';
import { EngramError, ExitCode } from '../core/runtime/exit-codes.js';
import { formatRecords, type RecordBlock } from '../core/cli/format.js';
import type { MemoryType, Scope } from '../core/runtime/types.js';

/** Return memory health summary. */
export async function cmdHealth(flags: Record<string, any> = {}): Promise<string> {
  const ctx = await getContext();
  const entries = visibleEntries(ctx.index.entries, ctx.config, false, ctx.ignorePatterns);
  return isJsonMode(flags) ? jsonOk(healthData(entries, ctx.hiddenCount)) : health(entries, ctx.hiddenCount);
}

/** Search the merged index. */
export async function cmdSearch(args: string[], flags: Record<string, any> = {}): Promise<string> {
  const ctx = await getContext();
  const entries = visibleEntries(ctx.index.entries, ctx.config, true, ctx.ignorePatterns);
  const search = flags.semantic ? semanticSearchEntries : searchEntries;
  const query = args.join(' ');
  const hits = search(entries, query);
  if (isJsonMode(flags)) {
    return jsonOk({
      query,
      semantic: Boolean(flags.semantic),
      count: hits.length,
      results: hits.map((entry) => ({ id: entry.id, scope: entry.scope, type: entry.type, file: entry.file, summary: entry.summary }))
    });
  }
  if (!hits.length) return 'No matches';
  const title = flags.semantic ? `Semantic search results (${hits.length})` : `Search results (${hits.length})`;
  return formatRecords(title, hits.map((entry) => ({
    title: `${entry.scope}:${entry.file}`,
    fields: [['Type', entry.type], ['Summary', entry.summary]]
  })));
}

/** Score every indexed memory. */
export async function cmdQuality(flags: Record<string, any> = {}): Promise<string> {
  const ctx = await getContext();
  const entries = visibleEntries(ctx.index.entries, ctx.config, false, ctx.ignorePatterns);
  const scored: Array<{ file: string; scope: string; id: string; score: number; issues: string[] }> = [];
  const rows: RecordBlock[] = [];
  for (const entry of entries) {
    const row = await readGuardedMemory(process.cwd(), entry, ctx.config, { render: false });
    if (row.flagged) {
      rows.push({ title: entry.file, fields: [['Status', `skipped: ${row.flagged}`]] });
      scored.push({ file: entry.file, scope: entry.scope, id: entry.id, score: 0, issues: [`skipped: ${row.flagged}`] });
      continue;
    }
    const { memory } = ctx.config;
    const result = scoreMemory(row.content, { ruleLineTarget: memory.rule_line_target, ruleLineHardLimit: memory.rule_line_hard_limit });
    scored.push({ file: entry.file, scope: entry.scope, id: entry.id, score: result.score, issues: result.issues });
    rows.push({ title: entry.file, fields: [['Score', `${result.score}/100`], ['Issues', result.issues.join(', ') || '-']] });
  }
  const contradictions = contradictionEdges(ctx.graph);
  for (const edge of contradictions) rows.push({ title: 'contradiction candidate', fields: [['From', edge.from], ['To', edge.to], ['Reason', edge.reason]] });
  if (isJsonMode(flags)) {
    return jsonOk({
      memories: scored,
      contradictions: contradictions.map((edge) => ({ from: edge.from, to: edge.to, reason: edge.reason }))
    });
  }
  return rows.length ? formatRecords(`Quality check (${rows.length})`, rows) : 'No memories';
}

/** Show the derived layered memory graph and optional query matches. */
export async function cmdGraph(args: string[], flags: Record<string, any> = {}): Promise<string> {
  const ctx = await getContext(process.cwd(), { rebuild: flags.rebuild === true });
  return renderGraphReport(ctx.graph, args.join(' '));
}

/** Run a tiny retrieval benchmark over query/expected-memory cases. */
export async function cmdBenchmark(args: string[], flags: Record<string, any> = {}): Promise<string> {
  const file = args[0];
  if (!file) throw new EngramError('ENG_USAGE', 'benchmark requires cases.json', ExitCode.UsageError);
  const rawCases = await readJson<any>(path.resolve(file), []);
  const cases: Array<{ query: string; expect: string[] }> = Array.isArray(rawCases) ? rawCases : rawCases.cases ?? [];
  const ctx = await getContext();
  const limit = normalizeLoadLimit(ctx.config.load?.limit);
  let hits = 0;
  const rows: RecordBlock[] = [];
  const caseResults: Array<{ query: string; hit: boolean; routed: string[] }> = [];
  for (const item of cases) {
    const expects = Array.isArray(item.expect) ? item.expect : [item.expect].filter(Boolean);
    const expected = new Set(expects.map((value) => String(value).replace(/\\/g, '/')));
    const vectorHits = await vectorRouteHits(ctx.roots, ctx.scopeIndexes, ctx.config, item.query, ctx.ignorePatterns);
    const routed = route(ctx.index, item.query, ctx.config, false, {
      ignorePatterns: ctx.ignorePatterns,
      vectorHits,
      candidatePool: ctx.config.vector.candidate_pool
    }, ctx.graph);
    const found = routed.some((entry) => expected.has(entry.id) || expected.has(entry.file) || expected.has(`${entry.scope}:${entry.file}`));
    if (found) hits += 1;
    caseResults.push({ query: item.query, hit: found, routed: routed.map((entry) => entry.file) });
    rows.push({
      title: `${found ? 'HIT' : 'MISS'} ${item.query}`,
      fields: [['Routed', routed.map((entry) => entry.file).join(', ') || '-']]
    });
  }
  const total = cases.length || 1;
  if (isJsonMode(flags)) {
    return jsonOk({
      limit,
      cases: cases.length,
      hits,
      hit_rate: Math.round((hits / total) * 100) / 100,
      results: caseResults
    });
  }
  return formatRecords(`Benchmark: ${hits}/${cases.length} hit@${limit} (${Math.round((hits / total) * 100)}%)`, rows);
}

/** Archive one wrong or superseded memory after approval. */
export async function cmdArchive(args: string[], flags: Record<string, any> = {}): Promise<string> {
  const target = args[0];
  if (!target) throw new Error('archive requires memory id or file path');
  const reason = typeof flags.reason === 'string' ? flags.reason : args.slice(1).join(' ').trim();
  const ctx = await getContext();
  const plans = planArchiveSet(ctx, target, reason);
  const plan = plans[0];
  const raw = await readText(plan.originalPath);
  const approval = await requestApproval([
    `Archive ${plan.entry.scope}:${plan.entry.file}`,
    `Reason: ${reason || 'No reason provided'}`,
    ...plans.slice(1).map((extra) => `Also archive: ${extra.entry.scope}:${extra.entry.file}`),
    '',
    raw
  ].join('\n'));
  if (!approval.accepted) return 'Discarded. No file archived.';
  const finalReason = [reason, approval.edits].filter(Boolean).join(' ');
  const archived = [];
  for (const next of planArchiveSet(ctx, target, finalReason)) archived.push(await archiveMemory(ctx, next, finalReason));
  return `Archived -> ${archived.join(', ')}`;
}

/** Show likely duplicate pairs. */
export async function cmdDeduplicate(flags: Record<string, any> = {}): Promise<string> {
  const ctx = await getContext();
  const finder = flags.semantic ? semanticDuplicatePairs : duplicatePairs;
  const pairs = finder(visibleEntries(ctx.index.entries, ctx.config, false, ctx.ignorePatterns));
  if (isJsonMode(flags)) {
    return jsonOk({
      semantic: Boolean(flags.semantic),
      count: pairs.length,
      pairs: pairs.map(([a, b, score]) => ({ a: { id: a.id, scope: a.scope, file: a.file }, b: { id: b.id, scope: b.scope, file: b.file }, score: Math.round(score * 100) / 100 }))
    });
  }
  if (!pairs.length) return 'No duplicate candidates';
  return formatRecords(`Duplicate candidates (${pairs.length})`, pairs.map(([a, b, score]) => ({
    title: `${Math.round(score * 100)}% match`,
    fields: [['A', a.file], ['B', b.file]]
  })));
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
export async function cmdImport(args: string[], flags: Record<string, any> = {}): Promise<string> {
  const file = args[0];
  if (!file) throw new Error('import requires bundle.json');
  const bundle = await readJson<any>(path.resolve(file), { memories: [] });
  if (isAgentMemoryBundle(bundle)) return importAgentMemoryBundle(bundle, flags);
  let count = 0;
  for (const item of bundle.memories ?? []) {
    const approval = await requestApproval(`Import ${item.entry.scope}:${item.entry.file}\n\n${item.content}`);
    if (!approval.accepted) continue;
    await writeApprovedMemory({ cwd: process.cwd(), scope: item.entry.scope, file: item.entry.file, content: item.content, message: `import ${item.entry.id}` });
    count += 1;
  }
  return `Imported ${count} memories`;
}

async function importAgentMemoryBundle(bundle: any, flags: Record<string, any>): Promise<string> {
  const ctx = await getContext();
  const requestedScope = typeof flags.scope === 'string' ? flags.scope : '';
  const scopes = (requestedScope
    ? writeScopes(parseSaveTarget(requestedScope, 'import --scope'), ctx.config)
    : writeScopes(ctx.config.scope, ctx.config)).filter((scope) => Boolean(ctx.roots[scope]));
  if (requestedScope && !scopes.length) throw new Error(`import --scope ${requestedScope} is not available for active profile ${ctx.profile.active || '<none>'}`);
  if (!scopes.length) throw new Error('import --scope requires global memory; set ENGRAM_GLOBAL_DIR or run engram inject --global-path <path>');
  const author = await resolveAuthor();
  const max = flags.all === true ? Number.POSITIVE_INFINITY : Number(flags.max ?? 50);
  const candidates = agentMemoryCandidates(bundle).slice(0, Number.isFinite(max) ? Math.max(0, max) : undefined);
  let count = 0;
  for (const candidate of candidates) {
    const plans = await planMemorySave({ ctx, text: candidate.text, type: candidate.type, scopes, author, source: { source: 'agentmemory-import' } });
    const approval = await requestApproval(previewSavePlans(plans));
    if (!approval.accepted) continue;
    await writePlans(plans, approval.edits);
    count += 1;
  }
  return `Imported ${count} agentmemory memories`;
}

function isAgentMemoryBundle(bundle: any): boolean {
  if (!Array.isArray(bundle.memories)) return false;
  return bundle.memories.some((item: any) => item && typeof item.content === 'string' && typeof item.title === 'string' && !item.entry);
}

function agentMemoryCandidates(bundle: any): Array<{ type: MemoryType; text: string }> {
  const candidates: Array<{ type: MemoryType; text: string }> = [];
  for (const memory of bundle.memories ?? []) {
    if (!memory?.content) continue;
    candidates.push({ type: agentMemoryType(memory.type), text: compactParts([memory.title, memory.content, arrayLabel('Concepts', memory.concepts), arrayLabel('Files', memory.files)]) });
  }
  for (const semantic of bundle.semanticMemories ?? []) {
    if (semantic?.fact) candidates.push({ type: 'knowledge', text: String(semantic.fact) });
  }
  for (const proc of bundle.proceduralMemories ?? []) {
    const steps = Array.isArray(proc.steps) ? proc.steps.join(' ') : '';
    candidates.push({ type: 'skill', text: compactParts([proc.name, steps, proc.triggerCondition && `Trigger: ${proc.triggerCondition}`]) });
  }
  for (const lesson of bundle.lessons ?? []) {
    if (lesson?.content) candidates.push({ type: 'knowledge', text: compactParts([lesson.content, lesson.context]) });
  }
  for (const insight of bundle.insights ?? []) {
    if (insight?.content) candidates.push({ type: 'knowledge', text: compactParts([insight.title, insight.content]) });
  }
  const unique = new Map<string, { type: MemoryType; text: string }>();
  for (const candidate of candidates) unique.set(`${candidate.type}:${candidate.text.toLowerCase()}`, candidate);
  return [...unique.values()];
}

function agentMemoryType(type: string): MemoryType {
  const normalized = normalizeMemoryType(type);
  if (normalized) return normalized;
  if (type === 'preference') return 'rule';
  if (type === 'workflow') return 'skill';
  return 'knowledge';
}

function compactParts(parts: unknown[]): string {
  return parts.map((part) => String(part ?? '').trim()).filter(Boolean).join(' ');
}

function arrayLabel(label: string, value: unknown): string {
  return Array.isArray(value) && value.length ? `${label}: ${value.join(', ')}` : '';
}

async function writePlans(plans: SavePlan[], edits?: string): Promise<void> {
  for (const plan of plans) {
    await writeApprovedMemory({ cwd: process.cwd(), scope: plan.scope, file: plan.file, content: applyApprovalEdit(plan.content, edits), message: plan.message });
  }
}

/** Print index counts. */
export async function cmdStats(flags: Record<string, any> = {}): Promise<string> {
  const ctx = await getContext();
  const entries = visibleEntries(ctx.index.entries, ctx.config, false, ctx.ignorePatterns);
  return isJsonMode(flags) ? jsonOk(statsData(entries)) : stats(entries);
}

export async function cmdEntry(flags: Record<string, any> = {}): Promise<string> {
  if (process.env.NODE_ENV === 'test') {
    const { renderEntry } = await import('../core/runtime/entry.js');
    return renderEntry(process.cwd());
  }
  const hostOnly = flags.hostOnly === true || flags['host-only'] === true;
  return launchEntryUi(process.cwd(), { hostOnly });
}

/** Render live-sync targets once. */
export async function cmdSync(): Promise<string> {
  const before = await getContext();
  const targets = before.config.live_sync.targets;
  for (const target of targets) assertFormat(target);
  const syncRows = before.roots.global ? await syncGlobalMemoryGit(process.cwd()) : ['global memory: not configured'];
  if (!before.config.live_sync.enabled) return `${syncRows.join('\n')}\nLive sync disabled`;
  const ctx = await getContext(process.cwd(), { rebuild: true });
  const entries = visibleEntries(ctx.index.entries, ctx.config, false, ctx.ignorePatterns);
  const written = [];
  for (const target of targets) written.push(await writeSyncTarget(process.cwd(), target, await renderFormat(process.cwd(), entries, target)));
  return `${syncRows.join('\n')}\nSynced: ${written.join(', ')}`;
}
