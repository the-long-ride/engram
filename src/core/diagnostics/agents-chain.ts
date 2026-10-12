/** Codex AGENTS.md chain size versus project_doc_max_bytes (https://learn.chatgpt.com/docs/agent-configuration/agents-md). */
import fs from 'node:fs/promises';
import path from 'node:path';
import { globalAgentHome } from '../integrations/agent-paths.js';
import { nearestGitRoot, readText } from '../system/fsx.js';

export const CODEX_DOC_MAX_BYTES = 32 * 1024;
export const CHAIN_WARN_RATIO = 0.8;
export type ChainFile = { file: string; bytes: number };

const OVERRIDE_FILE = 'AGENTS.override.md';
const PROJECT_FILE = 'AGENTS.md';

/** Codex home: `CODEX_HOME` when set, else `<agent home>/.codex`. */
export function codexHome(): string {
  return process.env.CODEX_HOME?.trim() || path.join(globalAgentHome(), '.codex');
}

/** Global (CODEX_HOME) override-or-AGENTS.md, then one file per dir from the git root (nearest `.git` ancestor, else cwd) to cwd. */
export async function codexAgentsChain(cwd: string, home = codexHome()): Promise<ChainFile[]> {
  const chain: ChainFile[] = [];
  const global = await firstNonEmpty(home, [OVERRIDE_FILE, PROJECT_FILE]);
  if (global) chain.push(global);
  const names = [OVERRIDE_FILE, PROJECT_FILE, ...await codexFallbackNames(home)];
  for (const dir of await dirsFromRootTo(cwd)) {
    const found = await firstNonEmpty(dir, names);
    if (found) chain.push(found);
  }
  return chain;
}

/** `project_doc_max_bytes = N` from <codex home>/config.toml, else the default. */
export async function codexDocMaxBytes(home: string): Promise<number> {
  const value = topLevelTomlValue(await readText(path.join(home, 'config.toml')), 'project_doc_max_bytes');
  const parsed = value === undefined ? NaN : Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : CODEX_DOC_MAX_BYTES;
}

/** `project_doc_fallback_filenames = ["A.md", "B.md"]` from <codex home>/config.toml. */
async function codexFallbackNames(home: string): Promise<string[]> {
  const value = topLevelTomlValue(await readText(path.join(home, 'config.toml')), 'project_doc_fallback_filenames');
  if (!value) return [];
  return [...value.matchAll(/"([^"]+)"|'([^']+)'/g)].map((match) => match[1] ?? match[2]).filter((name) => name && !/[\\/]/.test(name));
}

/** Value text of a top-level (before the first table header) TOML key, comments stripped. */
function topLevelTomlValue(toml: string, key: string): string | undefined {
  for (const raw of toml.split(/\r?\n/)) {
    const line = raw.trim();
    if (line.startsWith('[')) return undefined;
    const match = line.match(/^([A-Za-z0-9_-]+)\s*=\s*(.*)$/);
    if (match && match[1] === key) return match[2].replace(/\s+#.*$/, '').trim();
  }
  return undefined;
}

/** Directories from the git root (else cwd itself) down to cwd, inclusive. */
async function dirsFromRootTo(cwd: string): Promise<string[]> {
  const start = path.resolve(cwd);
  const root = path.resolve((await nearestGitRoot(start)) ?? start);
  const dirs = [start];
  let current = start;
  while (current !== root) {
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
    dirs.unshift(current);
  }
  return dirs;
}

/** First file in `dir` (by name order) with non-blank content; Codex skips empty files. */
async function firstNonEmpty(dir: string, names: string[]): Promise<ChainFile | undefined> {
  for (const name of names) {
    const file = path.join(dir, name);
    try {
      const raw = await fs.readFile(file);
      if (raw.toString('utf8').trim()) return { file, bytes: Buffer.byteLength(raw) };
    } catch { /* missing or unreadable: try the next name */ }
  }
  return undefined;
}
