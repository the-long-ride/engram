/** Minimal JSON-line MCP wrapper for Engram tools. */
// stdout carries only JSON-RPC; diagnostics go to stderr.
import { createInterface } from 'node:readline';
import { cmdSetRole, cmdSetRuleVariant } from '../commands/admin.js';
import { cmdLoad, cmdVerify, loadForAgent, renderRoute, routeData } from '../commands/read.js';
import { cmdHealth, searchMemories } from '../commands/ops.js';
import { estimateTokens } from '../core/memory/payload-plan.js';
import { parseMaxTokens } from '../core/runtime/load-limit.js';
import { getContext, type EngramContext } from '../core/memory/context.js';
import { listFlag } from '../cli/args.js';
import { previewSavePlans, type SavePreviewOptions } from '../core/memory/save-plan.js';
import { requireResolvedAuthor } from '../core/author/resolve.js';
import { describeNote, noteCandidate, noteScopes, planNote, prepareNote, renderNotePreview } from '../core/memory/working-note.js';
import { normalizeMemoryType, parseMemoryCandidate, parseMemoryCandidates, type MemoryCandidate } from '../core/memory/memory-candidate.js';
import { classifyTaskType, normalizeTaskType, type TaskType } from '../core/memory/task-classifier.js';
import { parseSaveTarget, writeScopes } from '../core/runtime/config.js';
import type { Scope } from '../core/runtime/types.js';
import { CONTRACT_VERSION } from '../core/contracts/result.js';
import { commitApprovedCandidates, planCandidates, type PlannedCandidate } from '../commands/write.js';
import { redeemToken, type SaveTarget } from './approval-tokens.js';
import { InputRequired, McpProtocolError, REDEEM_ERRORS, StructuredOutput, approve, completeModernApproval, type ToolCall } from './approval-flow.js';
import {
  RPC, SERVER_INFO, SERVER_INSTRUCTIONS, discoverResult, modernMeta, negotiateLegacy, objectOrEmpty, requestEra, rpcError, serverCapabilities, withModernFields,
  OutboundAborted, OutboundTimeout, type Era, type McpSession
} from './protocol.js';
import { ResourceNotFound, getPrompt, listResources, promptList, readResource, resourceTemplates } from './resources.js';

/** Handle one MCP-like request object; `session` carries per-process state (a fresh one means stateless, so no elicitation). `signal` aborts when the client cancels the request. */
export async function handleMcp(request: any, session: McpSession = {}, signal?: AbortSignal): Promise<any> {
  // JSON-RPC notifications (no id, e.g. notifications/cancelled) never get a response, in either era.
  if (request.id === undefined) return undefined;
  return requestEra(request) === 'modern' ? handleModern(request, session, signal) : handleLegacy(request, session, signal);
}

async function handleLegacy(request: any, session: McpSession, signal?: AbortSignal): Promise<any> {
  if (request.method === 'initialize') {
    session.legacyClientCapabilities = objectOrEmpty(request.params?.capabilities);
    return ok(request.id, initializeResult(request));
  }
  if (request.method === 'tools/list') return ok(request.id, { tools: toolDefinitions(session) });
  if (request.method === 'ping') return ok(request.id, {});
  const routed = await handleResourceOrPrompt(request, 'legacy');
  if (routed) return routed;
  const isToolCall = request.method === 'tools/call';
  const method = mcpMethod(request);
  const args = mcpArgs(request);
  try {
    // Bare `engram_*` methods are non-standard calls: they never get an approval dialog.
    const call: ToolCall = { era: 'legacy', session: isToolCall ? session : {}, signal };
    const result = await callTool(method, args, call);
    if (result !== undefined) return ok(request.id, isToolCall ? toolResult(result) : legacyResult(result));
    return fail(request.id, `Unknown tool: ${method}`);
  } catch (error: any) {
    if (isToolCall) return ok(request.id, toolResult(error.message, true));
    return fail(request.id, error.message);
  }
}

/** 2026-07-28 requests are stateless: capabilities come from `_meta`, results carry `resultType`, and errors use the modern codes. */
async function handleModern(request: any, session: McpSession, signal?: AbortSignal): Promise<any> {
  const meta = modernMeta(request);
  if ('error' in meta) return { jsonrpc: '2.0', id: request.id, error: meta.error };
  const method = String(request.method ?? '');
  if (method === 'server/discover') return ok(request.id, discoverResult());
  if (method === 'tools/list') return ok(request.id, withModernFields({ tools: toolDefinitions(session) }, method));
  if (method === 'tools/call') {
    const name = request.params?.name;
    if (typeof name !== 'string' || !TOOL_NAMES.has(name)) return rpcError(request.id, RPC.INVALID_PARAMS, `Unknown tool: ${String(name)}`);
    // inputResponses and requestState come from `params` only, never from the model-controlled `arguments`.
    const call: ToolCall = { era: 'modern', session, clientCapabilities: meta.clientCapabilities, inputResponses: request.params?.inputResponses, requestState: request.params?.requestState, signal };
    try {
      const result = await callTool(name, request.params?.arguments ?? {}, call);
      // `input_required` keeps its resultType and gets no cache hints (withModernFields).
      if (result instanceof InputRequired) return ok(request.id, withModernFields(result.result, method));
      return ok(request.id, withModernFields(toolResult(result), method));
    } catch (error: any) {
      if (error instanceof McpProtocolError) return rpcError(request.id, error.code, error.message);
      return ok(request.id, withModernFields(toolResult(error.message, true), method));
    }
  }
  const routed = await handleResourceOrPrompt(request, 'modern');
  if (routed) return routed;
  // Modern removes ping/initialize; bare `engram_*` methods are legacy-only.
  return rpcError(request.id, RPC.METHOD_NOT_FOUND, `Method not found: ${method}`);
}

/** Resource and prompt methods for both eras; `wrap` adds modern fields; not-found is -32602 (modern) or -32002 (legacy). */
async function handleResourceOrPrompt(request: any, era: Era): Promise<any | undefined> {
  const wrap = (result: any) => ok(request.id, era === 'modern' ? withModernFields(result, request.method) : result);
  try {
    switch (request.method) {
      case 'resources/list': return wrap(await listResources());
      case 'resources/templates/list': return wrap(resourceTemplates());
      case 'resources/read': {
        const uri = request.params?.uri;
        if (typeof uri !== 'string') return rpcError(request.id, RPC.INVALID_PARAMS, 'resources/read requires a string uri');
        return wrap(await readResource(uri));
      }
      case 'prompts/list': return wrap(promptList());
      case 'prompts/get': {
        const prompt = getPrompt(request.params?.name);
        return prompt ? wrap(prompt) : rpcError(request.id, RPC.INVALID_PARAMS, `Unknown prompt: ${String(request.params?.name)}`);
      }
      default: return undefined;
    }
  } catch (error: any) {
    if (error instanceof ResourceNotFound) return rpcError(request.id, era === 'modern' ? RPC.INVALID_PARAMS : RPC.LEGACY_RESOURCE_NOT_FOUND, 'Resource not found', { uri: error.uri });
    return rpcError(request.id, era === 'modern' ? RPC.INTERNAL : RPC.LEGACY_SERVER_ERROR, error.message);
  }
}

/** Bare (non tools/call) requests keep receiving the plain agent text. */
function legacyResult(result: unknown): unknown {
  return result instanceof StructuredOutput ? result.text : result;
}

async function callTool(method: string | undefined, args: any, call: ToolCall): Promise<unknown> {
  if (method === 'engram_load') return await loadTool(args);
  if (method === 'engram_route') return await routeTool(String(args.query ?? args.task ?? ''));
  if (method === 'engram_search') return await searchTool(String(args.query ?? ''));
  if (method === 'engram_verify') return await cmdVerify(args.scope);
  if (method === 'engram_set_role') return await cmdSetRole(roleArgs(args));
  if (method === 'engram_set_rule_variant') return await cmdSetRuleVariant(ruleVariantArgs(args));
  if (method === 'engram_status') return await cmdHealth();
  if (method === 'engram_save' || method === 'engram_save_session') {
    // A 2026-07-28 retry commits the pending, hash-verified candidates before (and instead of) any new planning.
    if (call.era === 'modern' && (call.requestState !== undefined || call.inputResponses !== undefined)) return await completeModernApproval(call, method, args);
    return method === 'engram_save' ? await saveProposal(args, call) : await saveSessionProposal(args, call);
  }
  if (method === 'engram_note') {
    if (call.era === 'modern' && (call.requestState !== undefined || call.inputResponses !== undefined)) return await completeModernApproval(call, method, args);
    return await noteProposal(args, call);
  }
  if (method === 'engram_commit') return await commitTool(args);
  return undefined;
}

async function loadTool(args: any): Promise<unknown> {
  const query = args.query ?? 'current session';
  const ids = listFlag(args.id);
  const budgetTokens = args.budget_tokens === undefined ? undefined : parseMaxTokens(args.budget_tokens, 'budget_tokens');
  const disclosure = parseToolDisclosure(args.disclosure);
  if (args.full === true || args.explain === true) {
    return await cmdLoad([query], {
      ...(args.full === true ? { full: true } : {}),
      ...(args.explain === true ? { explain: true, json: true } : {}),
      ...(ids.length ? { id: ids } : {}),
      ...(budgetTokens === undefined ? {} : { 'budget-tokens': budgetTokens }),
      ...(disclosure ? { disclosure } : {})
    });
  }
  const load = await loadForAgent(query, {
    ...(ids.length ? { id: ids } : {}),
    ...(budgetTokens === undefined ? {} : { budgetTokens }),
    ...(disclosure ? { disclosure } : {})
  });
  return new StructuredOutput(load.text, {
    selected_keys: load.selectedKeys,
    body_keys: load.bodyKeys,
    card_ids: load.cardIds,
    // Selected memories the token cap shed; fetch them with engram_load { id: [...] }.
    omitted_ids: load.omittedIds,
    tokens: estimateTokens(load.text)
  });
}

async function searchTool(query: string): Promise<StructuredOutput> {
  const { text, data } = await searchMemories(query);
  return new StructuredOutput(text, { query, count: data.results.length, entries: data.results.map(routedEntry) });
}

/** Task classification as before, plus the routed memories (with scores) a load for the same query would pick. */
async function routeTool(query: string): Promise<StructuredOutput> {
  const classification = routeData(query);
  const preview = parseContractResult(await cmdLoad([query], { 'dry-run': true, json: true }))?.data;
  const entries = ((preview?.entries ?? []) as Array<Record<string, unknown>>).map(routedEntry);
  const lines = entries.map((entry) => `${entry.scope}:${entry.id} (${entry.type}, score ${entry.score})`);
  return new StructuredOutput([renderRoute(classification), `Routed memories: ${lines.length ? lines.join('; ') : '-'}`].join('\n'), { ...classification, entries });
}

function routedEntry(row: Record<string, unknown>): Record<string, unknown> {
  return { id: row.id, type: row.type, scope: row.scope, score: row.score };
}

function parseToolDisclosure(value: unknown): 'auto' | 'full' | undefined {
  if (value === undefined) return undefined;
  if (value === 'auto' || value === 'full') return value;
  throw new Error(`engram_load disclosure must be auto or full, got '${String(value)}'`);
}

function initializeResult(request: any): any {
  return {
    protocolVersion: negotiateLegacy(request.params?.protocolVersion),
    capabilities: serverCapabilities(),
    serverInfo: SERVER_INFO,
    instructions: SERVER_INSTRUCTIONS
  };
}

function toolResult(text: unknown, isError = false): any {
  if (text instanceof StructuredOutput) {
    return {
      content: [{ type: 'text', text: text.text }],
      contract_version: CONTRACT_VERSION,
      structuredContent: { contract_version: CONTRACT_VERSION, ok: true, data: text.data, diagnostics: [] }
    };
  }
  const rendered = typeof text === 'string' ? text : JSON.stringify(text ?? '');
  const contract = !isError ? parseContractResult(rendered) : undefined;
  return {
    content: [{ type: 'text', text: rendered }],
    contract_version: CONTRACT_VERSION,
    structuredContent: isError
      ? { contract_version: CONTRACT_VERSION, ok: false, error: { code: 'ENG_TOOL_ERROR', message: String(text ?? '') }, diagnostics: [] }
      : contract ?? { contract_version: CONTRACT_VERSION, ok: true, data: { text: rendered }, diagnostics: [] },
    ...(isError ? { isError: true } : {})
  };
}

function parseContractResult(text: string): any | undefined {
  try {
    const value = JSON.parse(text);
    return value && value.contract_version === CONTRACT_VERSION && typeof value.ok === 'boolean' ? value : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Tools that never write; set_* mutate config, save tools only preview and stay unannotated.
 * engram_commit is destructive: an UPDATE: candidate rewrites an existing memory.
 */
const READ_ONLY_TOOLS = new Set(['engram_load', 'engram_route', 'engram_search', 'engram_verify', 'engram_status']);
const MUTATING_TOOLS = new Set(['engram_set_role', 'engram_set_rule_variant']);
const MEMORY_WRITE_TOOLS = new Set(['engram_commit']);
/** engram_note proposes a gitignored, expiring working-tier note behind the same human gate: it writes, but never durable memory and never destructively. */
const WORKING_WRITE_TOOLS = new Set(['engram_note']);
/** Claude Code shows a permission prompt on every call of a tool carrying this flag, even in bypass modes. */
export const REQUIRES_USER_INTERACTION_META = 'anthropic/requiresUserInteraction';

/** Claude Code loads a tool carrying this flag upfront instead of deferring it behind tool search. */
export const ALWAYS_LOAD_META = 'anthropic/alwaysLoad';

function annotateTool(tool: any): any {
  if (READ_ONLY_TOOLS.has(tool.name)) return { ...tool, annotations: { readOnlyHint: true } };
  if (MUTATING_TOOLS.has(tool.name)) return { ...tool, annotations: { readOnlyHint: false } };
  if (WORKING_WRITE_TOOLS.has(tool.name)) return { ...tool, annotations: { readOnlyHint: false } };
  if (MEMORY_WRITE_TOOLS.has(tool.name)) {
    return {
      ...tool,
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false },
      _meta: { [REQUIRES_USER_INTERACTION_META]: true }
    };
  }
  return tool;
}

/** Order is part of the contract (prompt-cache stability); append new tools at the end. `alwaysLoad` merges into `_meta`. */
function toolDefinitions(options: { alwaysLoad?: boolean } = {}): any[] {
  return rawToolDefinitions().map((raw) => {
    const tool = annotateTool(raw);
    if (options.alwaysLoad && tool.name === 'engram_load') return { ...tool, _meta: { ...(tool._meta ?? {}), [ALWAYS_LOAD_META]: true } };
    return tool;
  });
}

function rawToolDefinitions(): any[] {
  const stringProperty = (description: string) => ({ type: 'string', description });
  return [
    {
      name: 'engram_load',
      description: 'Load routed Engram memory for the current task or query. Text is the agent pack; structured data lists selected_keys, body_keys, card_ids, omitted_ids, and tokens.',
      inputSchema: {
        type: 'object',
        properties: {
          query: stringProperty('Task or search query for routed memory.'),
          id: { type: 'array', items: { type: 'string' }, description: 'Fetch these memory ids directly instead of routing (for example ids a previous load listed as cards or omitted).' },
          budget_tokens: { type: 'number', description: 'Token cap for the rendered pack (200 to 16000); defaults to the configured load budget. Has no effect when id is given.' },
          disclosure: { type: 'string', enum: ['auto', 'full'], description: 'auto expands the top hits and lists the rest as cards; full expands every hit.' },
          full: { type: 'boolean', description: 'Load full memory output instead of compact routed context.' },
          explain: { type: 'boolean', description: 'Include safe route ranking and omission explanations.' }
        }
      }
    },
    {
      name: 'engram_route',
      description: 'Preview which Engram memories match a query: task classification plus routed entries (id, type, scope, score) in load order, not sorted by score.',
      inputSchema: {
        type: 'object',
        properties: {
          query: stringProperty('Task or search query.'),
          task: stringProperty('Alternative task text.')
        }
      }
    },
    {
      name: 'engram_search',
      description: 'Search Engram memory; structured entries carry id, type, scope, and score.',
      inputSchema: {
        type: 'object',
        properties: { query: stringProperty('Search query.') }
      }
    },
    {
      name: 'engram_verify',
      description: 'Verify Engram memory integrity.',
      inputSchema: {
        type: 'object',
        properties: { scope: stringProperty('Optional scope: workspace, global, or all.') }
      }
    },
    {
      name: 'engram_status',
      description: 'Show Engram memory health and status.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false }
    },
    {
      name: 'engram_set_role',
      description: 'Set active Engram role filters.',
      inputSchema: {
        type: 'object',
        properties: {
          role: stringProperty('Comma-separated roles.'),
          roles: {
            oneOf: [
              { type: 'string' },
              { type: 'array', items: { type: 'string' } }
            ],
            description: 'Roles as string or array.'
          }
        }
      }
    },
    {
      name: 'engram_set_rule_variant',
      description: 'Set active Engram rule strictness variant.',
      inputSchema: {
        type: 'object',
        properties: { variant: stringProperty('Rule variant: light, balanced, strict, or status.') }
      }
    },
    {
      name: 'engram_save',
      description: 'Preview a human-approved Engram memory save proposal. Does not write silently; returns an approval_token for engram_commit.',
      inputSchema: {
        type: 'object',
        properties: {
          text: stringProperty('Memory candidate text.'),
          type: stringProperty('Optional type: rule, skill, or knowledge.'),
          scope: stringProperty('Optional save scope.'),
          role: stringProperty('Optional role metadata.')
        },
        required: ['text']
      }
    },
    {
      name: 'engram_save_session',
      description: 'Preview multiple human-approved Engram memory save proposals. Does not write silently; returns an approval_token for engram_commit.',
      inputSchema: {
        type: 'object',
        properties: {
          text: stringProperty('TYPE/TEXT memory candidate lines.'),
          scope: stringProperty('Optional save scope.'),
          role: stringProperty('Optional role metadata.'),
          showRuleVariants: { type: 'boolean', description: 'Include rule variant previews.' }
        },
        required: ['text']
      }
    },
    {
      name: 'engram_commit',
      description: 'Write the candidates of an engram_save or engram_save_session proposal. Call ONLY after the human explicitly approved the exact displayed candidates in chat; never on your own judgment. The approval_token is single use and expires 30 minutes after the proposal. Hosts should require per-call user permission for this tool. The approval_token proves a proposal exists; it is not approval.',
      inputSchema: {
        type: 'object',
        properties: {
          approval_token: stringProperty('approval_token returned by the proposal the human approved.'),
          approve: {
            oneOf: [
              { type: 'string', enum: ['all'] },
              { type: 'array', items: { type: 'integer', minimum: 1 } }
            ],
            description: '"all", or the 1-based candidate numbers the human approved.'
          }
        },
        required: ['approval_token', 'approve']
      }
    },
    {
      name: 'engram_note',
      description: 'Propose one short working-tier task note: gitignored, redacted, and expiring after load.working_ttl_days. The human must say yes (a yes/cancel dialog when the host supports it, otherwise an approval_token for engram_commit after the human says yes in chat); cancel writes nothing. A note becomes durable only through engram promote. Returns id, file, and valid_until.',
      inputSchema: {
        type: 'object',
        properties: {
          text: stringProperty('The note: one short factual line about the current task (no secrets; they are redacted).'),
          objective: stringProperty('Optional objective the note serves; SessionStart loads the note only when the session objective matches it.'),
          type: { type: 'string', enum: ['knowledge', 'rule'], description: 'Optional type; defaults to knowledge.' },
          scope: { type: 'string', enum: ['workspace', 'global'], description: 'Optional scope; defaults to workspace.' }
        },
        required: ['text']
      }
    }
  ];
}

const TOOL_NAMES = new Set(rawToolDefinitions().map((tool) => tool.name));

function mcpMethod(request: any): string | undefined {
  if (request.method === 'tools/call') return request.params?.name;
  return request.method ?? request.tool;
}

function mcpArgs(request: any): any {
  if (request.method === 'tools/call') return request.params?.arguments ?? {};
  if (request.params?.arguments && typeof request.params.arguments === 'object') return request.params.arguments;
  return request.arguments ?? request.params ?? {};
}

/** Return a proposal only; MCP never writes memory silently. */
async function saveProposal(args: any, call: ToolCall): Promise<StructuredOutput | InputRequired> {
  const ctx = await getContext();
  const text = String(args.text ?? '').trim();
  const requestedType = String(args.type ?? '').trim();
  const explicitType = normalizeMemoryType(requestedType);
  if (!text) throw new Error('engram_save requires non-empty text');
  if (requestedType && !explicitType) throw new Error('engram_save type must be rule, skill, or knowledge');
  const { target, scopes } = proposalScopes(ctx, args.scope, 'engram_save scope');
  const requestedTaskType = args.taskType ?? args['task-type'];
  const candidates = proposalCandidates([parseMemoryCandidate(text, { explicitType })], rolesFromArgs(args), requestedTaskType === undefined ? undefined : normalizeTaskType(String(requestedTaskType)));
  const author = await requireResolvedAuthor(ctx.cwd);
  // A single proposal is not numbered in the preview; engram_commit still addresses it as candidate 1.
  const plans = (await planCandidates(ctx, candidates, scopes, author)).map((plan) => ({ ...plan, candidateIndex: undefined }));
  const preview = `ENGRAM SAVE PROPOSAL\n${previewSavePlans(plans, previewOptionsFromArgs(args))}`;
  return approve(call, 'engram_save', args, ctx, preview, candidates, plans, target);
}
/** Return a save-session proposal only; MCP never writes memory silently. */
async function saveSessionProposal(args: any, call: ToolCall): Promise<StructuredOutput | InputRequired> {
  const ctx = await getContext();
  const text = String(args.text ?? '').trim();
  if (!text) throw new Error('engram_save_session requires non-empty text');
  const { target, scopes } = proposalScopes(ctx, args.scope, 'engram_save_session scope');
  const author = await requireResolvedAuthor(ctx.cwd);
  const candidates = proposalCandidates(parseMemoryCandidates(text), rolesFromArgs(args));
  const plans = await planCandidates(ctx, candidates, scopes, author);
  const preview = `ENGRAM SAVE-SESSION PROPOSAL\n${previewSavePlans(plans, previewOptionsFromArgs(args))}`;
  return approve(call, 'engram_save_session', args, ctx, preview, candidates, plans, target);
}

/** Propose one working-tier note: nothing is written until the human says yes (dialog, or token plus engram_commit). */
async function noteProposal(args: any, call: ToolCall): Promise<StructuredOutput | InputRequired> {
  const note = prepareNote(args, 'engram_note');
  const ctx = await getContext();
  const { target, scopes } = noteScopes(ctx, args.scope, 'engram_note scope');
  const candidate = noteCandidate(note);
  const plan = await planNote(ctx, candidate, scopes, await requireResolvedAuthor(ctx.cwd));
  const info = { id: plan.id, file: plan.file, valid_until: plan.workingUntil ?? '' };
  // The same note already exists in the working tier: there is nothing to approve.
  if (plan.verdict.kind === 'NOOP') return new StructuredOutput(describeNote({ ...info, scope: plan.scope, written: false }), { ...info, scope: plan.scope, committed: false, written: false });
  const preview = `ENGRAM WORKING NOTE PROPOSAL\n${renderNotePreview(plan, note.redacted)}`;
  const result = await approve(call, 'engram_note', args, ctx, preview, [candidate], [plan], target);
  return result instanceof StructuredOutput ? new StructuredOutput(result.text, { ...info, committed: false, ...result.data }) : result;
}

/** Pin role and task type on each candidate so the preview and engram_commit plan (and hash) the same input. */
function proposalCandidates(candidates: MemoryCandidate[], role: string[] | undefined, taskType?: TaskType): PlannedCandidate[] {
  return candidates.map((candidate) => ({ ...candidate, role, taskType: taskType ?? classifyTaskType(candidate.text).taskType }));
}

/** Redeem an approval token and write the approved candidates; every refusal surfaces as a tool error. */
async function commitTool(args: any): Promise<string> {
  const token = typeof args.approval_token === 'string' ? args.approval_token.trim() : '';
  if (!token) throw new Error('engram_commit requires approval_token from an engram_save or engram_save_session proposal');
  const approve = parseApprove(args.approve);
  // Same cwd getContext() resolves for the proposal tools, so the token's cwd binding matches.
  const cwd = process.cwd();
  const redeemed = await redeemToken(cwd, token, new Date(), (pending) => {
    const outOfRange = approve === 'all' ? [] : approve.filter((index) => index > pending.length);
    if (outOfRange.length) throw new Error(`engram_commit approve ${outOfRange.join(', ')} is out of range: the proposal has ${pending.length} candidate(s)`);
  });
  if ('error' in redeemed) throw new Error(REDEEM_ERRORS[redeemed.error]);
  const { candidates, scope } = redeemed;
  const indexes = approve === 'all' ? candidates.map((_, index) => index + 1) : [...approve].sort((a, b) => a - b);
  return commitApprovedCandidates(cwd, indexes.map((index) => candidates[index - 1]), scope, indexes, redeemed.verdicts);
}

function parseApprove(value: unknown): 'all' | number[] {
  if (value === 'all') return 'all';
  const indexes = (Array.isArray(value) ? value : []).map((item) => Number(item));
  if (!indexes.length || indexes.some((index) => !Number.isInteger(index) || index < 1)) {
    throw new Error('engram_commit approve must be "all" or a non-empty array of 1-based candidate numbers');
  }
  return [...new Set(indexes)];
}

function proposalScopes(ctx: EngramContext, rawScope: unknown, label: string): { target: SaveTarget; scopes: Scope[] } {
  const target = rawScope === undefined ? ctx.config.scope : parseSaveTarget(String(rawScope), label);
  if (rawScope !== undefined && target !== 'workspace' && !ctx.roots.global) {
    throw new Error(`${label} requires global memory; set ENGRAM_GLOBAL_DIR or run engram inject --global-path <path>`);
  }
  const scopes = writeScopes(target, ctx.config);
  if (!scopes.length) throw new Error('save target requires global memory; set ENGRAM_GLOBAL_DIR or run engram inject --global-path <path>');
  return { target, scopes };
}

function rolesFromArgs(args: any): string[] | undefined {
  const raw = Array.isArray(args.role) ? (args.role as unknown[]).map((role) => String(role)).join(',') : String(args.role ?? args.roles ?? '');
  const roles = raw.split(',').map((role) => role.trim()).filter(Boolean);
  return roles.length ? roles : undefined;
}

function roleArgs(args: any): string[] {
  if (Array.isArray(args.roles)) {
    return args.roles.map((role: unknown) => String(role).trim()).filter(Boolean);
  }
  const raw = String(args.roles ?? args.role ?? '').trim();
  return raw ? raw.split(/[,\s]+/u).map((role) => role.trim()).filter(Boolean) : [];
}

function ruleVariantArgs(args: any): string[] {
  const value = String(args.variant ?? args.value ?? 'status').trim();
  return value ? [value] : [];
}

function previewOptionsFromArgs(args: any): SavePreviewOptions {
  return { showRuleVariants: args.showRuleVariants === true || args['show-rule-variants'] === true };
}

export type McpServerOptions = { alwaysLoad: boolean; elicitation: boolean };

/** Parse `engram-mcp` argv; unknown options go to stderr (never stdout) and are ignored so a version skew fails open. */
export function parseServerArgs(argv: string[]): McpServerOptions {
  const options = { alwaysLoad: false, elicitation: true };
  for (const arg of argv) {
    if (arg === '--always-load') options.alwaysLoad = true;
    else if (arg === '--no-elicitation') options.elicitation = false;
    else process.stderr.write(`engram-mcp: ignoring unknown option ${arg}\n`);
  }
  return options;
}

type Waiter = { resolve: (value: unknown) => void; reject: (error: Error) => void };

/** A client reply to one of our server-to-client requests: it has an id, no method, and a result or an error. */
function isResponse(message: any): boolean {
  return message.method === undefined && message.id !== undefined && ('result' in message || 'error' in message);
}

/**
 * Run a JSON-lines stdio server. Requests run as tasks (tool calls in arrival order) so a tool call can wait on its own elicitation request
 * while the loop keeps reading the client's answer; late or unknown answers are dropped, cancelled calls emit nothing.
 */
export async function runMcp(argv: string[] = process.argv.slice(2)): Promise<void> {
  const options = parseServerArgs(argv);
  const outbound = new Map<string, Waiter>();
  const inflight = new Map<string, AbortController>();
  let nextId = 0;
  const session: McpSession = {
    alwaysLoad: options.alwaysLoad,
    elicitation: options.elicitation,
    request: (method, params, { timeoutMs, signal }) => new Promise((resolve, reject) => {
      if (signal?.aborted) return reject(new OutboundAborted(`${method} cancelled`));
      // String ids cannot collide with the client's own numeric ids.
      const id = `engram-${++nextId}`;
      const done = () => { clearTimeout(timer); outbound.delete(id); };
      const timer = setTimeout(() => { done(); reject(new OutboundTimeout(`${method} timed out`)); }, timeoutMs);
      signal?.addEventListener('abort', () => { done(); reject(new OutboundAborted(`${method} cancelled`)); }, { once: true });
      outbound.set(id, { resolve: (value) => { done(); resolve(value); }, reject: (error) => { done(); reject(error); } });
      writeMessage({ jsonrpc: '2.0', id, method, params });
    })
  };
  const tasks = new Set<Promise<void>>();
  let toolQueue: Promise<unknown> = Promise.resolve();
  const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line.trim()) continue;
    let message: any;
    try {
      message = JSON.parse(line);
    } catch {
      writeMessage({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } });
      continue;
    }
    if (!message || typeof message !== 'object' || Array.isArray(message)) {
      writeMessage({ jsonrpc: '2.0', id: null, error: { code: -32600, message: 'Invalid Request' } });
      continue;
    }
    if (isResponse(message)) {
      const waiter = outbound.get(String(message.id));
      if (waiter) message.error ? waiter.reject(new Error(String(message.error.message ?? 'client error'))) : waiter.resolve(message.result);
      continue;
    }
    if (message.method === 'notifications/cancelled') {
      inflight.get(JSON.stringify(message.params?.requestId))?.abort();
      continue;
    }
    const key = JSON.stringify(message.id);
    const controller = new AbortController();
    if (message.id !== undefined) inflight.set(key, controller);
    // Tool calls keep arrival order (a pipelined set_role then load stays deterministic); client replies and other methods
    // are not queued, so a call awaiting its own elicitation still receives the answer.
    // A queued call the client cancelled before it started never runs (it might write).
    const run = () => (controller.signal.aborted ? Promise.resolve(undefined) : handleMcp(message, session, controller.signal));
    const started = isToolRequest(message) ? (toolQueue = toolQueue.then(run, run)) : run();
    const task: Promise<void> = started
      .then((response) => { if (response !== undefined && !controller.signal.aborted) writeMessage(response); })
      .catch((error) => { process.stderr.write(`engram-mcp: ${error?.message ?? error}\n`); })
      .finally(() => { if (inflight.get(key) === controller) inflight.delete(key); tasks.delete(task); });
    tasks.add(task);
  }
  // stdin EOF: nobody can answer a pending dialog any more; unblock those calls, then finish in-flight work and exit.
  for (const waiter of [...outbound.values()]) waiter.reject(new OutboundAborted('stdin closed'));
  await Promise.allSettled(tasks);
}

/** tools/call and bare `engram_*` methods may write config or memory, so they run one at a time in arrival order. */
function isToolRequest(message: any): boolean {
  return message.method === 'tools/call' || (typeof message.method === 'string' && message.method.startsWith('engram_'));
}

/** The only stdout writer: one JSON-RPC message per line. */
function writeMessage(message: unknown): void {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

function ok(id: unknown, result: unknown): any {
  return { jsonrpc: '2.0', id, result };
}

function fail(id: unknown, message: string): any {
  return rpcError(id, RPC.LEGACY_SERVER_ERROR, message);
}






