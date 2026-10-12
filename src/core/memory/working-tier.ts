/** D16 working tier: paths and TTL dates, promotion to durable memory, and pruning of expired working memories. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { WORKING_DIR, isActiveMemoryPath, isWorkingPath } from '../runtime/constants.js';
import type { EngramConfig, MemoryEntry, MemoryType, Scope } from '../runtime/types.js';
import { workingTtlDays } from '../runtime/config.js';
import { applyApprovalEdit, type Approval } from '../safety/approval.js';
import { removeHash, updateHash } from '../safety/hash.js';
import { exists, inside, listFiles, readText, writeText } from '../system/fsx.js';
import { today } from '../system/text.js';
import { getContext, type EngramContext } from './context.js';
import { updateFrontmatter } from './frontmatter.js';
import { rebuildGraph } from './graph.js';
import { rebuildIndex, staleWorkingEntries } from './index.js';
import { memoryDir, type WorkingTierMeta } from './memory-template.js';
import { isExpired, matchesMemoryRef } from './memory-ref.js';
import { parseMemory } from './schema.js';
import { writeApprovedMemory } from './storage.js';
import { ensureVectorIndex } from './vector-db.js';

export type PromoteApproval = (preview: string) => Promise<Approval>;

/** Scope-relative path of a working-tier memory, e.g. `working/knowledge/<id>.md`. */
export function workingPath(type: MemoryType, id: string): string {
  return `${WORKING_DIR}/${memoryDir(type)}/${id}.md`;
}


/**
 * An explicit UPDATE never crosses tiers, so a possible duplicate in the other tier needs a different action than
 * `UPDATE: <id>`. Returns that advice, or undefined when plan and hint share a tier.
 */
export function crossTierUpdateAdvice(planFile: string, hintFile: string, id: string): string | undefined {
  if (isWorkingPath(planFile) === isWorkingPath(hintFile)) return undefined;
  return isWorkingPath(planFile)
    ? `${id} is durable; an OBJECTIVE: task candidate cannot UPDATE it. Drop OBJECTIVE: task and rerun with UPDATE: ${id} to change it, or skip this candidate.`
    : `${id} is a working memory; run engram promote ${id} first, then rerun with UPDATE: ${id}.`;
}

/** Working-tier frontmatter for an approved `OBJECTIVE: task` candidate written on `day`. */
export function workingTierMeta(config: EngramConfig, day: string, objective?: string): WorkingTierMeta {
  return { validUntil: addDays(day, workingTtlDays(config)), ...(objective ? { objective } : {}) };
}

/** `YYYY-MM-DD` plus whole days (UTC). */
export function addDays(day: string, days: number): string {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}


/**
 * Move a working memory to its durable type directory after A/B/C approval: drops `tier` and `valid_until`,
 * keeps `objective` as provenance, and bumps `revision`. The write reuses `writeApprovedMemory`, so safety
 * scans, schema validation, hashing, reindexing, and global Git behave exactly as for any approved save.
 */
export async function promoteWorking(cwd: string, id: string, approve: PromoteApproval): Promise<string> {
  const ctx = await getContext(cwd);
  const entry = await findWorkingEntry(ctx, id);
  const day = today();
  if (isExpired(entry.validUntil, day)) {
    throw new Error(`Working memory ${entry.id} expired on ${entry.validUntil}; it can no longer be promoted. Save it again, or run engram working prune.`);
  }
  const root = ctx.roots[entry.scope];
  const source = entry.file;
  const target = source.slice(WORKING_DIR.length + 1);
  // Checked before any preview: a stale index entry must never show an empty promotion.
  if (!(await exists(inside(root, source)))) throw new Error(staleIndexMessage(entry.scope, source));
  if (await exists(inside(root, target))) throw new Error(`Cannot promote ${entry.id}: durable file ${entry.scope}:${target} already exists`);
  const raw = await readText(inside(root, source));
  const content = promotedContent(raw, day);
  const approval = await approve([
    `Promote ${entry.scope}:${source} -> ${entry.scope}:${target}`,
    `Tier: working -> durable (drops tier and valid_until${entry.validUntil ? ` ${entry.validUntil}` : ''}; keeps objective)`,
    '',
    content
  ].join('\n'));
  if (!approval.accepted) return `Discarded. ${entry.scope}:${source} stays in the working tier.`;
  // Drop the working copy first so the rebuilt (and, for global, committed) index never lists the id twice.
  await fs.rm(inside(root, source), { force: true });
  await removeHash(root, source);
  try {
    const written = await writeApprovedMemory({ cwd: ctx.cwd, scope: entry.scope, file: target, content: applyApprovalEdit(content, approval.edits), message: `promote ${entry.type}: ${entry.id}` });
    return `Promoted -> ${written}`;
  } catch (error) {
    // A blocked write (safety scan, validation) leaves the working memory exactly as it was.
    if (!(await exists(inside(root, target)))) {
      await writeText(inside(root, source), raw);
      await updateHash(root, source, raw);
      await reindexScope(ctx, entry.scope);
    }
    throw error;
  }
}

/**
 * Delete working memories whose `valid_until` is before `day` and return them as `scope:file`. Only regular
 * `.md` files under `<scope>/working/` are considered; symlinks (and anything resolving outside the scope) are
 * skipped, so durable memory is never touched. `dryRun` lists without deleting.
 */
export async function pruneWorking(cwd: string, day: string, options: { dryRun?: boolean } = {}): Promise<string[]> {
  const ctx = await getContext(cwd);
  const pruned: string[] = [];
  for (const scope of ['workspace', 'global'] as const) {
    const root = ctx.roots[scope];
    if (!root) continue;
    const { expired } = await scanWorkingFiles(root, day);
    pruned.push(...expired.map((rel) => `${scope}:${rel}`));
    if (!expired.length || options.dryRun) continue;
    // Working files, hashes, and index entries are all local (gitignored), so pruning never touches global Git
    // and the committed changelog never names them.
    for (const rel of expired) {
      await fs.rm(inside(root, rel), { force: true });
      await removeHash(root, rel);
    }
    await reindexScope(ctx, scope);
  }
  return pruned;
}

/** Working memories with no usable `valid_until`, as `scope:file`: they never expire, so prune reports but keeps them. */
export async function undatedWorkingFiles(cwd: string): Promise<string[]> {
  const ctx = await getContext(cwd);
  const rows: string[] = [];
  for (const scope of ['workspace', 'global'] as const) {
    const root = ctx.roots[scope];
    if (root) rows.push(...(await scanWorkingFiles(root, '')).undated.map((rel) => `${scope}:${rel}`));
  }
  return rows;
}

async function findWorkingEntry(ctx: EngramContext, ref: string): Promise<MemoryEntry> {
  const scoped = ref.trim().match(/^(workspace|global):(.+)$/);
  const scopes: Scope[] = scoped ? [scoped[1] as Scope] : ['workspace', 'global'];
  const requested = scoped ? scoped[2] : ref;
  const matching = (entries: MemoryEntry[]) => entries.filter((entry) => matchesMemoryRef(entry, requested));
  const matches = scopes.flatMap((scope) => ctx.roots[scope]
    ? matching(ctx.scopeIndexes[scope].entries).map((entry) => ({ ...entry, scope }))
    : []);
  if (!matches.length) {
    for (const scope of scopes) {
      const stale = ctx.roots[scope] ? matching(await staleWorkingEntries(ctx.roots[scope]))[0] : undefined;
      if (stale) throw new Error(staleIndexMessage(scope, stale.file));
    }
  }
  const working = matches.filter((entry) => isWorkingPath(entry.file));
  if (working.length > 1) {
    throw new Error(`Working memory ${ref} exists in ${working.map((entry) => entry.scope).join(' and ')}; rerun with workspace:${ref} or global:${ref}`);
  }
  if (working.length) return working[0];
  const durable = matches[0];
  if (durable) throw new Error(`Memory ${durable.id} is already durable (${durable.scope}:${durable.file}); nothing to promote`);
  throw new Error(`No working memory found for ${ref}. Working memories live under .agents/.engram/${WORKING_DIR}/`);
}

function staleIndexMessage(scope: Scope, file: string): string {
  return `Working memory file ${scope}:${file} is missing (stale index); run engram rebuild-index`;
}

function promotedContent(raw: string, day: string): string {
  const revision = Number(parseMemory(raw).frontmatter.revision ?? 1);
  return updateFrontmatter(raw, {
    tier: undefined,
    valid_until: undefined,
    revision: Number.isInteger(revision) && revision >= 1 ? revision + 1 : 2,
    updated: day,
    last_confirmed: day
  });
}


/**
 * Classify the regular working-tier memory files of one scope root: `expired` (valid_until before `day`) and
 * `undated` (no parseable valid_until, so they never expire). Symlinks and paths resolving outside the root are skipped.
 */
export async function scanWorkingFiles(root: string, day: string): Promise<{ expired: string[]; undated: string[] }> {
  const result = { expired: [] as string[], undated: [] as string[] };
  const dir = path.join(root, WORKING_DIR);
  // lstat: a symlinked working/ directory is not followed.
  if (!(await fs.lstat(dir).catch(() => undefined))?.isDirectory()) return result;
  const realRoot = await fs.realpath(root);
  // listFiles skips symlinked files and directories.
  for (const file of await listFiles(dir)) {
    const rel = path.relative(root, file).replace(/\\/g, '/');
    if (!isWorkingPath(rel) || !isActiveMemoryPath(rel)) continue;
    const real = await fs.realpath(file).catch(() => '');
    const relativeToRoot = real ? path.relative(realRoot, real) : '..';
    if (relativeToRoot.startsWith('..') || path.isAbsolute(relativeToRoot)) continue;
    try {
      const validUntil = parseMemory(await readText(file)).frontmatter.valid_until;
      if (typeof validUntil !== 'string' || !Number.isFinite(Date.parse(validUntil))) result.undated.push(rel);
      else if (isExpired(validUntil, day)) result.expired.push(rel);
    } catch {
      continue;
    }
  }
  result.expired.sort();
  result.undated.sort();
  return result;
}

async function reindexScope(ctx: EngramContext, scope: Scope): Promise<void> {
  const root = ctx.roots[scope];
  const index = await rebuildIndex(root, scope);
  await rebuildGraph(root, scope, index, ctx.config);
  await ensureVectorIndex(root, scope, index.entries, ctx.config);
}
