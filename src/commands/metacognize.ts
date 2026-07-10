/** Agent-assisted restructuring for existing Engram memory folders. */
import { stdin as input } from 'node:process';
import { entryPath, getContext, type EngramContext } from '../core/memory/context.js';
import { parseMemory } from '../core/memory/schema.js';
import type { MemoryEntry, Scope } from '../core/runtime/types.js';
import { verifyMemoryHash, sha256 } from '../core/safety/hash.js';
import { requestGeneratedSelectionText } from '../core/safety/approval.js';
import { readText } from '../core/system/fsx.js';
import { runSaveSessionCandidates } from './write.js';

type TargetMemory = {
  scope: Scope;
  file: string;
  id: string;
  type: string;
  tags: string[];
  summary: string;
  content: string;
  hash: string;
  dependsOn: string[];
};
type SkippedMemory = { scope: Scope; file: string; reason: string };
type MetacognitionPack = { scopes: Scope[]; roots: Partial<Record<Scope, string>>; memories: TargetMemory[]; skipped: SkippedMemory[] };

const targetWords = new Set(['workspace', 'global', 'all']);
const activeMemoryDirs = ['rules/', 'skills/', 'knowledge/'];

/** Let an agent review and restructure an existing memory scope through approved save plans. */
export async function cmdMetacognize(args: string[], flags: Record<string, any> = {}): Promise<string> {
  const ctx = await getContext(process.cwd(), { rebuild: true });
  const scopes = metacognizeScopes(ctx, args, flags);
  const pack = await buildMetacognitionPack(ctx, scopes);
  const inline = inlineCandidates(args);
  const guidance = metacognitionGuidance(pack, flags.force === true || flags.f === true);
  if (flags['dry-run'] === true && !inline) return guidance;
  if (!pack.memories.length && !inline) return `${packHeader(pack)}\nNo active target memories found.`;

  let text = inline;
  if (!text) {
    if (!input.isTTY) return guidance;
    text = await requestGeneratedSelectionText({ guidance, acceptAll: flags.force === true || flags.f === true }) ?? '';
  }
  if (!text) return 'Discarded. No file written.';

  return runSaveSessionCandidates({
    ctx,
    text,
    scopes,
    flags,
    source: {
      source: 'metacognize',
      sourceFiles: pack.memories.map((memory) => `${memory.scope}:${memory.file}`),
      sourceHashes: pack.memories.map((memory) => memory.hash)
    },
    dryRunLabel: `${packHeader(pack)}\nMode: dry-run candidate preview`,
    forceLabel: 'Metacognize forced candidates (--force).',
    forceRerunCommand: rerunCommand(scopes)
  });
}

function metacognizeScopes(ctx: EngramContext, args: string[], flags: Record<string, any>): Scope[] {
  const words = targetArgs(args);
  const wantsAll = flags.all === true || words.includes('all');
  const requested = new Set<Scope>();
  if (wantsAll || flags.workspace === true || words.includes('workspace')) requested.add('workspace');
  if (wantsAll || flags.global === true || words.includes('global')) requested.add('global');
  if (!requested.size) throw new Error('metacognize requires --workspace, --global, or --all');
  for (const scope of requested) {
    if (!ctx.roots[scope]) throw new Error(`metacognize --${scope} requires ${scope} memory to be available for the active profile`);
  }
  return (['workspace', 'global'] as Scope[]).filter((scope) => requested.has(scope));
}

function targetArgs(args: string[]): string[] {
  const end = candidateStart(args);
  return args.slice(0, end < 0 ? args.length : end)
    .map((arg) => arg.toLowerCase())
    .filter((arg) => targetWords.has(arg));
}

function inlineCandidates(args: string[]): string {
  const start = candidateStart(args);
  return start < 0 ? '' : args.slice(start).join(' ').trim();
}

function candidateStart(args: string[]): number {
  return args.findIndex((arg) => /^\s*(?:[-*]\s*)?(?:type|kind|memory type|rule|rules|skill|skills|workflow|workflows|knowledge)\s*:/i.test(arg));
}

async function buildMetacognitionPack(ctx: EngramContext, scopes: Scope[]): Promise<MetacognitionPack> {
  const memories: TargetMemory[] = [];
  const skipped: SkippedMemory[] = [];
  for (const scope of scopes) {
    const root = ctx.roots[scope];
    if (!root) continue;
    const entries = ctx.scopeIndexes[scope].entries
      .filter((entry) => entry.scope === scope && !entry.ignored && activeMemoryDirs.some((dir) => entry.file.startsWith(dir)))
      .sort((a, b) => a.file.localeCompare(b.file));
    for (const entry of entries) {
      const memory = await readTargetMemory(ctx, root, entry);
      if ('reason' in memory) skipped.push(memory);
      else memories.push(memory);
    }
  }
  return { scopes, roots: Object.fromEntries(scopes.map((scope) => [scope, ctx.roots[scope]])), memories, skipped };
}

async function readTargetMemory(ctx: EngramContext, root: string, entry: MemoryEntry): Promise<TargetMemory | SkippedMemory> {
  const raw = await readText(entryPath(ctx, entry.scope, entry.file));
  const trusted = await verifyMemoryHash(root, entry.file, raw);
  if (!trusted.ok) return { scope: entry.scope, file: entry.file, reason: trusted.reason ?? 'hash verification failed' };
  const doc = parseMemory(raw);
  return {
    scope: entry.scope,
    file: entry.file,
    id: entry.id,
    type: entry.type,
    tags: entry.tags,
    summary: entry.summary,
    content: compactText(contentText(doc.body), 320),
    hash: sha256(raw),
    dependsOn: Array.isArray(entry.dependsOn) ? entry.dependsOn : []
  };
}

function metacognitionGuidance(pack: MetacognitionPack, force: boolean): string {
  const lines = [
    packHeader(pack),
    '',
    'Review the target Engram memory folder and return concise restructuring candidates.',
    'Return one candidate per line: TYPE: rule|skill|knowledge | TEXT: ... | UPDATE: existing-memory-id',
    'Use UPDATE for duplicates, over-broad memories, or wording cleanup; use DEPENDS_ON for layered memories; omit content that is already covered.',
    'Do not delete or archive from this command. Use engram archive --reason <why> <id|file> separately after review.',
    force ? 'Because --force is active, every generated candidate will be saved unless related-memory hints require another restructuring pass.' : 'Engram will show a numbered approval preview before writing.',
    '',
    'Source pack:'
  ];
  if (!pack.memories.length) lines.push('- No active target memories found.');
  for (const memory of pack.memories) {
    lines.push(`- ${memory.scope}:${memory.file} (${memory.type}) id=${memory.id}`);
    if (memory.dependsOn.length) lines.push(`  Depends on: ${memory.dependsOn.join(', ')}`);
    lines.push(`  Tags: ${memory.tags.slice(0, 8).join(', ') || '<none>'}`);
    lines.push(`  Summary: ${compactText(memory.summary, 180)}`);
    lines.push(`  Content: ${memory.content || '<empty>'}`);
  }
  for (const item of pack.skipped) lines.push(`- SKIPPED ${item.scope}:${item.file} (${item.reason})`);
  return lines.join('\n');
}

function packHeader(pack: MetacognitionPack): string {
  const roots = pack.scopes.map((scope) => `${scope}: ${pack.roots[scope]}`).join('\n');
  return [
    `Metacognize ${pack.scopes.join('+')} memory`,
    roots,
    `Memories: ${pack.memories.length}`,
    `Skipped: ${pack.skipped.length}`
  ].join('\n');
}

function contentText(body: string): string {
  const section = body.match(/\n## Content\r?\n([\s\S]*?)(?=\n## |\s*$)/)?.[1] ?? '';
  return section
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/^-\s*/, ''))
    .filter((line) => line && !line.startsWith('### '))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function compactText(text: string, max: number): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length <= max ? clean : `${clean.slice(0, Math.max(0, max - 3)).trimEnd()}...`;
}

function rerunCommand(scopes: Scope[]): string {
  return scopes.length > 1 ? 'engram metacognize --all --force' : `engram metacognize --${scopes[0]} --force`;
}
