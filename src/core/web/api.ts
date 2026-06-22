/** Control panel data API and write handlers. */
import { openConfigDb, isConfigDbUsable } from '../config-db/schema.js';
import { loadConfig, writeUserConfig, readProfileStore, writeProfileStore, workspaceRoot, legacyWorkspaceRoot } from '../runtime/config.js';
import { exists, ensureDir } from '../system/fsx.js';
import { homedir } from 'node:os';
import { getContext } from '../memory/context.js';
import { visibleEntries } from '../memory/routing.js';
import { duplicatePairs, semanticDuplicatePairs, type DuplicatePair } from '../analysis/search.js';
import type { MemoryEntry, MemoryGraphEdge, MemoryGraphNode, Scope } from '../runtime/types.js';
import { loadIndex, rebuildIndex } from '../memory/index.js';

import {
  configFieldsForPanel,
  validateConfigPatch,
  type ConfigPatchValidation
} from './config-schema.js';

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
  isInitialized: boolean;
  configFields: ReturnType<typeof configFieldsForPanel>;
}

export async function loadPanelData(cwd: string, entryText: string): Promise<PanelData> {
  const config = await loadConfig(cwd);
  const entry = parseEntryText(entryText);
  const version = (config as any).version ?? '';
  const isInitialized = await exists(workspaceRoot(cwd)) || await exists(legacyWorkspaceRoot(cwd));
  const dbh = await openConfigDb();
  if (!dbh) {
    return { config, workspaces: [], profiles: [], entry, sqliteAvailable: false, cwd, version, isInitialized, configFields: configFieldsForPanel() };
  }
  try {
    if (!isConfigDbUsable(dbh.db)) {
      return { config, workspaces: [], profiles: [], entry, sqliteAvailable: false, cwd, version, isInitialized, configFields: configFieldsForPanel() };
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
      configFields: configFieldsForPanel()
    };
  } finally {
    dbh.close();
  }
}

export function apiConfigValidate(patch: unknown): ConfigPatchValidation {
  return validateConfigPatch(patch);
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

export interface AgentUiInfo {
  id: string;
  name: string;
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
  cursor: ['.cursor/rules/engram.mdc'],
  gemini: ['GEMINI.md'],
  cline: ['.clinerules'],
  windsurf: ['.windsurfrules'],
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
  if (["codex", "claude", "gemini"].includes(target)) return target;
  if (target === "antigravity" || target === "antigravity-cli") return "gemini";
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
      detected: isDet,
      workspaceLinked: wsLinked,
      globalLinked: glLinked,
      targets: AGENT_TARGET_MAP[agent.id] ?? [agent.id],
    });
  }
  return result;
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

export interface CorePanelData {
  generatedAt: string;
  scope: {
    activeProfile: string;
    profiles: string[];
    filter: CoreScopeFilter;
    workspaceRoot: string;
    globalRoot: string;
    profilesPath: string;
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

export async function apiCoreData(cwd: string, options: { semantic?: boolean; rebuild?: boolean; scope?: CoreScopeFilter } = {}): Promise<CorePanelData> {
  const filter: CoreScopeFilter = options.scope === 'workspace' || options.scope === 'global' ? options.scope : 'all';
  const ctx = await getContext(cwd, { rebuild: options.rebuild === true });
  const activeProfile = ctx.profile.active || '<none>';
  const store = await readProfileStore();
  const profiles = Object.keys(store.profiles);
  if (ctx.profile.active && !profiles.includes(activeProfile)) {
    profiles.push(activeProfile);
  }

  // 1. Gather active profile entries
  const activeEntries = visibleEntries(ctx.index.entries, ctx.config, false, ctx.ignorePatterns);
  const allSyntheticEntries: any[] = activeEntries.map((e) => ({
    ...e,
    file: `${activeProfile}/${e.scope}/${e.file}`,
    originalFile: e.file,
    profile: activeProfile
  }));

  // 2. Gather other profiles' global entries
  for (const pName of profiles) {
    if (pName === activeProfile) continue;
    const pConfig = store.profiles[pName];
    const root = pConfig?.global_path;
    if (root && await exists(root)) {
      let pIndex;
      if (options.rebuild === true) {
        pIndex = await rebuildIndex(root, 'global', ctx.ignorePatterns);
      } else {
        pIndex = await loadIndex(root);
      }
      const pEntries = visibleEntries(pIndex.entries, ctx.config, false, ctx.ignorePatterns);
      for (const e of pEntries) {
        allSyntheticEntries.push({
          ...e,
          file: `${pName}/${e.scope}/${e.file}`,
          originalFile: e.file,
          profile: pName
        });
      }
    }
  }

  // 3. Filter entries based on scope
  const filteredEntries = allSyntheticEntries.filter((entry) => filter === 'all' || entry.scope === filter);

  // 4. Calculate duplicate pairs
  const pairs = coreDuplicatePairs(filteredEntries, options.semantic === true);
  const duplicates = pairs.map(([a, b, score], index) => ({
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
      profilesPath: ctx.profile.profiles_path || ''
    },
    duplicates,
    relationship: coreRelationshipData(activeProfile, ctx.graph.nodes, ctx.graph.edges, duplicates),
    prompts: corePrompts(filter),
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

function corePrompts(filter: CoreScopeFilter): CorePanelData['prompts'] {
  const scopeFlag = filter === 'workspace' ? '--workspace' : filter === 'global' ? '--global' : '--all';
  return {
    resolveDuplicates: [
      'Review these Engram duplicate candidates.',
      'For each pair, decide whether to merge, archive, or keep both.',
      'When proposing saved memories, use TYPE, TEXT, CONTEXT, and UPDATE: memory-id for duplicates.',
      'Do not invent facts. Preserve stronger, newer, and more specific guidance.'
    ].join('\n'),
    metacognize: [
      `Run Engram metacognition for ${filter} memory scope.`,
      `Preferred command: engram metacognize ${scopeFlag} --accept-all`,
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

  const absPath = path.join(root, file);
  if (!(await exists(absPath))) {
    throw new Error(`Memory file not found at ${absPath}`);
  }

  return readText(absPath);
}


