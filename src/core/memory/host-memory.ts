/** Host-local memory stores (Claude auto memory, Codex memories): root resolution, a read-only guarded walk, and the origin hash. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { globalAgentHome } from '../integrations/agent-paths.js';
import { sha256 } from '../safety/hash.js';
import { readText } from '../system/fsx.js';
import { git } from '../vcs/git.js';
import { isSecretFile, sourceFileGuard } from './take-control-guards.js';

export type HostMemoryPreset = 'claude-auto-memory' | 'codex-memories';
export const HOST_MEMORY_PRESETS: readonly HostMemoryPreset[] = ['claude-auto-memory', 'codex-memories'];
export type HostMemoryNote = { file: string; reason: string };
export type HostMemoryRoot = {
  preset: HostMemoryPreset; dir: string;
  via: 'autoMemoryDirectory' | 'project-dir' | 'prefix-match' | '--dir' | 'codex-home';
  /** Resolution notes the plan lists as skipped lines (never a path). */
  notes: HostMemoryNote[];
};
export type HostMemoryFile = { rel: string };
export type HostMemoryWalk = { files: HostMemoryFile[]; skipped: Array<{ rel: string; reason: string }> };
export type HostMemoryRead = { text: string; rel: string } | { missing: true } | { unchecked: string };

export const HOST_OTHER_MACHINE = 'host memory store not on this machine';
const MAX_PROJECT_DIR_CHARS = 200;
const CODEX_MAX_DEPTH = 2;
const SAFE_NAME = /^[A-Za-z0-9][A-Za-z0-9._ @+-]*$/;
const REPO_SETTINGS_IGNORED = 'autoMemoryDirectory from repository settings ignored; pass --dir to use it';

/** Claude's project directory name: the repository path with every non-alphanumeric character replaced by `-`. */
export function claudeProjectDirName(repoRoot: string): string { return repoRoot.replace(/[^A-Za-z0-9]/g, '-'); }

/** Resolve the store root; a reason (never a path) when it cannot be found unambiguously, so the caller asks for --dir. */
export async function resolveHostMemoryRoot(cwd: string, preset: HostMemoryPreset, explicitDir?: string): Promise<HostMemoryRoot | { reason: string }> {
  if (explicitDir !== undefined) {
    const dir = expandHostPath(explicitDir);
    if (!dir) return { reason: '--dir must be an absolute path or start with ~/' };
    return await isDirectory(dir) ? { preset, dir, via: '--dir', notes: [] } : { reason: '--dir is not a directory' };
  }
  return preset === 'codex-memories' ? resolveCodexRoot() : resolveClaudeRoot(cwd);
}

async function resolveCodexRoot(): Promise<HostMemoryRoot | { reason: string }> {
  const home = process.env.CODEX_HOME?.trim() || path.join(globalAgentHome(), '.codex');
  const dir = path.join(path.resolve(home), 'memories');
  return await isDirectory(dir) ? { preset: 'codex-memories', dir, via: 'codex-home', notes: [] } : { reason: 'Codex memories directory was not found; pass --dir <path>' };
}

async function resolveClaudeRoot(cwd: string): Promise<HostMemoryRoot | { reason: string }> {
  const preset: HostMemoryPreset = 'claude-auto-memory';
  const configDir = process.env.CLAUDE_CONFIG_DIR?.trim();
  const claudeHome = configDir ? path.resolve(configDir) : path.join(globalAgentHome(), '.claude');
  const notes: HostMemoryNote[] = [];
  // Only the user's own settings and the untracked local file may redirect the store; a committed file could be hostile.
  // A settings.local.json that git tracks was committed by the repository, so it is treated like settings.json.
  const local = path.join(cwd, '.claude', 'settings.local.json');
  const localTracked = await isTrackedByGit(cwd, '.claude/settings.local.json');
  if (localTracked && await autoMemoryDirectory(local) !== undefined) notes.push({ file: '.claude/settings.local.json', reason: REPO_SETTINGS_IGNORED });
  for (const file of [path.join(claudeHome, 'settings.json'), ...(localTracked ? [] : [local])]) {
    const configured = await autoMemoryDirectory(file);
    if (configured === undefined) continue;
    const dir = expandHostPath(configured);
    return dir && await isDirectory(dir)
      ? { preset, dir, via: 'autoMemoryDirectory', notes }
      : { reason: 'autoMemoryDirectory is not an existing directory; pass --dir <path>' };
  }
  if (await autoMemoryDirectory(path.join(cwd, '.claude', 'settings.json')) !== undefined) {
    notes.push({ file: '.claude/settings.json', reason: REPO_SETTINGS_IGNORED });
  }
  const projects = path.join(claudeHome, 'projects');
  const override = process.env.CLAUDE_CODE_PROJECT_DIR_NAME?.trim();
  const name = configDir && override && override === path.basename(override) ? override : claudeProjectDirName(await repoRootFor(cwd));
  let project = name;
  let via: HostMemoryRoot['via'] = 'project-dir';
  if (name.length > MAX_PROJECT_DIR_CHARS) {
    // Claude truncates long names and appends a hash; accept the prefix only when exactly one directory carries it.
    const prefix = name.slice(0, MAX_PROJECT_DIR_CHARS);
    const matches: string[] = [];
    for (const entry of await fs.readdir(projects, { withFileTypes: true }).catch(() => [])) {
      if (entry.isDirectory() && entry.name.startsWith(prefix)) matches.push(entry.name);
    }
    if (matches.length !== 1) return { reason: 'Claude project directory name is truncated and ambiguous; pass --dir <path>' };
    project = matches[0];
    via = 'prefix-match';
  }
  const dir = path.join(projects, project, 'memory');
  return await isDirectory(dir) ? { preset, dir, via, notes } : { reason: 'Claude auto memory for this project was not found; pass --dir <path>' };
}

/** Repository root shared by all worktrees (the parent of the common git dir); the real cwd outside git. */
async function repoRootFor(cwd: string): Promise<string> {
  const real = await fs.realpath(cwd).catch(() => path.resolve(cwd));
  try {
    const common = (await git(['-C', real, 'rev-parse', '--git-common-dir'])).trim();
    return common ? path.dirname(await fs.realpath(path.resolve(real, common))) : real;
  } catch {
    return real;
  }
}

/** True when git tracks (or stages) the cwd-relative `rel`; outside a repository (or when git fails) nothing is tracked. */
async function isTrackedByGit(cwd: string, rel: string): Promise<boolean> {
  try {
    return (await git(['-C', cwd, 'ls-files', '--', rel])).trim() !== '';
  } catch {
    return false;
  }
}

/** `autoMemoryDirectory` from one settings file; undefined when the file or key is absent or unreadable. */
async function autoMemoryDirectory(file: string): Promise<string | undefined> {
  try {
    const value = (JSON.parse(await readText(file)) as { autoMemoryDirectory?: unknown }).autoMemoryDirectory;
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
  } catch {
    return undefined;
  }
}

/** Absolute paths and `~/` (expanded against the agent home); anything relative is refused. */
function expandHostPath(value: string): string | undefined {
  const text = value.trim();
  if (text === '~' || /^~[\\/]/.test(text)) return path.join(globalAgentHome(), text.slice(1));
  return path.isAbsolute(text) ? path.resolve(text) : undefined;
}

async function isDirectory(dir: string): Promise<boolean> {
  try { return (await fs.stat(dir)).isDirectory(); } catch { return false; }
}

/** Imported memories record this hash of the real store path, never the path itself. */
export async function hostMemoryOrigin(dir: string): Promise<string> {
  const real = (await fs.realpath(dir).catch(() => path.resolve(dir))).replace(/\\/g, '/').replace(/\/+$/, '');
  return sha256(`engram-host-origin:${process.platform === 'win32' ? real.toLowerCase() : real}`);
}

/** `<preset>/<relative path>`: the only form of a host file that reaches output or frontmatter. */
export function hostLabel(preset: HostMemoryPreset, rel: string): string { return `${preset}/${rel}`; }

/** Split a recorded label into its preset and store-relative path, or undefined for any other value. */
export function parseHostLabel(label: string): { preset: HostMemoryPreset; rel: string } | undefined {
  const preset = HOST_MEMORY_PRESETS.find((item) => label.startsWith(`${item}/`));
  return preset ? { preset, rel: label.slice(preset.length + 1) } : undefined;
}

/**
 * Candidate topic files, never read here. Claude: top level only, `MEMORY.md` is the index. Codex: depth 2. Markdown only;
 * links (symbolic or hard), secret names, odd names, and oversized or binary files are skipped with a reason.
 */
export async function walkHostMemory(root: HostMemoryRoot): Promise<HostMemoryWalk> {
  const files: HostMemoryFile[] = [];
  const skipped: HostMemoryWalk['skipped'] = [];
  const maxDepth = root.preset === 'codex-memories' ? CODEX_MAX_DEPTH : 1;
  async function visit(dir: string, prefix: string, depth: number): Promise<void> {
    for (const entry of await fs.readdir(dir, { withFileTypes: true }).catch(() => [])) {
      const rel = `${prefix}${entry.name}`;
      if (entry.isDirectory()) {
        if (depth < maxDepth && SAFE_NAME.test(entry.name)) await visit(path.join(dir, entry.name), `${rel}/`, depth + 1);
        continue;
      }
      if (!/\.md$/i.test(entry.name)) continue;
      if (!SAFE_NAME.test(entry.name)) skipped.push({ rel: `${prefix}(unsupported file name)`, reason: 'unsupported file name' });
      else if (root.preset === 'claude-auto-memory' && depth === 1 && entry.name.toLowerCase() === 'memory.md') skipped.push({ rel, reason: 'index file' });
      else if (entry.isSymbolicLink() || !entry.isFile()) skipped.push({ rel, reason: 'link' });
      else if (isSecretFile(rel)) skipped.push({ rel, reason: 'secret file' });
      else files.push({ rel });
    }
  }
  await visit(root.dir, '', 1);
  files.sort((a, b) => a.rel.localeCompare(b.rel));
  return { files, skipped };
}

/**
 * Read one topic file of a store for import or freshness. Unread and reported: unsafe relative paths, non-Markdown or
 * secret names, links (symbolic, or hard with more than one name), anything resolving outside the store, and files failing
 * the size or binary guard. Never writes.
 */
export async function readHostMemorySource(root: HostMemoryRoot, rel: string): Promise<HostMemoryRead> {
  const value = rel.trim().replace(/\\/g, '/');
  const parts = value.split('/');
  if (!value || value.includes('\0') || value.includes(':') || value.startsWith('/') || parts.some((part) => !part || part === '.' || part === '..')) return { unchecked: 'unsafe path' };
  if (!/\.md$/i.test(value) || isSecretFile(value)) return { unchecked: 'not a readable memory file' };
  const target = path.join(root.dir, ...parts);
  let stat: Awaited<ReturnType<typeof fs.lstat>>;
  try { stat = await fs.lstat(target); }
  catch (error) { return isMissing(error) ? { missing: true } : { unchecked: 'unreadable' }; }
  if (stat.isSymbolicLink() || stat.nlink > 1) return { unchecked: 'link' };
  if (!stat.isFile()) return { unchecked: 'not a file' };
  const [realRoot, realTarget] = await Promise.all([fs.realpath(root.dir).catch(() => undefined), fs.realpath(target).catch(() => undefined)]);
  const inside = realRoot && realTarget ? path.relative(realRoot, realTarget) : '..';
  if (!inside || inside === '..' || inside.startsWith(`..${path.sep}`) || path.isAbsolute(inside)) return { unchecked: 'path outside the memory store' };
  const guard = await sourceFileGuard(target);
  if (guard) return { unchecked: guard };
  return { text: await readText(target), rel: value };
}

function isMissing(error: unknown): boolean {
  const code = (error as { code?: string } | undefined)?.code;
  return code === 'ENOENT' || code === 'ENOTDIR';
}
