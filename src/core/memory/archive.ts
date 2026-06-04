/** Approved archival for wrong or superseded memories. */
import fs from 'node:fs/promises';
import path from 'node:path';
import type { EngramContext } from './context.js';
import type { MemoryEntry, Scope } from '../runtime/types.js';
import { entryPath } from './context.js';
import { ensureDir, inside, readText, writeText } from '../system/fsx.js';
import { today } from '../system/text.js';
import { removeHash, updateHash } from '../safety/hash.js';
import { rebuildIndex } from './index.js';
import { rebuildGraph } from './graph.js';
import { appendChangelog } from './storage.js';
import { gitCommitGlobal, pullGlobalGit } from '../vcs/git.js';
import { resolveConflictsInRoot } from '../vcs/conflict.js';

export type ArchivePlan = { entry: MemoryEntry; originalPath: string; archiveFile: string; content: string };
type NormalizedArchiveTarget = { scope?: Scope; value: string };

/** Resolve a memory by ID, file path, or scope-prefixed path. */
export function planArchive(ctx: EngramContext, target: string, reason = ''): ArchivePlan {
  return planArchiveSet(ctx, target, reason)[0];
}

/** Resolve one memory and any active global twin that should leave routing with it. */
export function planArchiveSet(ctx: EngramContext, target: string, reason = ''): ArchivePlan[] {
  const wanted = normalizeTarget(target);
  const entries = archiveTargetEntries(ctx, wanted);
  if (!entries.length) throw new Error(`memory not found: ${target}`);
  if (entries.length > 1) throw new Error(`memory target is ambiguous: ${target}`);
  const primary = archivePlanForEntry(ctx, entries[0], reason);
  const twins = wanted.scope === 'global' ? [] : globalTwinEntries(ctx, primary.entry).map((entry) => archivePlanForEntry(ctx, entry, reason));
  return uniqueArchivePlans([primary, ...twins]);
}

function archivePlanForEntry(ctx: EngramContext, entry: MemoryEntry, reason: string): ArchivePlan {
  const archiveFile = `archive/${today()}/${entry.file}`;
  const originalPath = entryPath(ctx, entry.scope, entry.file);
  const content = [
    `<!-- Archived by Engram on ${new Date().toISOString()} -->`,
    `<!-- Original: ${entry.scope}:${entry.file} -->`,
    `<!-- Reason: ${reason || 'No reason provided'} -->`,
    '',
    readTextSyncNotice()
  ].join('\n');
  return { entry, originalPath, archiveFile, content };
}

function archiveTargetEntries(ctx: EngramContext, wanted: NormalizedArchiveTarget): MemoryEntry[] {
  const source = wanted.scope ? ctx.scopeIndexes[wanted.scope].entries : ctx.index.entries;
  return source.filter((entry) => entry.id === wanted.value || entry.file === wanted.value || entry.file.endsWith(`/${wanted.value}`));
}

function globalTwinEntries(ctx: EngramContext, entry: MemoryEntry): MemoryEntry[] {
  if (entry.scope !== 'workspace') return [];
  return ctx.scopeIndexes.global.entries.filter((candidate) => candidate.id === entry.id && candidate.type === entry.type && !candidate.ignored);
}

function uniqueArchivePlans(plans: ArchivePlan[]): ArchivePlan[] {
  const map = new Map<string, ArchivePlan>();
  for (const plan of plans) map.set(`${plan.entry.scope}:${plan.entry.file}`, plan);
  return [...map.values()];
}

/** Move a memory out of active routing while preserving it under archive/. */
export async function archiveMemory(ctx: EngramContext, plan: ArchivePlan, reason = ''): Promise<string> {
  const root = ctx.roots[plan.entry.scope];
  if (!root) throw new Error(`${plan.entry.scope} memory is not configured`);
  const globalGit = plan.entry.scope === 'global' ? ctx.config.global_git : undefined;
  if (globalGit) await pullGlobalGit(root, globalGit, () => resolveGlobalConflicts(root));
  const raw = await readText(plan.originalPath);
  const archivePath = inside(root, plan.archiveFile);
  await ensureDir(path.dirname(archivePath));
  await fs.rename(plan.originalPath, archivePath);
  const annotated = plan.content.replace(readTextSyncNotice(), raw);
  await writeText(archivePath, annotated);
  await removeHash(root, plan.entry.file);
  await updateHash(root, plan.archiveFile, annotated);
  const index = await rebuildIndex(root, plan.entry.scope);
  await rebuildGraph(root, plan.entry.scope, index, ctx.config);
  await appendChangelog(root, plan.archiveFile, `archive ${plan.entry.id}: ${reason || 'No reason provided'}`);
  if (globalGit) await gitCommitGlobal(root, `archive memory: ${plan.entry.id}`, globalGit, () => resolveGlobalConflicts(root));
  return archivePath;
}

function normalizeTarget(target: string): NormalizedArchiveTarget {
  const raw = target.replace(/\\/g, '/').trim();
  const match = raw.match(/^(workspace|global):(.+)$/);
  return match ? { scope: match[1] as Scope, value: match[2] } : { value: raw };
}

async function resolveGlobalConflicts(root: string): Promise<number> {
  const results = await resolveConflictsInRoot(root, 'global');
  return results.filter((row) => row.resolved).length;
}

function readTextSyncNotice(): string {
  return '<!-- archived-memory-body -->';
}
