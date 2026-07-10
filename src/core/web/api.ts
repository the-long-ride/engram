/** Control panel data API and write handlers. */
import { openConfigDb, isConfigDbUsable } from '../config-db/schema.js';
import { loadConfig, writeUserConfig, readProfileStore, writeProfileStore, workspaceRoot, legacyWorkspaceRoot, scopeRootsForConfig } from '../runtime/config.js';
import { VERSION } from '../runtime/constants.js';
import { exists, ensureDir, inside } from '../system/fsx.js';
import { globalGitInfo, configureGlobalRemote } from '../vcs/git.js';
import { homedir } from 'node:os';
import { getContext } from '../memory/context.js';
import { visibleEntries } from '../memory/routing.js';
import { duplicatePairs, semanticDuplicatePairs, type DuplicatePair } from '../analysis/search.js';
import type { MemoryEntry, MemoryGraphEdge, MemoryGraphNode, Scope } from '../runtime/types.js';
import { loadIndex, rebuildIndex } from '../memory/index.js';
import { archiveMemory, planArchiveSet } from '../memory/archive.js';

import {
  configFieldsForPanel,
  validateConfigPatch,
  type ConfigPatchValidation
} from './config-schema.js';
import { resolveUnderRoot } from './path-utils.js';

async function importQueries(): Promise<any> {
  const url = new URL('../config-db/queries.js', import.meta.url).href;
  return import(url);
}

export interface EntrySection {
  group: string;
  rows: Array<[string, string]>;
}

export interface PanelData {
  config: any;
  workspaces: any[];
  profiles: any[];
  entry: EntrySection[];
  sqliteAvailable: boolean;
  cwd: string;
  version: string;
  latestVersion?: string;
  isInitialized: boolean;
  configFields: ReturnType<typeof configFieldsForPanel>;
}

export async function loadPanelData(cwd: string, entryText: string): Promise<PanelData> {
  const config = await loadConfig(cwd);
  const roots = scopeRootsForConfig(cwd, config);
  let remoteUrl = '';
  if (roots.global) {
    try {
      const gitInfo = await globalGitInfo(roots.global, config.global_git);
      remoteUrl = gitInfo.remoteUrl || '';
    } catch {}
  }
  (config.global_git as any).remote_url = remoteUrl;

  const entry = parseEntryText(entryText);
  const version = VERSION;
  const isInitialized = await exists(workspaceRoot(cwd)) || await exists(legacyWorkspaceRoot(cwd));
  const latestVersion = await latestPackageVersion(version);
  const dbh = await openConfigDb();
  if (!dbh) {
    return { config, workspaces: [], profiles: [], entry, sqliteAvailable: false, cwd, version, isInitialized, latestVersion, configFields: configFieldsForPanel() };
  }
  try {
    if (!isConfigDbUsable(dbh.db)) {
      return { config, workspaces: [], profiles: [], entry, sqliteAvailable: false, cwd, version, isInitialized, latestVersion, configFields: configFieldsForPanel() };
    }
    const q = await importQueries();
    return {
      config,
      workspaces: q.listWorkspaces(dbh.db),
      profiles: q.listProfiles(dbh.db),
      entry,
      sqliteAvailable: true,
      cwd,
      version,
      isInitialized,
      latestVersion,
      configFields: configFieldsForPanel()
    };
  } finally {
    dbh.close();
  }
}

export function apiConfigValidate(patch: unknown): ConfigPatchValidation {
  return validateConfigPatch(patch);
}

let latestVersionCache: { at: number; value: string } | null = null;

async function latestPackageVersion(currentVersion: string): Promise<string> {
  const envVersion = process.env.ENGRAM_LATEST_VERSION?.trim();
  if (envVersion) return isNewerVersion(envVersion, currentVersion) ? envVersion : '';
  if (process.env.NODE_ENV === 'test') return '';
  const now = Date.now();
  if (latestVersionCache && now - latestVersionCache.at < 10 * 60 * 1000) {
    return isNewerVersion(latestVersionCache.value, currentVersion) ? latestVersionCache.value : '';
  }
  try {
    const value = await fetchNpmLatestVersion(1200);
    latestVersionCache = { at: now, value };
    return isNewerVersion(value, currentVersion) ? value : '';
  } catch {
    latestVersionCache = { at: now, value: '' };
    return '';
  }
}

async function fetchNpmLatestVersion(timeoutMs: number): Promise<string> {
  const res = await fetch('https://registry.npmjs.org/@the-long-ride/engram/latest', {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(timeoutMs)
  });
  if (!res.ok) throw new Error('npm status ' + res.status);
  const body = await res.json() as { version?: string };
  return String(body.version || '');
}
function isNewerVersion(latest: string, current: string): boolean {
  const l = latest.split('.').map(Number);
  const c = current.split('.').map(Number);
  for (let i = 0; i < Math.max(l.length, c.length); i += 1) {
    const lv = l[i] || 0;
    const cv = c[i] || 0;
    if (lv > cv) return true;
    if (lv < cv) return false;
  }
  return false;
}

export async function apiConfigSet(key: string, value: string, cwd: string): Promise<string> {
  const validation = validateConfigPatch({ [key]: value });
  if (!validation.ok) {
    throw new Error(validation.issues.map((issue) => issue.message).join('; '));
  }
  const suffix = await writeConfigPatch(validation.patch, cwd);
  const [savedKey, savedValue] = Object.entries(validation.patch)[0];
  return 'Set ' + savedKey + ' = ' + savedValue + suffix;
}

export async function apiConfigUpdate(rawPatch: unknown, cwd: string): Promise<string> {
  const validation = validateConfigPatch(rawPatch);
  if (!validation.ok) {
    throw new Error(validation.issues.map((issue) => issue.message).join('; '));
  }

  const suffix = await writeConfigPatch(validation.patch, cwd);
  const count = Object.keys(validation.patch).length;
  return 'Saved ' + count + ' config ' + (count === 1 ? 'setting' : 'settings') + suffix;
}

async function writeConfigPatch(patch: Record<string, string>, cwd: string): Promise<string> {
  if (patch.global_path) {
    let gp = patch.global_path;
    if (gp.startsWith('~')) {
      gp = gp.replace(/^~/, homedir());
    }
    if (gp && !(await exists(gp))) {
      await ensureDir(gp);
    }
  }
  let sqliteUnavailable = false;
  const dbh = await openConfigDb();
  if (dbh) {
    try {
      if (isConfigDbUsable(dbh.db)) {
        const q = await importQueries();
        for (const [key, value] of Object.entries(patch)) {
          q.setUserConfigKey(dbh.db, key, value);
        }
      } else {
        sqliteUnavailable = true;
      }
    } finally {
      dbh.close();
    }
  } else {
    sqliteUnavailable = true;
  }

  const config = await loadConfig(cwd);
  for (const [key, value] of Object.entries(patch)) {
    applyDotted(config as any, key, value);
  }

  if (patch['global_git.remote_url'] !== undefined) {
    const remoteUrlVal = patch['global_git.remote_url'];
    const roots = scopeRootsForConfig(cwd, config);
    if (roots.global && remoteUrlVal) {
      try {
        await configureGlobalRemote(roots.global, remoteUrlVal, config.global_git.branch, config.global_git.remote);
      } catch (e: any) {
        throw new Error(`Failed to configure global git remote: ${e.message}`);
      }
    }
  }

  await writeUserConfig(config);
  return sqliteUnavailable ? ' (SQLite unavailable; JSON only)' : '';
}

export async function apiWorkspaceAdd(wsPath: string, name: string): Promise<string> {
  const dbh = await openConfigDb();
  if (!dbh) throw new Error('SQLite unavailable');
  try {
    if (!isConfigDbUsable(dbh.db)) throw new Error('SQLite unavailable');
    const q = await importQueries();
    q.upsertWorkspace(dbh.db, wsPath, name || '');
    return 'Registered: ' + wsPath;
  } finally { dbh.close(); }
}

export async function apiWorkspaceRemove(wsPath: string): Promise<string> {
  const dbh = await openConfigDb();
  if (!dbh) throw new Error('SQLite unavailable');
  try {
    if (!isConfigDbUsable(dbh.db)) throw new Error('SQLite unavailable');
    const q = await importQueries();
    q.deleteWorkspace(dbh.db, wsPath);
    return 'Removed: ' + wsPath;
  } finally { dbh.close(); }
}

export async function apiWorkspaceLink(wsPath: string, linked: boolean): Promise<string> {
  const dbh = await openConfigDb();
  if (!dbh) throw new Error('SQLite unavailable');
  try {
    if (!isConfigDbUsable(dbh.db)) throw new Error('SQLite unavailable');
    const q = await importQueries();
    q.setWorkspaceLinked(dbh.db, wsPath, linked);
    return (linked ? 'Linked' : 'Unlinked') + ': ' + wsPath;
  } finally { dbh.close(); }
}

export async function apiProfileAdd(name: string, globalPath: string, scope: string): Promise<string> {
  if (!name.trim()) throw new Error('Profile name is required');
  if (!globalPath.trim()) throw new Error('Global path is required');
  const dbh = await openConfigDb();
  if (!dbh) throw new Error('SQLite unavailable');
  try {
    if (!isConfigDbUsable(dbh.db)) throw new Error('SQLite unavailable');
    const q = await importQueries();
    q.upsertProfile(dbh.db, name, globalPath, scope || 'global');
    const store = await readProfileStore();
    store.profiles[name] = { global_path: globalPath, scope: (scope || 'global') as any };
    await writeProfileStore(store);
    return 'Profile saved: ' + name;
  } finally { dbh.close(); }
}

export async function apiProfileRemove(name: string): Promise<string> {
  const dbh = await openConfigDb();
  if (!dbh) throw new Error('SQLite unavailable');
  try {
    if (!isConfigDbUsable(dbh.db)) throw new Error('SQLite unavailable');
    const q = await importQueries();
    q.deleteProfile(dbh.db, name);
    const store = await readProfileStore();
    delete store.profiles[name];
    if (store.active_profile === name) store.active_profile = undefined;
    await writeProfileStore(store);
    return 'Profile deleted: ' + name;
  } finally { dbh.close(); }
}

export async function apiProfileActivate(name: string): Promise<string> {
  const dbh = await openConfigDb();
  if (!dbh) throw new Error('SQLite unavailable');
  try {
    if (!isConfigDbUsable(dbh.db)) throw new Error('SQLite unavailable');
    const q = await importQueries();
    q.setActiveProfile(dbh.db, name);
    const store = await readProfileStore();
    store.active_profile = name;
    await writeProfileStore(store);
    return 'Active profile: ' + name;
  } finally { dbh.close(); }
}

function applyDotted(obj: Record<string, any>, key: string, value: string): void {
  const parts = key.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!cur[parts[i]]) cur[parts[i]] = {};
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = parsePersistedValue(key, value);
}

function parsePersistedValue(key: string, value: string): any {
  if (key === 'roles') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map((item) => String(item)) : [];
    } catch {
      return [];
    }
  }
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value !== '' && !isNaN(Number(value))) return Number(value);
  return value;
}

export function parseEntryText(text: string): EntrySection[] {
  const sections: EntrySection[] = [];
  let cur: EntrySection | null = null;
  for (const line of text.split('\n')) {
    const s = line.replace(/\x1b\[[0-9;]*m/g, '').trim();
    if (!s) continue;
    if (s.startsWith('## ')) {
      const groupName = s.slice(3).trim();
      if (groupName.toLowerCase() === 'runtime') {
        cur = null;
        continue;
      }
      cur = { group: groupName, rows: [] };
      sections.push(cur);
    } else if (s.startsWith('- ') && cur) {
      const c = s.indexOf(': ');
      if (c === -1) continue;
      cur.rows.push([s.slice(2, c).trim(), s.slice(c + 2).trim()]);
    }
  }
  return sections;
}

// ── Agent Connections API ──────────────────────────────────────────────────
import path from 'node:path';
import { readText } from '../system/fsx.js';
import { detectInstalledAgents } from '../integrations/agent-detect.js';
import { isGenerated } from '../integrations/skillset-render.js';
import { readGlobalSkillsetRegistry, installSkillset, unlinkSkillset, installGlobalSkillset, unlinkGlobalSkillset, type SkillsetTarget } from '../integrations/skillset.js';
import { applyAgentHookAction } from '../integrations/agent-hooks.js';
import { globalAgentConfigHome, globalOpenCodeConfigHome } from '../integrations/agent-paths.js';

export interface AgentUiInfo {
  id: string;
  name: string;
  path?: string;
  detected: boolean;
  workspaceLinked: boolean;
  globalLinked: boolean;
  targets: string[];
}

const AGENT_TARGET_MAP: Record<string, string[]> = {
  codex: ['agents-md', 'agent-skill'],
  claude: ['claude'],
  cursor: ['cursor'],
  gemini: ['gemini'],
  copilot: ['copilot'],
  cline: ['cline'],
  windsurf: ['windsurf'],
  opencode: ['opencode'],
  antigravity: ['antigravity'],
};

const TARGET_FILES: Record<string, string[]> = {
  'agents-md': ['AGENTS.md'],
  copilot: ['.github/copilot-instructions.md'],
  claude: ['CLAUDE.md'],
  cursor: ['.cursor/rules/engram.mdc', '.cursor/engram.md', '.cursor/mcp.json'],
  gemini: ['GEMINI.md'],
  cline: ['.clinerules'],
  windsurf: ['.windsurf/rules/engram.md', '.windsurf/engram.md'],
  'agent-skill': ['.agents/skills/engram/SKILL.md'],
  antigravity: [
    '.antigravity/skills/engram/SKILL.md',
    '.antigravity-cli/skills/engram/SKILL.md',
    '.antigravity-ide/skills/engram/SKILL.md',
    '.antigravityrules'
  ],
  opencode: ['opencode.json', '.opencode/engram.md'],
  mcp: ['.mcp.json'],
  slash: ['.claude/commands/engram.md', '.claude/skills/engram/SKILL.md', '.cursor/commands/engram.md', '.gemini/commands/engram.toml']
};

function skillsetHookTarget(target: string): string {
  if (target === "all" || target === "all-supported") return "all";
  if (["codex", "claude", "gemini", "opencode", "cursor", "windsurf"].includes(target)) return target;
  if (target === "antigravity" || target === "antigravity-cli") return "gemini";
  if (target === "cascade") return "windsurf";
  if (target === "open-code") return "opencode";
  return "";
}

async function isTargetLinkedWorkspace(cwd: string, agentId: string): Promise<boolean> {
  const targetKeys = AGENT_TARGET_MAP[agentId] ?? [agentId];
  for (const key of targetKeys) {
    const files = TARGET_FILES[key] ?? [];
    for (const relFile of files) {
      const file = path.join(cwd, relFile);
      try {
        const content = await readText(file);
        if (content && isGenerated(content, relFile)) {
          return true;
        }
      } catch {
        // Ignored
      }
    }
  }
  return false;
}

async function isTargetLinkedGlobal(agentId: string): Promise<boolean> {
  try {
    const registry = await readGlobalSkillsetRegistry();
    const install = registry.installs[agentId];
    if (install && install.files && install.files.length > 0) {
      return true;
    }
  } catch {
    // Ignored
  }
  return false;
}

export async function apiAgentsScan(cwd: string): Promise<AgentUiInfo[]> {
  const detected = detectInstalledAgents();
  const agents = [
    { id: 'claude', name: 'Anthropic Claude' },
    { id: 'gemini', name: 'Google Gemini' },
    { id: 'cursor', name: 'Cursor' },
    { id: 'copilot', name: 'GitHub Copilot' },
    { id: 'cline', name: 'Cline' },
    { id: 'windsurf', name: 'Windsurf' },
    { id: 'codex', name: 'OpenAI Codex' },
    { id: 'opencode', name: 'OpenCode' },
    { id: 'antigravity', name: 'Antigravity' },
  ];

  const result: AgentUiInfo[] = [];
  for (const agent of agents) {
    const isDet = detected.has(agent.id);
    const wsLinked = await isTargetLinkedWorkspace(cwd, agent.id);
    const glLinked = await isTargetLinkedGlobal(agent.id);
    result.push({
      id: agent.id,
      name: agent.name,
      path: agentPath(agent.id),
      detected: isDet,
      workspaceLinked: wsLinked,
      globalLinked: glLinked,
      targets: AGENT_TARGET_MAP[agent.id] ?? [agent.id],
    });
  }
  return result;
}

function agentPath(agentId: string): string {
  const home = homedir();
  const configHome = globalAgentConfigHome(home);
  const localAppData = process.env.LOCALAPPDATA ?? path.join(home, 'AppData', 'Local');
  const paths: Record<string, string> = {
    codex: path.join(home, '.codex'),
    claude: path.join(home, '.claude'),
    cursor: path.join(home, '.cursor'),
    gemini: path.join(home, '.gemini'),
    copilot: path.join(home, '.copilot'),
    cline: path.join(home, '.cline'),
    windsurf: path.join(localAppData, 'Programs', 'Windsurf'),
    opencode: globalOpenCodeConfigHome(home),
    antigravity: path.join(home, '.antigravity')
  };
  return paths[agentId] || configHome;
}

export async function apiAgentLink(cwd: string, agentId: string, global: boolean): Promise<string> {
  if (global) {
    const results = await installGlobalSkillset(agentId, { force: true });
    const anyWritten = results.some((r) => r.action === 'written' || r.action === 'updated');
    const allSkipped = results.length > 0 && results.every((r) => r.action === 'skipped');
    if (allSkipped) {
      const reasons = [...new Set(results.map((r) => r.reason).filter(Boolean))].join('; ');
      return `Skipped ${agentId} (global): not supported${reasons ? ' — ' + reasons : ''}.`;
    }
    const hookTarget = skillsetHookTarget(agentId);
    if (hookTarget) {
      await applyAgentHookAction('install', hookTarget, { global: true, force: true, cwd });
    }
    return `Connected ${agentId} globally.${anyWritten ? '' : ' (already linked)'}`;
  } else {
    const config = await loadConfig(cwd);
    if (config.scope === 'global') {
      return `Skipped ${agentId} (workspace): config scope is global.`;
    }
    const results = await installSkillset(cwd, agentId, true);
    const anyWritten = results.some((r) => r.action === 'written' || r.action === 'updated');
    const allSkipped = results.length > 0 && results.every((r) => r.action === 'skipped');
    if (allSkipped) {
      const reasons = [...new Set(results.map((r) => r.reason).filter(Boolean))].join('; ');
      return `Skipped ${agentId} (workspace): not supported${reasons ? ' — ' + reasons : ''}.`;
    }
    const hookTarget = skillsetHookTarget(agentId);
    if (hookTarget) {
      await applyAgentHookAction('install', hookTarget, { global: false, force: true, cwd });
    }
    return `Connected ${agentId} in this workspace.${anyWritten ? '' : ' (already linked)'}`;
  }
}

export async function apiAgentUnlink(cwd: string, agentId: string, global: boolean): Promise<string> {
  if (global) {
    await unlinkGlobalSkillset(agentId, { force: true });
    const hookTarget = skillsetHookTarget(agentId);
    if (hookTarget) {
      await applyAgentHookAction('uninstall', hookTarget, { global: true, force: true, cwd });
    }
    return `Disconnected ${agentId} globally.`;
  } else {
    const config = await loadConfig(cwd);
    if (config.scope === 'global') {
      return `Skipped ${agentId} (workspace): config scope is global.`;
    }
    await unlinkSkillset(cwd, agentId);
    const hookTarget = skillsetHookTarget(agentId);
    if (hookTarget) {
      await applyAgentHookAction('uninstall', hookTarget, { global: false, force: true, cwd });
    }
    return `Disconnected ${agentId} from this workspace.`;
  }
}

export type CoreScopeFilter = 'all' | 'workspace' | 'global';

export interface CoreDuplicateRef {
  key: string;
  profile: string;
  scope: Scope;
  file: string;
  id: string;
  type: string;
  tags: string[];
  summary: string;
  updated: string;
}

export interface CoreDuplicateCandidate {
  id: string;
  method: 'strict' | 'semantic';
  score: number;
  a: CoreDuplicateRef;
  b: CoreDuplicateRef;
}

export interface CoreRelationshipNode {
  id: string;
  label: string;
  kind: 'profile' | 'global' | 'workspace' | 'memory' | 'topic' | 'type' | 'scope';
  scope?: Scope;
  profile?: string;
  file?: string;
}

export interface CoreRelationshipLink {
  from: string;
  to: string;
  kind: 'scope' | 'duplicate' | 'depends_on' | 'related_to' | 'contradicts' | 'contains' | 'tagged_as';
  label: string;
  score?: number;
}

export type MemoriesScopeFilter = 'profile' | 'global' | 'workspace';

export interface MemoriesGraphNode {
  id: string;
  memoryId: string;
  label: string;
  profile: string;
  scope: Scope;
  sourceScope: MemoriesScopeFilter;
  file: string;
  type?: string;
  tags?: string[];
  summary?: string;
  updated?: string;
  dependencyDepth?: number;
  canView: boolean;
  canDelete: boolean;
  canEdit: boolean;
  workspaceName?: string;
}

export interface MemoriesGraphLink {
  id: string;
  from: string;
  to: string;
  kind: 'dependency' | 'duplicate' | 'semantic';
  label: string;
  score?: number;
  thin: boolean;
  crossScope: boolean;
}

export interface MemoriesGraphData {
  generatedAt: string;
  filters: {
    enabledScopes: MemoriesScopeFilter[];
    enabledTypes: ('rule' | 'skill' | 'workflow' | 'knowledge')[];
    availableScopes: MemoriesScopeFilter[];
    availableTypes: ('rule' | 'skill' | 'workflow' | 'knowledge')[];
    semantic: boolean;
    activeProfile: string;
  };
  stats: {
    total: number;
    profile: number;
    global: number;
    workspace: number;
    dependencies: number;
    thinLinks: number;
  };
  nodes: MemoriesGraphNode[];
  links: MemoriesGraphLink[];
}

type BrowseDirectoryEntry = {
  name: string;
  path: string;
};

let driveCache: { at: number; drives: string[] } | null = null;

export interface CorePanelData {
  generatedAt: string;
  scope: {
    activeProfile: string;
    profiles: string[];
    filter: CoreScopeFilter;
    workspaceRoot: string;
    globalRoot: string;
    profilesPath: string;
    scopes?: ('profile' | 'global' | 'workspace')[];
    types?: ('rule' | 'skill' | 'workflow' | 'knowledge')[];
  };
  duplicates: CoreDuplicateCandidate[];
  relationship: {
    nodes: CoreRelationshipNode[];
    links: CoreRelationshipLink[];
  };
  prompts: {
    resolveDuplicates: string;
    metacognize: string;
  };
  warning: string;
}

type PanelMemoryEntry = MemoryEntry & {
  profile: string;
  originalFile: string;
};

interface PanelMemoryEntryPack {
  ctx: Awaited<ReturnType<typeof getContext>>;
  activeProfile: string;
  profiles: string[];
  entries: PanelMemoryEntry[];
}

async function collectPanelMemoryEntries(
  cwd: string,
  options: { rebuild?: boolean; scope?: CoreScopeFilter } = {}
): Promise<PanelMemoryEntryPack> {
  const filter: CoreScopeFilter = options.scope === 'workspace' || options.scope === 'global' ? options.scope : 'all';
  const ctx = await getContext(cwd, { rebuild: options.rebuild === true });
  const activeProfile = ctx.profile.active || '<none>';
  const store = await readProfileStore();
  const profiles = Object.keys(store.profiles);
  if (ctx.profile.active && !profiles.includes(activeProfile)) {
    profiles.push(activeProfile);
  }

  const activeEntries = visibleEntries(ctx.index.entries, ctx.config, false, ctx.ignorePatterns);
  const entries: PanelMemoryEntry[] = activeEntries.map((entry) => ({
    ...entry,
    file: `${activeProfile}/${entry.scope}/${entry.file}`,
    originalFile: entry.file,
    profile: activeProfile
  }));

  for (const profileName of profiles) {
    if (profileName === activeProfile) continue;
    const pConfig = store.profiles[profileName];
    const root = pConfig?.global_path;
    if (root && await exists(root)) {
      const pIndex = options.rebuild === true
        ? await rebuildIndex(root, 'global', ctx.ignorePatterns)
        : await loadIndex(root);
      const pEntries = visibleEntries(pIndex.entries, ctx.config, false, ctx.ignorePatterns);
      for (const entry of pEntries) {
        entries.push({
          ...entry,
          file: `${profileName}/${entry.scope}/${entry.file}`,
          originalFile: entry.file,
          profile: profileName
        });
      }
    }
  }

  return {
    ctx,
    activeProfile,
    profiles,
    entries: entries.filter((entry) => filter === 'all' || entry.scope === filter)
  };
}

export async function apiCoreData(
  cwd: string,
  options: {
    semantic?: boolean;
    rebuild?: boolean;
    scope?: CoreScopeFilter;
    scopes?: ('profile' | 'global' | 'workspace')[];
    types?: ('rule' | 'skill' | 'workflow' | 'knowledge')[];
    limit?: number;
  } = {}
): Promise<CorePanelData> {
  const pack = await collectPanelMemoryEntries(cwd, { rebuild: options.rebuild, scope: 'all' });
  const { ctx, activeProfile, profiles } = pack;

  let enabledScopes: ('profile' | 'global' | 'workspace')[];
  if (options.scopes) {
    enabledScopes = options.scopes;
  } else {
    const filter = options.scope === 'workspace' || options.scope === 'global' ? options.scope : 'all';
    if (filter === 'workspace') {
      enabledScopes = ['workspace'];
    } else if (filter === 'global') {
      enabledScopes = ['global', 'profile'];
    } else {
      enabledScopes = ['profile', 'global', 'workspace'];
    }
  }

  let enabledTypes: ('rule' | 'skill' | 'workflow' | 'knowledge')[];
  if (options.types) {
    enabledTypes = options.types;
  } else {
    enabledTypes = ['rule', 'skill', 'workflow', 'knowledge'];
  }

  const filteredEntries = pack.entries.filter((entry) => {
    const srcScope = memoriesSourceScope(entry, activeProfile);
    if (!enabledScopes.includes(srcScope)) return false;
    const type = getMemoryType(entry);
    return enabledTypes.includes(type);
  });

  const filter: CoreScopeFilter = enabledScopes.length === 1 && enabledScopes[0] === 'workspace'
    ? 'workspace'
    : enabledScopes.length === 1 && enabledScopes[0] === 'global'
      ? 'global'
      : 'all';

  const pairs = coreDuplicatePairs(filteredEntries, options.semantic === true);
  const maxPairs = Math.max(1, Math.min(100, Number(options.limit || 50)));
  const visiblePairs = pairs.slice(0, maxPairs);
  const duplicates = visiblePairs.map(([a, b, score], index) => ({
    id: `dup-${index + 1}`,
    method: options.semantic === true ? 'semantic' as const : 'strict' as const,
    score: Number(score.toFixed(3)),
    a: coreRef(a, activeProfile),
    b: coreRef(b, activeProfile)
  }));

  return {
    generatedAt: new Date().toISOString(),
    scope: {
      activeProfile,
      profiles,
      filter,
      workspaceRoot: ctx.roots.workspace || '',
      globalRoot: ctx.roots.global || '',
      profilesPath: ctx.profile.profiles_path || '',
      scopes: enabledScopes,
      types: enabledTypes
    },
    duplicates,
    relationship: coreRelationshipData(activeProfile, ctx.graph.nodes, ctx.graph.edges, duplicates),
    prompts: corePrompts(filter, duplicates),
    warning: 'Duplicate resolution and metacognition can consume more tokens than regular Engram operations. Use a strong AI model and review proposed UPDATE or archive actions before saving.'
  };
}

function coreDuplicatePairs(entries: MemoryEntry[], semantic: boolean): DuplicatePair[] {
  const strict = duplicatePairs(entries);
  if (!semantic) return strict;
  const seen = new Set(strict.map(([a, b]) => pairKey(a, b)));
  const merged = [...strict];
  for (const pair of semanticDuplicatePairs(entries)) {
    const key = pairKey(pair[0], pair[1]);
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(pair);
    }
  }
  return merged.sort((a, b) => b[2] - a[2] || a[0].file.localeCompare(b[0].file) || a[1].file.localeCompare(b[1].file));
}

function pairKey(a: any, b: any): string {
  return [entryKey(a), entryKey(b)].sort().join('::');
}

function entryKey(entry: any): string {
  return `${entry.profile || 'default'}:${entry.scope}:${entry.originalFile || entry.file}`;
}

function coreRef(entry: any, defaultProfile: string): CoreDuplicateRef {
  const profile = entry.profile || defaultProfile;
  const file = entry.originalFile || entry.file;
  const key = `${entry.scope}:${profile}:${file}`;
  return {
    key,
    profile,
    scope: entry.scope,
    file,
    id: entry.id,
    type: entry.type,
    tags: entry.tags,
    summary: entry.summary,
    updated: entry.updated
  };
}

function memoriesSourceScope(entry: PanelMemoryEntry, activeProfile: string): MemoriesScopeFilter {
  if (entry.profile !== activeProfile) return 'profile';
  return entry.scope === 'workspace' ? 'workspace' : 'global';
}

function getMemoryType(entry: any): 'rule' | 'skill' | 'workflow' | 'knowledge' {
  if (entry.type === 'skill') {
    const fileLower = (entry.originalFile || entry.file || '').toLowerCase();
    const idLower = (entry.id || '').toLowerCase();
    const summaryLower = (entry.summary || '').toLowerCase();
    const tags = entry.tags || [];
    const isWorkflow =
      fileLower.includes('workflow') ||
      idLower.includes('workflow') ||
      summaryLower.includes('workflow') ||
      tags.some((t: string) => t.toLowerCase().includes('workflow'));
    return isWorkflow ? 'workflow' : 'skill';
  }
  return entry.type;
}

function memoriesNodeId(entry: PanelMemoryEntry): string {
  return `memory:${entry.profile}:${entry.scope}:${entry.originalFile}`;
}

function memoryGraphNode(entry: PanelMemoryEntry, activeProfile: string, workspaceName?: string): MemoriesGraphNode {
  const sourceScope = memoriesSourceScope(entry, activeProfile);
  return {
    id: memoriesNodeId(entry),
    memoryId: entry.id,
    label: entry.id,
    profile: entry.profile,
    scope: entry.scope,
    sourceScope,
    file: entry.originalFile,
    type: entry.type,
    tags: entry.tags,
    summary: entry.summary,
    updated: entry.updated,
    dependencyDepth: entry.dependencyDepth,
    canView: true,
    canDelete: sourceScope !== 'profile' || entry.scope === 'global',
    canEdit: sourceScope !== 'profile' || entry.scope === 'global',
    workspaceName: sourceScope === 'workspace' ? workspaceName : undefined
  };
}

function normalizeMemoriesScopes(scopes: unknown): MemoriesScopeFilter[] {
  const raw = Array.isArray(scopes) ? scopes : typeof scopes === 'string' ? scopes.split(',') : [];
  const valid = raw.filter((scope): scope is MemoriesScopeFilter => scope === 'profile' || scope === 'global' || scope === 'workspace');
  return valid.length ? Array.from(new Set(valid)) : ['profile', 'global', 'workspace'];
}

function normalizeMemoryTypes(types: unknown): ('rule' | 'skill' | 'workflow' | 'knowledge')[] {
  const raw = Array.isArray(types) ? types : typeof types === 'string' ? types.split(',') : [];
  const valid = raw.filter((type): type is 'rule' | 'skill' | 'workflow' | 'knowledge' => type === 'rule' || type === 'skill' || type === 'workflow' || type === 'knowledge');
  return valid.length ? Array.from(new Set(valid)) : ['rule', 'skill', 'workflow', 'knowledge'];
}

function memoryRefKeys(entry: PanelMemoryEntry): string[] {
  const fileNoExt = entry.originalFile.replace(/\.md$/i, '');
  return Array.from(new Set([
    entry.id,
    entry.originalFile,
    fileNoExt,
    fileNoExt.split(/[\\/]/).pop() || fileNoExt
  ]));
}

export async function apiMemoriesGraphData(
  cwd: string,
  options: { scopes?: MemoriesScopeFilter[] | string; types?: ('rule' | 'skill' | 'workflow' | 'knowledge')[] | string; semantic?: boolean; rebuild?: boolean; limit?: number } = {}
): Promise<MemoriesGraphData> {
  const enabledScopes = normalizeMemoriesScopes(options.scopes);
  const enabledTypes = normalizeMemoryTypes(options.types);
  const pack = await collectPanelMemoryEntries(cwd, { rebuild: options.rebuild, scope: 'all' });
  const maxThinLinks = Math.max(1, Math.min(200, Number(options.limit || 100)));

  let workspaceName = '';
  const dbh = await openConfigDb();
  if (dbh) {
    try {
      if (isConfigDbUsable(dbh.db)) {
        const q = await importQueries();
        const ws = q.getWorkspaceByPath(dbh.db, cwd);
        if (ws && ws.name) {
          workspaceName = ws.name;
        }
      }
    } finally {
      dbh.close();
    }
  }
  if (!workspaceName) {
    workspaceName = cwd.split(/[\\/]/).pop() || 'workspace';
  }

  const allNodes = pack.entries.map((entry) => memoryGraphNode(entry, pack.activeProfile, workspaceName));
  const visibleNodes = allNodes.filter((node) => enabledScopes.includes(node.sourceScope) && enabledTypes.includes(getMemoryType(node)));
  const visibleIds = new Set(visibleNodes.map((node) => node.id));
  const entriesByKey = new Map<string, PanelMemoryEntry>();
  for (const entry of pack.entries) {
    for (const key of memoryRefKeys(entry)) {
      if (!entriesByKey.has(key)) entriesByKey.set(key, entry);
    }
  }

  const links: MemoriesGraphLink[] = [];
  const seenLinks = new Set<string>();
  const pushLink = (link: MemoriesGraphLink) => {
    if (!visibleIds.has(link.from) || !visibleIds.has(link.to)) return;
    const key = `${link.kind}:${link.from}:${link.to}`;
    if (seenLinks.has(key)) return;
    seenLinks.add(key);
    links.push(link);
  };

  for (const entry of pack.entries) {
    for (const ref of entry.dependsOn ?? []) {
      const target = entriesByKey.get(ref) || entriesByKey.get(ref.replace(/\.md$/i, ''));
      if (!target || target.id === entry.id) continue;
      const from = memoriesNodeId(entry);
      const to = memoriesNodeId(target);
      pushLink({
        id: `dependency:${from}:${to}`,
        from,
        to,
        kind: 'dependency',
        label: 'depends_on',
        thin: false,
        crossScope: memoriesSourceScope(entry, pack.activeProfile) !== memoriesSourceScope(target, pack.activeProfile)
      });
    }
  }

  const duplicatePairs = coreDuplicatePairs(pack.entries, options.semantic === true).slice(0, maxThinLinks);
  for (const [a, b, score] of duplicatePairs) {
    const from = memoriesNodeId(a as PanelMemoryEntry);
    const to = memoriesNodeId(b as PanelMemoryEntry);
    const kind = score >= 0.999 ? 'duplicate' : 'semantic';
    pushLink({
      id: `${kind}:${from}:${to}`,
      from,
      to,
      kind,
      label: kind === 'duplicate' ? 'duplicate' : 'high semantic match',
      score: Number(score.toFixed(3)),
      thin: true,
      crossScope: memoriesSourceScope(a as PanelMemoryEntry, pack.activeProfile) !== memoriesSourceScope(b as PanelMemoryEntry, pack.activeProfile)
    });
  }

  const stats = {
    total: visibleNodes.length,
    profile: visibleNodes.filter((node) => node.sourceScope === 'profile').length,
    global: visibleNodes.filter((node) => node.sourceScope === 'global').length,
    workspace: visibleNodes.filter((node) => node.sourceScope === 'workspace').length,
    dependencies: links.filter((link) => link.kind === 'dependency').length,
    thinLinks: links.filter((link) => link.thin).length
  };

  return {
    generatedAt: new Date().toISOString(),
    filters: {
      enabledScopes,
      enabledTypes,
      availableScopes: ['profile', 'global', 'workspace'],
      availableTypes: ['rule', 'skill', 'workflow', 'knowledge'],
      semantic: options.semantic === true,
      activeProfile: pack.activeProfile
    },
    stats,
    nodes: visibleNodes,
    links
  };
}

function mapNodeId(id: string, activeProfile: string): string {
  if (id.startsWith('memory:')) {
    const parts = id.split(':');
    const scope = parts[1];
    const rest = parts.slice(2).join(':');
    return `memory:${activeProfile}:${scope}:${rest}`;
  }
  return id;
}

function coreRelationshipData(
  activeProfile: string,
  graphNodes: MemoryGraphNode[],
  graphEdges: MemoryGraphEdge[],
  duplicates: CoreDuplicateCandidate[]
): CorePanelData['relationship'] {
  const nodes = new Map<string, CoreRelationshipNode>();
  const links: CoreRelationshipLink[] = [];
  const addNode = (node: CoreRelationshipNode) => nodes.set(node.id, node);

  addNode({ id: `profile:${activeProfile}`, label: activeProfile, kind: 'profile', profile: activeProfile });
  addNode({ id: 'scope:global', label: 'global', kind: 'global', scope: 'global', profile: activeProfile });
  addNode({ id: 'scope:workspace', label: 'workspace', kind: 'workspace', scope: 'workspace', profile: activeProfile });

  links.push({ from: `profile:${activeProfile}`, to: 'scope:global', kind: 'scope', label: 'profile -> global' });
  links.push({ from: 'scope:global', to: 'scope:workspace', kind: 'scope', label: 'global -> workspace' });

  for (const node of graphNodes) {
    if (node.kind === 'memory') {
      const parts = node.id.split(':');
      const scope = parts[1] as Scope;
      const memId = parts.slice(2).join(':');
      const mappedId = `memory:${activeProfile}:${scope}:${memId}`;
      addNode({
        id: mappedId,
        label: node.label,
        kind: 'memory',
        scope,
        profile: activeProfile,
        file: node.file
      });
      links.push({
        from: scope === 'global' ? 'scope:global' : 'scope:workspace',
        to: mappedId,
        kind: 'scope',
        label: `${scope} memory`
      });
    } else {
      addNode({
        id: node.id,
        label: node.label,
        kind: node.kind as any,
        profile: activeProfile
      });
    }
  }

  for (const edge of graphEdges) {
    if (!['depends_on', 'related_to', 'contradicts', 'contains', 'tagged_as'].includes(edge.kind)) continue;
    const fromMapped = mapNodeId(edge.from, activeProfile);
    const toMapped = mapNodeId(edge.to, activeProfile);
    links.push({
      from: fromMapped,
      to: toMapped,
      kind: edge.kind as CoreRelationshipLink['kind'],
      label: edge.reason,
      score: edge.weight
    });
  }

  for (const dup of duplicates) {
    const fromId = `memory:${dup.a.profile}:${dup.a.scope}:${dup.a.id}`;
    const toId = `memory:${dup.b.profile}:${dup.b.scope}:${dup.b.id}`;

    addNode({
      id: fromId,
      label: dup.a.id,
      kind: 'memory',
      scope: dup.a.scope,
      profile: dup.a.profile,
      file: dup.a.file
    });
    addNode({
      id: toId,
      label: dup.b.id,
      kind: 'memory',
      scope: dup.b.scope,
      profile: dup.b.profile,
      file: dup.b.file
    });

    links.push({
      from: fromId,
      to: toId,
      kind: 'duplicate',
      label: `${Math.round(dup.score * 100)}% duplicate`,
      score: dup.score
    });
  }

  return { nodes: [...nodes.values()], links };
}

function corePromptRef(ref: CoreDuplicateRef): string {
  return `- id=${ref.id} profile=${ref.profile} scope=${ref.scope} file=${ref.file}`;
}

function corePrompts(filter: CoreScopeFilter, duplicates: CoreDuplicateCandidate[] = []): CorePanelData['prompts'] {
  const scopeFlag = filter === 'workspace' ? '--workspace' : filter === 'global' ? '--global' : '--all';
  const duplicateIds = Array.from(new Set(duplicates.flatMap((d) => [d.a.id, d.b.id])));
  const loadCommand = duplicateIds.length > 0
    ? `engram load --id ${duplicateIds.join(',')}`
    : 'engram load --id id1,id2';
  const refs = Array.from(new Map(duplicates.flatMap((d) => [d.a, d.b]).map((ref) => [ref.key, ref])).values());
  const refList = refs.length ? refs.map(corePromptRef).join('\n') : '- id=id1 profile=profile scope=scope file=path';
  return {
    resolveDuplicates: [
      'Review these Engram duplicate or semantically overlapping candidates.',
      `Convenience command for ids visible in the active profile: ${loadCommand}`,
      '',
      'Candidate refs:',
      refList,
      '',
      'For each pair, decide whether to merge, archive, or keep both.',
      'Note: Candidates with middle semantic similarity can also be merged if they share related context or rules.',
      'When proposing saved memories, use TYPE, TEXT, CONTEXT, and UPDATE: memory-id for duplicates or merged targets.',
      'Do not invent facts. Preserve stronger, newer, and more specific guidance.'
    ].join('\n'),
    metacognize: [
      `Run Engram metacognition for ${filter} memory scope.`,
      `Preferred command: engram metacognize ${scopeFlag} --force`,
      'Use UPDATE for duplicates, DEPENDS_ON for prerequisites, and omit candidates already covered.'
    ].join('\n')
  };
}

export async function apiGetMemoryContent(cwd: string, profileName: string, scope: Scope, file: string): Promise<string> {
  const ctx = await getContext(cwd);
  const activeProfile = ctx.profile.active || '<none>';
  
  let root = '';
  if (profileName === activeProfile) {
    root = scope === 'workspace' ? ctx.roots.workspace : ctx.roots.global;
  } else {
    const store = await readProfileStore();
    const pConfig = store.profiles[profileName];
    root = pConfig?.global_path || '';
  }

  if (!root) {
    throw new Error(`Profile ${profileName} is not configured or has no global path`);
  }

  const absPath = resolveUnderRoot(root, file);
  if (!(await exists(absPath))) {
    throw new Error(`Memory file not found at ${absPath}`);
  }

  return readText(absPath);
}

async function listWindowsDrives(): Promise<string[]> {
  if (process.platform !== 'win32') return [];
  const now = Date.now();
  if (driveCache && now - driveCache.at < 5000) return driveCache.drives;

  const fs = await import('node:fs/promises');
  const drives: string[] = [];
  for (let i = 65; i <= 90; i += 1) {
    const drive = String.fromCharCode(i) + ':\\';
    try {
      const stat = await fs.stat(drive);
      if (stat.isDirectory()) drives.push(drive);
    } catch {
      // Drive not available.
    }
  }
  driveCache = { at: now, drives };
  return drives;
}

export async function apiBrowseDirectories(currentPath: string, cwd = process.cwd()): Promise<any> {
  const fs = await import('node:fs/promises');
  const pathMod = await import('node:path');
  const drives = await listWindowsDrives();
  const requested = currentPath && String(currentPath).trim()
    ? String(currentPath)
    : cwd;
  let targetPath = pathMod.resolve(requested);

  try {
    const stats = await fs.stat(targetPath);
    if (!stats.isDirectory()) targetPath = pathMod.dirname(targetPath);
  } catch {
    return {
      ok: false,
      currentPath: targetPath,
      parentPath: '',
      directories: [],
      drives,
      error: `Cannot access directory: ${requested}`
    };
  }

  let entries: Awaited<ReturnType<typeof fs.readdir>>;
  try {
    entries = await fs.readdir(targetPath, { withFileTypes: true });
  } catch {
    return {
      ok: false,
      currentPath: targetPath,
      parentPath: pathMod.resolve(targetPath, '..'),
      directories: [],
      drives,
      error: `Cannot read directory: ${targetPath}`
    };
  }

  const directories: BrowseDirectoryEntry[] = entries
    .filter((entry: { isDirectory: () => boolean }) => entry.isDirectory())
    .map((entry: { name: string }) => ({
      name: entry.name,
      path: pathMod.join(targetPath, entry.name)
    }))
    .sort((a: BrowseDirectoryEntry, b: BrowseDirectoryEntry) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

  const parentPath = pathMod.resolve(targetPath, '..');
  return {
    ok: true,
    currentPath: targetPath,
    parentPath: parentPath === targetPath ? '' : parentPath,
    directories,
    drives
  };
}

export interface ResolvedMemoryFile {
  profile: string;
  scope: Scope;
  file: string;
  path: string;
  editorUrl: string;
}

async function memoryRootForProfile(cwd: string, profileName: string, scope: Scope): Promise<string> {
  const ctx = await getContext(cwd);
  const activeProfile = ctx.profile.active || '<none>';
  if (profileName === activeProfile || profileName === 'default') {
    return scope === 'workspace' ? ctx.roots.workspace : ctx.roots.global;
  }
  if (scope !== 'global') {
    throw new Error('Only active profile workspace memories can be managed');
  }
  const store = await readProfileStore();
  const pConfig = store.profiles[profileName];
  return pConfig?.global_path || '';
}

export async function apiResolveMemoryFile(cwd: string, profileName: string, scope: Scope, file: string): Promise<ResolvedMemoryFile> {
  const root = await memoryRootForProfile(cwd, profileName, scope);
  if (!root) {
    throw new Error(`Profile ${profileName} is not configured for ${scope} memories`);
  }
  const absPath = resolveUnderRoot(root, file);
  if (!(await exists(absPath))) {
    throw new Error(`Memory file not found at ${absPath}`);
  }
  const normalized = absPath.replace(/\\/g, '/');
  return {
    profile: profileName,
    scope,
    file,
    path: absPath,
    editorUrl: `vscode://file/${encodeURI(normalized)}`
  };
}

export interface ArchiveMemoryRequest {
  profile: string;
  scope: Scope;
  file: string;
  id?: string;
  reason?: string;
}

export interface ArchiveMemoryResult {
  archived: true;
  message: string;
  path: string;
}

export async function apiArchiveMemory(cwd: string, body: ArchiveMemoryRequest): Promise<ArchiveMemoryResult> {
  const ctx = await getContext(cwd);
  const activeProfile = ctx.profile.active || '<none>';
  if (body.profile !== activeProfile && body.profile !== 'default') {
    throw new Error('Activate this profile before deleting its memories');
  }
  const target = body.file || body.id || '';
  if (!target) throw new Error('memory file or id is required');
  const reason = (body.reason || 'Deleted from Memories graph view').trim();
  const plans = planArchiveSet(ctx, target, reason).filter((plan) => plan.entry.scope === body.scope);
  const plan = plans[0];
  if (!plan) throw new Error(`Memory not found in ${body.scope}: ${target}`);
  const archivedPath = await archiveMemory(ctx, plan, reason);
  return {
    archived: true,
    message: `Archived -> ${archivedPath}`,
    path: archivedPath
  };
}

