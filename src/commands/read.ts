/** Read-oriented commands: load, rebuild-index, verify, audit, and rehash. */
import path from 'node:path';
import { getContext, type EngramContext } from '../core/memory/context.js';
import { classifyTaskType } from '../core/memory/task-classifier.js';
import { inferTaskIntent, taskIntentQuery, intentIsActionable } from '../core/memory/task-intent.js';
import { rebuildGraph } from '../core/memory/graph.js';
import { invalidMemoryFiles, rebuildIndex } from '../core/memory/index.js';
import { routeDetailed, visibleEntries, type RouteDetail } from '../core/memory/routing.js';
import { ensureVectorIndex, vectorRouteHits } from '../core/memory/vector-db.js';
import { formatRecords, type RecordBlock } from '../core/cli/format.js';
import { isJsonMode, jsonOk } from '../core/cli/json-output.js';
import { EngramError, ExitCode } from '../core/runtime/exit-codes.js';
import { fail, serializeResult } from '../core/contracts/result.js';
import { runDoctor, doctorDiagnostics, type DoctorResult } from '../core/diagnostics/doctor.js';
import type { Scope, MemoryEntry } from '../core/runtime/types.js';
import { memoryKey } from '../core/memory/memory-ref.js';
import { listFlag } from '../cli/args.js';
import { loadHashes, saveHashes, updateHash, verifyRoot, sha256 } from '../core/safety/hash.js';
import { inside, listFiles, readText } from '../core/system/fsx.js';
import { scopeRootsForConfig } from '../core/runtime/config.js';
import { isActiveMemoryPath } from '../core/runtime/constants.js';
import { explainRoute } from '../core/memory/route-explain.js';
import { planLoad, renderLoadPlan, type LoadDisclosure, type LoadPlan } from '../core/memory/load-plan.js';
import { DEFAULT_MAX_TOKENS, parseMaxTokens } from '../core/runtime/load-limit.js';
import { recordUsage } from '../core/memory/usage.js';
import { applyBackupMoves, planBackupMoves, type BackupMove } from '../core/memory/backups.js';
import { nativeRuleRecords, refreshLinkedNativeRules, type NativeRuleSyncResult } from '../core/integrations/native-rules.js';
import { checkFreshnessDetailed, freshnessEntries, HOST_OTHER_MACHINE, readStale, STALE_FILE, writeStale, type FreshnessReport } from '../core/memory/freshness.js';

/** Load routed memory for a query. */
export async function cmdLoad(args: string[], flags: Record<string, any> = {}): Promise<string> {
  const ctx = await getContext(typeof flags.cwd === 'string' ? flags.cwd : process.cwd());
  if (!ctx.config.enabled || ctx.config.read === 'off') return isJsonMode(flags) ? jsonOk({ selected: 0, total_related: 0, entries: [], disabled: true }) : '';

  const idFlag = flags.id;
  let targetIds: string[] = [];
  if (Array.isArray(idFlag)) {
    targetIds = idFlag.flatMap((i) => String(i).split(','));
  } else if (typeof idFlag === 'string') {
    targetIds = idFlag.split(',');
  }
  targetIds = targetIds.map((i) => i.trim()).filter(Boolean);

  const query = args.join(' ') || 'current session';
  const full = flags.full === true || flags.f === true;
  const forAgents = !full;
  const all = flags.all === true;
  const budgetTokens = flags['budget-tokens'] === undefined
    ? ctx.config.load.max_tokens ?? DEFAULT_MAX_TOKENS
    : parseMaxTokens(flags['budget-tokens'], '--budget-tokens');

  const disclosure = parseDisclosure(flags.disclosure);
  const excludeKeys = listFlag(flags['exclude-keys']);

  const plan = await planLoad(ctx, query, {
    all,
    full,
    id: targetIds,
    budgetTokens,
    forAgents,
    ...(disclosure ? { disclosure } : {}),
    ...(excludeKeys.length ? { excludeKeys } : {})
  });

  const routed = plan.routeDetail!;
  const entries = routed.entries;
  const intent = plan.query.intent ? (inferTaskIntent(query)) : undefined;

  if (targetIds.length > 0) {
    const archivedHits = entries.filter((e) => e.lifecycle === 'archived');
    if (archivedHits.length) {
      const ids = archivedHits.map((e) => e.id).join(', ');
      process.stderr.write(`warning: ${ids} archived via frontmatter; loaded by explicit --id only.\n`);
    }
  }

  if (flags.explain === true) {
    const directId = targetIds.length > 0;
    const query = directId ? `--id ${targetIds.join(',')}` : (args.join(' ') || 'current session');
    const fallback = !directId && !args.join(' ').trim();
    const omittedEntries = directId ? [] : (routed.candidateEntries ?? []).filter((e) => !entries.includes(e));
    const explanation = explainRoute(routed, entries, { query, fallback, directId, omittedEntries });
    if (isJsonMode(flags)) return jsonOk(explanation);
    return renderExplanation(explanation);
  }

  if (flags['dry-run'] === true) {
    if (!entries.length) return isJsonMode(flags) ? jsonOk({ selected: 0, total_related: routed.candidates, entries: [] }) : 'No routed memories';
    if (isJsonMode(flags)) {
      return jsonOk({
        selected: entries.length,
        total_related: routed.candidates,
        omitted: routed.omitted,
        entries: entries.map((entry) => ({ id: entry.id, scope: entry.scope, type: entry.type, file: entry.file, summary: entry.summary, score: matchScore(routed, entry), matched_by: matchReason(routed, entry) }))
      });
    }
    const rows: RecordBlock[] = [];
    if (forAgents && intent && intentIsActionable(intent)) {
      rows.push({ title: 'Task intent', fields: [
        ['Domains', intent.domains.join(', ') || '-'],
        ['Work kinds', intent.workKinds.join(', ') || '-'],
        ['Artifacts', intent.artifacts.join(', ') || '-'],
        ['Styles', intent.styles.join(', ') || '-'],
        ['Technologies', intent.technologies.join(', ') || '-'],
        ['Confidence', intent.confidence]
      ]});
    }
    if (routed.omitted) rows.push(refinementRecord(routed));
    rows.push(...entries.map((entry): RecordBlock => ({
      title: `${entry.scope}:${entry.file}`,
      fields: [
        ['Type', entry.type],
        ['Summary', entry.summary],
        ['Matched by', matchReason(routed, entry)]
      ]
    })));
    return formatRecords(`Routed memories (${entries.length} of ${routed.candidates})`, rows);
  }
  // D10: only an explicit `--id` fetch counts; routed, --all, and --full loads do not.
  if (targetIds.length > 0 && ctx.roots.workspace) {
    await recordUsage(ctx.roots.workspace, plan.payload_rows.map(({ entry }) => memoryKey(entry)), 'fetched');
  }
  if (isJsonMode(flags)) {
    const stale = new Set(plan.stale_keys ?? []);
    const row = (entry: MemoryEntry) => ({ id: entry.id, scope: entry.scope, type: entry.type, file: entry.file, summary: entry.summary, ...(stale.has(memoryKey(entry)) ? { stale: true } : {}) });
    return jsonOk({
      selected: plan.selected_ids.length,
      total_related: routed.candidates,
      omitted: routed.omitted,
      entries: plan.payload_rows.map(({ entry }) => row(entry)),
      cards: plan.card_rows.map(({ entry }) => row(entry)),
      already_loaded: plan.already_loaded
    });
  }
  return agentLoadResult(ctx, plan).text;
}

export type AgentLoadOptions = {
  cwd?: string;
  excludeKeys?: string[];
  /** Bodies the caller already holds: they keep their expansion slots but are not re-rendered. */
  deliveredKeys?: string[];
  /** Fetch these memory ids directly (bypasses routing and the token cap). */
  id?: string[];
  /** Token cap for rendered compact context; defaults to `load.max_tokens`. */
  budgetTokens?: number;
  disclosure?: LoadDisclosure;
};
export type AgentLoad = {
  text: string;
  /** Every routed selection key (`scope:file`), including excluded and carded rows. */
  selectedKeys: string[];
  /** Keys whose bodies `text` expands; excluded and delivered keys never appear here. */
  bodyKeys: string[];
  /** Total related candidates for the query. */
  related: number;
  /** Ids of routed memories left out because the caller already holds them (excluded or delivered). */
  alreadyLoaded: string[];
  /** Ids rendered as one-line cards in `text`. */
  cardIds: string[];
  /** Ids of selected memories the token cap shed; fetch them with `id`. */
  omittedIds: string[];
};

/** Routed agent load for hooks and MCP: the default `engram load` text plus the plan facts callers need. */
export async function loadForAgent(query: string, opts: AgentLoadOptions = {}): Promise<AgentLoad> {
  return loadForAgentWithContext(await getContext(opts.cwd ?? process.cwd()), query, opts);
}

/** `loadForAgent` over an already-built context, so the benchmark and other callers avoid re-reading the index. */
export async function loadForAgentWithContext(ctx: EngramContext, query: string, opts: AgentLoadOptions = {}): Promise<AgentLoad> {
  if (!ctx.config.enabled || ctx.config.read === 'off') return { text: '', selectedKeys: [], bodyKeys: [], related: 0, alreadyLoaded: [], cardIds: [], omittedIds: [] };
  const excludeKeys = opts.excludeKeys ?? [];
  const deliveredKeys = opts.deliveredKeys ?? [];
  const ids = (opts.id ?? []).map((id) => id.trim()).filter(Boolean);
  const plan = await planLoad(ctx, query || 'current session', {
    budgetTokens: opts.budgetTokens ?? ctx.config.load.max_tokens ?? DEFAULT_MAX_TOKENS,
    forAgents: true,
    ...(opts.disclosure ? { disclosure: opts.disclosure } : {}),
    ...(ids.length ? { id: ids } : {}),
    ...(excludeKeys.length ? { excludeKeys } : {}),
    ...(deliveredKeys.length ? { deliveredKeys } : {})
  });
  // D10: only an explicit id fetch counts as usage.
  if (ids.length && ctx.roots.workspace) {
    await recordUsage(ctx.roots.workspace, plan.payload_rows.map(({ entry }) => memoryKey(entry)), 'fetched');
  }
  return agentLoadResult(ctx, plan);
}

/** One rendering path shared by `cmdLoad` and `loadForAgent`. */
function agentLoadResult(ctx: EngramContext, plan: LoadPlan): AgentLoad {
  const routed = plan.routeDetail?.entries ?? [];
  const already = new Set(plan.already_loaded);
  const shed = new Set(plan.omitted.filter((item) => item.reason === 'budget').map((item) => item.key));
  return {
    text: renderLoadPlan(ctx, plan),
    selectedKeys: routed.map(memoryKey),
    bodyKeys: plan.payload_rows.map(({ entry }) => memoryKey(entry)),
    related: plan.routeDetail?.candidates ?? 0,
    alreadyLoaded: routed.filter((entry) => already.has(memoryKey(entry))).map((entry) => entry.id),
    cardIds: plan.disclosure === 'auto' ? plan.card_rows.map(({ entry }) => entry.id) : [],
    omittedIds: routed.filter((entry) => shed.has(memoryKey(entry))).map((entry) => entry.id)
  };
}

function parseDisclosure(value: unknown): LoadDisclosure | undefined {
  if (value === undefined) return undefined;
  if (value === 'auto' || value === 'full') return value;
  throw new EngramError('ENG_USAGE', `load --disclosure: invalid value '${String(value)}'. Must be auto or full.`, ExitCode.UsageError);
}


/** Classify a user task for `engram load` and save tags. */
export function cmdRoute(args: string[], flags: Record<string, any> = {}): string {
  const data = routeData(args.join(' '));
  return isJsonMode(flags) ? jsonOk(data) : renderRoute(data);
}

export type RouteData = { task_type: string; confidence: number; load_query: string; save_tags: string[] };

/** Task classification data for `engram route`. */
export function routeData(query: string): RouteData {
  const classification = classifyTaskType(query.trim());
  return {
    task_type: classification.taskType,
    confidence: Math.round(classification.confidence * 100) / 100,
    load_query: classification.loadQuery,
    save_tags: classification.saveTags
  };
}

/** Human text for `engram route`. */
export function renderRoute(data: RouteData): string {
  return [
    `Task type: ${data.task_type}`,
    `Confidence: ${data.confidence.toFixed(2)}`,
    `Load query: ${data.load_query}`,
    `Save tags: ${data.save_tags.join(', ') || '-'}`
  ].join('\n');
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
  // E12: rule files for linked Claude/Cursor hosts follow the rebuilt index (workspace rules for the workspace scope, user rules for global).
  const native: NativeRuleSyncResult[] = [];
  if (scopes.includes('workspace')) native.push(...await refreshLinkedNativeRules(process.cwd()));
  if (scopes.includes('global')) native.push(...await refreshLinkedNativeRules(process.cwd(), { global: true }));
  rows.push(...nativeRuleRecords(native));
  return formatRecords('engram: rebuilt indexes', rows);
}

/** Report malformed memories that rebuild-index skips. */
export async function cmdRepair(scope: string | undefined, flags: Record<string, any> = {}): Promise<string> {
  const ctx = await getContext();
  const scopes = scope === 'workspace' || scope === 'global' ? [scope] : ['workspace', 'global'];
  if (flags['move-backups'] === true) return repairMoveBackups(ctx, scopes as Scope[], flags.confirm === true, flags);
  const rows: RecordBlock[] = [];
  const invalid: Array<{ scope: string; file: string; error: string }> = [];
  const scopeStatus: Array<{ scope: string; status: 'checked' | 'not_configured'; invalid_count: number }> = [];
  for (const current of scopes) {
    const root = ctx.roots[current as Scope];
    if (!root) {
      rows.push({ title: current, fields: [['Status', 'not configured']] });
      scopeStatus.push({ scope: current, status: 'not_configured', invalid_count: 0 });
      continue;
    }
    const scopeInvalid: typeof invalid = [];
    for (const item of await invalidMemoryFiles(root, current as Scope)) {
      rows.push({ title: `${item.scope}:${item.file}`, fields: [['Error', item.error]] });
      invalid.push({ scope: item.scope, file: item.file, error: item.error });
      scopeInvalid.push({ scope: item.scope, file: item.file, error: item.error });
    }
    scopeStatus.push({ scope: current, status: 'checked', invalid_count: scopeInvalid.length });
  }
  if (isJsonMode(flags)) return jsonOk({ scopes: scopeStatus, invalid, count: invalid.length });
  const found = rows.filter((row) => row.fields?.[0]?.[1] !== 'not configured');
  if (!found.length) return rows.length ? formatRecords('No invalid memory files.', rows) : 'No invalid memory files.';
  return formatRecords('Invalid memory files', rows);
}

/** Plan (default) or apply (`--confirm`) moving stray migration backups into the gitignored `backups/` folder. */
async function repairMoveBackups(ctx: EngramContext, scopes: Scope[], confirm: boolean, flags: Record<string, any>): Promise<string> {
  const lines: string[] = [];
  const backups: Array<BackupMove & { scope: string }> = [];
  const scopeStatus: Array<{ scope: string; status: 'checked' | 'not_configured'; backups: number }> = [];
  let planned = 0;
  for (const current of scopes) {
    const root = ctx.roots[current];
    if (!root) {
      scopeStatus.push({ scope: current, status: 'not_configured', backups: 0 });
      lines.push(`${current}: not configured`);
      continue;
    }
    const plan = await planBackupMoves(root);
    planned += plan.filter((move) => move.action !== 'conflict').length;
    const result = confirm ? await applyBackupMoves(root, plan) : plan;
    for (const move of result) {
      backups.push({ scope: current, ...move });
      lines.push(backupMoveLine(current, move));
    }
    scopeStatus.push({ scope: current, status: 'checked', backups: result.length });
  }
  const moved = backups.filter((move) => move.action === 'moved').length;
  const conflicts = backups.filter((move) => move.action === 'conflict').length;
  if (isJsonMode(flags)) return jsonOk({ scopes: scopeStatus, backups, planned, moved, conflicts });
  if (!backups.length) return 'No stray backup files.';
  if (!confirm) lines.push('Run again with --confirm to move these files.');
  return lines.join('\n');
}

function backupMoveLine(scope: string, move: BackupMove): string {
  const label = move.action === 'moved' ? 'MOVED' : move.action === 'conflict' ? 'CONFLICT' : 'PLAN';
  return `${label} ${scope}:${move.from} -> ${move.to}${move.reason ? `: ${move.reason}` : ''}`;
}

/**
 * Verify hashes for one or both scopes. Exits non-zero when mismatches are found. `--sources` (D17) also re-hashes
 * take-control memories' source files and records stale ones in `stale.json`; stale sources never fail the command.
 */
export async function cmdVerify(scope: string | undefined, flags: Record<string, any> = {}): Promise<string> {
  const ctx = await getContext();
  const scopes = scope === 'workspace' || scope === 'global' ? [scope] : ['workspace', 'global'];
  const freshness = flags.sources === true ? await verifySources(ctx, scopes as Scope[]) : undefined;
  const scopeRows = await Promise.all(scopes.map(async (s) => {
    const root = ctx.roots[s as Scope];
    if (!root) return { scope: s, status: 'not_configured' as const, rows: [] };
    return { scope: s, status: 'checked' as const, rows: await verifyRoot(root, s as Scope) };
  }));
  const rows = scopeRows.flatMap((item) => item.rows);
  const mismatches = rows.filter((row) => !row.ok);
  const scopeStatus = scopeRows.map((item) => ({ scope: item.scope, status: item.status, checked_files: item.rows.length, mismatches: item.rows.filter((r) => !r.ok).length }));
  if (isJsonMode(flags)) {
    const data = { scopes: scopeStatus, results: rows.map((row) => ({ scope: row.scope, file: row.file, ok: row.ok })), mismatches: mismatches.length, ...(freshness ? { sources: sourcesJson(freshness) } : {}) };
    if (mismatches.length) {
      // The failure envelope has no data, so stale sources found by the same run travel as info diagnostics.
      const staleDiagnostics = Object.entries(freshness?.stale ?? {}).map(([key, files]) => ({ id: 'sources.stale', severity: 'info' as const, message: `${key}: ${files.join(', ')}`, remediation: 'engram take-control --refresh' }));
      const diagnostics = [...mismatches.map((row) => ({ id: 'hash.mismatch', severity: 'error' as const, message: `${row.scope}:${row.file}`, remediation: `engram rehash ${row.scope}` })), ...staleDiagnostics];
      throw new EngramError('ENG_INTEGRITY', `${mismatches.length} hash mismatch(es) found`, ExitCode.IntegrityError, serializeResult(fail('ENG_INTEGRITY', `${mismatches.length} hash mismatch(es) found`, diagnostics)));
    }
    return jsonOk(data);
  }
  const sourcesText = freshness ? `\n\n${renderSources(freshness)}` : '';
  if (!rows.length && scopeStatus.every((s) => s.status === 'not_configured')) return 'engram: no memory files to verify';
  if (!rows.length) return formatRecords('Verify memory hashes', scopeStatus.map((s) => ({ title: s.scope, fields: [['Status', s.status]] }))) + sourcesText;
  const text = formatRecords('Verify memory hashes', rows.map((row) => ({ title: `${row.ok ? 'OK' : 'MISMATCH'} ${row.scope}:${row.file}` }))) + sourcesText;
  if (mismatches.length) {
    throw new EngramError('ENG_INTEGRITY', `${mismatches.length} hash mismatch(es) found`, ExitCode.IntegrityError, text);
  }
  return text;
}

type SourcesCheck = FreshnessReport & { written: boolean; staleFile?: string };

/**
 * Re-hash source files for the checked scopes and store the result in the workspace `stale.json` (local derived
 * state, gitignored). Keys of scopes not checked this run are kept. Global memories are checked only in the workspace
 * their `source_origin` fingerprint names, because their paths are relative to the workspace they came from; others,
 * and older global memories without an origin, are listed as skipped and never read.
 */
async function verifySources(ctx: EngramContext, scopes: Scope[]): Promise<SourcesCheck> {
  const report = await checkFreshnessDetailed(ctx.cwd, await freshnessEntries(ctx, scopes.filter((scope) => Boolean(ctx.roots[scope]))), undefined, ctx.ignorePatterns);
  const root = ctx.roots.workspace;
  if (!root) return { ...report, written: false };
  const kept = Object.fromEntries(Object.entries(await readStale(root)).filter(([key]) => !scopes.some((scope) => key.startsWith(`${scope}:`))));
  const written = await writeStale(root, { ...kept, ...report.stale });
  return { ...report, written, staleFile: path.relative(ctx.cwd, path.join(root, STALE_FILE)).replace(/\\/g, '/') };
}

function sourcesJson(check: SourcesCheck) {
  return { checked: check.checked.length, stale: check.stale, stale_count: Object.keys(check.stale).length, unchecked: check.unchecked, skipped: check.skipped, written: check.written };
}

function renderSources(check: SourcesCheck): string {
  const stale = Object.entries(check.stale);
  const records: RecordBlock[] = stale.map(([key, files]) => ({ title: `STALE ${key}`, fields: [['Changed', files.join(', ')]] }));
  records.push(...check.unchecked.map((item) => ({ title: `UNCHECKED ${item.key}`, fields: [['Source', `${item.file}: ${item.reason}`]] as Array<[string, string]> })));
  const hostSkipped = check.skipped.filter((item) => item.reason === HOST_OTHER_MACHINE).length;
  const globalSkipped = check.skipped.length - hostSkipped;
  const skipped = [
    globalSkipped ? ` ${globalSkipped} global ${globalSkipped === 1 ? 'memory' : 'memories'} skipped (from another workspace or without a recorded origin).` : '',
    hostSkipped ? ` ${hostSkipped} host-memory ${hostSkipped === 1 ? 'import' : 'imports'} skipped (host memory store not on this machine).` : ''
  ].join('');
  const summary = (stale.length
    ? `${stale.length} stale of ${check.checked.length} checked; recorded in ${check.staleFile ?? STALE_FILE}. Run engram take-control --refresh to propose updates.`
    : `No stale memories (${check.checked.length} checked).`) + skipped;
  return [formatRecords('Verify memory sources', records), summary].join('\n');
}

/** Show audit rows, with simple filters. */
export async function cmdAudit(flags: Record<string, any> = {}): Promise<string> {
  const ctx = await getContext();
  let entries = visibleEntries(ctx.index.entries, ctx.config, Boolean(flags['low-confidence']), ctx.ignorePatterns);
  if (flags.author) entries = entries.filter((e) => [e.author, e.authorName, e.authorEmail].includes(flags.author));
  if (flags['low-confidence']) entries = entries.filter((e) => e.confidence === 'low');
  if (flags.stale) entries = entries.filter((e) => Date.now() - Date.parse(e.updated) > 180 * 864e5);
  if (isJsonMode(flags)) {
    return jsonOk({
      count: entries.length,
      memories: entries.map((entry) => ({ id: entry.id, scope: entry.scope, type: entry.type, file: entry.file, updated: entry.updated, author: entry.author }))
    });
  }
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

function matchScore(routed: RouteDetail, entry: { scope: string; file: string }): number {
  const score = routed.reasons?.find((item) => item.key === memoryKey(entry))?.score;
  return score === undefined ? 0 : Math.round(score * 1000) / 1000;
}

function matchReason(routed: RouteDetail, entry: { scope: string; file: string }): string {
  const reason = routed.reasons?.find((item) => item.key === memoryKey(entry));
  if (!reason) return '-';
  if (reason.kind === 'dependency') return `dependency prerequisite${reason.source ? ` (${reason.source})` : ''}`;
  const terms = reason.terms?.join(', ') || '-';
  const score = reason.score === undefined ? '' : `, score ${reason.score.toFixed(3)}`;
  return `${reason.kind} terms: ${terms}${score}`;
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
      if (!isActiveMemoryPath(rel)) continue;
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
    await saveHashes(root, newHashes);
    rows.push({ title: current, fields: [['Hashed', updated], ['Changed', changed], ['Unchanged', updated - changed]] });
  }
  return formatRecords('engram: rehashed memory files', rows);
}

/** Composed diagnostics command for config, integrity, and adapter health. */
export async function cmdDoctor(args: string[], flags: Record<string, any> = {}): Promise<string> {
  const ctx = await getContext(typeof flags.cwd === 'string' ? flags.cwd : process.cwd());
  const VALID_SCOPES = ['workspace', 'global', 'all'];
  const positionalScope = typeof args[0] === 'string' && VALID_SCOPES.includes(args[0]) ? args[0] as 'workspace' | 'global' | 'all' : undefined;
  if (typeof args[0] === 'string' && !positionalScope) {
    throw new EngramError('ENG_USAGE', `doctor: invalid scope '${args[0]}'. Must be workspace, global, or all.`, ExitCode.UsageError);
  }
  const flagScope = typeof flags.scope === 'string' && VALID_SCOPES.includes(flags.scope) ? flags.scope as 'workspace' | 'global' | 'all' : undefined;
  if (typeof flags.scope === 'string' && !flagScope) {
    throw new EngramError('ENG_USAGE', `doctor --scope: invalid value '${flags.scope}'. Must be workspace, global, or all.`, ExitCode.UsageError);
  }
  if (positionalScope && flagScope && positionalScope !== flagScope) {
    throw new EngramError('ENG_USAGE', `doctor --scope ${flagScope} conflicts with positional ${positionalScope}`, ExitCode.UsageError);
  }
  const scopeArg = positionalScope ?? flagScope ?? 'all';
  const strict = flags.strict === true;
  const result = await runDoctor(ctx, scopeArg);
  if (isJsonMode(flags)) {
    if (strict && (result.failed > 0 || result.warned > 0)) {
      throw new EngramError('ENG_DOCTOR', `doctor found ${result.failed} failure(s) and ${result.warned} warning(s)`, ExitCode.GeneralError, serializeResult(fail('ENG_DOCTOR', `doctor found ${result.failed} failure(s) and ${result.warned} warning(s)`, doctorDiagnostics(result))));
    }
    return jsonOk(result);
  }
  const text = renderDoctor(result);
  if (strict && (result.failed > 0 || result.warned > 0)) {
    throw new EngramError('ENG_DOCTOR', `doctor found ${result.failed} failure(s) and ${result.warned} warning(s)`, ExitCode.GeneralError, text);
  }
  return text;
}

function renderDoctor(result: DoctorResult): string {
  const lines: string[] = [];
  lines.push(`Doctor: ${result.passed} passed, ${result.warned} warned, ${result.failed} failed, ${result.skipped} skipped`);
  lines.push('');
  for (const check of result.checks) {
    const icon = check.status === 'pass' ? 'OK' : check.status === 'warn' ? 'WARN' : check.status === 'fail' ? 'FAIL' : 'SKIP';
    lines.push(`${icon} ${check.id}: ${check.message}`);
    if (check.remediation) lines.push(`  remediation: ${check.remediation}`);
  }
  return lines.join('\n');
}

function renderExplanation(explanation: ReturnType<typeof explainRoute>): string {
  const lines: string[] = [];
  lines.push(`Route explanation for: ${explanation.query}`);
  if (explanation.fallback) lines.push('(query was empty; fell back to "current session")');
  lines.push('');
  if (explanation.selected.length) {
    lines.push('Selected:');
    for (const item of explanation.selected) {
      lines.push(`  ${item.rank}. ${item.scope}:${item.id} [${item.source}]`);
      lines.push(`     type: ${item.type}, summary: ${item.summary}`);
      if (item.signals.length) lines.push(`     signals: ${item.signals.join('; ')}`);
    }
  } else {
    lines.push('Selected: (none)');
  }
  if (explanation.omitted.length) {
    lines.push('');
    lines.push('Omitted:');
    for (const item of explanation.omitted) {
      lines.push(`  ${item.scope}:${item.id} (${item.reason})`);
    }
  }
  for (const diag of explanation.diagnostics) {
    lines.push('');
    lines.push(`${diag.severity.toUpperCase()}: ${diag.message}`);
    if (diag.remediation) lines.push(`  remediation: ${diag.remediation}`);
  }
  return lines.join('\n');
}
