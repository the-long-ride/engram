/** Agent hook adapter metadata and managed JSON merge helpers. */
import path from 'node:path';
import fs from 'node:fs/promises';
import { formatRecords, type RecordBlock } from '../cli/format.js';
import { globalAgentHome, globalOpenCodeConfigHome } from './agent-paths.js';
import {
  isGeneratedOpenCodeHookPlugin,
  renderOpenCodeHookPlugin
} from './opencode-hook-plugin.js';
import { exists, parseJsonLike, readJson, readText, writeJson, writeText } from '../system/fsx.js';
import { loadConfig, pathRulesMode } from '../runtime/config.js';
import type { PathRulesMode } from '../runtime/types.js';

export type AgentHookHost = 'codex' | 'claude' | 'gemini' | 'opencode' | 'cursor' | 'windsurf';
export type AgentHookAction = 'install' | 'uninstall';

type JsonHookTarget = {
  kind: 'json';
  host: Exclude<AgentHookHost, 'opencode'>;
  configFile: string;
  globalFile: () => string;
  events: string[];
  /** Events an earlier Engram version registered: merge strips them; uninstall and detection still recognise them. */
  retiredEvents?: string[];
  /** Opt-in events: never registered by default or by upgrade, but uninstall and detection still recognise them. */
  optionalEvents?: string[];
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

export type AgentHookUpgradePreview = { host: AgentHookHost; file: string; current: string; expected: string; safe: boolean; reason?: string };

const MANAGED_NAME = 'engram-auto-load';
const TIMEOUT_MS = 10000;
/**
 * Claude Code, Codex, and Cursor read the hook `timeout` in seconds:
 * https://code.claude.com/docs/en/hooks, https://developers.openai.com/codex/hooks, https://cursor.com/docs/agent/hooks
 */
const TIMEOUT_SECONDS = 10;
const SECONDS_TIMEOUT_HOSTS = new Set<AgentHookHost>(['claude', 'codex', 'cursor']);
const UNPARSEABLE_REASON = 'could not parse existing file; left untouched';
const PATH_TOOL_MATCHER = 'Read|Edit|Write|MultiEdit';
/** Gemini AfterTool matcher (a regex over the tool name; anchoring is undocumented, so the runtime filters exact names). */
const GEMINI_PATH_TOOL_MATCHER = 'read_file|write_file|replace';
/** InstructionsLoaded matches on load reason; Engram only needs the rules Claude attached by path glob. */
const NATIVE_RULES_MATCHER = 'path_glob_match';
/** Opt-in SessionEnd (`link --session-end`): the hook only queues the transcript path, so it gets a short budget in seconds. */
const SESSION_END_EVENT = 'SessionEnd';
const SESSION_END_TIMEOUT_SECONDS: Partial<Record<AgentHookHost, number>> = { claude: 5, codex: 3 };

const TARGETS: Record<AgentHookHost, HookTarget> = {
  codex: {
    kind: 'json',
    host: 'codex',
    configFile: path.join('.codex', 'hooks.json'),
    globalFile: () => path.join(globalAgentHome(), '.codex', 'hooks.json'),
    events: ['SessionStart', 'UserPromptSubmit', 'PreToolUse', 'PreCompact', 'SubagentStart'],
    optionalEvents: [SESSION_END_EVENT],
    schema: 'claude-codex'
  },
  claude: {
    kind: 'json',
    host: 'claude',
    configFile: path.join('.claude', 'settings.json'),
    globalFile: () => path.join(globalAgentHome(), '.claude', 'settings.json'),
    events: ['SessionStart', 'UserPromptSubmit', 'PreToolUse', 'PreCompact', 'SubagentStart'],
    optionalEvents: [SESSION_END_EVENT],
    schema: 'claude-codex'
  },
  gemini: {
    kind: 'json',
    host: 'gemini',
    configFile: path.join('.gemini', 'settings.json'),
    globalFile: () => path.join(globalAgentHome(), '.gemini', 'settings.json'),
    events: ['SessionStart', 'BeforeAgent', 'AfterTool', 'PreCompress'],
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
    globalFile: () => path.join(globalOpenCodeConfigHome(), 'plugins', 'engram.js'),
    events: ['chat.message', 'experimental.chat.system.transform']
  }
};

const UNSUPPORTED: Record<string, string> = {
  copilot: 'partial hook support: sessionStart can inject context, but userPromptSubmitted does not provide prompt-time context injection; use Engram skillset/manual load in v1',
  cline: 'plugin-based hook support is real, but install UX is not file-first; use Engram skillset/manual load in v1'
};

/** E13: Claude swaps PreToolUse for InstructionsLoaded under native path rules; every other host is static. */
function targetFor(host: AgentHookHost, pathRules: PathRulesMode, sessionEnd = false): HookTarget {
  let meta = TARGETS[host];
  if (meta.kind !== 'json') return meta;
  if (host === 'claude') {
    const base = meta.events.filter((event) => event !== 'PreToolUse' && event !== 'InstructionsLoaded');
    meta = pathRules === 'native'
      ? { ...meta, events: [...base.slice(0, 2), 'InstructionsLoaded', ...base.slice(2)], retiredEvents: ['PreToolUse'] }
      : { ...meta, events: [...base.slice(0, 2), 'PreToolUse', ...base.slice(2)], retiredEvents: ['InstructionsLoaded'] };
  }
  // Opt-in only: an install without the flag leaves an existing managed SessionEnd entry as it is.
  return sessionEnd && meta.optionalEvents?.includes(SESSION_END_EVENT) ? { ...meta, events: [...meta.events, SESSION_END_EVENT] } : meta;
}

const knownEvents = (meta: JsonHookTarget): string[] => [...new Set([...meta.events, ...(meta.retiredEvents ?? []), ...(meta.optionalEvents ?? [])])];

/** The configured `hooks.path_rules` mode; an unreadable config reads as the default (`native`). */
async function resolvePathRules(options: { cwd?: string; pathRules?: PathRulesMode }): Promise<PathRulesMode> {
  if (options.pathRules) return options.pathRules;
  try {
    return pathRulesMode(await loadConfig(options.cwd ?? process.cwd()));
  } catch {
    return 'native';
  }
}

/** Install or uninstall managed Engram agent hooks for one target or all known targets. */
export async function applyAgentHookAction(action: AgentHookAction, targetArg = 'all', options: { global?: boolean; plan?: boolean; force?: boolean; cwd?: string; pathRules?: PathRulesMode; sessionEnd?: boolean } = {}): Promise<string> {
  const results: AgentHookResult[] = [];
  const pathRules = await resolvePathRules(options);
  for (const target of expandTargets(targetArg)) {
    const normalized = normalizeTarget(target);
    if (typeof normalized !== 'string') {
      results.push({ status: 'SKIPPED', host: normalized.target, reason: normalized.reason });
      continue;
    }
    const meta = targetFor(normalized, pathRules, action === 'install' && Boolean(options.sessionEnd));
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
    const config = await readHookConfig(file);
    if (!config) {
      results.push({ status: 'SKIPPED', host: meta.host, file, events: meta.events, reason: UNPARSEABLE_REASON });
      continue;
    }
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

export async function refreshInstalledAgentHooks(targetArg = 'all', options: { global?: boolean; plan?: boolean; force?: boolean; cwd?: string; installMissing?: boolean; pathRules?: PathRulesMode } = {}): Promise<AgentHookResult[]> {
  const results: AgentHookResult[] = [];
  const pathRules = await resolvePathRules(options);
  for (const target of expandTargets(targetArg)) {
    const normalized = normalizeTarget(target);
    if (typeof normalized !== 'string') continue;
    const meta = targetFor(normalized, pathRules);
    const file = options.global
      ? meta.globalFile()
      : path.join(options.cwd ?? process.cwd(), meta.configFile);
    if (!options.installMissing && !(await hasManagedHookInstall(meta, file))) continue;
    if (options.plan) {
      results.push({ status: 'PLAN', host: meta.host, file, events: meta.events });
      continue;
    }
    if (meta.kind === 'plugin') {
      results.push(await applyOpenCodePlugin('install', meta, file, Boolean(options.force)));
      continue;
    }
    const config = await readHookConfig(file);
    if (!config) {
      results.push({ status: 'SKIPPED', host: meta.host, file, events: meta.events, reason: UNPARSEABLE_REASON });
      continue;
    }
    mergeManagedHooks(config, meta, Boolean(options.force));
    await writeJson(file, config);
    results.push({ status: 'UPDATED', host: meta.host, file, events: meta.events });
  }
  return results;
}

/** Preview installed Engram hooks without writing files. Mixed user hook configs become conflicts. */
export async function previewInstalledAgentHooks(options: { global?: boolean; cwd?: string; pathRules?: PathRulesMode } = {}): Promise<AgentHookUpgradePreview[]> {
  const out: AgentHookUpgradePreview[] = [];
  const pathRules = await resolvePathRules(options);
  for (const host of Object.keys(TARGETS) as AgentHookHost[]) {
    const meta = targetFor(host, pathRules);
    const file = options.global ? meta.globalFile() : path.join(options.cwd ?? process.cwd(), meta.configFile);
    if (!(await exists(file))) continue;
    const current = await readText(file);
    if (meta.kind === 'plugin') {
      if (!isGeneratedOpenCodeHookPlugin(current)) continue;
      const expected = renderOpenCodeHookPlugin();
      out.push({ host, file, current, expected, safe: true });
      continue;
    }
    const currentInstall = await hasManagedHookInstall(meta, file, false);
    const staleInstall = currentInstall || await hasManagedHookInstall(meta, file, true);
    if (!staleInstall) continue;
    const config = await readJson<Record<string, any>>(file, {});
    const next = JSON.parse(JSON.stringify(config));
    mergeManagedHooks(next, meta, true);
    if (currentInstall) {
      // Hooks with Engram's name and current command are ours, so their shape (timeout, new events) refreshes
      // in place. A leftover hook with an older command makes the forced merge differ; that stays a review.
      const refreshed = JSON.parse(JSON.stringify(config));
      mergeManagedHooks(refreshed, meta, false);
      if (JSON.stringify(refreshed) === JSON.stringify(next)) {
        const expected = JSON.stringify(refreshed) === JSON.stringify(config) ? current : `${JSON.stringify(refreshed, null, 2)}\n`;
        out.push({ host, file, current, expected, safe: true });
        continue;
      }
    }
    const safe = hasOnlyManagedHookContent(config, meta);
    out.push({
      host,
      file,
      current,
      expected: `${JSON.stringify(next, null, 2)}\n`,
      safe,
      reason: safe ? undefined : 'stale Engram hook shares a user-authored hook config; review required'
    });
  }
  return out;
}

/**
 * A host hook config to merge into: `{}` for a missing or empty file, `undefined` when existing content does not parse
 * as a JSON object. Callers never write over such a file, so a typo in a user's settings never loses their config.
 */
async function readHookConfig(file: string): Promise<Record<string, any> | undefined> {
  let text: string;
  try {
    text = await fs.readFile(file, 'utf8');
  } catch (error) {
    // Only a missing file is an empty config; an unreadable one (EACCES/EBUSY) must never be overwritten.
    return (error as { code?: string }).code === 'ENOENT' ? {} : undefined;
  }
  if (!text.trim()) return {};
  try {
    const parsed = parseJsonLike<unknown>(text);
    return isObject(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function hasOnlyManagedHookContent(config: Record<string, any>, meta: JsonHookTarget): boolean {
  if (meta.schema === 'cursor') {
    const allowed = new Set(meta.events);
    if (Object.keys(config).some((key) => !allowed.has(key))) return false;
    return meta.events.every((event) => !Array.isArray(config[event]) || config[event].every((entry: any) => isCursorManagedEntry(entry, true)));
  }
  if (meta.schema === 'windsurf') {
    const allowed = new Set(meta.events);
    if (Object.keys(config).some((key) => !allowed.has(key))) return false;
    return meta.events.every((event) => !Array.isArray(config[event]) || config[event].every((entry: any) => isWindsurfManagedEntry(entry, true)));
  }
  if (Object.keys(config).some((key) => key !== 'hooks')) return false;
  if (!isObject(config.hooks)) return true;
  const allowed = new Set(knownEvents(meta));
  if (Object.keys(config.hooks).some((key) => !allowed.has(key))) return false;
  return knownEvents(meta).every((event) => {
    const groups = Array.isArray(config.hooks[event]) ? config.hooks[event] : [];
    return groups.every((group: any) => isObject(group)
      && Array.isArray(group.hooks)
      && group.hooks.every((hook: any) => isManagedHook(hook, meta.host, true)));
  });
}

export async function detectInstalledHookTargets(options: { global?: boolean; cwd?: string; includeStale?: boolean; pathRules?: PathRulesMode } = {}): Promise<AgentHookHost[]> {
  const hosts: AgentHookHost[] = [];
  const pathRules = await resolvePathRules(options);
  for (const host of Object.keys(TARGETS) as AgentHookHost[]) {
    const meta = targetFor(host, pathRules);
    const file = options.global
      ? meta.globalFile()
      : path.join(options.cwd ?? process.cwd(), meta.configFile);
    if (await hasManagedHookInstall(meta, file, Boolean(options.includeStale))) hosts.push(host);
  }
  return hosts;
}

async function hasManagedHookInstall(meta: HookTarget, file: string, force = false): Promise<boolean> {
  if (!(await exists(file))) return false;
  if (meta.kind === 'plugin') return isGeneratedOpenCodeHookPlugin(await readText(file));
  const config = await readJson<Record<string, any>>(file, {});
  if (meta.schema === 'cursor') {
    return meta.events.some((event) => Array.isArray(config[event]) && config[event].some((entry: any) => isCursorManagedEntry(entry, force)));
  }
  if (meta.schema === 'windsurf') {
    return meta.events.some((event) => Array.isArray(config[event]) && config[event].some((entry: any) => isWindsurfManagedEntry(entry, force)));
  }
  if (!isObject(config.hooks)) return false;
  return knownEvents(meta).some((event) => Array.isArray(config.hooks[event]) && config.hooks[event].some((group: any) => hasManagedHook(group, meta.host, force)));
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

/** Hook-capable hosts an install for this target covers (unsupported targets such as copilot/cline drop out). */
export function hookHostsForTarget(target: string): AgentHookHost[] {
  if (!target) return [];
  return expandTargets(target).map(normalizeTarget).filter((host): host is AgentHookHost => typeof host === 'string');
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
    const cleaned = removeManagedFromGroups(groups, meta.host, force);
    const group = {
      matcher: eventMatcher(event),
      hooks: [managedHook(meta.host, event)]
    };
    config.hooks[event] = [...cleaned, group];
    changed ||= force || cleaned.length !== groups.length || !groups.some((item: any) => hasManagedHook(item, meta.host, force));
  }
  // Events an earlier install registered (Claude's PreToolUse under native path rules) lose their managed entries.
  for (const event of meta.retiredEvents ?? []) {
    const groups = Array.isArray(config.hooks[event]) ? config.hooks[event] : [];
    const cleaned = removeManagedFromGroups(groups, meta.host, force);
    if (cleaned.length !== groups.length || groups.some((item: any) => hasManagedHook(item, meta.host, force))) changed = true;
    if (cleaned.length) config.hooks[event] = cleaned;
    else delete config.hooks[event];
  }
  return changed;
}

/**
 * Matcher per event. PreToolUse limits path triggers to file tools (Codex maps `Edit|Write` onto
 * `apply_patch`); Gemini's AfterTool limits path triggers to its file tools; PreCompact matches both `manual` and `auto` triggers; SubagentStart matches every agent type.
 * Docs: https://code.claude.com/docs/en/hooks, https://developers.openai.com/codex/hooks
 */
function eventMatcher(event: string): string {
  if (event === 'PreToolUse') return PATH_TOOL_MATCHER;
  if (event === 'InstructionsLoaded') return NATIVE_RULES_MATCHER;
  if (event === 'AfterTool') return GEMINI_PATH_TOOL_MATCHER;
  return event === 'SessionStart' || event === 'BeforeAgent' || event === 'PreCompact' || event === 'PreCompress' || event === 'SubagentStart' ? '*' : '';
}

function mergeCursorHooks(config: Record<string, any>, meta: JsonHookTarget, force: boolean): boolean {
  return mergeFlatHooks(config, meta, force, isCursorManagedEntry, cursorManagedEntry);
}

function mergeWindsurfHooks(config: Record<string, any>, meta: JsonHookTarget, force: boolean): boolean {
  return mergeFlatHooks(config, meta, force, isWindsurfManagedEntry, windsurfManagedEntry);
}

function mergeFlatHooks(config: Record<string, any>, meta: JsonHookTarget, force: boolean, isManaged: (e: any, force?: boolean) => boolean, makeEntry: () => Record<string, any>): boolean {
  let changed = false;
  for (const event of meta.events) {
    const entries = Array.isArray(config[event]) ? config[event] : [];
    const cleaned = entries.filter((e: any) => !isManaged(e, force));
    config[event] = [...cleaned, makeEntry()];
    changed ||= force || cleaned.length !== entries.length || !entries.some((e: any) => isManaged(e));
  }
  return changed;
}

export function unmergeManagedHooks(config: Record<string, any>, meta: JsonHookTarget): boolean {
  if (meta.schema === 'cursor') return unmergeCursorHooks(config, meta);
  if (meta.schema === 'windsurf') return unmergeWindsurfHooks(config, meta);
  if (!isObject(config.hooks)) return false;
  let changed = false;
  for (const event of knownEvents(meta)) {
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

function removeManagedFromGroups(groups: any[], host: AgentHookHost, force = false): any[] {
  const out = [];
  for (const group of groups) {
    if (!isObject(group) || !Array.isArray(group.hooks)) {
      out.push(group);
      continue;
    }
    const hooks = group.hooks.filter((hook: any) => !isManagedHook(hook, host, force));
    if (hooks.length) out.push({ ...group, hooks });
  }
  return out;
}

function hasManagedHook(group: any, host: AgentHookHost, force = false): boolean {
  return isObject(group) && Array.isArray(group.hooks) && group.hooks.some((hook: any) => isManagedHook(hook, host, force));
}

function isManagedHook(hook: any, host: AgentHookHost, force = false): boolean {
  return isObject(hook) && hook.name === MANAGED_NAME && (force || hook.command === managedCommand(host));
}

function managedHook(host: AgentHookHost, event = ''): Record<string, any> {
  if (event === SESSION_END_EVENT) {
    return {
      name: MANAGED_NAME,
      type: 'command',
      command: managedCommand(host),
      timeout: SESSION_END_TIMEOUT_SECONDS[host] ?? TIMEOUT_SECONDS,
      description: 'Queue this session transcript for engram observe --queue; injects nothing.'
    };
  }
  return {
    name: MANAGED_NAME,
    type: 'command',
    command: managedCommand(host),
    timeout: SECONDS_TIMEOUT_HOSTS.has(host) ? TIMEOUT_SECONDS : TIMEOUT_MS,
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

function isCursorManagedEntry(entry: any, force = false): boolean {
  return isObject(entry) && entry.name === MANAGED_NAME && typeof entry.command === 'string' && (force || entry.command.includes(managedCommand('cursor')));
}

function cursorManagedEntry(): Record<string, any> {
  return {
    ...managedHook('cursor'),
    description: 'Load routed Engram memory context for Cursor session start.'
  };
}

function isWindsurfManagedEntry(entry: any, force = false): boolean {
  if (!isObject(entry)) return false;
  const cmd = entry.command ?? entry.powershell ?? '';
  return cmd.includes(managedCommand('windsurf')) || (force && entry.name === MANAGED_NAME);
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





