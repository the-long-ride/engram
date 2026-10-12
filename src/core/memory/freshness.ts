/** D17 source freshness: re-hash take-control `source_files` against `source_hashes` and keep the local `stale.json`. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { digestSource } from '../ingest/registry.js';
import type { SourceKind } from '../ingest/types.js';
import { isConvertibleDocument } from '../integrations/markdown-them.js';
import { sha256 } from '../safety/hash.js';
import { exists, readJson, readText, writeTextAtomic } from '../system/fsx.js';
import { ensureScopeGitignore } from './scope-gitignore.js';
import type { Scope } from '../runtime/types.js';
import { entryPath, type EngramContext } from './context.js';
import { frontmatterStringList, parseFrontmatter } from './frontmatter.js';
import { protectedSourceReason, resolvedSourceGuard, sourceFileGuard } from './take-control-guards.js';
import { isIgnored } from '../safety/ignore.js';
import { HOST_OTHER_MACHINE, hostMemoryOrigin, parseHostLabel, readHostMemorySource, resolveHostMemoryRoot, type HostMemoryPreset, type HostMemoryRoot } from './host-memory.js';

/** Local derived state under the workspace scope root; gitignored like `usage.json`. */
export const STALE_FILE = 'stale.json';
/** Memory key (`scope:file`) → changed source files; a deleted file is listed as `missing: <file>`. */
export type StaleMap = Record<string, string[]>;
/**
 * `digest`: code/config/manifest sources were hashed by their digest text; absent or `raw`: every hash is the raw file's.
 * `digest` means version 1 of the extractors and redaction: any change to what a digest contains must add a new mode
 * (`digest-v2`) instead of silently changing what `digest` hashes cover.
 */
export type SourceHashMode = 'digest' | 'raw';
/**
 * `global` memories are checked only in the workspace whose `origin` fingerprint they recorded. `host` memories (imported by
 * `take-control --from`) carry preset-relative labels and are checked only where the host store they came from (`origin`) lives.
 */
export type FreshnessEntry = { key: string; sourceFiles: string[]; sourceHashes: string[]; mode?: SourceHashMode; global?: boolean; host?: boolean; origin?: string };
export type UncheckedSource = { key: string; file: string; reason: string };
export type SkippedEntry = { key: string; reason: string };
export type FreshnessReport = { stale: StaleMap; checked: string[]; unchecked: UncheckedSource[]; skipped: SkippedEntry[] };
export type WorkspaceSourceRead = { text: string; rel: string } | { missing: true } | { unchecked: string };

const DIGEST_KINDS: readonly SourceKind[] = ['code', 'config', 'manifest'];
/** Freshness digests are never truncated, so the hash does not depend on take-control's `--max-chars`. */
const UNBOUNDED_CHARS = Number.MAX_SAFE_INTEGER;
const OUTSIDE = 'path outside the workspace';
const IGNORED = 'ignored by Engram ignore rules';
const BOM = '﻿';
export const OTHER_WORKSPACE = 'global memory from another workspace';
export const NO_ORIGIN = 'global memory without origin';
export { HOST_OTHER_MACHINE };

/**
 * The hash take-control records for a code/config/manifest source: sha256 of its untruncated digest text, so
 * whitespace-only and body-only edits keep it. Docs (and unknown kinds) record the raw-file hash instead.
 */
export function sourceDigestHash(relPath: string, text: string, kind: SourceKind): string | undefined {
  if (kind === 'docs') return undefined;
  return digestSource(relPath, stripBom(text), new Set([kind]), UNBOUNDED_CHARS)?.hash;
}

/**
 * Origin fingerprint recorded on take-control memories saved to global scope: sha256 of the workspace's normalized
 * real root path. The path itself never reaches the (committed, synced) global files; a global memory is checked
 * and refreshed only in the workspace it came from, so another machine or clone skips it.
 */
export async function workspaceOrigin(cwd: string): Promise<string> {
  const real = (await fs.realpath(cwd).catch(() => path.resolve(cwd))).replace(/\\/g, '/').replace(/\/+$/, '');
  return sha256(`engram-source-origin:${process.platform === 'win32' ? real.toLowerCase() : real}`);
}

/**
 * Re-hash every entry's sources: the stale map (memory key → changed files) plus the checked keys, unverifiable sources (with reasons), and skipped global entries (another
 * workspace's, or older ones without an origin). Skipped entries' sources are never read.
 */
export async function checkFreshnessDetailed(cwd: string, entries: FreshnessEntry[], origin?: string, ignorePatterns: string[] = []): Promise<FreshnessReport> {
  const report: FreshnessReport = { stale: {}, checked: [], unchecked: [], skipped: [] };
  const here = entries.some((entry) => entry.global) ? origin ?? await workspaceOrigin(cwd) : undefined;
  const hostRoots = new Map<HostMemoryPreset, HostMemoryRoot | undefined>();
  for (const entry of entries) {
    if (entry.host) {
      await checkHostEntry(cwd, entry, report, hostRoots);
      continue;
    }
    if (entry.global && entry.origin !== here) {
      report.skipped.push({ key: entry.key, reason: entry.origin ? OTHER_WORKSPACE : NO_ORIGIN });
      continue;
    }
    const stored = new Set(entry.sourceHashes);
    const reads = await Promise.all(entry.sourceFiles.map(async (file) => ({ file, read: await readWorkspaceSource(cwd, file, ignorePatterns) })));
    report.checked.push(entry.key);
    const changed: string[] = [];
    for (const { file, read } of reads) {
      if ('unchecked' in read) report.unchecked.push({ key: entry.key, file, reason: read.unchecked });
      else if ('missing' in read) changed.push(`missing: ${file}`);
      else if (!currentHashes(read.rel, read.text, entry.mode).some((hash) => stored.has(hash))) changed.push(read.rel);
    }
    if (changed.length) report.stale[entry.key] = changed;
  }
  return report;
}

/**
 * Host-memory entry: its store is resolved on this machine and must hash to the recorded origin, otherwise the entry is
 * skipped without reading anything. Reads are guarded and never write into the host store.
 */
async function checkHostEntry(cwd: string, entry: FreshnessEntry, report: FreshnessReport, roots: Map<HostMemoryPreset, HostMemoryRoot | undefined>): Promise<void> {
  const labels = entry.sourceFiles.map((file) => ({ file, label: parseHostLabel(file) }));
  const presets = [...new Set(labels.flatMap(({ label }) => (label ? [label.preset] : [])))];
  const local = new Map<HostMemoryPreset, HostMemoryRoot>();
  for (const preset of presets) {
    if (!roots.has(preset)) {
      const resolved = await resolveHostMemoryRoot(cwd, preset);
      roots.set(preset, 'reason' in resolved ? undefined : resolved);
    }
    const root = roots.get(preset);
    if (root && entry.origin && await hostMemoryOrigin(root.dir) === entry.origin) local.set(preset, root);
  }
  if (!presets.length || labels.some(({ label }) => !label) || local.size !== presets.length) {
    report.skipped.push({ key: entry.key, reason: HOST_OTHER_MACHINE });
    return;
  }
  const stored = new Set(entry.sourceHashes);
  report.checked.push(entry.key);
  const changed: string[] = [];
  for (const { file, label } of labels) {
    const read = await readHostMemorySource(local.get(label!.preset)!, label!.rel);
    if ('unchecked' in read) report.unchecked.push({ key: entry.key, file, reason: read.unchecked });
    else if ('missing' in read) changed.push(`missing: ${file}`);
    else if (!currentHashes(read.rel, read.text, entry.mode).some((hash) => stored.has(hash))) changed.push(file);
  }
  if (changed.length) report.stale[entry.key] = changed;
}

/** Freshness entries for take-control memories in `scopes`: those with both source lists (others are not file-derived). */
export async function freshnessEntries(ctx: EngramContext, scopes: Scope[]): Promise<FreshnessEntry[]> {
  const entries: FreshnessEntry[] = [];
  for (const entry of ctx.index.entries.filter((item) => scopes.includes(item.scope))) {
    let data: Record<string, any>;
    try { data = parseFrontmatter(await readText(entryPath(ctx, entry.scope, entry.file))).data; }
    catch { continue; }
    const sourceFiles = frontmatterStringList(data.source_files);
    const sourceHashes = frontmatterStringList(data.source_hashes);
    const mode = sourceHashMode(data.source_hash_mode);
    // Save-session, observe, clone, and metacognize also write source lists, but not as workspace file hashes.
    const host = data.source === 'host-memory';
    if (!sourceFiles.length || !sourceHashes.length || (data.source !== 'take-control' && !host && !mode)) continue;
    // A host memory's origin names its store, not a workspace, so it is never treated as a global entry.
    const origin = typeof data.source_origin === 'string' ? { origin: data.source_origin } : {};
    const where = host ? { host: true, ...origin } : entry.scope === 'global' ? { global: true, ...origin } : {};
    entries.push({ key: `${entry.scope}:${entry.file}`, sourceFiles, sourceHashes, ...(mode ? { mode } : {}), ...where });
  }
  return entries;
}

/** Frontmatter `source_hash_mode`, or undefined when absent or unknown (treated as raw). */
export function sourceHashMode(value: unknown): SourceHashMode | undefined {
  return value === 'digest' || value === 'raw' ? value : undefined;
}

/**
 * Read one workspace-relative source for hashing (verify --sources and take-control --refresh). Unread and reported
 * unchecked: absolute paths, drive or scope prefixes, `~`, and `..` segments; secret names, VCS metadata, and Engram
 * data, checked on both the requested and the resolved path; any file that is itself a link (symlink, or a hard link
 * with more than one name, which can give a secret file an innocent name); directory links leaving the workspace;
 * converted documents; files failing the take-control size/binary guard; and paths matching Engram ignore rules.
 */
export async function readWorkspaceSource(cwd: string, file: string, ignorePatterns: string[] = []): Promise<WorkspaceSourceRead> {
  const rel = workspaceRelPath(file);
  if (!rel) return { unchecked: OUTSIDE };
  if (isIgnored(rel, ignorePatterns)) return { unchecked: IGNORED };
  const named = protectedSourceReason(rel);
  if (named) return { unchecked: named };
  if (isConvertibleDocument(rel)) return { unchecked: 'converted document' };
  const target = path.join(cwd, rel);
  let stat: Awaited<ReturnType<typeof fs.lstat>>;
  try { stat = await fs.lstat(target); }
  catch (error) { return isMissing(error) ? { missing: true } : { unchecked: 'unreadable' }; }
  if (stat.isSymbolicLink() || stat.nlink > 1) return { unchecked: 'link' };
  if (!stat.isFile()) return { unchecked: 'not a file' };
  const resolved = await resolvedSourceGuard(cwd, target);
  if (resolved) return { unchecked: resolved };
  const guard = await sourceFileGuard(target);
  if (guard) return { unchecked: guard };
  return { text: await readText(target), rel };
}

/** Normalized relative path, or undefined when the value could name anything outside the workspace. */
export function workspaceRelPath(file: string): string | undefined {
  const value = file.trim().replace(/\\/g, '/');
  if (!value || value.includes('\0') || value.includes(':') || value.startsWith('/') || value.startsWith('~')) return undefined;
  const parts = value.split('/').filter((part) => part && part !== '.');
  if (!parts.length || parts.includes('..')) return undefined;
  return parts.join('/');
}

/** Read `stale.json`; a missing, corrupt, or malformed file yields only the valid rows (usually `{}`). */
export async function readStale(root?: string): Promise<StaleMap> {
  if (!root) return {};
  try {
    const raw = await readJson<unknown>(path.join(root, STALE_FILE), {});
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
    const stale: StaleMap = {};
    for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
      const files = Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && Boolean(item)) : [];
      if (files.length) stale[key] = files;
    }
    return stale;
  } catch {
    return {};
  }
}

/**
 * Write `stale.json` only when its content changes; an empty map removes the file, so a fresh workspace keeps
 * today's load output. The scope `.gitignore` entry is reconciled first so the file is never staged.
 */
export async function writeStale(root: string, stale: StaleMap): Promise<boolean> {
  const file = path.join(root, STALE_FILE);
  const keys = Object.keys(stale).filter((key) => stale[key]?.length).sort();
  const current = await readText(file);
  if (!keys.length) {
    if (!current && !(await exists(file))) return false;
    await fs.rm(file, { force: true });
    return true;
  }
  const next = `${JSON.stringify(Object.fromEntries(keys.map((key) => [key, stale[key]])), null, 2)}\n`;
  if (current === next) return false;
  await ensureScopeGitignore(root);
  await writeTextAtomic(file, next);
  return true;
}

/** Drop `keys` from `stale.json` (after their refresh UPDATE was written). Never throws. */
export async function clearStaleKeys(root: string | undefined, keys: string[]): Promise<void> {
  if (!root || !keys.length) return;
  try {
    const stale = await readStale(root);
    if (!keys.some((key) => key in stale)) return;
    for (const key of keys) delete stale[key];
    await writeStale(root, stale);
  } catch {
    // stale.json is derived; the next `engram verify --sources` rebuilds it.
  }
}

/**
 * Hashes the current text may match. Raw hashes accept LF, CRLF, and BOM variants of the same text, so a checkout
 * with different line endings (Git autocrlf) is not a change; stored hashes stay as saved.
 */
function currentHashes(rel: string, text: string, mode?: SourceHashMode): string[] {
  const hashes = lineEndingVariants(text).map(sha256);
  if (mode !== 'digest') return hashes;
  // A source's digest kind is the extractor take-control used; any matching digest kind may have recorded it.
  for (const kind of DIGEST_KINDS) {
    const hash = sourceDigestHash(rel, text, kind);
    if (hash) hashes.push(hash);
  }
  return hashes;
}

function lineEndingVariants(text: string): string[] {
  const lf = stripBom(text).replace(/\r\n/g, '\n');
  const crlf = lf.replace(/\n/g, '\r\n');
  return [...new Set([text, lf, crlf, `${BOM}${lf}`, `${BOM}${crlf}`])];
}

function stripBom(text: string): string {
  return text.startsWith(BOM) ? text.slice(1) : text;
}

function isMissing(error: unknown): boolean {
  const code = (error as { code?: string } | undefined)?.code;
  return code === 'ENOENT' || code === 'ENOTDIR';
}
