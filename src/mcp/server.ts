/** Minimal JSON-line MCP wrapper for Engram tools. */
import { createInterface } from 'node:readline';
import { cmdSetRole, cmdSetRuleVariant } from '../commands/admin.js';
import { cmdLoad, cmdRoute, cmdVerify } from '../commands/read.js';
import { cmdHealth, cmdSearch } from '../commands/ops.js';
import { getContext } from '../core/memory/context.js';
import { planMemorySave, previewSavePlans, type SavePreviewOptions } from '../core/memory/save-plan.js';
import { resolveAuthor } from '../core/memory/storage.js';
import { normalizeMemoryType, parseMemoryCandidate, parseMemoryCandidates } from '../core/memory/memory-candidate.js';
import { agentMemoryChatApprovalText } from '../core/memory/agent-proposal-protocol.js';
import { normalizeTaskType } from '../core/memory/task-classifier.js';
import { parseSaveTarget, writeScopes } from '../core/runtime/config.js';
import { VERSION } from '../core/runtime/version.js';
import type { Scope } from '../core/runtime/types.js';

/** Handle one MCP-like request object. */
export async function handleMcp(request: any): Promise<any> {
  if (request.method === 'initialize') return ok(request.id, initializeResult(request));
  if (request.method === 'notifications/initialized') return undefined;
  if (request.method === 'tools/list') return ok(request.id, { tools: toolDefinitions() });
  const isToolCall = request.method === 'tools/call';
  const method = mcpMethod(request);
  const args = mcpArgs(request);
  try {
    const result = await callTool(method, args);
    if (result !== undefined) return ok(request.id, isToolCall ? toolResult(result) : result);
    return fail(request.id, `Unknown tool: ${method}`);
  } catch (error: any) {
    if (isToolCall) return ok(request.id, toolResult(error.message, true));
    return fail(request.id, error.message);
  }
}

async function callTool(method: string | undefined, args: any): Promise<string | undefined> {
  if (method === 'engram_load') return await cmdLoad([args.query ?? 'current session'], args.full === true ? { full: true } : {});
  if (method === 'engram_route') return cmdRoute([String(args.query ?? args.task ?? '')]);
  if (method === 'engram_search') return await cmdSearch([args.query ?? '']);
  if (method === 'engram_verify') return await cmdVerify(args.scope);
  if (method === 'engram_set_role') return await cmdSetRole(roleArgs(args));
  if (method === 'engram_set_rule_variant') return await cmdSetRuleVariant(ruleVariantArgs(args));
  if (method === 'engram_status') return await cmdHealth();
  if (method === 'engram_save') return await saveProposal(args);
  if (method === 'engram_save_session') return await saveSessionProposal(args);
  return undefined;
}

function initializeResult(request: any): any {
  return {
    protocolVersion: request.params?.protocolVersion ?? '2024-11-05',
    capabilities: { tools: {} },
    serverInfo: { name: 'engram', version: VERSION }
  };
}

function toolResult(text: unknown, isError = false): any {
  return {
    content: [{ type: 'text', text: String(text ?? '') }],
    ...(isError ? { isError: true } : {})
  };
}

function toolDefinitions(): any[] {
  const stringProperty = (description: string) => ({ type: 'string', description });
  return [
    {
      name: 'engram_load',
      description: 'Load routed Engram memory for the current task or query.',
      inputSchema: {
        type: 'object',
        properties: {
          query: stringProperty('Task or search query for routed memory.'),
          full: { type: 'boolean', description: 'Load full memory output instead of compact routed context.' }
        }
      }
    },
    {
      name: 'engram_route',
      description: 'Preview which Engram memories match a query.',
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
      description: 'Search Engram memory.',
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
      inputSchema: { type: 'object', properties: {} }
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
      description: 'Preview a human-approved Engram memory save proposal. Does not write silently.',
      inputSchema: {
        type: 'object',
        properties: {
          text: stringProperty('Memory candidate text.'),
          type: stringProperty('Optional type: rule, skill, workflow, or knowledge.'),
          scope: stringProperty('Optional save scope.'),
          role: stringProperty('Optional role metadata.')
        },
        required: ['text']
      }
    },
    {
      name: 'engram_save_session',
      description: 'Preview multiple human-approved Engram memory save proposals. Does not write silently.',
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
    }
  ];
}

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
async function saveProposal(args: any): Promise<string> {
  const ctx = await getContext();
  const text = String(args.text ?? '').trim();
  const requestedType = String(args.type ?? '').trim();
  const explicitType = normalizeMemoryType(requestedType);
  if (!text) throw new Error('engram_save requires non-empty text');
  if (requestedType && !explicitType) throw new Error('engram_save type must be rule, skill, workflow, or knowledge');
  const scopes = proposalScopes(ctx, args.scope, 'engram_save scope');
  const candidate = parseMemoryCandidate(text, { explicitType });
  const plans = await planMemorySave({
    ctx,
    text: candidate.text,
    type: candidate.type,
    scopes,
    author: await resolveAuthor(),
    role: rolesFromArgs(args),
    taskType: normalizeTaskType(args.taskType ?? args['task-type']),
    context: candidate.context,
    triggers: candidate.triggers,
    dependsOn: candidate.dependsOn,
    level: candidate.level,
    updateId: candidate.updateId,
    variants: candidate.variants
  });
  return `ENGRAM SAVE PROPOSAL\n${previewSavePlans(plans, previewOptionsFromArgs(args))}\n\n${mcpAgentApprovalFooter()}`;
}
/** Return a save-session proposal only; MCP never writes memory silently. */
async function saveSessionProposal(args: any): Promise<string> {
  const ctx = await getContext();
  const text = String(args.text ?? '').trim();
  if (!text) throw new Error('engram_save_session requires non-empty text');
  const scopes = proposalScopes(ctx, args.scope, 'engram_save_session scope');
  const author = await resolveAuthor();
  const role = rolesFromArgs(args);
  const plans = [];
  let candidateIndex = 1;
  for (const candidate of parseMemoryCandidates(text)) {
    const next = await planMemorySave({
      ctx,
      text: candidate.text,
      type: candidate.type,
      scopes,
      author,
      role,
      context: candidate.context,
      triggers: candidate.triggers,
      dependsOn: candidate.dependsOn,
      level: candidate.level,
      updateId: candidate.updateId,
      variants: candidate.variants
    });
    plans.push(...next.map((plan) => ({ ...plan, candidateIndex })));
    candidateIndex += 1;
  }
  return `ENGRAM SAVE-SESSION PROPOSAL\n${previewSavePlans(plans, previewOptionsFromArgs(args))}\n\n${mcpAgentApprovalFooter()}`;
}
function mcpAgentApprovalFooter(): string {
  return [
    'AI-agent chat approval required before writing.',
    agentMemoryChatApprovalText()
  ].join('\n');
}
function proposalScopes(ctx: Awaited<ReturnType<typeof getContext>>, rawScope: unknown, label: string): Scope[] {
  const target = rawScope === undefined ? ctx.config.scope : parseSaveTarget(String(rawScope), label);
  if (rawScope !== undefined && target !== 'workspace' && !ctx.roots.global) {
    throw new Error(`${label} requires global memory; set ENGRAM_GLOBAL_DIR or run engram inject --global-path <path>`);
  }
  const scopes = writeScopes(target, ctx.config);
  if (!scopes.length) throw new Error('save target requires global memory; set ENGRAM_GLOBAL_DIR or run engram inject --global-path <path>');
  return scopes;
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

/** Run a JSON-lines stdio server. */
export async function runMcp(): Promise<void> {
  const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line.trim()) continue;
    const response = await handleMcp(JSON.parse(line));
    if (response !== undefined) process.stdout.write(`${JSON.stringify(response)}\n`);
  }
}

function ok(id: unknown, result: unknown): any {
  return { jsonrpc: '2.0', id, result };
}

function fail(id: unknown, message: string): any {
  return { jsonrpc: '2.0', id, error: { code: -32000, message } };
}






