/** Profile commands for isolated global memory roots. */
import path from 'node:path';
import { formatRecords } from '../core/cli/format.js';
import { rebuildGraph } from '../core/memory/graph.js';
import { rebuildIndex } from '../core/memory/index.js';
import { createScope, appendChangelog } from '../core/memory/storage.js';
import { entryFromMemory, validateMemoryRaw } from '../core/memory/schema.js';
import { ensureVectorIndex } from '../core/memory/vector-db.js';
import {
  defaultConfig,
  loadConfig,
  parseSaveTarget,
  readProfileStore,
  resolveProfile,
  userProfilesPath,
  workspaceRoot,
  writeConfig,
  writeProfileStore
} from '../core/runtime/config.js';
import type { EngramConfig, EngramProfile, MemoryEntry } from '../core/runtime/types.js';
import { exists, inside, listFiles, readText, writeText } from '../core/system/fsx.js';
import { updateHash, verifyMemoryHash } from '../core/safety/hash.js';
import { lexicalScore } from '../core/system/text.js';
import { ensureGlobalGit, gitCommitGlobal } from '../core/vcs/git.js';
import { resolveConflictsInRoot } from '../core/vcs/conflict.js';

type MergeAction = 'copied' | 'planned' | 'skipped' | 'duplicate' | 'unsafe' | 'invalid';
type MergeResult = { action: MergeAction; file: string; reason?: string };

const activeMemoryDirs = ['rules', 'skills', 'knowledge'];

/** Create, select, inspect, or merge isolated Engram profiles. */
export async function cmdProfile(args: string[], flags: Record<string, any> = {}): Promise<string> {
  const [rawAction = 'status', ...rest] = args;
  const action = rawAction.toLowerCase();
  if (action === 'list' || action === 'ls') return profileList();
  if (action === 'status' || action === 'show') return profileStatus();
  if (action === 'create' || action === 'add') return profileCreate(rest, flags);
  if (['use', 'default', 'set-default', 'select'].includes(action)) return profileUse(rest, flags);
  if (action === 'remove' || action === 'rm' || action === 'delete') return profileRemove(rest);
  if (action === 'merge') return profileMerge(rest, flags);
  throw new Error('profile expects list, status, create, use, remove, or merge');
}

async function profileList(): Promise<string> {
  const store = await readProfileStore();
  const resolution = await resolveProfile();
  const names = Object.keys(store.profiles).sort();
  if (!names.length) return `No profiles configured. Registry: ${userProfilesPath()}`;
  return formatRecords('Profiles', names.map((name) => ({
    title: `${name}${name === resolution.active ? ' (active)' : ''}`,
    fields: profileFields(store.profiles[name], name === store.active_profile)
  })));
}

async function profileStatus(): Promise<string> {
  const store = await readProfileStore();
  const resolution = await resolveProfile();
  const activeProfile = resolution.active ? store.profiles[resolution.active] : undefined;
  return formatRecords('Profile status', [{
    title: resolution.active || '<none>',
    fields: [
      ['Source', resolution.source],
      ['Configured', resolution.configured ? 'yes' : 'no'],
      ['Global path', resolution.global_path || '<none>'],
      ['Workspace default', resolution.workspace_default || '<none>'],
      ['User default', resolution.user_default || '<none>'],
      ['Workspace memory', resolution.workspace_allowed ? 'allowed' : 'disabled for profile mismatch'],
      ['Registry', resolution.profiles_path],
      ...(activeProfile ? profileFields(activeProfile, resolution.active === store.active_profile) : [])
    ]
  }]);
}

async function profileCreate(args: string[], flags: Record<string, any>): Promise<string> {
  const name = requiredProfileName(args[0]);
  const globalPath = profilePathFromArgs(args, flags);
  const scope = typeof flags.scope === 'string' ? parseSaveTarget(flags.scope, 'profile create --scope') : 'global';
  const store = await readProfileStore();
  if (store.profiles[name] && flags.force !== true) throw new Error(`profile already exists: ${name}`);
  const loaded = await loadConfig();
  const profile: EngramProfile = {
    global_path: globalPath,
    scope,
    global_git: loaded.global_git
  };
  store.profiles[name] = profile;
  if (flags.use === true || !store.active_profile) store.active_profile = name;
  const profileFile = await writeProfileStore(store);
  const config = profileConfigForScope(loaded, profile);
  await createScope(globalPath, config, 'global', Boolean(flags.force), { scope: 'global', global_path: globalPath });
  const branch = await ensureGlobalGit(globalPath, config.global_git.branch);
  await gitCommitGlobal(globalPath, `create profile ${name}`, config.global_git, () => resolveGlobalConflicts(globalPath));
  if (flags.workspace === true) await writeWorkspaceDefault(name);
  return [
    `Profile created: ${name}`,
    `Global path: ${globalPath}`,
    `Default save target: ${scope}`,
    `Git branch: ${branch}`,
    `Registry: ${profileFile}`,
    ...(flags.workspace === true ? [`Workspace default: ${name}`] : []),
    ...(store.active_profile === name ? [`User default: ${name}`] : [])
  ].join('\n');
}

async function profileUse(args: string[], flags: Record<string, any>): Promise<string> {
  const name = requiredProfileName(args[0]);
  const store = await readProfileStore();
  if (!store.profiles[name]) throw new Error(`unknown profile: ${name}`);
  const preferWorkspace = flags.workspace === true || (flags.user !== true && await exists(workspaceRoot(process.cwd())));
  if (preferWorkspace) {
    const file = await writeWorkspaceDefault(name);
    return `Workspace default profile: ${name}\nConfig: ${file}`;
  }
  store.active_profile = name;
  const file = await writeProfileStore(store);
  return `User default profile: ${name}\nRegistry: ${file}`;
}

async function profileRemove(args: string[]): Promise<string> {
  const name = requiredProfileName(args[0]);
  const store = await readProfileStore();
  if (!store.profiles[name]) throw new Error(`unknown profile: ${name}`);
  delete store.profiles[name];
  if (store.active_profile === name) store.active_profile = undefined;
  const file = await writeProfileStore(store);
  return `Profile removed: ${name}\nRegistry: ${file}`;
}

async function profileMerge(args: string[], flags: Record<string, any>): Promise<string> {
  const store = await readProfileStore();
  const sourceName = requiredProfileName(typeof flags['from-profile'] === 'string' ? flags['from-profile'] : args[0]);
  const targetName = requiredProfileName(typeof flags['to-profile'] === 'string' ? flags['to-profile'] : args[1]);
  if (sourceName === targetName) throw new Error('profile merge source and target must be different');
  const source = store.profiles[sourceName];
  const target = store.profiles[targetName];
  if (!source) throw new Error(`unknown source profile: ${sourceName}`);
  if (!target) throw new Error(`unknown target profile: ${targetName}`);
  const dryRun = flags['dry-run'] === true;
  const force = flags.force === true;
  const config = profileConfigForScope(await loadConfig(), target);
  const sourceRoot = path.resolve(source.global_path);
  const targetRoot = path.resolve(target.global_path);
  if (!(await exists(sourceRoot))) throw new Error(`source profile root not found: ${sourceRoot}`);
  if (!dryRun) await createScope(targetRoot, config, 'global', false, { scope: 'global', global_path: targetRoot });
  const sourceEntries = await activeMemoryEntries(sourceRoot);
  const targetEntries = await activeMemoryEntries(targetRoot);
  const duplicates = duplicateMap(sourceEntries, targetEntries);
  const results: MergeResult[] = [];
  for (const file of await activeMemoryFiles(sourceRoot)) {
    results.push(await mergeOne(sourceRoot, targetRoot, file, duplicates.get(file), { dryRun, force }));
  }
  if (!dryRun && results.some((result) => result.action === 'copied')) {
    const index = await rebuildIndex(targetRoot, 'global');
    await rebuildGraph(targetRoot, 'global', index, config);
    await ensureVectorIndex(targetRoot, 'global', index.entries, config, { force: true });
    await gitCommitGlobal(targetRoot, `merge profile ${sourceName} into ${targetName}`, config.global_git, () => resolveGlobalConflicts(targetRoot));
  }
  return renderMergeResult(sourceName, targetName, sourceRoot, targetRoot, results, dryRun, force);
}

async function writeWorkspaceDefault(name: string): Promise<string> {
  const config = await loadConfig();
  config.default_profile = name;
  if (!(await exists(workspaceRoot(process.cwd())))) {
    const file = path.join(workspaceRoot(process.cwd()), 'engram.config.json');
    await writeText(file, JSON.stringify({ ...defaultConfig(), global_path: '', default_profile: name }, null, 2));
    return file;
  }
  return writeConfig(process.cwd(), config);
}

function profilePathFromArgs(args: string[], flags: Record<string, any>): string {
  const value = typeof flags['global-path'] === 'string' ? flags['global-path'] : args[1];
  if (!value?.trim()) throw new Error('profile create requires --global-path <path>');
  return path.resolve(value);
}

function profileConfigForScope(base: EngramConfig, profile: EngramProfile): EngramConfig {
  return {
    ...defaultConfig(),
    ...base,
    global_path: path.resolve(profile.global_path),
    scope: profile.scope ?? 'global',
    global_git: { ...base.global_git, ...(profile.global_git ?? {}) }
  };
}

function profileFields(profile: EngramProfile, userDefault: boolean): [string, string][] {
  return [
    ['Global path', path.resolve(profile.global_path)],
    ['Default save target', profile.scope ?? 'global'],
    ['User default', userDefault ? 'yes' : 'no']
  ];
}

function requiredProfileName(value: string | undefined): string {
  const name = (value ?? '').trim();
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/.test(name)) throw new Error('profile name must use letters, numbers, dot, dash, or underscore');
  return name;
}

async function activeMemoryFiles(root: string): Promise<string[]> {
  return (await listFiles(root))
    .map((file) => path.relative(root, file).replace(/\\/g, '/'))
    .filter((file) => file.endsWith('.md') && activeMemoryDirs.some((dir) => file.startsWith(`${dir}/`)))
    .sort();
}

async function activeMemoryEntries(root: string): Promise<MemoryEntry[]> {
  const entries: MemoryEntry[] = [];
  for (const file of await activeMemoryFiles(root)) {
    try {
      entries.push(entryFromMemory(await readText(inside(root, file)), file, 'global'));
    } catch {
      continue;
    }
  }
  return entries;
}

function duplicateMap(sourceEntries: MemoryEntry[], targetEntries: MemoryEntry[]): Map<string, string> {
  const duplicatePairsByFile = new Map<string, string>();
  const targetById = new Map(targetEntries.map((entry) => [entry.id, entry]));
  const targetByFile = new Map(targetEntries.map((entry) => [entry.file, entry]));
  for (const entry of sourceEntries) {
    const exact = targetByFile.get(entry.file) ?? targetById.get(entry.id);
    if (exact) {
      duplicatePairsByFile.set(entry.file, `matches ${exact.file}`);
      continue;
    }
    const similar = targetEntries
      .map((target) => ({ target, score: similarity(entry, target) }))
      .filter((row) => row.score >= 0.96)
      .sort((a, b) => b.score - a.score)[0];
    if (similar) duplicatePairsByFile.set(entry.file, `similar to ${similar.target.file} (${Math.round(similar.score * 100)}%)`);
  }
  return duplicatePairsByFile;
}

function similarity(a: MemoryEntry, b: MemoryEntry): number {
  if (a.id === b.id || a.file === b.file) return 1;
  const typeBonus = a.type === b.type ? 0.08 : 0;
  const score = lexicalScore(`${a.id} ${a.tags.join(' ')} ${a.summary}`, `${b.id} ${b.tags.join(' ')} ${b.summary}`);
  return Math.min(1, score + typeBonus);
}

async function mergeOne(sourceRoot: string, targetRoot: string, file: string, duplicate: string | undefined, options: { dryRun: boolean; force: boolean }): Promise<MergeResult> {
  const sourceFile = inside(sourceRoot, file);
  const targetFile = inside(targetRoot, file);
  const raw = await readText(sourceFile);
  const trusted = await verifyMemoryHash(sourceRoot, file, raw);
  if (!trusted.ok) return { action: 'unsafe', file, reason: trusted.reason };
  try {
    validateMemoryRaw(raw);
  } catch (error: any) {
    return { action: 'invalid', file, reason: error?.message ?? String(error) };
  }
  if (duplicate && !options.force) return { action: 'duplicate', file, reason: duplicate };
  if (await exists(targetFile) && !options.force) return { action: 'skipped', file, reason: 'destination exists' };
  if (options.dryRun) return { action: 'planned', file, reason: duplicate };
  await writeText(targetFile, raw);
  await updateHash(targetRoot, file, raw);
  await appendChangelog(targetRoot, file, `merge profile memory from ${sourceRoot}`);
  return { action: 'copied', file, reason: duplicate };
}

function renderMergeResult(source: string, target: string, sourceRoot: string, targetRoot: string, results: MergeResult[], dryRun: boolean, force: boolean): string {
  const count = (action: MergeAction) => results.filter((result) => result.action === action).length;
  const lines = [
    `${dryRun ? 'Profile merge dry-run' : 'Profile merge'} ${source} -> ${target}`,
    `Source: ${sourceRoot}`,
    `Target: ${targetRoot}`,
    `Copied: ${count('copied')}`,
    `Planned: ${count('planned')}`,
    `Duplicates: ${count('duplicate')}`,
    `Skipped: ${count('skipped')}`,
    `Unsafe: ${count('unsafe')}`,
    `Invalid: ${count('invalid')}`,
    `Force: ${force ? 'yes' : 'no'}`
  ];
  const shown = results.slice(0, 24);
  for (const result of shown) lines.push(`${result.action.toUpperCase()} ${result.file}${result.reason ? ` (${result.reason})` : ''}`);
  if (results.length > shown.length) lines.push(`... ${results.length - shown.length} more`);
  return lines.join('\n');
}

async function resolveGlobalConflicts(root: string): Promise<number> {
  const results = await resolveConflictsInRoot(root, 'global');
  return results.filter((row) => row.resolved).length;
}
