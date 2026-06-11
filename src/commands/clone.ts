/** Clone active memory files between workspace and global scopes. */
import path from 'node:path';
import { getContext } from '../core/memory/context.js';
import { createScope, appendChangelog } from '../core/memory/storage.js';
import { rebuildIndex } from '../core/memory/index.js';
import { rebuildGraph } from '../core/memory/graph.js';
import { ensureVectorIndex } from '../core/memory/vector-db.js';
import { exists, inside, listFiles, readText, writeText } from '../core/system/fsx.js';
import { sha256, updateHash, verifyMemoryHash } from '../core/safety/hash.js';
import { parseMemory, validateMemoryRaw } from '../core/memory/schema.js';
import type { MemoryType, Scope } from '../core/runtime/types.js';
import { runSaveSessionCandidates } from './write.js';

type CloneAction = 'copied' | 'planned' | 'skipped' | 'unsafe' | 'invalid';
type CloneResult = { action: CloneAction; file: string; reason?: string };
type RestructureCandidate = { file: string; line: string; hash: string };
type RestructureSkipped = { file: string; reason: string };

const scopes = new Set<Scope>(['workspace', 'global']);
const activeMemoryDirs = ['rules', 'skills', 'knowledge'];

/** Clone approved memory Markdown from one scope to the other. */
export async function cmdCloneMemory(args: string[], flags: Record<string, any> = {}): Promise<string> {
  const [source, target] = parseDirection(args);
  const dryRun = flags['dry-run'] === true;
  const force = flags.force === true;
  const ctx = await getContext(process.cwd(), { rebuild: true });
  const sourceRoot = ctx.roots[source];
  const targetRoot = ctx.roots[target];
  if (!sourceRoot || !(await exists(sourceRoot))) throw new Error(`${source} memory root not found; run engram init first`);
  if (!targetRoot) throw new Error('global memory is not configured; set ENGRAM_GLOBAL_DIR or run engram init --global-path <path>');
  if (flags.restructure === true) {
    if (force) throw new Error('--force cannot be used with --restructure');
    return cloneMemoryRestructured(ctx, source, target, sourceRoot, targetRoot, flags);
  }
  if (!dryRun) await createScope(targetRoot, ctx.config, target, false);

  const files = await activeMemoryFiles(sourceRoot);
  const results: CloneResult[] = [];
  for (const file of files) results.push(await cloneOne(sourceRoot, targetRoot, source, target, file, { dryRun, force }));
  if (!dryRun && results.some((result) => result.action === 'copied')) {
    const index = await rebuildIndex(targetRoot, target, ctx.ignorePatterns);
    await rebuildGraph(targetRoot, target, index, ctx.config);
    await ensureVectorIndex(targetRoot, target, index.entries, ctx.config, { force: true });
  }
  return renderCloneResult(source, target, sourceRoot, targetRoot, results, dryRun, force);
}

function parseDirection(args: string[]): [Scope, Scope] {
  const [source, target] = args.map((arg) => arg.toLowerCase()).filter((arg): arg is Scope => scopes.has(arg as Scope));
  if (!source || !target) throw new Error('clone-memory requires source and target scopes: workspace global or global workspace');
  if (source === target) throw new Error('clone-memory source and target must be different');
  return [source, target];
}

async function activeMemoryFiles(root: string): Promise<string[]> {
  return (await listFiles(root))
    .map((file) => path.relative(root, file).replace(/\\/g, '/'))
    .filter((file) => file.endsWith('.md') && activeMemoryDirs.some((dir) => file.startsWith(`${dir}/`)))
    .sort();
}

async function cloneMemoryRestructured(
  ctx: Awaited<ReturnType<typeof getContext>>,
  source: Scope,
  target: Scope,
  sourceRoot: string,
  targetRoot: string,
  flags: Record<string, any>
): Promise<string> {
  const files = await activeMemoryFiles(sourceRoot);
  const candidates: RestructureCandidate[] = [];
  const skipped: RestructureSkipped[] = [];
  for (const file of files) {
    const result = await cloneCandidateFromMemory(sourceRoot, file);
    if ('line' in result) candidates.push(result);
    else skipped.push(result);
  }
  const header = [
    `${flags['dry-run'] === true ? 'Clone memory restructure dry-run' : 'Clone memory restructure'} ${source} -> ${target}`,
    `Source: ${sourceRoot}`,
    `Target: ${targetRoot}`,
    `Candidates: ${candidates.length}`,
    `Skipped: ${skipped.length}`
  ].join('\n');
  const skipLines = skipped.map((item) => `SKIPPED ${item.file} (${item.reason})`).join('\n');
  if (!candidates.length) return [header, skipLines || 'No memory candidates detected.'].filter(Boolean).join('\n');
  const output = await runSaveSessionCandidates({
    ctx,
    text: candidates.map((candidate) => candidate.line).join('\n'),
    scopes: [target],
    flags,
    source: {
      source: 'clone-memory',
      sourceFiles: candidates.map((candidate) => `${source}:${candidate.file}`),
      sourceHashes: candidates.map((candidate) => candidate.hash)
    },
    dryRunLabel: header,
    acceptAllLabel: 'Accepted all clone-memory restructure candidates (--accept-all).'
  });
  return skipLines ? `${output}\n${skipLines}` : output;
}

async function cloneCandidateFromMemory(root: string, file: string): Promise<RestructureCandidate | RestructureSkipped> {
  const raw = await readText(inside(root, file));
  const trusted = await verifyMemoryHash(root, file, raw);
  if (!trusted.ok) return { file, reason: trusted.reason ?? 'hash verification failed' };
  try {
    validateMemoryRaw(raw);
    const doc = parseMemory(raw);
    const type = memoryTypeFor(file, doc.frontmatter.type);
    const text = contentText(doc.body);
    if (!text) return { file, reason: 'missing content text' };
    return { file, hash: sha256(raw), line: `TYPE: ${type} | TEXT: ${candidateText(text)}` };
  } catch (error: any) {
    return { file, reason: error?.message ?? String(error) };
  }
}

function memoryTypeFor(file: string, value: unknown): MemoryType {
  if (value === 'rule' || value === 'skill' || value === 'knowledge') return value;
  if (file.startsWith('rules/')) return 'rule';
  if (file.startsWith('skills/')) return 'skill';
  return 'knowledge';
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

function candidateText(text: string): string {
  return text.replace(/\s*\|\s*/g, ' / ').trim();
}

async function cloneOne(sourceRoot: string, targetRoot: string, source: Scope, target: Scope, file: string, options: { dryRun: boolean; force: boolean }): Promise<CloneResult> {
  const sourceFile = inside(sourceRoot, file);
  const targetFile = inside(targetRoot, file);
  const raw = await readText(sourceFile);
  const trusted = await verifyMemoryHash(sourceRoot, file, raw);
  if (!trusted.ok) return { action: 'unsafe', file, reason: trusted.reason };
  const content = rewriteScope(raw, target);
  try {
    validateMemoryRaw(content);
  } catch (error: any) {
    return { action: 'invalid', file, reason: error?.message ?? String(error) };
  }
  if (await exists(targetFile) && !options.force) return { action: 'skipped', file, reason: 'destination exists' };
  if (options.dryRun) return { action: 'planned', file };
  await writeText(targetFile, content);
  await updateHash(targetRoot, file, content);
  await appendChangelog(targetRoot, file, `clone ${source} memory to ${target}`);
  return { action: 'copied', file };
}

function rewriteScope(raw: string, scope: Scope): string {
  const match = raw.match(/^---(\r?\n)([\s\S]*?)(\r?\n)---(\r?\n)?/);
  if (!match) return raw;
  const eol = match[1];
  const lines = match[2].split(/\r?\n/);
  let replaced = false;
  const next = lines.map((line) => {
    if (!/^scope\s*:/u.test(line)) return line;
    replaced = true;
    return `scope: ${scope}`;
  });
  if (!replaced) next.splice(Math.min(2, next.length), 0, `scope: ${scope}`);
  return `---${eol}${next.join(eol)}${eol}---${match[4] ?? eol}${raw.slice(match[0].length)}`;
}

function renderCloneResult(source: Scope, target: Scope, sourceRoot: string, targetRoot: string, results: CloneResult[], dryRun: boolean, force: boolean): string {
  const count = (action: CloneAction) => results.filter((result) => result.action === action).length;
  const lines = [
    `${dryRun ? 'Clone memory dry-run' : 'Clone memory'} ${source} -> ${target}`,
    `Source: ${sourceRoot}`,
    `Target: ${targetRoot}`,
    `Copied: ${count('copied')}`,
    `Planned: ${count('planned')}`,
    `Skipped: ${count('skipped')}`,
    `Unsafe: ${count('unsafe')}`,
    `Invalid: ${count('invalid')}`,
    `Force: ${force ? 'yes' : 'no'}`
  ];
  const shown = results.slice(0, 20);
  for (const result of shown) lines.push(`${result.action.toUpperCase()} ${result.file}${result.reason ? ` (${result.reason})` : ''}`);
  if (results.length > shown.length) lines.push(`... ${results.length - shown.length} more`);
  return lines.join('\n');
}
