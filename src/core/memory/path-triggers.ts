/** D9 path triggers: memories whose `applies_to` globs match a file an agent tool is about to touch. */
import path from 'node:path';
import type { EngramContext } from './context.js';
import type { MemoryEntry } from '../runtime/types.js';
import { memoryKey } from './memory-ref.js';
import { matchPattern } from '../safety/ignore.js';
import { CLAUDE_BRACE_BUDGET, expandBraces } from '../integrations/native-rules.js';
import { loadEntries, prefilter } from './routing.js';
import { estimateTokens } from './payload-plan.js';

/** Most bodies one tool event may inject. */
export const PATH_TRIGGER_LIMIT = 3;
/** Claude file tools that carry `tool_input.file_path`. */
const FILE_TOOLS = new Set(['Read', 'Edit', 'Write', 'MultiEdit']);
/** Gemini file tools; `file_path` may be relative to the workspace. */
const GEMINI_FILE_TOOLS = new Set(['read_file', 'write_file', 'replace']);
/** Codex edits arrive as `apply_patch`; touched files are named in the patch headers. */
const PATCH_FILE_LINE = /^\*\*\* (?:Add File|Update File|Move to): (.+)$/gm;

export type PathLoad = { text: string; bodyKeys: string[] };

/** Entries whose `applies_to` matches a workspace-relative path; `\` separators count as `/`. */
export function entriesForPath(entries: MemoryEntry[], relPath: string): MemoryEntry[] {
  const file = normalizeRelPath(relPath);
  if (!file) return [];
  return entries.filter((entry) => entry.appliesTo?.some((glob) => appliesToMatches(file, glob)));
}

/** `{a,b}` braces expand as in the native host rules (matchPattern reads them literally); nested or oversized braces stay literal. */
function appliesToMatches(file: string, glob: string): boolean {
  return (expandBraces(glob, CLAUDE_BRACE_BUDGET) ?? [glob]).some((pattern) => matchPattern(file, pattern));
}

/**
 * Workspace-relative paths a tool call touches (Claude and Gemini file tools, Codex `apply_patch`); other tools and
 * paths outside the cwd yield nothing. Relative paths resolve against the workspace, absolute ones against `cwd`.
 */
export function toolPaths(toolName: string, toolInput: unknown, cwd: string): string[] {
  const input = toolInput && typeof toolInput === 'object' ? toolInput as Record<string, unknown> : {};
  const raw = FILE_TOOLS.has(toolName) || GEMINI_FILE_TOOLS.has(toolName)
    ? [input.file_path ?? input.path]
    : toolName === 'apply_patch' ? [...String(input.command ?? input.patch ?? '').matchAll(PATCH_FILE_LINE)].map((match) => match[1]) : [];
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item !== 'string' || !item.trim()) continue;
    const rel = path.isAbsolute(item) ? path.relative(cwd, item) : item.trim();
    const file = normalizeRelPath(rel);
    // A different drive or a `..` escape is not part of this workspace.
    if (!file || file === '..' || file.startsWith('../') || path.isAbsolute(file)) continue;
    if (!out.includes(file)) out.push(file);
  }
  return out;
}

/**
 * Lean, safety-scanned bodies for memories scoped to `relPaths`, skipping keys the session already holds.
 * Bodies go through the same guarded read as routed loads (hash check, secret and injection scans).
 * `options.budgetTokens` (planner tokens) overrides `load.max_tokens`; a body that does not fit is skipped whole, never sliced.
 */
export async function loadForPaths(
  ctx: EngramContext, relPaths: string[], deliveredKeys: string[] = [], options: { budgetTokens?: number } = {}
): Promise<PathLoad> {
  const delivered = new Set(deliveredKeys);
  const visible = prefilter(ctx.index, ctx.config, false, ctx.ignorePatterns);
  const matched = new Map<string, MemoryEntry>();
  for (const relPath of relPaths) {
    for (const entry of entriesForPath(visible, relPath)) {
      if (!delivered.has(memoryKey(entry))) matched.set(memoryKey(entry), entry);
    }
  }
  // Workspace memories first, then a stable file order, so a capped event is deterministic.
  const ordered = [...matched.values()].sort((a, b) => scopeRank(a) - scopeRank(b) || a.file.localeCompare(b.file));
  const budget = options.budgetTokens ?? ctx.config.load?.max_tokens ?? Infinity;
  const bodies: string[] = [];
  const bodyKeys: string[] = [];
  let used = 0;
  for (const entry of ordered) {
    if (bodies.length >= PATH_TRIGGER_LIMIT) break;
    const [row] = await loadEntries(ctx.cwd, [entry], ctx.config, { forAgents: true });
    if (!row?.content || row.flagged) continue;
    const cost = estimateTokens(row.content);
    if (used + cost > budget) continue;
    used += cost;
    bodies.push(row.content);
    bodyKeys.push(memoryKey(entry));
  }
  return { text: bodies.join('\n\n'), bodyKeys };
}

/** Forward slashes with `.` and `..` segments resolved, so `src/../../x` surfaces as an escape. */
function normalizeRelPath(relPath: string): string {
  const slashed = relPath.trim().replace(/\\/g, '/');
  if (!slashed) return '';
  const normalized = path.posix.normalize(slashed).replace(/\/+$/, '');
  return normalized === '.' ? '' : normalized;
}

function scopeRank(entry: MemoryEntry): number {
  return entry.scope === 'workspace' ? 0 : 1;
}
