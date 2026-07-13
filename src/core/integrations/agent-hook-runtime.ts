/** Runtime entrypoint for AI-agent hook context injection. */
import path from 'node:path';
import { createHash } from 'node:crypto';
import { cmdLoad } from '../../commands/read.js';
import { exists, readJson, writeJson } from '../system/fsx.js';
import { loadConfig, workspaceRoot, scopeRootsForConfig } from '../runtime/config.js';
import { ingestTranscript } from '../transcripts/ingest.js';
import type { TranscriptIngestOptions } from '../transcripts/types.js';
import type { EngramConfig } from '../runtime/types.js';
import type { AgentHookHost } from './agent-hooks.js';
import { adapterCapabilities } from './capabilities.js';

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
type HookProofMode = EngramConfig['proof'];
type HookReadMode = EngramConfig['read'];
type HookDecision = 'loaded' | 'reused' | 'skipped';
type HookSkipReason = 'manual' | 'off' | 'startup-only' | 'no-context';
type HookProof = {
  mode: HookProofMode;
  decision: HookDecision;
  readMode: HookReadMode;
  selectedCount: number;
  relatedCount: number;
  signature: string;
  reason?: HookSkipReason;
};

type OpenCodeHookAction = 'replace' | 'retain' | 'clear';

function hostOutput(
  host: AgentHookHost,
  output: Record<string, any>,
  action: OpenCodeHookAction
): Record<string, any> {
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

const CACHE_FILE = 'agent-hook-cache.json';

/** Run the hook and return stdout JSON. Errors fail open with an empty object. */
export async function runAgentHook(host: AgentHookHost, rawInput: string): Promise<string> {
  try {
    const payload = JSON.parse(rawInput || '{}') as HookPayload;
    const cwd = payloadCwd(payload);
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
  if (!text || text === 'current task' || isSessionStart(event)) return;
  await ingestTranscript(root, { text, host, session_id: sessionId(payload) }, options);
}

function isSessionStart(event: string): boolean {
  return event === 'SessionStart' || event === 'sessionStart';
}

async function computeHookOutput(host: AgentHookHost, payload: HookPayload, cwd: string): Promise<Record<string, any>> {
  const event = eventName(payload);
  if (!isEligibleEvent(host, event)) return {};
  const config = await loadConfig(cwd);
  const configMode = config.read;
  const proofMode = config.proof;
  if (configMode === 'manual') {
    return hostOutput(host, proofOnlyOutput(event, proofMode, skippedProof(configMode, 'manual')), 'clear');
  }
  if (configMode === 'off') {
    return hostOutput(host, proofOnlyOutput(event, proofMode, skippedProof(configMode, 'off')), 'clear');
  }
  if (configMode === 'startup' && !isSessionStart(event)) {
    return hostOutput(host, proofOnlyOutput(event, proofMode, skippedProof(configMode, 'startup-only')), 'retain');
  }

  const query = queryText(payload, event);
  const context = await cmdLoad([query], {});
  if (!context.trim()) {
    return hostOutput(host, proofOnlyOutput(event, proofMode, skippedProof(configMode, 'no-context')), 'retain');
  }

  const signature = sha256(context);
  const counts = loadCounts(context);
  const cache = await readCache(cwd);
  const key = cacheKey(host, cwd, sessionId(payload));
  const previous = cache.records[key];
  const shouldInject = host === 'windsurf'
    ? false
    : configMode === 'always'
      || isSessionStart(event)
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
  const proof: HookProof = shouldInject
    ? { mode: proofMode, decision: 'loaded', readMode: configMode, selectedCount: counts.selected, relatedCount: counts.related, signature: shortSignature(signature) }
    : { mode: proofMode, decision: 'reused', readMode: configMode, selectedCount: counts.selected, relatedCount: counts.related, signature: shortSignature(signature) };
  const output = shouldInject
    ? contextOutput(event, context, proof)
    : proofOnlyOutput(event, proofMode, proof);
  return hostOutput(host, output, shouldInject ? 'replace' : 'retain');
}

function contextOutput(event: string, context: string, proof: HookProof): Record<string, any> {
  const proofText = proofBlock(proof);
  const additionalContext = proofText
    ? `${proofText}\n\nEngram auto-loaded context:\n\n${context}`
    : `Engram auto-loaded context:\n\n${context}`;
  return {
    hookSpecificOutput: {
      hookEventName: event,
      additionalContext
    },
    suppressOutput: true
  };
}

function proofOnlyOutput(event: string, proofMode: HookProofMode, proof: HookProof): Record<string, any> {
  const proofText = proofMode === 'off' ? '' : proofBlock(proof);
  if (!proofText) return {};
  return {
    hookSpecificOutput: {
      hookEventName: event,
      additionalContext: proofText
    },
    suppressOutput: true
  };
}

function eventName(payload: HookPayload): string {
  return String(payload.hook_event_name ?? payload.hookEventName ?? payload.event ?? payload.agent_action_name ?? '');
}

function payloadCwd(payload: HookPayload): string {
  const found = String(payload.cwd ?? process.env.CURSOR_PROJECT_DIR ?? process.env.GEMINI_CWD ?? process.env.CLAUDE_PROJECT_DIR ?? process.cwd());
  return path.resolve(found || process.cwd());
}

function sessionId(payload: HookPayload): string {
  return String(payload.session_id ?? payload.sessionId ?? payload.conversation_id ?? payload.trajectory_id ?? process.env.GEMINI_SESSION_ID ?? 'default');
}

function queryText(payload: HookPayload, event: string): string {
  if (isSessionStart(event)) return `session start ${String(payload.source ?? '')}`.trim();
  const windsurfPrompt = payload.tool_info?.user_prompt;
  return String(payload.prompt ?? payload.user_prompt ?? windsurfPrompt ?? payload.message ?? 'current task').trim() || 'current task';
}

function isEligibleEvent(host: AgentHookHost, event: string): boolean {
  if (event === 'SessionStart' || event === 'sessionStart') return true;
  if (host === 'gemini') return event === 'BeforeAgent';
  if (host === 'cursor') return event === 'sessionStart';
  if (host === 'windsurf') return event === 'pre_user_prompt';
  return event === 'UserPromptSubmit';
}

function loadCounts(context: string): { selected: number; related: number } {
  const match = context.match(/engram:\s+loaded\s+(\d+)\s+memory files\s+\/\s+(\d+)\s+total related memories/i);
  return {
    selected: Number(match?.[1] ?? 0),
    related: Number(match?.[2] ?? 0)
  };
}

function skippedProof(readMode: HookReadMode, reason: HookSkipReason): HookProof {
  return {
    mode: 'compact',
    decision: 'skipped',
    readMode,
    selectedCount: 0,
    relatedCount: 0,
    signature: '-',
    reason
  };
}

function proofBlock(proof: HookProof): string {
  if (proof.mode === 'off') return '';
  return proofLine(proof);
}

function proofLine(proof: HookProof): string {
  if (proof.decision === 'loaded') {
    return `Engram proof: loaded ${proof.selectedCount}/${proof.relatedCount} via hook ${proof.readMode} (sig ${proof.signature}).`;
  }
  if (proof.decision === 'reused') {
    return `Engram proof: reused prior Engram context; ${proof.selectedCount}/${proof.relatedCount}, routed signature unchanged (sig ${proof.signature}).`;
  }
  switch (proof.reason) {
    case 'manual':
      return 'Engram proof: no Engram load this turn (read mode manual).';
    case 'off':
      return 'Engram proof: no Engram load this turn (read mode off).';
    case 'startup-only':
      return 'Engram proof: no Engram load this turn (startup mode only injects on SessionStart).';
    default:
      return 'Engram proof: no Engram load this turn (0/0 routed memories).';
  }
}

function shortSignature(value: string): string {
  return value.slice(0, 8);
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
