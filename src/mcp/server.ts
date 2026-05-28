/** Minimal JSON-line MCP wrapper for Engram tools. */
import { createInterface } from 'node:readline';
import { cmdLoad, cmdVerify } from '../commands/core.js';
import { cmdHealth, cmdSearch } from '../commands/ops.js';
import { getContext } from '../core/context.js';
import { planMemorySave, previewSavePlans } from '../core/save-plan.js';
import { resolveAuthor } from '../core/storage.js';
import type { MemoryType, Scope } from '../core/types.js';

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
    return fail(request.id, `Unknown tool: ${method}`);
  } catch (error: any) {
    return fail(request.id, error.message);
  }
}

/** Return a proposal only; MCP never writes memory silently. */
async function saveProposal(args: any): Promise<string> {
  const ctx = await getContext();
  const text = String(args.text ?? '').trim();
  const type = String(args.type ?? 'knowledge');
  const scope = String(args.scope ?? 'workspace');
  if (!text) throw new Error('engram_save requires non-empty text');
  if (!isMemoryType(type)) throw new Error('engram_save type must be rule, skill, or knowledge');
  if (!isScope(scope)) throw new Error('engram_save scope must be workspace or global');
  const plans = await planMemorySave({
    ctx,
    text,
    type,
    scopes: [scope],
    author: await resolveAuthor()
  });
  return `ENGRAM SAVE PROPOSAL\n${previewSavePlans(plans)}\n\nHuman approval required before writing.`;
}

function isMemoryType(value: string): value is MemoryType {
  return ['rule', 'skill', 'knowledge'].includes(value);
}

function isScope(value: string): value is Scope {
  return ['workspace', 'global'].includes(value);
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
