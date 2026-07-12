/** Read-oriented commands: load, rebuild-index, verify, audit, and rehash. */
import path from 'node:path';
import { getContext, loadSummary } from '../core/memory/context.js';
import { classifyTaskType } from '../core/memory/task-classifier.js';
import { inferTaskIntent, taskIntentQuery, intentIsActionable } from '../core/memory/task-intent.js';
import { rebuildGraph } from '../core/memory/graph.js';
import { invalidMemoryFiles, rebuildIndex } from '../core/memory/index.js';
import { loadEntries, routeDetailed, visibleEntries, type RouteDetail } from '../core/memory/routing.js';
import { ensureVectorIndex, vectorRouteHits } from '../core/memory/vector-db.js';
import { formatRecords, type RecordBlock } from '../core/cli/format.js';
import { isJsonMode, jsonOk } from '../core/cli/json-output.js';
import { EngramError, ExitCode } from '../core/runtime/exit-codes.js';
import { fail, serializeResult } from '../core/contracts/result.js';
import { runDoctor, doctorDiagnostics, type DoctorResult } from '../core/diagnostics/doctor.js';
import type { Scope, MemoryEntry } from '../core/runtime/types.js';
import { loadHashes, updateHash, verifyRoot, sha256 } from '../core/safety/hash.js';
import { inside, listFiles, readText, writeJson } from '../core/system/fsx.js';
import { scopeRootsForConfig } from '../core/runtime/config.js';
import { HASH_FILE } from '../core/runtime/constants.js';
import { explainRoute } from '../core/memory/route-explain.js';

/** Load routed memory for a query. */
export async function cmdLoad(args: string[], flags: Record<string, any> = {}): Promise<string> {
  const ctx = await getContext();
  if (!ctx.config.enabled || ctx.config.read === 'off') return isJsonMode(flags) ? jsonOk({ selected: 0, total_related: 0, entries: [], disabled: true }) : '';

  const idFlag = flags.id;
  let targetIds: string[] = [];
  if (Array.isArray(idFlag)) {
    targetIds = idFlag.flatMap((i) => String(i).split(','));
  } else if (typeof idFlag === 'string') {
    targetIds = idFlag.split(',');
  }
  targetIds = targetIds.map((i) => i.trim()).filter(Boolean);

  let entries: MemoryEntry[] = [];
  let routed: RouteDetail;
  const full = flags.full === true || flags.f === true;
  const forAgents = !full;
  let intent: ReturnType<typeof inferTaskIntent> | undefined;

  if (targetIds.length > 0) {
    entries = ctx.index.entries.filter((e) => targetIds.includes(e.id));
    routed = {
      entries,
      candidates: entries.length,
      selected: entries.length,
      omitted: 0,
      refined: false,
      facets: [],
      reasons: entries.map((e) => ({ key: `${e.scope}:${e.file}`, kind: 'direct' as const, matchedBy: ['literal' as const], terms: [e.id] }))
    };
  } else {
    const query = args.join(' ') || 'current session';
    const all = flags.all === true;
    intent = forAgents ? inferTaskIntent(query) : undefined;
    const routingQuery = intent && intentIsActionable(intent) ? taskIntentQuery(intent) : query;
    const vectorHits = all ? [] : await vectorRouteHits(ctx.roots, ctx.scopeIndexes, ctx.config, routingQuery, ctx.ignorePatterns, all);
    routed = routeDetailed(ctx.index, routingQuery, ctx.config, all, {
      all,
      ignorePatterns: ctx.ignorePatterns,
      vectorHits,
      candidatePool: ctx.config.vector.candidate_pool,
      intent,
      semanticRelaxed: forAgents
    }, ctx.graph);
    entries = routed.entries;
  }

  if (flags.explain === true) {
    const directId = targetIds.length > 0;
    const query = directId ? `--id ${targetIds.join(',')}` : (args.join(' ') || 'current session');
    const fallback = !directId && !args.join(' ').trim();
    const omittedEntries = directId ? [] : visibleEntries(ctx.index.entries, ctx.config, false, ctx.ignorePatterns).filter((e) => !entries.includes(e));
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
        entries: entries.map((entry) => ({ id: entry.id, scope: entry.scope, type: entry.type, file: entry.file, summary: entry.summary, matched_by: matchReason(routed, entry) }))
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
  if (isJsonMode(flags)) {
    return jsonOk({
      selected: entries.length,
      total_related: routed.candidates,
      omitted: routed.omitted,
      entries: entries.map((entry) => ({ id: entry.id, scope: entry.scope, type: entry.type, file: entry.file, summary: entry.summary }))
    });
  }
  const loaded = await loadEntries(process.cwd(), entries, ctx.config, { forAgents });
  const summary = loadSummary(entries, ctx.hiddenCount, routed.candidates);
  return `${summary}${routeHint(routed)}\n\n${loaded.map((row) => {
    if (!row.content) return `SKIPPED ${row.entry.file}: ${row.flagged ?? 'empty'}`;
    if (row.flagged) return `⚠ ${row.entry.file}: ${row.flagged} (run \`engram rehash ${row.entry.scope}\` to re-hash)\n\n${row.content}`;
    return row.content;
  }).join('\n---\n')}`.trim();
}

/** Classify a user task for `engram load` and save tags. */
export function cmdRoute(args: string[], flags: Record<string, any> = {}): string {
  const text = args.join(' ').trim();
  const classification = classifyTaskType(text);
  const data = {
    task_type: classification.taskType,
    confidence: Math.round(classification.confidence * 100) / 100,
    load_query: classification.loadQuery,
    save_tags: classification.saveTags
  };
  if (isJsonMode(flags)) return jsonOk(data);
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
  return formatRecords('engram: rebuilt indexes', rows);
}

/** Report malformed memories that rebuild-index skips. */
export async function cmdRepair(scope: string | undefined, flags: Record<string, any> = {}): Promise<string> {
  const ctx = await getContext();
  const scopes = scope === 'workspace' || scope === 'global' ? [scope] : ['workspace', 'global'];
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

/** Verify hashes for one or both scopes. Exits non-zero when mismatches are found. */
export async function cmdVerify(scope: string | undefined, flags: Record<string, any> = {}): Promise<string> {
  const ctx = await getContext();
  const scopes = scope === 'workspace' || scope === 'global' ? [scope] : ['workspace', 'global'];
  const scopeRows = await Promise.all(scopes.map(async (s) => {
    const root = ctx.roots[s as Scope];
    if (!root) return { scope: s, status: 'not_configured' as const, rows: [] };
    return { scope: s, status: 'checked' as const, rows: await verifyRoot(root, s as Scope) };
  }));
  const rows = scopeRows.flatMap((item) => item.rows);
  const mismatches = rows.filter((row) => !row.ok);
  const scopeStatus = scopeRows.map((item) => ({ scope: item.scope, status: item.status, checked_files: item.rows.length, mismatches: item.rows.filter((r) => !r.ok).length }));
  if (isJsonMode(flags)) {
    const data = { scopes: scopeStatus, results: rows.map((row) => ({ scope: row.scope, file: row.file, ok: row.ok })), mismatches: mismatches.length };
    if (mismatches.length) {
      const diagnostics = mismatches.map((row) => ({ id: 'hash.mismatch', severity: 'error' as const, message: `${row.scope}:${row.file}`, remediation: `engram rehash ${row.scope}` }));
      throw new EngramError('ENG_INTEGRITY', `${mismatches.length} hash mismatch(es) found`, ExitCode.IntegrityError, serializeResult(fail('ENG_INTEGRITY', `${mismatches.length} hash mismatch(es) found`, diagnostics)));
    }
    return jsonOk(data);
  }
  if (!rows.length && scopeStatus.every((s) => s.status === 'not_configured')) return 'engram: no memory files to verify';
  if (!rows.length) return formatRecords('Verify memory hashes', scopeStatus.map((s) => ({ title: s.scope, fields: [['Status', s.status]] })));
  const text = formatRecords('Verify memory hashes', rows.map((row) => ({ title: `${row.ok ? 'OK' : 'MISMATCH'} ${row.scope}:${row.file}` })));
  if (mismatches.length) {
    throw new EngramError('ENG_INTEGRITY', `${mismatches.length} hash mismatch(es) found`, ExitCode.IntegrityError, text);
  }
  return text;
}

/** Show audit rows, with simple filters. */
export async function cmdAudit(flags: Record<string, any> = {}): Promise<string> {
  const ctx = await getContext();
  let entries = visibleEntries(ctx.index.entries, ctx.config, Boolean(flags['low-confidence']), ctx.ignorePatterns);
  if (flags.author) entries = entries.filter((e) => e.author === flags.author);
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

function routeHint(routed: RouteDetail): string {
  if (!routed.omitted) return '';
  const tags = routed.facets.map((facet) => facet.tag).join(', ');
  return `\nengram: refined ${routed.selected} of ${routed.candidates} related memories${tags ? `; narrow with tags: ${tags}` : ''}`;
}

function matchReason(routed: RouteDetail, entry: { scope: string; file: string }): string {
  const reason = routed.reasons?.find((item) => item.key === `${entry.scope}:${entry.file}`);
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

/** Composed diagnostics command for config, integrity, and adapter health. */
export async function cmdDoctor(args: string[], flags: Record<string, any> = {}): Promise<string> {
  const ctx = await getContext();
  const scopeArg = typeof args[0] === 'string' && ['workspace', 'global', 'all'].includes(args[0]) ? args[0] as 'workspace' | 'global' | 'all' : 'all';
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
