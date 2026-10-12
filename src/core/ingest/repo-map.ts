/** Repo map: code and manifest digests aggregated per directory under a token budget; docs and config stay per file. */
import { estimateTokens } from '../memory/payload-plan.js';
import type { SourceDigest } from './types.js';

/** The digest fields the map reads; a full SourceDigest is accepted. */
export type RepoMapInput = Pick<SourceDigest, 'file' | 'kind' | 'lines' | 'symbols'>;

const MAX_SYMBOLS = 12;
const MAX_IMPORTS_CHARS = 300;
const MAX_FACTS_CHARS = 400;
const MAX_OMITTED_LISTED = 20;
const IMPORTS_PREFIX = 'imports: ';
const CHARS_PER_TOKEN = 4;

type MapItem = { name: string; text: string; weight: number };

/** The per-file block shared by the repo map and take-control guidance. */
export function renderFileBlock(file: string, lines: number, chars: number, excerpt: string): string {
  return [`### ${file} (${lines} lines, ${chars} chars)`, '```text', excerpt, '```'].join('\n');
}

/**
 * Render digests as per-file blocks (docs, config) followed by one block per directory (code, manifest): merged top
 * symbols, one deduplicated imports line, and manifest facts. Over `budgetTokens`, directories are dropped
 * largest-first (most files, then path) and the map ends with `omitted: <dirs>`; the result never exceeds the budget.
 */
export function repoMap(digests: RepoMapInput[], budgetTokens: number): string {
  if (!digests.length) return '';
  const sorted = [...digests].sort((a, b) => compare(a.file, b.file));
  const fileItems = sorted.filter((digest) => !isGrouped(digest)).map(fileItem);
  const byDir = new Map<string, RepoMapInput[]>();
  for (const digest of sorted.filter(isGrouped)) {
    const dir = dirOf(digest.file);
    byDir.set(dir, [...(byDir.get(dir) ?? []), digest]);
  }
  const dirItems = [...byDir].map(([dir, members]) => dirItem(dir, members));
  // Trim order: directories largest-first, then (only if still over) per-file blocks from the end.
  const bySize = [...dirItems].sort((a, b) => b.weight - a.weight || compare(a.name, b.name));
  const trimOrder = [...bySize, ...[...fileItems].reverse()];
  const ordered = [...fileItems, ...[...dirItems].sort((a, b) => compare(a.name, b.name))];
  const limit = Math.max(0, budgetTokens);
  for (let dropped = 0; dropped <= trimOrder.length; dropped += 1) {
    const gone = new Set(trimOrder.slice(0, dropped));
    const text = render(ordered.filter((item) => !gone.has(item)), trimOrder.slice(0, dropped));
    if (estimateTokens(text) <= limit) return text;
  }
  return render([], trimOrder).slice(0, limit * CHARS_PER_TOKEN).trimEnd();
}

/** `dir/**` globs for the directory blocks a rendered map kept (the root `.` block and omitted dirs have none). */
export function repoMapDirectoryGlobs(map: string): string[] {
  return [...map.matchAll(/^## (.+) \(\d+ files\)$/gm)].map((match) => match[1]).filter((dir) => dir !== '.').map((dir) => `${dir}/**`);
}

function render(kept: MapItem[], dropped: MapItem[]): string {
  const blocks = kept.map((item) => item.text);
  if (dropped.length) {
    const listed = dropped.slice(0, MAX_OMITTED_LISTED).map((item) => item.name).join(', ');
    blocks.push(`omitted: ${listed}${dropped.length > MAX_OMITTED_LISTED ? `, +${dropped.length - MAX_OMITTED_LISTED} more` : ''}`);
  }
  return blocks.join('\n\n');
}

function isGrouped(digest: RepoMapInput): boolean {
  return digest.kind === 'code' || digest.kind === 'manifest';
}

function fileItem(digest: RepoMapInput): MapItem {
  const excerpt = digest.lines.join('\n');
  return { name: digest.file, text: renderFileBlock(digest.file, digest.lines.length, excerpt.length, excerpt), weight: 1 };
}

function dirItem(dir: string, members: RepoMapInput[]): MapItem {
  const symbols = rankedNames(members.map((member) => member.symbols)).slice(0, MAX_SYMBOLS);
  const imports = rankedNames(members.map(importsOf));
  const facts = [...new Set(members.filter((member) => member.kind === 'manifest').flatMap((member) => member.lines))];
  const lines = [
    `## ${dir} (${members.length} files)`,
    ...(symbols.length ? [`symbols: ${symbols.join(', ')}`] : []),
    ...(imports.length ? [`${IMPORTS_PREFIX}${bounded(imports, ', ', MAX_IMPORTS_CHARS)}`] : []),
    ...(facts.length ? [`facts: ${bounded(facts, '; ', MAX_FACTS_CHARS)}`] : [])
  ];
  return { name: dir, text: lines.join('\n'), weight: members.length };
}

/** Names across files ranked by how many files carry them, then alphabetically. */
function rankedNames(groups: string[][]): string[] {
  const counts = new Map<string, number>();
  for (const group of groups) for (const name of new Set(group)) counts.set(name, (counts.get(name) ?? 0) + 1);
  return [...counts].sort((a, b) => b[1] - a[1] || compare(a[0], b[0])).map(([name]) => name);
}

/** The names on a digest's `imports:` line; the extractor's own `(+N more)` suffix is not a name. */
function importsOf(digest: RepoMapInput): string[] {
  const line = digest.lines.find((entry) => entry.startsWith(IMPORTS_PREFIX));
  if (!line) return [];
  return line.slice(IMPORTS_PREFIX.length).replace(/\s*\(\+\d+ more\)$/, '').split(', ').map((name) => name.trim()).filter(Boolean);
}

function bounded(items: string[], separator: string, maxChars: number): string {
  let text = '';
  let used = 0;
  for (const item of items) {
    const next = used ? `${text}${separator}${item}` : item;
    if (next.length > maxChars && used) break;
    text = next.length > maxChars ? next.slice(0, maxChars) : next;
    used += 1;
  }
  return used < items.length ? `${text} (+${items.length - used} more)` : text;
}

function dirOf(file: string): string {
  const index = file.lastIndexOf('/');
  return index > 0 ? file.slice(0, index) : '.';
}

/** Locale-independent ordering so maps are identical across machines. */
function compare(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
