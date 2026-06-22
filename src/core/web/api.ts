/** Control panel data API and write handlers. */
import { openConfigDb, isConfigDbUsable } from '../config-db/schema.js';
import { loadConfig, writeUserConfig, readProfileStore, writeProfileStore, workspaceRoot, legacyWorkspaceRoot } from '../runtime/config.js';
import { exists, ensureDir } from '../system/fsx.js';
import { homedir } from 'node:os';
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

