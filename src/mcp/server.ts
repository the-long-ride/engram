/** Minimal JSON-line MCP wrapper for Engram tools. */
import { createInterface } from 'node:readline';
import { cmdLoad, cmdVerify } from '../commands/core.js';
import { cmdHealth, cmdSearch } from '../commands/ops.js';
import { getContext } from '../core/context.js';
import { planMemorySave, previewSavePlans } from '../core/save-plan.js';
import { resolveAuthor } from '../core/storage.js';
import { normalizeMemoryType, parseMemoryCandidate, parseMemoryCandidates } from '../core/memory-candidate.js';
import type { Scope } from '../core/types.js';

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
    if (method === 'engram_autosave') return ok(request.id, await autosaveProposal(args));
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
  const scope = String(args.scope ?? 'workspace');
  if (!text) throw new Error('engram_save requires non-empty text');
  if (requestedType && !explicitType) throw new Error('engram_save type must be rule, skill, workflow, or knowledge');
  if (!isScope(scope)) throw new Error('engram_save scope must be workspace or global');
  const candidate = explicitType ? { type: explicitType, text } : parseMemoryCandidate(text);
  const plans = await planMemorySave({
    ctx,
    text: candidate.text,
    type: candidate.type,
    scopes: [scope],
    author: await resolveAuthor(),
    role: rolesFromArgs(args)
  });
  return `ENGRAM SAVE PROPOSAL\n${previewSavePlans(plans)}\n\nHuman approval required before writing.`;
}

/** Return an autosave proposal only; MCP never writes memory silently. */
async function autosaveProposal(args: any): Promise<string> {
  const ctx = await getContext();
  const text = String(args.text ?? '').trim();
  const scope = String(args.scope ?? 'workspace');
  if (!text) throw new Error('engram_autosave requires non-empty text');
  if (!isScope(scope)) throw new Error('engram_autosave scope must be workspace or global');
  const author = await resolveAuthor();
  const role = rolesFromArgs(args);
  const plans = [];
  let candidateIndex = 1;
  for (const candidate of parseMemoryCandidates(text)) {
    const next = await planMemorySave({ ctx, text: candidate.text, type: candidate.type, scopes: [scope], author, role });
    plans.push(...next.map((plan) => ({ ...plan, candidateIndex })));
    candidateIndex += 1;
  }
  return `ENGRAM AUTOSAVE PROPOSAL\n${previewSavePlans(plans)}\n\nHuman approval required before writing.`;
}

function isScope(value: string): value is Scope {
  return ['workspace', 'global'].includes(value);
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
