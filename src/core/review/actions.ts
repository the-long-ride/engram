/** Review actions: dismiss/verify/supersede/archive — each writes an audit changelog event and updates persisted review-record status; lifecycle frontmatter updates use existing approval flows (no bypass). */
import type { EngramContext } from '../memory/context.js';
import type { MemoryEntry, Scope, EngramConfig } from '../runtime/types.js';
import { entryPath } from '../memory/context.js';
import { readText, writeText } from '../system/fsx.js';
import { today } from '../system/text.js';
import { appendChangelog } from '../memory/storage.js';
import { updateHash } from '../safety/hash.js';
import { rebuildIndex } from '../memory/index.js';
import { rebuildGraph } from '../memory/graph.js';
import { ensureVectorIndex } from '../memory/vector-db.js';
import { archiveMemory, planArchive } from '../memory/archive.js';
import { visibleEntries } from '../memory/routing.js';
import { deriveFindings } from './findings.js';
import { loadReviewStore, writeReviewStore, seedAllRecords, resolveFinding, type ReviewStore, type ReviewRecord } from './records.js';
import type { ReviewFinding } from './findings.js';

export type ActionResult = { ok: true; message: string; record?: ReviewRecord };
export type ActionError = { ok: false; message: string };

/** Dismiss a finding by fingerprint. Audit event records the dismissal. */
export async function dismissFindingAction(ctx: EngramContext, fingerprint: string, note?: string): Promise<ActionResult | ActionError> {
  const scope = await resolveScopeForFingerprint(ctx, fingerprint);
  if (!scope) return { ok: false, message: `finding not found: ${fingerprint}` };
  const root = ctx.roots[scope];
  if (!root) return { ok: false, message: `${scope} root not configured` };
  const store = await loadReviewStore(root);
  const now = new Date().toISOString();
  const { store: next, record } = resolveFinding(store, fingerprint, note, now);
  if (!record) {
    // Dismissal requested but no persisted record seeded yet — seed it as dismissed directly.
    const seeded: ReviewRecord = {
      fingerprint,
      kind: guessKindFromFingerprint(fingerprint),
      memory_ids: fingerprint.split(':').slice(1).join(',').split(',').filter(Boolean),
      status: 'dismissed',
      updated_at: now,
      ...(note ? { note } : {})
    };
    const seededStore: ReviewStore = { records: { ...store.records, [fingerprint]: seeded } };
    await writeReviewStore(root, seededStore);
    await appendChangelog(root, 'review', `dismiss ${fingerprint}${note ? `: ${note}` : ''}`);
    return { ok: true, message: `Dismissed ${fingerprint}`, record: seeded };
  }
  await writeReviewStore(root, next);
  await appendChangelog(root, 'review', `dismiss ${fingerprint}${note ? `: ${note}` : ''}`);
  return { ok: true, message: `Dismissed ${fingerprint}`, record };
}

/** Verify a memory: update last_verified frontmatter and resolve linked findings. */
export async function verifyAction(ctx: EngramContext, memoryId: string): Promise<ActionResult | ActionError> {
  const entry = await findEntry(ctx, memoryId);
  if (!entry) return { ok: false, message: `memory not found: ${memoryId}` };
  const root = ctx.roots[entry.scope];
  if (!root) return { ok: false, message: `${entry.scope} root not configured` };
  const filePath = entryPath(ctx, entry.scope, entry.file);
  const raw = await readText(filePath);
  const updated = setFrontmatterField(setFrontmatterField(raw, 'last_verified', today()), 'lifecycle', 'active');
  await writeText(filePath, updated);
  await updateHash(root, entry.file, updated);
  const index = await rebuildIndex(root, entry.scope);
  await rebuildGraph(root, entry.scope, index, ctx.config);
  await ensureVectorIndex(root, entry.scope, index.entries, ctx.config);
  const store = await loadReviewStore(root);
  const now = new Date().toISOString();
  const entries = visibleEntries(index.entries, ctx.config);
  const derived = deriveFindings(entries, ctx.graph);
  const matching = derived.filter((f) => f.memory_ids.includes(memoryId));
  let next = seedAllRecords(store, derived);
  for (const f of matching) {
    next = resolveFinding(next, f.fingerprint, `verified ${memoryId}`, now).store;
  }
  await writeReviewStore(root, next);
  await appendChangelog(root, entry.file, `verify ${memoryId}: last_verified set to ${today()}`);
  return { ok: true, message: `Verified ${memoryId}: last_verified updated to ${today()}` };
}

/** Supersede an old memory with a new one. Old memory gets lifecycle: superseded,
 *  new memory gets supersedes: <old-id>. Findings for the old memory are resolved. */
export async function supersedeAction(ctx: EngramContext, oldId: string, newId: string): Promise<ActionResult | ActionError> {
  if (oldId === newId) return { ok: false, message: 'old and new memory ids must differ' };
  const oldEntry = await findEntry(ctx, oldId);
  const newEntry = await findEntry(ctx, newId);
  if (!oldEntry) return { ok: false, message: `old memory not found: ${oldId}` };
  if (!newEntry) return { ok: false, message: `new memory not found: ${newId}` };
  if (oldEntry.scope !== newEntry.scope) return { ok: false, message: 'cross-scope supersede is not supported: old and new memory must share the same scope; use engram review supersede for same-scope pairs only' };
  const root = ctx.roots[oldEntry.scope];
  if (!root) return { ok: false, message: `${oldEntry.scope} root not configured` };
  const oldPath = entryPath(ctx, oldEntry.scope, oldEntry.file);
  const oldRaw = await readText(oldPath);
  const oldUpdated = setFrontmatterField(oldRaw, 'lifecycle', 'superseded');
  await writeText(oldPath, oldUpdated);
  await updateHash(root, oldEntry.file, oldUpdated);
  const newPath = entryPath(ctx, newEntry.scope, newEntry.file);
  const newRaw = await readText(newPath);
  const newUpdated = setFrontmatterField(newRaw, 'supersedes', oldId);
  await writeText(newPath, newUpdated);
  await updateHash(root, newEntry.file, newUpdated);
  const index = await rebuildIndex(root, oldEntry.scope);
  await rebuildGraph(root, oldEntry.scope, index, ctx.config);
  await ensureVectorIndex(root, oldEntry.scope, index.entries, ctx.config);
  const store = await loadReviewStore(root);
  const now = new Date().toISOString();
  const entries = visibleEntries(index.entries, ctx.config);
  const derived = deriveFindings(entries, ctx.graph);
  const matching = derived.filter((f) => f.memory_ids.includes(oldId));
  let next = seedAllRecords(store, derived);
  for (const f of matching) {
    next = resolveFinding(next, f.fingerprint, `superseded by ${newId}`, now).store;
  }
  await writeReviewStore(root, next);
  await appendChangelog(root, oldEntry.file, `supersede ${oldId} -> ${newId}`);
  return { ok: true, message: `Superseded ${oldId} with ${newId}` };
}

/** Archive a memory via the existing approval-bound archive flow.
 *  Resolves linked review findings after the move completes. */
export async function archiveAction(ctx: EngramContext, memoryId: string, reason: string): Promise<ActionResult | ActionError> {
  const entry = await findEntry(ctx, memoryId);
  if (!entry) return { ok: false, message: `memory not found: ${memoryId}` };
  const root = ctx.roots[entry.scope];
  if (!root) return { ok: false, message: `${entry.scope} root not configured` };
  const plan = planArchive(ctx, memoryId, reason);
  const archivePath = await archiveMemory(ctx, plan, reason);
  const store = await loadReviewStore(root);
  const now = new Date().toISOString();
  const entries = visibleEntries(ctx.index.entries, ctx.config);
  const derived = deriveFindings(entries, ctx.graph);
  const matching = derived.filter((f) => f.memory_ids.includes(memoryId));
  let next = seedAllRecords(store, derived);
  for (const f of matching) {
    next = resolveFinding(next, f.fingerprint, `archived: ${reason}`, now).store;
  }
  await writeReviewStore(root, next);
  return { ok: true, message: `Archived ${memoryId} -> ${archivePath}` };
}

async function findEntry(ctx: EngramContext, memoryId: string): Promise<MemoryEntry | undefined> {
  return ctx.index.entries.find((e) => e.id === memoryId);
}

async function resolveScopeForFingerprint(ctx: EngramContext, fingerprint: string): Promise<Scope | undefined> {
  for (const scope of ['workspace', 'global'] as Scope[]) {
    const root = ctx.roots[scope];
    if (!root) continue;
    const store = await loadReviewStore(root);
    if (store.records[fingerprint]) return scope;
  }
  return undefined;
}

function guessKindFromFingerprint(fingerprint: string): ReviewFinding['kind'] {
  const prefix = fingerprint.split(':')[0];
  const kinds: ReviewFinding['kind'][] = ['duplicate', 'contradiction', 'stale', 'invalid_dependency'];
  return kinds.find((k) => k === prefix) ?? 'stale';
}

/** Set or replace a frontmatter field on raw Markdown memory text. */
function setFrontmatterField(raw: string, field: string, value: string): string {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return raw;
  const fmBlock = match[1];
  const lines = fmBlock.split(/\r?\n/);
  let found = false;
  const updated = lines.map((line) => {
    const i = line.indexOf(':');
    if (i < 0) return line;
    const key = line.slice(0, i).trim();
    if (key !== field) return line;
    found = true;
    return `${field}: ${value}`;
  });
  if (!found) updated.push(`${field}: ${value}`);
  return `---\n${updated.join('\n')}\n---\n${raw.slice(match[0].length)}`;
}
