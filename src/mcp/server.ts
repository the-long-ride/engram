/** Minimal JSON-line MCP wrapper for Engram tools. */
import { createInterface } from 'node:readline';
import { cmdLoad, cmdVerify } from '../commands/core.js';
import { cmdHealth, cmdSearch } from '../commands/ops.js';
import { draftMemory } from '../core/memory-template.js';
import { resolveAuthor } from '../core/storage.js';

/** Handle one MCP-like request object. */
export async function handleMcp(request: any): Promise<any> {
  const method = request.method ?? request.tool;
  const args = request.params ?? request.arguments ?? {};
  try {
    if (method === 'engram_load') return ok(request.id, await cmdLoad([args.query ?? 'current session'], true));
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
  const draft = draftMemory({
    text: args.text ?? '',
    type: args.type ?? 'knowledge',
    scope: args.scope ?? 'workspace',
    author: await resolveAuthor()
  });
  return `ENGRAM SAVE PROPOSAL\nFile: ${draft.file}\n\n${draft.content}\n\nHuman approval required before writing.`;
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
