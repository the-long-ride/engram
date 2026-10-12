/** Runtime entrypoint for AI-agent hook context injection. */
import path from 'node:path';
import { loadForAgentWithContext } from '../../commands/read.js';
import type { AgentLoad } from '../../commands/read.js';
import { getContext } from '../memory/context.js';
import type { EngramContext } from '../memory/context.js';
import { PATH_TRIGGER_LIMIT, loadForPaths, toolPaths } from '../memory/path-triggers.js';
import { exists, readJson, readText } from '../system/fsx.js';
import { recordUsage } from '../memory/usage.js';
import { readSession, writeSession } from './hook-session.js';
import { loadConfig, pathRulesMode, workspaceRoot, scopeRootsForConfig } from '../runtime/config.js';
import { DEFAULT_MAX_TOKENS } from '../runtime/load-limit.js';
import { ingestTranscript } from '../transcripts/ingest.js';
import type { TranscriptIngestOptions } from '../transcripts/types.js';
import { planHookTurn, proofOnlyOutput, skippedProof, setSignature } from './hook-turn.js';
import { sha256 } from '../safety/hash.js';
import type { HookTurn, HookTurnOptions } from './hook-turn.js';
import { CAP_REPLANS, REPLAN_MARGIN, hookCap, hookSize, plannerTokensFor } from './hook-caps.js';
import type { AgentHookHost } from './agent-hooks.js';
import { adapterCapabilities } from './capabilities.js';
import { globalAgentHome } from './agent-paths.js';
import { nativeRuleKeys, parseNativeRuleMarker } from './native-rules.js';
import { recordSessionEnd } from './session-end.js';

type HookPayload = Record<string, any>;
type OpenCodeHookAction = 'replace' | 'retain' | 'clear';

function hostOutput(
  host: AgentHookHost,
  output: Record<string, any>,
  action: OpenCodeHookAction
): Record<string, any> {
  // Codex does not list suppressOutput for SubagentStart, so the field is dropped there.
  if (host === 'codex' && output?.hookSpecificOutput?.hookEventName === 'SubagentStart') {
    const { suppressOutput: _omitted, ...rest } = output;
    return rest;
  }
  if (host === 'opencode') return { ...output, engramHook: { action } };
  if (host === 'cursor') {
    const additional_context = output?.hookSpecificOutput?.additionalContext ?? '';
    return { additional_context };
  }
  if (host === 'windsurf') {
    const proofText = output?.hookSpecificOutput?.additionalContext ?? '';
    if (!proofText) return {};
    return { proof: proofText };
  }
  return output;
}

/** Run the hook and return stdout JSON. Errors fail open with an empty object. */
export async function runAgentHook(host: AgentHookHost, rawInput: string): Promise<string> {
  try {
    const payload = JSON.parse(rawInput || '{}') as HookPayload;
    const cwd = payloadCwd(payload);
    // Opt-in SessionEnd: queue the transcript path for `observe --queue`; never injects.
    if (eventName(payload) === 'SessionEnd') {
      await recordSessionEnd(host, payload, cwd);
      return '{}';
    }
    try {
      await maybeIngestTranscript(host, payload, cwd);
    } catch {
      // Transcript capture is optional; a persistence failure must not suppress retrieval context.
    }
    const output = await computeHookOutput(host, payload, cwd);
    return JSON.stringify(output);
  } catch {
    return '{}';
  }
}

/** Opt-in hook bridge: transcript capture is disabled unless an explicit local file enables it. */
async function maybeIngestTranscript(host: AgentHookHost, payload: HookPayload, cwd: string): Promise<void> {
  const configFile = path.join(cwd, '.agents', 'engram.transcripts.json');
  if (!(await exists(configFile))) return;
  const options = await readJson<TranscriptIngestOptions & { scope?: 'workspace' | 'global'; hosts?: string[] }>(configFile, { enabled: false });
  if (options.enabled !== true || (Array.isArray(options.hosts) && !options.hosts.includes(host))) return;
  if (!adapterCapabilities(host)[0]?.transcript_events) return;
  const config = await loadConfig(cwd);
  const roots = scopeRootsForConfig(cwd, config);
  const root = options.scope === 'global' ? roots.global : roots.workspace;
  if (!root) return;
  const event = eventName(payload);
  const text = queryText(payload, event);
  if (!text || text === 'current task' || isContextStart(event)) return;
  await ingestTranscript(root, {
    text,
    host,
    session_id: baseSessionId(payload),
    turn_id: numericTurnId(payload),
    speaker: 'user',
    event_time: payloadEventTime(payload),
    source: 'agent-hook',
    trust_level: 'human',
    sensitivity: options.sensitivity ?? 'private',
    retention: options.retention ?? '30d'
  }, options);
}

function isSessionStart(event: string): boolean {
  return event === 'SessionStart' || event === 'sessionStart';
}

/** Events that open a fresh context window: a session, or a subagent (Claude/Codex `SubagentStart`). */
function isContextStart(event: string): boolean {
  return isSessionStart(event) || event === 'SubagentStart';
}

/** Claude/Codex fire `PreCompact`; Gemini CLI fires `PreCompress` before it summarizes history. */
function isCompaction(event: string): boolean {
  return event === 'PreCompact' || event === 'PreCompress';
}

async function computeHookOutput(host: AgentHookHost, payload: HookPayload, cwd: string): Promise<Record<string, any>> {
  const event = eventName(payload);
  if (!isEligibleEvent(host, event)) return {};
  const key = cacheKey(host, cwd, deliveredSessionId(payload));
  // A new session or subagent, or a compaction (Claude/Codex PreCompact, Gemini PreCompress), drops earlier injections
  // from the transcript, so the delivered set starts over. Only an existing record is rewritten, so a reset never creates cache
  // files in an unused workspace.
  // A SubagentStart without `agent_id` shares the parent's key: it neither resets nor reads nor writes the parent's set.
  const sharedSubagent = event === 'SubagentStart' && !agentId(payload);
  if ((isContextStart(event) || isCompaction(event)) && !sharedSubagent && (await deliveredKeys(cwd, key)).length) await saveDelivered(cwd, key, []);
  if (isCompaction(event)) return {};
  if (event === 'InstructionsLoaded') return instructionsLoadedOutput(host, payload, cwd, key);
  if (event === 'PreToolUse' || event === 'AfterTool') return pathTriggerOutput(host, payload, cwd, key, event);
  const config = await loadConfig(cwd);
  const configMode = config.read;
  const proofMode = config.proof;
  if (configMode === 'manual') {
    return hostOutput(host, proofOnlyOutput(event, proofMode, skippedProof(configMode, 'manual')), 'clear');
  }
  if (configMode === 'off') {
    return hostOutput(host, proofOnlyOutput(event, proofMode, skippedProof(configMode, 'off')), 'clear');
  }
  if (configMode === 'startup' && !isContextStart(event)) {
    return hostOutput(host, proofOnlyOutput(event, proofMode, skippedProof(configMode, 'startup-only')), 'retain');
  }

  const query = queryText(payload, event);
  // Windsurf only shows proof; it never receives bodies, so it has no delivered set.
  const proofOnly = host === 'windsurf';
  // OpenCode keeps one system-prompt slot that each `replace` overwrites, so it always gets the full routed set.
  const replacesSlot = host === 'opencode';
  const stored = proofOnly || sharedSubagent ? [] : await deliveredKeys(cwd, key);
  // `read: always` re-injects every eligible body each prompt, so it ignores (but keeps) the delivered set.
  const previous = configMode === 'always' ? [] : stored;
  // Delivered bodies keep their expansion slots, so a repeated prompt never promotes its former cards.
  const held = replacesSlot ? [] : previous;
  // The cap loop runs before any saveDelivered/recordUsage, so both record only what is actually sent.
  const { load, turn } = await planCappedTurn(host, await getContext(cwd), event, query, held, previous, { proofMode, readMode: configMode, proofOnly });
  if (turn.empty) return hostOutput(host, turn.output, 'retain');
  if (!proofOnly && !turn.reused) {
    if (!sharedSubagent) await saveDelivered(cwd, key, replacesSlot ? load.bodyKeys : [...stored, ...turn.fresh]);
    await recordUsage(workspaceRoot(cwd), turn.fresh, 'injected');
  } else if (!proofOnly && !sharedSubagent) {
    await saveDelivered(cwd, key, stored);
  }
  return hostOutput(host, turn.output, turn.reused ? 'retain' : 'replace');
}

/**
 * E9: plan one turn, then re-plan with a smaller budget until the rendered `additionalContext` fits the host cap.
 * Bodies demote to cards through the tiered planner, so no body is ever cut. If the text is still over, only the
 * `already loaded:` line shrinks; the last resort is the proof-only payload.
 */
async function planCappedTurn(
  host: AgentHookHost, ctx: EngramContext, event: string, query: string, held: string[], previous: string[], opts: HookTurnOptions
): Promise<{ load: AgentLoad; turn: HookTurn }> {
  const maxTokens = ctx.config.load.max_tokens ?? DEFAULT_MAX_TOKENS;
  const cap = hookCap(host, maxTokens);
  const over = (turn: HookTurn) => hookSize(turn.additionalContext, cap) - cap.max;
  const plan = async (budgetTokens: number) => {
    const load = await loadForAgentWithContext(ctx, query, { budgetTokens, ...(held.length ? { deliveredKeys: held } : {}) });
    return { load, turn: planHookTurn(event, load, previous, opts) };
  };
  let budget = Math.min(maxTokens, plannerTokensFor(cap, cap.max));
  let planned = await plan(budget);
  for (let i = 0; i < CAP_REPLANS && over(planned.turn) > 0 && budget > 0; i += 1) {
    budget = Math.max(0, budget - plannerTokensFor(cap, over(planned.turn)) - REPLAN_MARGIN);
    planned = await plan(budget);
  }
  if (over(planned.turn) <= 0) return planned;
  const { load } = planned;
  for (let keep = load.alreadyLoaded.length - 1; keep >= 0; keep -= 1) {
    const turn = planHookTurn(event, load, previous, { ...opts, alreadyLoadedLimit: keep });
    if (over(turn) <= 0) return { load, turn };
  }
  return { load, turn: planHookTurn(event, load, previous, { ...opts, proofOnly: true, alreadyLoadedLimit: 0 }) };
}

/**
 * E13: Claude loaded an Engram native rule by path glob; mark it delivered and count it. The host discards the output
 * of this async event, so it is always `{}`.
 */
async function instructionsLoadedOutput(host: AgentHookHost, payload: HookPayload, cwd: string, key: string): Promise<Record<string, any>> {
  if (host !== 'claude' || payload.load_reason !== 'path_glob_match' || typeof payload.file_path !== 'string' || !payload.file_path) return {};
  const file = path.resolve(cwd, payload.file_path);
  if (!isNativeRuleFile(file)) return {};
  const marker = parseNativeRuleMarker(await readText(file));
  if (!marker) return {};
  const previous = await deliveredKeys(cwd, key);
  if (previous.includes(marker.key)) return {};
  await saveDelivered(cwd, key, [...previous, marker.key]);
  await recordUsage(workspaceRoot(cwd), [marker.key], 'injected');
  return {};
}

/** A `.md` file directly inside a `.claude/rules/engram` folder (project or user level); case-insensitive on win32. */
function isNativeRuleFile(file: string): boolean {
  const fold = (text: string) => (process.platform === 'win32' ? text.toLowerCase() : text);
  const dir = fold(path.dirname(file)).split(path.sep).join('/');
  return fold(file).endsWith('.md') && dir.endsWith('/.claude/rules/engram');
}

/**
 * D9: inject undelivered memories whose `applies_to` matches the file a tool is about to touch (Claude/Codex `PreToolUse`)
 * or has just touched (Gemini `AfterTool`, appended to the tool result).
 * The output only adds context; it never carries a permission decision, so the tool call always proceeds.
 */
async function pathTriggerOutput(
  host: AgentHookHost, payload: HookPayload, cwd: string, key: string, event: 'PreToolUse' | 'AfterTool'
): Promise<Record<string, any>> {
  const relPaths = toolPaths(String(payload.tool_name ?? ''), payload.tool_input, cwd);
  if (!relPaths.length) return {};
  // Path triggers follow per-turn loading; startup, manual, and off modes stay silent on tool calls.
  // The config check runs before the index load so silent modes stay cheap on every tool call.
  const config = await loadConfig(cwd);
  if (!config.enabled || (config.read !== 'auto' && config.read !== 'always')) return {};
  const ctx = await getContext(cwd);
  const previous = await deliveredKeys(cwd, key);
  let skip = previous;
  const maxTokens = ctx.config.load?.max_tokens ?? DEFAULT_MAX_TOKENS;
  const cap = hookCap(host, maxTokens);
  const render = (count: number, sig: string, text: string): string => {
    const proof = ctx.config.proof === 'off' ? '' : `Engram proof: path trigger loaded ${count} new bodies for ${relPaths.join(', ')} (sig ${sig}).`;
    return [proof, `Engram path context:\n\n${text}`].filter(Boolean).join('\n\n');
  };
  // The proof and header are not planner tokens: price them at the most bodies one event can carry, then give the rest to bodies.
  const overhead = hookSize(render(PATH_TRIGGER_LIMIT, '0'.repeat(8), ''), cap);
  let budget = Math.min(maxTokens, plannerTokensFor(cap, cap.max - overhead));
  const build = async () => {
    const load = await loadForPaths(ctx, relPaths, skip, { budgetTokens: budget });
    return { load, additionalContext: render(load.bodyKeys.length, setSignature(load.bodyKeys), load.text) };
  };
  let built = await build();
  // Claude attaches Engram rule files natively; a leftover PreToolUse (an old global install, or `path_rules: hook` with stale
  // rule files) must not inject the same bodies a second time. The rule folders are read only when this event would inject.
  if (built.load.bodyKeys.length && host === 'claude' && pathRulesMode(config) === 'native') {
    const nativeKeys = new Set([...await nativeRuleKeys(cwd, 'claude'), ...await nativeRuleKeys(globalAgentHome(), 'claude')]);
    if (built.load.bodyKeys.some((item) => nativeKeys.has(item))) {
      skip = [...previous, ...nativeKeys];
      built = await build();
    }
  }
  const over = () => hookSize(built.additionalContext, cap) - cap.max;
  for (let i = 0; i < CAP_REPLANS && built.load.bodyKeys.length && over() > 0 && budget > 0; i += 1) {
    budget = Math.max(0, budget - plannerTokensFor(cap, over()) - REPLAN_MARGIN);
    built = await build();
  }
  const { load, additionalContext } = built;
  // A body is never cut: if nothing fits whole, the event stays silent and nothing is recorded as delivered.
  if (!load.bodyKeys.length || over() > 0) return {};
  await saveDelivered(cwd, key, [...previous, ...load.bodyKeys]);
  await recordUsage(workspaceRoot(cwd), load.bodyKeys, 'injected');
  const output: Record<string, any> = { hookSpecificOutput: { hookEventName: event, additionalContext } };
  // Codex marks a PreToolUse hook that sets suppressOutput as failed.
  if (host === 'claude') output.suppressOutput = true;
  return output;
}

function eventName(payload: HookPayload): string {
  return String(payload.hook_event_name ?? payload.hookEventName ?? payload.event ?? payload.agent_action_name ?? '');
}

function payloadCwd(payload: HookPayload): string {
  const found = String(payload.cwd ?? process.env.CURSOR_PROJECT_DIR ?? process.env.GEMINI_CWD ?? process.env.CLAUDE_PROJECT_DIR ?? process.cwd());
  return path.resolve(found || process.cwd());
}

function baseSessionId(payload: HookPayload): string {
  return String(payload.session_id ?? payload.sessionId ?? payload.conversation_id ?? payload.trajectory_id ?? process.env.GEMINI_SESSION_ID ?? 'default');
}

/** Delivered-set id. Subagent hooks carry the parent `session_id`, so a present `agent_id` scopes the set to that subagent. */
function deliveredSessionId(payload: HookPayload): string {
  const base = baseSessionId(payload);
  const agent = agentId(payload);
  return agent ? `${base}#agent:${agent}` : base;
}

/** The subagent id a hook payload carries, or '' for the main session. */
function agentId(payload: HookPayload): string {
  return typeof payload.agent_id === 'string' ? payload.agent_id.trim() : '';
}

function numericTurnId(payload: HookPayload): number | undefined {
  const value = Number(payload.turn_id ?? payload.turnId ?? payload.message_index);
  return Number.isInteger(value) && value >= 0 ? value : undefined;
}

function payloadEventTime(payload: HookPayload): string | undefined {
  const value = payload.event_time ?? payload.timestamp ?? payload.created_at;
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

/** Routed query text for a hook event; SessionStart and SubagentStart are the literal `current session`. */
export function queryText(payload: HookPayload, event: string): string {
  if (isContextStart(event)) return 'current session';
  const windsurfPrompt = payload.tool_info?.user_prompt;
  return String(payload.prompt ?? payload.user_prompt ?? windsurfPrompt ?? payload.message ?? 'current task').trim() || 'current task';
}

function isEligibleEvent(host: AgentHookHost, event: string): boolean {
  if (event === 'SessionStart' || event === 'sessionStart') return true;
  if (host === 'gemini') return event === 'BeforeAgent' || event === 'PreCompress' || event === 'AfterTool';
  if (host === 'cursor') return event === 'sessionStart';
  if (host === 'windsurf') return event === 'pre_user_prompt';
  if (event === 'SubagentStart') return host === 'claude' || host === 'codex';
  if (event === 'PreToolUse') return host === 'claude' || host === 'codex';
  if (event === 'InstructionsLoaded') return host === 'claude';
  return event === 'UserPromptSubmit' || event === 'PreCompact';
}

/** Delivered keys for a session; a cache that cannot be read means nothing was delivered (fail open). */
async function deliveredKeys(cwd: string, key: string): Promise<string[]> {
  try {
    return (await readSession(cwd, key)).delivered;
  } catch {
    return [];
  }
}

/** Persist the delivered set; a write failure must not suppress this turn's context. */
async function saveDelivered(cwd: string, key: string, delivered: string[]): Promise<void> {
  try {
    await writeSession(cwd, key, delivered);
  } catch {
    // The next turn re-injects, which is the safe direction.
  }
}

function cacheKey(host: AgentHookHost, cwd: string, session: string): string {
  return `${host}:${sha256(path.resolve(cwd))}:${session}`;
}
