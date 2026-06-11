/** Minimal JSON-line MCP wrapper for Engram tools. */
import { createInterface } from 'node:readline';
import { cmdLoad, cmdVerify } from '../commands/read.js';
import { cmdHealth, cmdSearch } from '../commands/ops.js';
import { getContext } from '../core/memory/context.js';
import { planMemorySave, previewSavePlans } from '../core/memory/save-plan.js';
import { resolveAuthor } from '../core/memory/storage.js';
import { normalizeMemoryType, parseMemoryCandidate, parseMemoryCandidates } from '../core/memory/memory-candidate.js';
import { parseSaveTarget, writeScopes } from '../core/runtime/config.js';
import type { Scope } from '../core/runtime/types.js';

/** Handle one MCP-like request object. */
export async function handleMcp(request: any): Promise<any> {
  const method = request.method ?? request.tool;
  const args = request.params ?? request.arguments ?? {};
  try {
    if (method === 'engram_load') return ok(request.id, await cmdLoad([args.query ?? 'current session'], {}));
    if (method === 'engram_search') return ok(request.id, await cmdSearch([args.query ?? '']));
    if (method === 'engram_verify') return ok(request.id, await cmdVerify(args.scope));
    if (method === 'engram_status') return ok(request.id, await cmdHealth());
    if (method === 'engram_save') return ok(request.id, await saveProposal(args));
    if (method === 'engram_save_session') return ok(request.id, await saveSessionProposal(args));
    return fail(request.id, `Unknown tool: ${method}`);
  } catch (error: any) {
    return fail(request.id, error.message);
  }
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
    dependsOn: candidate.dependsOn,
    level: candidate.level,
    updateId: candidate.updateId
  });
  return `ENGRAM SAVE PROPOSAL\n${previewSavePlans(plans)}\n\nHuman approval required before writing.`;
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
      dependsOn: candidate.dependsOn,
      level: candidate.level,
      updateId: candidate.updateId
    });
    plans.push(...next.map((plan) => ({ ...plan, candidateIndex })));
    candidateIndex += 1;
  }
  return `ENGRAM SAVE-SESSION PROPOSAL\n${previewSavePlans(plans)}\n\nHuman approval required before writing.`;
}

function proposalScopes(ctx: Awaited<ReturnType<typeof getContext>>, rawScope: unknown, label: string): Scope[] {
  const target = rawScope === undefined ? ctx.config.scope : parseSaveTarget(String(rawScope), label);
  if (rawScope !== undefined && target !== 'workspace' && !ctx.roots.global) {
    throw new Error(`${label} requires global memory; set ENGRAM_GLOBAL_DIR or run engram init --global-path <path>`);
  }
  const scopes = writeScopes(target, ctx.config);
  if (!scopes.length) throw new Error('save target requires global memory; set ENGRAM_GLOBAL_DIR or run engram init --global-path <path>');
  return scopes;
}

function rolesFromArgs(args: any): string[] | undefined {
  const raw = Array.isArray(args.role) ? (args.role as unknown[]).map((role) => String(role)).join(',') : String(args.role ?? args.roles ?? '');
  const roles = raw.split(',').map((role) => role.trim()).filter(Boolean);
  return roles.length ? roles : undefined;
}

/** Run a JSON-lines stdio server. */
export async function runMcp(): Promise<void> {
  const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line.trim()) continue;
    const response = await handleMcp(JSON.parse(line));
    process.stdout.write(`${JSON.stringify(response)}\n`);
  }
}

function ok(id: unknown, result: unknown): any {
  return { jsonrpc: '2.0', id, result };
}

function fail(id: unknown, message: string): any {
  return { jsonrpc: '2.0', id, error: { code: -32000, message } };
}
