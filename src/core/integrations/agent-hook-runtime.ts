/** Runtime entrypoint for AI-agent hook context injection. */
import path from 'node:path';
import { createHash } from 'node:crypto';
import { cmdLoad } from '../../commands/read.js';
import { readJson, writeJson } from '../system/fsx.js';
import { loadConfig, workspaceRoot } from '../runtime/config.js';
import type { AgentHookHost } from './agent-hooks.js';

type HookPayload = Record<string, any>;
type HookCache = {
  records: Record<string, {
    host: AgentHookHost;
    cwd: string;
    sessionId: string;
    promptHash: string;
    routedSignature: string;
  }>;
};

const CACHE_FILE = 'agent-hook-cache.json';

/** Run the hook and return stdout JSON. Errors fail open with an empty object. */
export async function runAgentHook(host: AgentHookHost, rawInput: string): Promise<string> {
  try {
    const payload = JSON.parse(rawInput || '{}') as HookPayload;
    const cwd = payloadCwd(payload);
    const output = await computeHookOutput(host, payload, cwd);
    return JSON.stringify(output);
  } catch {
    return '{}';
  }
}

async function computeHookOutput(host: AgentHookHost, payload: HookPayload, cwd: string): Promise<Record<string, any>> {
  const event = eventName(payload);
  if (!isEligibleEvent(host, event)) return {};
  const configMode = (await loadConfig(cwd)).read;
  if (configMode === 'manual' || configMode === 'off') return {};
  if (configMode === 'startup' && event !== 'SessionStart') return {};

  const query = queryText(payload, event);
  const context = await cmdLoad([query], {});
  if (!context.trim()) return {};

  const signature = sha256(context);
  const cache = await readCache(cwd);
  const key = cacheKey(host, cwd, sessionId(payload));
  const previous = cache.records[key];
  const shouldInject = configMode === 'always'
    || event === 'SessionStart'
    || !previous
    || previous.routedSignature !== signature;
  cache.records[key] = {
    host,
    cwd,
    sessionId: sessionId(payload),
    promptHash: sha256(query),
    routedSignature: signature
  };
  await writeCache(cwd, cache);
  return shouldInject ? contextOutput(event, context) : {};
}

function contextOutput(event: string, context: string): Record<string, any> {
  return {
    hookSpecificOutput: {
      hookEventName: event,
      additionalContext: `Engram auto-loaded context:\n\n${context}`
    },
    suppressOutput: true
  };
}

function eventName(payload: HookPayload): string {
  return String(payload.hook_event_name ?? payload.hookEventName ?? payload.event ?? '');
}

function payloadCwd(payload: HookPayload): string {
  const found = String(payload.cwd ?? process.env.GEMINI_CWD ?? process.env.CLAUDE_PROJECT_DIR ?? process.cwd());
  return path.resolve(found || process.cwd());
}

function sessionId(payload: HookPayload): string {
  return String(payload.session_id ?? payload.sessionId ?? process.env.GEMINI_SESSION_ID ?? 'default');
}

function queryText(payload: HookPayload, event: string): string {
  if (event === 'SessionStart') return `session start ${String(payload.source ?? '')}`.trim();
  return String(payload.prompt ?? payload.user_prompt ?? payload.message ?? 'current task').trim() || 'current task';
}

function isEligibleEvent(host: AgentHookHost, event: string): boolean {
  if (event === 'SessionStart') return true;
  if (host === 'gemini') return event === 'BeforeAgent';
  return event === 'UserPromptSubmit';
}

async function readCache(cwd: string): Promise<HookCache> {
  const cache = await readJson<Partial<HookCache>>(path.join(workspaceRoot(cwd), CACHE_FILE), {});
  return { records: isObject(cache.records) ? cache.records as HookCache['records'] : {} };
}

async function writeCache(cwd: string, cache: HookCache): Promise<void> {
  await writeJson(path.join(workspaceRoot(cwd), CACHE_FILE), cache);
}

function cacheKey(host: AgentHookHost, cwd: string, session: string): string {
  return `${host}:${sha256(path.resolve(cwd))}:${session}`;
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function isObject(value: unknown): value is Record<string, any> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
