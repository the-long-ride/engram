/** Native host path rules: emit applies_to memories as Claude `.claude/rules/engram/*.md` and Cursor `.cursor/rules/engram/*.mdc`. */
import fs from 'node:fs/promises';
import path from 'node:path';
import type { RecordBlock } from '../cli/format.js';
import { getContext } from '../memory/context.js';
import type { EngramContext } from '../memory/context.js';
import { memoryKey } from '../memory/memory-ref.js';
import { validityFactor, visibleEntries } from '../memory/routing.js';
import { pathRulesMode } from '../runtime/config.js';
import { isWorkingPath } from '../runtime/constants.js';
import type { MemoryEntry, Scope } from '../runtime/types.js';
import { readGuardedMemory } from '../safety/safe-read.js';
import { sha256 } from '../safety/hash.js';
import { exists, readText, writeTextAtomic } from '../system/fsx.js';
import { today } from '../system/text.js';
import { detectInstalledHookTargets } from './agent-hooks.js';
import { globalAgentHome } from './agent-paths.js';

export type NativeRuleHost = 'claude' | 'cursor';
export type NativeRuleFile = { host: NativeRuleHost; relFile: string; key: string; content: string };
export type NativeRuleSkip = { key: string; reason: string };
export type NativeRuleSyncResult = {
  host: NativeRuleHost;
  scope: Scope;
  dir: string;
  written: string[];
  updated: string[];
  removed: string[];
  unchanged: number;
  skipped: NativeRuleSkip[];
  /** Unmarked files left alone. */
  preserved: string[];
};

export const NATIVE_RULE_DIRS: Record<NativeRuleHost, string> = {
  claude: path.join('.claude', 'rules', 'engram'),
  cursor: path.join('.cursor', 'rules', 'engram')
};
const RULE_EXTENSION: Record<NativeRuleHost, string> = { claude: '.md', cursor: '.mdc' };
/** Claude expands at most this many brace patterns per rule; Cursor globs are expanded up front to the same bound. */
export const CLAUDE_BRACE_BUDGET = 1000;
const MARKER = /^<!-- engram:((?:workspace|global):.+?) sha:([0-9a-f]{8}) -->$/;
const DESCRIPTION_LIMIT = 200;

/** Marker line: memory key plus the first 8 hex of sha256(body). */
export function nativeRuleMarker(key: string, body: string): string {
  return `<!-- engram:${key} sha:${bodySha(body)} -->`;
}

/** Key and sha from the first non-empty line after the frontmatter; undefined for unmarked files. */
export function parseNativeRuleMarker(text: string): { key: string; sha: string } | undefined {
  let lines = text.replace(/\r\n?/g, '\n').split('\n');
  if (lines[0]?.trim() === '---') {
    const close = lines.findIndex((line, index) => index > 0 && line.trim() === '---');
    if (close < 0) return undefined;
    lines = lines.slice(close + 1);
  }
  const first = lines.find((line) => line.trim() !== '');
  const match = first ? MARKER.exec(first.trim()) : null;
  return match ? { key: match[1], sha: match[2] } : undefined;
}

/**
 * Engram applies_to -> host globs with the same match set as `matchPattern`: a slash-free or wildcard pattern matches at
 * any depth there, while Claude's `*.md` means the project root only. Deduped, input order kept.
 */
export function hostGlobs(appliesTo: string[]): string[] {
  const out: string[] = [];
  const add = (glob: string) => { if (!out.includes(glob)) out.push(glob); };
  for (const raw of appliesTo) {
    const p = raw.trim().replace(/\\/g, '/').replace(/^\.\//, '').replace(/^\/+/, '');
    if (!p) continue;
    if (p === '**') add('**');
    else if (p.endsWith('/')) add(`**/${p}**`);
    else if (p.endsWith('/**')) add(p);
    else if (!/[?*]/.test(p)) { add(`**/${p}`); add(`${p}/**`); }
    else if (p.startsWith('**/')) add(p);
    else add(`**/${p}`);
  }
  return out;
}

type BraceInfo = { groups: Array<{ start: number; end: number; alts: string[] }>; nested: boolean };

/** Top-level `{a,b}` groups of one glob; undefined when the braces are unbalanced. A group without a comma stays literal. */
function braceGroups(pattern: string): BraceInfo | undefined {
  const groups: BraceInfo['groups'] = [];
  let depth = 0;
  let start = -1;
  let altStart = 0;
  let alts: string[] = [];
  let nested = false;
  for (let i = 0; i < pattern.length; i += 1) {
    const char = pattern[i];
    if (char === '{') {
      if (depth === 0) { start = i; altStart = i + 1; alts = []; } else nested = true;
      depth += 1;
    } else if (char === ',' && depth === 1) {
      alts.push(pattern.slice(altStart, i));
      altStart = i + 1;
    } else if (char === '}') {
      if (depth === 0) return undefined;
      depth -= 1;
      if (depth === 0) {
        alts.push(pattern.slice(altStart, i));
        if (alts.length > 1) groups.push({ start, end: i, alts });
      }
    }
  }
  return depth === 0 ? { groups, nested } : undefined;
}

/** Expanded-pattern count of one glob's brace groups (1 for no braces). */
export function braceExpansionCount(pattern: string): number {
  const info = braceGroups(pattern);
  if (!info) return 1;
  return info.groups.reduce((total, group) => total * group.alts.reduce((sum, alt) => sum + braceExpansionCount(alt), 0), 1);
}

/** Expand brace groups up to `limit` patterns; undefined when over the limit or the braces are unbalanced/nested. */
export function expandBraces(pattern: string, limit: number): string[] | undefined {
  const info = braceGroups(pattern);
  if (!info || info.nested) return undefined;
  if (!info.groups.length) return [pattern];
  if (info.groups.reduce((total, group) => total * group.alts.length, 1) > limit) return undefined;
  let out = [''];
  let cursor = 0;
  for (const group of info.groups) {
    const literal = pattern.slice(cursor, group.start);
    out = out.flatMap((prefix) => group.alts.map((alt) => `${prefix}${literal}${alt}`));
    cursor = group.end + 1;
  }
  return out.map((prefix) => `${prefix}${pattern.slice(cursor)}`);
}

function bodySha(body: string): string {
  return sha256(body).slice(0, 8);
}

/** Claude rule: paths-only frontmatter with every glob quoted (an unparsable list would make the rule always-on). */
export function renderClaudeRule(key: string, globs: string[], body: string): string {
  const frontmatter = ['---', 'paths:', ...globs.map((glob) => `  - ${JSON.stringify(glob)}`), '---'];
  return `${[...frontmatter, nativeRuleMarker(key, body), body].join('\n')}\n`;
}

/** Cursor rule: `description` and comma-joined `globs` with `alwaysApply: false`, so it attaches only on a matching file. */
export function renderCursorRule(key: string, description: string, globs: string[], body: string): string {
  const frontmatter = ['---', `description: ${JSON.stringify(description.slice(0, DESCRIPTION_LIMIT))}`, `globs: ${globs.join(',')}`, 'alwaysApply: false', '---'];
  return `${[...frontmatter, nativeRuleMarker(key, body), body].join('\n')}\n`;
}

function ruleSlug(id: string): string {
  const slug = id.toLowerCase().replace(/[^a-z0-9._-]/g, '-').replace(/^\.+/, '');
  return slug || 'memory';
}

/**
 * Durable, visible memories with `applies_to` for one scope. Roles are ignored on purpose (K7): the rule folders are committed, so
 * one developer's role set must not churn them. Nothing is emitted unless Engram is enabled and reads per turn (`auto`/`always`).
 */
export function nativeRuleEntries(ctx: EngramContext, scope: Scope): MemoryEntry[] {
  if (!ctx.config.enabled || !['auto', 'always'].includes(ctx.config.read) || !ctx.roots[scope]) return [];
  const day = today();
  return visibleEntries(ctx.index.entries, { ...ctx.config, roles: [] }, false, ctx.ignorePatterns)
    .filter((entry) => validityFactor(entry, false, day) !== 'exclude')
    .filter((entry) => entry.scope === scope && Boolean(entry.appliesTo?.length) && entry.tier !== 'working' && !isWorkingPath(entry.file))
    .sort((a, b) => a.file.localeCompare(b.file));
}

/**
 * Desired files for one host and scope: durable, visible, applies_to, unflagged. Claude rules are off under
 * `hooks.path_rules: hook`, where the PreToolUse hook injects the bodies instead; the sync then removes marked files.
 */
export async function renderNativeRules(ctx: EngramContext, host: NativeRuleHost, scope: Scope): Promise<{ files: NativeRuleFile[]; skipped: NativeRuleSkip[] }> {
  const files: NativeRuleFile[] = [];
  const skipped: NativeRuleSkip[] = [];
  if (host === 'claude' && pathRulesMode(ctx.config) === 'hook') return { files, skipped };
  const entries = nativeRuleEntries(ctx, scope);
  const names = new Map<string, string>();
  for (const entry of entries) {
    const key = memoryKey(entry);
    const globs = ruleGlobs(entry, host);
    if (typeof globs === 'string') { skipped.push({ key, reason: globs }); continue; }
    const row = await readGuardedMemory(ctx.cwd, entry, ctx.config, { forAgents: true });
    if (row.flagged || !row.content) { skipped.push({ key, reason: row.flagged ?? 'empty memory body' }); continue; }
    const relFile = `${ruleSlug(entry.id)}${RULE_EXTENSION[host]}`;
    const owner = names.get(relFile);
    if (owner) { skipped.push({ key, reason: `rule file name collides with ${owner}` }); continue; }
    names.set(relFile, key);
    const body = row.content.replace(/\r\n?/g, '\n').trimEnd();
    const description = `Engram memory ${entry.id}: ${(entry.directive || entry.summary || '').replace(/\s+/g, ' ').trim()}`;
    files.push({ host, relFile, key, content: host === 'claude' ? renderClaudeRule(key, globs, body) : renderCursorRule(key, description, globs, body) });
  }
  return { files, skipped };
}

/** Host globs for one entry, or the reason it cannot be expressed. */
function ruleGlobs(entry: MemoryEntry, host: NativeRuleHost): string[] | string {
  const globs = hostGlobs(entry.appliesTo ?? []);
  if (!globs.length) return 'applies_to has no usable glob';
  if (host === 'claude') {
    const expanded = globs.filter((glob) => glob.includes('{')).reduce((sum, glob) => sum + braceExpansionCount(glob), 0);
    return expanded > CLAUDE_BRACE_BUDGET ? "applies_to brace expansion exceeds Claude's 1,000-pattern budget" : globs;
  }
  const out: string[] = [];
  for (const glob of globs) {
    const expanded = expandBraces(glob, CLAUDE_BRACE_BUDGET);
    if (!expanded) return 'applies_to braces cannot be expressed as Cursor globs';
    for (const item of expanded) if (!out.includes(item)) out.push(item);
  }
  return out.some((glob) => glob.includes(',')) ? 'applies_to glob contains a comma, which Cursor reads as a separator' : out;
}

/** Regular files of the host extension directly under `dir`, with their text; symlinks and subdirectories are ignored. */
async function ruleFilesIn(dir: string, host: NativeRuleHost): Promise<Array<{ name: string; file: string; text: string }>> {
  let dirents: Array<{ name: string; isFile(): boolean }>;
  try {
    dirents = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const out = [];
  for (const dirent of dirents.sort((a, b) => a.name.localeCompare(b.name))) {
    if (!dirent.isFile() || !dirent.name.toLowerCase().endsWith(RULE_EXTENSION[host])) continue;
    const file = path.join(dir, dirent.name);
    out.push({ name: dirent.name, file, text: await readText(file) });
  }
  return out;
}

async function removeDirIfEmpty(dir: string): Promise<void> {
  try {
    await fs.rmdir(dir);
  } catch {
    // Missing or not empty: leave it.
  }
}

/** Write changed files, delete marker-bearing files no longer desired, never touch unmarked files. */
export async function syncNativeRules(ctx: EngramContext, host: NativeRuleHost, options: { scope: Scope; baseDir: string; plan?: boolean }): Promise<NativeRuleSyncResult> {
  const dir = path.join(options.baseDir, NATIVE_RULE_DIRS[host]);
  const { files, skipped } = await renderNativeRules(ctx, host, options.scope);
  const result: NativeRuleSyncResult = { host, scope: options.scope, dir, written: [], updated: [], removed: [], unchanged: 0, skipped: [...skipped], preserved: [] };
  const existingFiles = new Map((await ruleFilesIn(dir, host)).map((item) => [item.name, item]));
  const desired = new Set(files.map((item) => item.relFile));
  for (const item of files) {
    const existing = existingFiles.get(item.relFile)?.text ?? '';
    if (existing.replace(/\r\n/g, '\n') === item.content) { result.unchanged += 1; continue; }
    if (existing && !parseNativeRuleMarker(existing)) {
      result.preserved.push(item.relFile);
      result.skipped.push({ key: item.key, reason: 'unmarked file exists' });
      continue;
    }
    if (!options.plan) await writeTextAtomic(path.join(dir, item.relFile), item.content);
    (existing ? result.updated : result.written).push(item.relFile);
  }
  for (const [name, existing] of existingFiles) {
    if (desired.has(name)) continue;
    if (!parseNativeRuleMarker(existing.text)) {
      if (!result.preserved.includes(name)) result.preserved.push(name);
      continue;
    }
    if (!options.plan) await fs.rm(existing.file, { force: true });
    result.removed.push(name);
  }
  if (!options.plan && result.removed.length) await removeDirIfEmpty(dir);
  return result;
}

/** Unlink: delete marker-bearing files and the directory when it ends up empty. */
export async function removeNativeRules(baseDir: string, host: NativeRuleHost): Promise<string[]> {
  const dir = path.join(baseDir, NATIVE_RULE_DIRS[host]);
  const removed: string[] = [];
  for (const item of await ruleFilesIn(dir, host)) {
    if (!parseNativeRuleMarker(item.text)) continue;
    await fs.rm(item.file, { force: true });
    removed.push(item.name);
  }
  if (removed.length) await removeDirIfEmpty(dir);
  return removed;
}

/** Keys of marker-bearing rule files under baseDir (runtime double-delivery guard). Fails open to []. */
export async function nativeRuleKeys(baseDir: string, host: NativeRuleHost): Promise<string[]> {
  try {
    const keys: string[] = [];
    for (const item of await ruleFilesIn(path.join(baseDir, NATIVE_RULE_DIRS[host]), host)) {
      const marker = parseNativeRuleMarker(item.text);
      if (marker && !keys.includes(marker.key)) keys.push(marker.key);
    }
    return keys;
  } catch {
    return [];
  }
}

/** Global applies_to memories no user-level Claude rule covers: native mode drops the PreToolUse that used to inject them. */
export async function missingGlobalRuleCount(ctx: EngramContext): Promise<number> {
  if (pathRulesMode(ctx.config) !== 'native') return 0;
  const covered = new Set(await nativeRuleKeys(globalAgentHome(), 'claude'));
  return nativeRuleEntries(ctx, 'global').filter((entry) => !covered.has(memoryKey(entry))).length;
}

const HOSTS: NativeRuleHost[] = ['claude', 'cursor'];

/**
 * sync/rebuild-index/upgrade/set-read entry point: refresh hosts whose rule dir exists or that are linked.
 * `global: true` refreshes the Claude user rules (global-scope memories) when a global Claude link is registered.
 */
export async function refreshLinkedNativeRules(cwd: string, options: { plan?: boolean; global?: boolean } = {}): Promise<NativeRuleSyncResult[]> {
  const results: NativeRuleSyncResult[] = [];
  try {
    const { detectLinkedWorkspaceTargets, readGlobalSkillsetRegistry } = await import('./skillset.js');
    if (options.global) {
      const home = globalAgentHome();
      const registry = await readGlobalSkillsetRegistry();
      if (!Object.keys(registry.installs ?? {}).includes('claude')) return results;
      results.push(await syncNativeRules(await getContext(cwd), 'claude', { scope: 'global', baseDir: home, plan: options.plan }));
      return results;
    }
    const linked = new Set<string>([...await detectLinkedWorkspaceTargets(cwd), ...await detectInstalledHookTargets({ cwd, includeStale: true })]);
    let ctx: EngramContext | undefined;
    for (const host of HOSTS) {
      if (!linked.has(host) && !(await exists(path.join(cwd, NATIVE_RULE_DIRS[host])))) continue;
      ctx ??= await getContext(cwd);
      results.push(await syncNativeRules(ctx, host, { scope: 'workspace', baseDir: cwd, plan: options.plan }));
    }
  } catch {
    // Rule files are derived output; a failed refresh must never fail the command that triggered it.
  }
  return results;
}

/** Workspace refresh plus the global Claude refresh, for commands that change memory or read policy. */
export async function refreshAllLinkedNativeRules(cwd: string, options: { plan?: boolean } = {}): Promise<NativeRuleSyncResult[]> {
  return [...await refreshLinkedNativeRules(cwd, options), ...await refreshLinkedNativeRules(cwd, { ...options, global: true })];
}

/** One report block per refreshed host and scope. */
export function nativeRuleRecords(results: NativeRuleSyncResult[]): RecordBlock[] {
  return results.map((result) => {
    const changed = result.written.length + result.updated.length + result.removed.length > 0;
    const status = changed ? 'UPDATED' : 'UNCHANGED';
    const fields: Array<[string, string]> = [
      ['Written', String(result.written.length)],
      ['Updated', String(result.updated.length)],
      ['Removed', String(result.removed.length)],
      ['Unchanged', String(result.unchanged)]
    ];
    if (changed) fields.push(['Files', [...result.written, ...result.updated, ...result.removed.map((name) => `-${name}`)].join(', ')]);
    if (result.skipped.length) fields.push(['Skipped', result.skipped.map((item) => `${item.key}: ${item.reason}`).join('; ')]);
    if (result.preserved.length) fields.push(['Preserved', result.preserved.join(', ')]);
    return { title: `${status} native rules ${result.host}: ${path.join(result.scope === 'global' ? '~' : '.', NATIVE_RULE_DIRS[result.host]).replace(/\\/g, '/')}`, fields };
  });
}

/** One-line summary for sync and rebuild-index output, e.g. `claude 1 written, 0 removed`. */
export function nativeRuleSummary(results: NativeRuleSyncResult[]): string {
  return results.map((result) => `${result.host}${result.scope === 'global' ? ' (global)' : ''} ${result.written.length + result.updated.length} written, ${result.removed.length} removed, ${result.unchanged} unchanged`).join('; ');
}
