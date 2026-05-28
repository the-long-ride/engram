/** Deterministic merge-conflict discovery and scoped auto-resolution. */
import path from 'node:path';
import { CHANGELOG_FILE, ENGRAM_DIR, HASH_FILE, INDEX_FILE } from '../runtime/constants.js';
import { listFiles, readText, writeText } from '../system/fsx.js';
import { updateHash } from '../safety/hash.js';
import { rebuildIndex } from '../memory/index.js';
import { git } from './git.js';
import type { Scope } from '../runtime/types.js';
import { scanInjection, scanSensitive } from '../safety/security.js';
import { validateMemoryRaw } from '../memory/schema.js';

export type Conflict = { file: string; kind: 'EXTEND' | 'CONTRADICT' | 'DUPLICATE' | 'UNRELATED'; summary: string };
export type ConflictResult = Conflict & { resolved: boolean; staged: boolean; decision: string };

/** Find conflicted memory files and classify with conservative heuristics. */
export async function findConflicts(cwd: string): Promise<Conflict[]> {
  return findConflictsInRoot(path.join(cwd, ENGRAM_DIR));
}

/** Find conflicted memory files under any Engram scope root. */
export async function findConflictsInRoot(root: string): Promise<Conflict[]> {
  const files = (await listFiles(root)).filter((file) => file.endsWith('.md'));
  const out: Conflict[] = [];
  for (const file of files) {
    const text = await readText(file);
    if (!text.includes('<<<<<<<')) continue;
    const kind = classifyConflict(text);
    out.push({ file: path.relative(root, file).replace(/\\/g, '/'), kind, summary: summaryFor(kind) });
  }
  return out;
}

/** Classify conflict text without attempting unsafe semantic resolution. */
export function classifyConflict(text: string): Conflict['kind'] {
  if (/updated:\s*(\d{4}-\d{2}-\d{2})[\s\S]*updated:\s*(\d{4}-\d{2}-\d{2})/.test(text)) return 'DUPLICATE';
  if (/must not|forbidden|never/i.test(text) && /must|always|required/i.test(text)) return 'CONTRADICT';
  if ((text.match(/^## /gm) ?? []).length > 3) return 'EXTEND';
  return 'UNRELATED';
}

/** Resolve all conflicted .engram Markdown files, optionally as preview only. */
export async function resolveConflicts(cwd: string, dryRun = false): Promise<ConflictResult[]> {
  const root = path.join(cwd, ENGRAM_DIR);
  const results = await resolveConflictsInRoot(root, 'workspace', dryRun);
  const changed = results.filter((row) => row.resolved).map((row) => row.file);
  const staged = dryRun ? false : await stageResolved(cwd, changed);
  return results.map((result) => ({ ...result, staged }));
}

/** Resolve conflicted memory files inside a scope root. */
export async function resolveConflictsInRoot(root: string, scope: Scope, dryRun = false): Promise<ConflictResult[]> {
  const conflicts = await findConflictsInRoot(root);
  const results: ConflictResult[] = [];
  const changed: string[] = [];
  for (const conflict of conflicts) {
    if (conflict.kind === 'CONTRADICT') {
      results.push({ ...conflict, resolved: false, staged: false, decision: 'needs human review for contradiction' });
      continue;
    }
    const source = await readText(path.join(root, conflict.file));
    const resolution = resolveConflictText(source);
    const validation = validateResolvedMemory(resolution.text);
    if (validation) {
      results.push({ ...conflict, resolved: false, staged: false, decision: validation });
      continue;
    }
    if (!dryRun) {
      await writeText(path.join(root, conflict.file), resolution.text);
      await updateHash(root, conflict.file, resolution.text);
      changed.push(conflict.file);
    }
    results.push({ ...conflict, resolved: true, staged: false, decision: resolution.decision });
  }
  if (!dryRun && changed.length) {
    await rebuildIndex(root, scope);
    await appendConflictChangelog(root, changed);
  }
  return results;
}

/** Resolve every two-sided conflict block in a file. */
export function resolveConflictText(text: string): { text: string; decision: string } {
  const decisions: string[] = [];
  const resolved = text.replace(/<<<<<<<[^\n]*\r?\n([\s\S]*?)\r?\n=======\r?\n([\s\S]*?)\r?\n>>>>>>>[^\n]*(?:\r?\n)?/g, (_all, ours, theirs) => {
    const decision = chooseChunk(String(ours), String(theirs));
    decisions.push(decision.reason);
    return decision.text.endsWith('\n') ? decision.text : `${decision.text}\n`;
  });
  return { text: resolved, decision: decisions.join('; ') || 'no conflict blocks changed' };
}

function chooseChunk(ours: string, theirs: string): { text: string; reason: string } {
  if (ours.trim() === theirs.trim()) return { text: ours, reason: 'kept identical content' };
  const newer = chooseNewer(ours, theirs);
  if (newer) return newer;
  if (isContradictory(ours, theirs)) return { text: ours, reason: 'kept ours for unresolved contradiction' };
  return { text: mergeUnique(ours, theirs), reason: 'merged unique lines from both sides' };
}

function chooseNewer(ours: string, theirs: string): { text: string; reason: string } | undefined {
  const od = Date.parse(ours.match(/updated:\s*(\d{4}-\d{2}-\d{2})/)?.[1] ?? '');
  const td = Date.parse(theirs.match(/updated:\s*(\d{4}-\d{2}-\d{2})/)?.[1] ?? '');
  if (!od || !td || od === td) return undefined;
  return td > od ? { text: theirs, reason: 'kept theirs with newer updated date' } : { text: ours, reason: 'kept ours with newer updated date' };
}

function isContradictory(ours: string, theirs: string): boolean {
  const combined = `${ours}\n${theirs}`;
  return /must not|forbidden|never/i.test(combined) && /must|always|required/i.test(combined);
}

function mergeUnique(ours: string, theirs: string): string {
  const lines = [...ours.split(/\r?\n/), ...theirs.split(/\r?\n/)];
  return [...new Set(lines)].join('\n').replace(/\n{3,}/g, '\n\n');
}

async function stageResolved(cwd: string, files: string[]): Promise<boolean> {
  if (!files.length) return false;
  const metadata = [INDEX_FILE, HASH_FILE, CHANGELOG_FILE];
  const paths = [...files, ...metadata].map((file) => path.join(ENGRAM_DIR, file).replace(/\\/g, '/'));
  try { await git(['-C', cwd, 'add', '--', ...paths]); return true; } catch { return false; }
}

async function appendConflictChangelog(root: string, files: string[]): Promise<void> {
  const target = path.join(root, CHANGELOG_FILE);
  const current = await readText(target);
  const lines = files.map((file) => `- ${new Date().toISOString()} ${file}: resolve conflict: ${file}`);
  await writeText(target, `${current.trimEnd()}\n${lines.join('\n')}\n`);
}

function summaryFor(kind: Conflict['kind']): string {
  if (kind === 'CONTRADICT') return 'Requires human review; contradictory memories are not auto-resolved.';
  if (kind === 'EXTEND') return 'Auto-resolves by merging unique lines.';
  if (kind === 'DUPLICATE') return 'Likely duplicate; choose newer updated date.';
  return 'Likely separate memories; split after review.';
}

function validateResolvedMemory(text: string): string {
  try {
    const sensitive = scanSensitive(text);
    if (sensitive.length) return `blocked sensitive data on line ${sensitive[0].line}`;
    const injection = scanInjection(text);
    if (injection.length) return `blocked prompt injection on line ${injection[0].line}`;
    validateMemoryRaw(text);
    return '';
  } catch (error: any) {
    return `needs human review: ${error.message}`;
  }
}
