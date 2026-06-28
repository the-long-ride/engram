/** Agent hook adapter metadata and managed JSON merge helpers. */
import path from 'node:path';
import fs from 'node:fs/promises';
import { formatRecords, type RecordBlock } from '../cli/format.js';
import { globalAgentHome, globalAgentConfigHome } from './agent-paths.js';
import {
  isGeneratedOpenCodeHookPlugin,
  renderOpenCodeHookPlugin
} from './opencode-hook-plugin.js';
import { exists, readJson, readText, writeJson, writeText } from '../system/fsx.js';

export type AgentHookHost = 'codex' | 'claude' | 'gemini' | 'opencode' | 'cursor' | 'windsurf';
export type AgentHookAction = 'install' | 'uninstall';

type JsonHookTarget = {
  kind: 'json';
  host: Exclude<AgentHookHost, 'opencode'>;
  configFile: string;
  globalFile: () => string;
  events: string[];
  schema: 'claude-codex' | 'cursor' | 'windsurf';
};

type PluginHookTarget = {
  kind: 'plugin';
  host: 'opencode';
  configFile: string;
  globalFile: () => string;
  events: string[];
};

type HookTarget = JsonHookTarget | PluginHookTarget;

type UnsupportedTarget = {
  target: string;
  reason: string;
};

export type AgentHookResult = {
  status: 'PLAN' | 'UPDATED' | 'REMOVED' | 'SKIPPED';
  host: string;
  file?: string;
  events?: string[];
  reason?: string;
};

const MANAGED_NAME = 'engram-auto-load';
const TIMEOUT_MS = 10000;

const TARGETS: Record<AgentHookHost, HookTarget> = {
  codex: {
    kind: 'json',
    host: 'codex',
    configFile: path.join('.codex', 'hooks.json'),
    globalFile: () => path.join(globalAgentHome(), '.codex', 'hooks.json'),
    events: ['SessionStart', 'UserPromptSubmit'],
    schema: 'claude-codex'
  },
  claude: {
    kind: 'json',
    host: 'claude',
    configFile: path.join('.claude', 'settings.json'),
    globalFile: () => path.join(globalAgentHome(), '.claude', 'settings.json'),
    events: ['SessionStart', 'UserPromptSubmit'],
    schema: 'claude-codex'
  },
  gemini: {
    kind: 'json',
    host: 'gemini',
    configFile: path.join('.gemini', 'settings.json'),
    globalFile: () => path.join(globalAgentHome(), '.gemini', 'settings.json'),
    events: ['SessionStart', 'BeforeAgent'],
    schema: 'claude-codex'
  },
  cursor: {
    kind: 'json',
    host: 'cursor',
    configFile: path.join('.cursor', 'hooks.json'),
    globalFile: () => path.join(globalAgentHome(), '.cursor', 'plugins', 'local', 'engram', 'hooks', 'hooks.json'),
    events: ['sessionStart'],
    schema: 'cursor'
  },
  windsurf: {
    kind: 'json',
    host: 'windsurf',
    configFile: path.join('.windsurf', 'hooks.json'),
    globalFile: () => path.join(globalAgentHome(), '.codeium', 'windsurf', 'hooks.json'),
    events: ['pre_user_prompt'],
    schema: 'windsurf'
  },
  opencode: {
    kind: 'plugin',
    host: 'opencode',
    configFile: path.join('.opencode', 'plugins', 'engram.js'),
    globalFile: () => path.join(globalAgentConfigHome(), 'opencode', 'plugins', 'engram.js'),
    events: ['chat.message', 'experimental.chat.system.transform']
  }
};

const UNSUPPORTED: Record<string, string> = {
  copilot: 'partial hook support: sessionStart can inject context, but userPromptSubmitted does not provide prompt-time context injection; use Engram skillset/manual load in v1',
  cline: 'plugin-based hook support is real, but install UX is not file-first; use Engram skillset/manual load in v1'
};

/** Install or uninstall managed Engram agent hooks for one target or all known targets. */
export async function applyAgentHookAction(action: AgentHookAction, targetArg = 'all', options: { global?: boolean; plan?: boolean; force?: boolean; cwd?: string } = {}): Promise<string> {
  const results: AgentHookResult[] = [];
  for (const target of expandTargets(targetArg)) {
    const normalized = normalizeTarget(target);
    if (typeof normalized !== 'string') {
      results.push({ status: 'SKIPPED', host: normalized.target, reason: normalized.reason });
      continue;
    }
    const meta = TARGETS[normalized];
    const file = options.global
      ? meta.globalFile()
      : path.join(options.cwd ?? process.cwd(), meta.configFile);
    if (options.plan) {
      results.push({ status: 'PLAN', host: meta.host, file, events: meta.events });
      continue;
    }
    if (meta.kind === 'plugin') {
      results.push(await applyOpenCodePlugin(action, meta, file, Boolean(options.force)));
      continue;
    }
    if (action === 'uninstall' && !(await exists(file))) {
      results.push({ status: 'SKIPPED', host: meta.host, file, events: meta.events, reason: 'config file not found' });
      continue;
    }
    const config = await readJson<Record<string, any>>(file, {});
    const changed = action === 'install'
      ? mergeManagedHooks(config, meta, Boolean(options.force))
      : unmergeManagedHooks(config, meta);
    if (changed || action === 'install') await writeJson(file, config);
    results.push({
      status: action === 'install' ? 'UPDATED' : 'REMOVED',
      host: meta.host,
      file,
      events: meta.events,
      reason: changed ? undefined : 'no Engram-managed hook entries found'
    });
  }
  return formatRecords(action === 'install' ? 'Engram agent hook install' : 'Engram agent hook uninstall', results.map(resultRecord));
}

/** Return canonical supported host or unsupported target reason. */
export function normalizeTarget(target: string): AgentHookHost | UnsupportedTarget {
  const lower = target.toLowerCase();
  if (lower === 'antigravity' || lower === 'antigravity-cli') return 'gemini';
  if (lower === 'open-code') return 'opencode';
  if (lower === 'cascade') return 'windsurf';
  if (lower === 'codex' || lower === 'claude' || lower === 'gemini' || lower === 'opencode' || lower === 'cursor' || lower === 'windsurf') return lower;
  if (UNSUPPORTED[lower]) return { target: lower, reason: UNSUPPORTED[lower] };
  return { target: lower || 'all', reason: 'unknown agent hook target' };
}

function expandTargets(target: string): string[] {
  const lower = (target || 'all').toLowerCase();
  return lower === 'all'
    ? ['codex', 'claude', 'gemini', 'cursor', 'copilot', 'cline', 'windsurf', 'opencode']
    : [lower];
}

function mergeManagedHooks(config: Record<string, any>, meta: JsonHookTarget, force: boolean): boolean {
  if (meta.schema === 'cursor') return mergeCursorHooks(config, meta, force);
  if (meta.schema === 'windsurf') return mergeWindsurfHooks(config, meta, force);
  config.hooks = isObject(config.hooks) ? config.hooks : {};
  let changed = false;
  for (const event of meta.events) {
    const groups = Array.isArray(config.hooks[event]) ? config.hooks[event] : [];
    const cleaned = removeManagedFromGroups(groups, meta.host);
    const group = {
      matcher: (event === 'SessionStart' || event === 'BeforeAgent') ? '*' : '',
      hooks: [managedHook(meta.host)]
    };
    config.hooks[event] = [...cleaned, group];
    changed ||= force || cleaned.length !== groups.length || !groups.some((item: any) => hasManagedHook(item, meta.host));
  }
  return changed;
}

function mergeCursorHooks(config: Record<string, any>, meta: JsonHookTarget, force: boolean): boolean {
  return mergeFlatHooks(config, meta, force, isCursorManagedEntry, cursorManagedEntry);
}

function mergeWindsurfHooks(config: Record<string, any>, meta: JsonHookTarget, force: boolean): boolean {
  return mergeFlatHooks(config, meta, force, isWindsurfManagedEntry, windsurfManagedEntry);
}

function mergeFlatHooks(config: Record<string, any>, meta: JsonHookTarget, force: boolean, isManaged: (e: any) => boolean, makeEntry: () => Record<string, any>): boolean {
  let changed = false;
  for (const event of meta.events) {
    const entries = Array.isArray(config[event]) ? config[event] : [];
    const cleaned = entries.filter((e: any) => !isManaged(e));
    config[event] = [...cleaned, makeEntry()];
    changed ||= force || cleaned.length !== entries.length || !entries.some(isManaged);
  }
  return changed;
}

export function unmergeManagedHooks(config: Record<string, any>, meta: JsonHookTarget): boolean {
  if (meta.schema === 'cursor') return unmergeCursorHooks(config, meta);
  if (meta.schema === 'windsurf') return unmergeWindsurfHooks(config, meta);
  if (!isObject(config.hooks)) return false;
  let changed = false;
  for (const event of meta.events) {
    const groups = Array.isArray(config.hooks[event]) ? config.hooks[event] : [];
    const cleaned = removeManagedFromGroups(groups, meta.host);
    if (cleaned.length !== groups.length || groups.some((item: any) => hasManagedHook(item, meta.host))) changed = true;
    if (cleaned.length) config.hooks[event] = cleaned;
    else delete config.hooks[event];
  }
  if (!Object.keys(config.hooks).length) delete config.hooks;
  return changed;
}

function unmergeCursorHooks(config: Record<string, any>, meta: JsonHookTarget): boolean {
  return unmergeFlatHooks(config, meta, isCursorManagedEntry);
}

function unmergeWindsurfHooks(config: Record<string, any>, meta: JsonHookTarget): boolean {
  return unmergeFlatHooks(config, meta, isWindsurfManagedEntry);
}

function unmergeFlatHooks(config: Record<string, any>, meta: JsonHookTarget, isManaged: (e: any) => boolean): boolean {
  let changed = false;
  for (const event of meta.events) {
    const entries = Array.isArray(config[event]) ? config[event] : [];
    const cleaned = entries.filter((e: any) => !isManaged(e));
    if (cleaned.length !== entries.length) changed = true;
    if (cleaned.length) config[event] = cleaned;
    else delete config[event];
  }
  return changed;
}

function removeManagedFromGroups(groups: any[], host: AgentHookHost): any[] {
  const out = [];
  for (const group of groups) {
    if (!isObject(group) || !Array.isArray(group.hooks)) {
      out.push(group);
      continue;
    }
    const hooks = group.hooks.filter((hook: any) => !isManagedHook(hook, host));
    if (hooks.length) out.push({ ...group, hooks });
  }
  return out;
}

function hasManagedHook(group: any, host: AgentHookHost): boolean {
  return isObject(group) && Array.isArray(group.hooks) && group.hooks.some((hook: any) => isManagedHook(hook, host));
}

function isManagedHook(hook: any, host: AgentHookHost): boolean {
  return isObject(hook) && hook.name === MANAGED_NAME && hook.command === managedCommand(host);
}

function managedHook(host: AgentHookHost): Record<string, any> {
  return {
    name: MANAGED_NAME,
    type: 'command',
    command: managedCommand(host),
    timeout: TIMEOUT_MS,
    description: 'Load routed Engram memory context for this session or turn.'
  };
}

function managedCommand(host: AgentHookHost): string {
  return `engram agent-hook --host ${host}`;
}

async function applyOpenCodePlugin(
  action: AgentHookAction,
  meta: PluginHookTarget,
  file: string,
  force: boolean
): Promise<AgentHookResult> {
  const existing = await readText(file);
  if (action === 'install') {
    if (existing && !force && !isGeneratedOpenCodeHookPlugin(existing)) {
      return {
        status: 'SKIPPED',
        host: meta.host,
        file,
        events: meta.events,
        reason: 'human-authored plugin exists; use --force to replace'
      };
    }
    await writeText(file, renderOpenCodeHookPlugin());
    return { status: 'UPDATED', host: meta.host, file, events: meta.events };
  }
  if (!existing) {
    return {
      status: 'SKIPPED',
      host: meta.host,
      file,
      events: meta.events,
      reason: 'plugin file not found'
    };
  }
  if (!force && !isGeneratedOpenCodeHookPlugin(existing)) {
    return {
      status: 'SKIPPED',
      host: meta.host,
      file,
      events: meta.events,
      reason: 'human-authored plugin; use --force to remove'
    };
  }
  await fs.rm(file, { force: true });
  return { status: 'REMOVED', host: meta.host, file, events: meta.events };
}

function resultRecord(result: AgentHookResult): RecordBlock {
  return {
    title: `${result.status} ${result.host}`,
    fields: [
      ...(result.file ? [['Path', result.file] as [string, string]] : []),
      ...(result.events ? [['Events', result.events.join(', ')] as [string, string]] : []),
      ...(result.reason ? [['Reason', result.reason] as [string, string]] : [])
    ]
  };
}

function isCursorManagedEntry(entry: any): boolean {
  return isObject(entry) && entry.name === MANAGED_NAME && typeof entry.command === 'string' && entry.command.includes(managedCommand('cursor'));
}

function cursorManagedEntry(): Record<string, any> {
  return {
    ...managedHook('cursor'),
    description: 'Load routed Engram memory context for Cursor session start.'
  };
}

function isWindsurfManagedEntry(entry: any): boolean {
  if (!isObject(entry)) return false;
  const cmd = entry.command ?? entry.powershell ?? '';
  return cmd.includes(managedCommand('windsurf'));
}

function windsurfManagedEntry(): Record<string, any> {
  const entry: Record<string, any> = {
    command: managedCommand('windsurf'),
    timeout: TIMEOUT_MS
  };
  if (process.platform === 'win32') {
    entry.powershell = managedCommand('windsurf');
  }
  return entry;
}

function isObject(value: unknown): value is Record<string, any> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
