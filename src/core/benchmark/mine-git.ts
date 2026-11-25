/** Mine anonymized retrieval benchmark cases from Git commit history. */
import { execFile } from 'node:child_process';
import type { EngramContext } from '../memory/context.js';
import { entriesForPath } from '../memory/path-triggers.js';
import { prefilter } from '../memory/routing.js';
import { redactSensitive } from '../safety/security.js';
import { stem } from '../system/bm25.js';
import { meaningfulWordList, meaningfulWords, slugify } from '../system/text.js';
import type { BenchmarkCase, BenchmarkDocument } from './schema.js';

type GitCommitRecord = { subject: string; paths: string[] };

const COMMIT_PREFIX = '__ENG_COMMIT__\t';

/** Scan recent non-merge commits and derive redacted version-2 benchmark cases without memory bodies. */
export async function mineBenchmarkCasesFromGit(
  ctx: EngramContext,
  options?: { range?: string; maxCases?: number; cwd?: string }
): Promise<BenchmarkDocument> {
  const maxCases = Math.max(1, options?.maxCases ?? 25);
  const limit = maxCases * 3;
  const args = [
    'log',
    '--no-merges',
    '-n',
    String(limit),
    '--pretty=format:__ENG_COMMIT__%x09%s',
    '--name-only',
    ...(options?.range ? [options.range] : [])
  ];
  let output = '';
  try {
    output = await new Promise<string>((resolve, reject) => {
      execFile('git', args, { cwd: options?.cwd ?? ctx.cwd }, (err: any, stdout: string) => {
        if (err) reject(err);
        else resolve(String(stdout ?? ''));
      });
    });
  } catch {
    return { version: 2, cases: [] };
  }

  const commits = parseGitCommits(output);
  if (!commits.length) return { version: 2, cases: [] };

  const workspaceEntries = prefilter(ctx.index, ctx.config, false, ctx.ignorePatterns)
    .filter((entry) => entry.scope === 'workspace');
  if (!workspaceEntries.length) return { version: 2, cases: [] };

  const entryStems = new Map<string, Set<string>>();
  for (const entry of workspaceEntries) {
    const stems = new Set<string>();
    const sources = [entry.id, ...(entry.autoTags ? [] : entry.tags)];
    for (const source of sources) {
      for (const word of meaningfulWordList(source)) stems.add(stem(word));
    }
    entryStems.set(entry.id, stems);
  }

  const cases: BenchmarkCase[] = [];
  const seenIds = new Set<string>();

  for (const commit of commits) {
    if (cases.length >= maxCases) break;
    if (!commit.paths.length) continue;
    const query = redactSensitive(commit.subject).trim();
    if (!query || meaningfulWords(query).size === 0) continue;
    const id = slugify(query);
    if (seenIds.has(id)) continue;

    const matchedIds = new Set<string>();
    const pathStems = new Set<string>();
    for (const relPath of commit.paths) {
      for (const entry of entriesForPath(workspaceEntries, relPath)) matchedIds.add(entry.id);
      const cleaned = relPath.replace(/[\\/._-]+/g, ' ');
      for (const word of meaningfulWordList(cleaned)) pathStems.add(stem(word));
    }
    if (pathStems.size >= 2) {
      for (const entry of workspaceEntries) {
        if (matchedIds.has(entry.id)) continue;
        const stems = entryStems.get(entry.id);
        if (!stems) continue;
        let hits = 0;
        for (const term of stems) {
          if (pathStems.has(term)) hits += 1;
        }
        if (hits >= 2) matchedIds.add(entry.id);
      }
    }
    if (!matchedIds.size) continue;

    seenIds.add(id);
    cases.push({
      id,
      query,
      expect: [...matchedIds].sort(),
      forbid: [],
      depends_on: []
    });
  }

  return { version: 2, cases };
}

function parseGitCommits(raw: string): GitCommitRecord[] {
  const commits: GitCommitRecord[] = [];
  let current: GitCommitRecord | undefined;
  for (const line of raw.split(/\r?\n/)) {
    if (line.startsWith(COMMIT_PREFIX)) {
      current = { subject: line.slice(COMMIT_PREFIX.length).trim(), paths: [] };
      commits.push(current);
      continue;
    }
    const trimmed = line.trim();
    if (current && trimmed) current.paths.push(trimmed.replace(/\\/g, '/'));
  }
  return commits;
}
