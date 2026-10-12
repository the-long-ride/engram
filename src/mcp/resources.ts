/** MCP resources (engram://index, engram://memory/{id}) and the `propose` prompt over the shared load path. */
import { getContext, type EngramContext } from '../core/memory/context.js';
import { loadForAgent } from '../commands/read.js';
import { readUsage } from '../core/memory/usage.js';
import { memoryKey } from '../core/memory/memory-ref.js';
import { renderAgentCard } from '../core/memory/agent-render.js';
import { isWorkingPath } from '../core/runtime/constants.js';
import { isIgnored } from '../core/safety/ignore.js';
import { redactSensitive, scanInjection } from '../core/safety/security.js';
import { mcpResourceLimit } from '../core/runtime/config.js';
import { agentMemoryProtocolText } from '../core/memory/agent-proposal-protocol.js';
import type { MemoryEntry } from '../core/runtime/types.js';

export const INDEX_URI = 'engram://index';
export const MEMORY_URI_PREFIX = 'engram://memory/';
export const MEMORY_URI_TEMPLATE = `${MEMORY_URI_PREFIX}{id}`;
export const PROPOSE_PROMPT = 'propose';
const MIME = 'text/markdown';
const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u;
const WITHHELD = '(withheld: flagged by the Engram safety scan)';

/** A resource that does not exist (or is not readable); the router maps it to the era-specific not-found error. */
export class ResourceNotFound extends Error {
  constructor(readonly uri: string) {
    super('Resource not found');
  }
}

/** Durable, visible, live memories with a URI-safe id; working-tier rows are gitignored and never listed. */
function listable(ctx: EngramContext, entry: MemoryEntry): boolean {
  return !entry.ignored && !isIgnored(entry.file, ctx.ignorePatterns) && !isWorkingPath(entry.file)
    && entry.lifecycle !== 'superseded' && entry.lifecycle !== 'archived' && ID_PATTERN.test(entry.id);
}

/** `read: off` or a disabled config exposes nothing, like `loadForAgent`. */
function exposed(ctx: EngramContext): boolean {
  return ctx.config.enabled && ctx.config.read !== 'off';
}

/** Free text from a memory (summary, directive) passes redaction and the injection scan before leaving the server. */
function safeText(text: string): string {
  return scanInjection(text).length ? WITHHELD : redactSensitive(text);
}

function safeCard(entry: MemoryEntry): string {
  return scanInjection(entry.directive || entry.summary).length
    ? `- ${entry.id} [${entry.type}] ${WITHHELD}`
    : redactSensitive(renderAgentCard(entry));
}

export function resourceTemplates() {
  return {
    resourceTemplates: [{
      uriTemplate: MEMORY_URI_TEMPLATE,
      name: 'memory',
      title: 'Engram memory by id',
      description: 'Agent body of one Engram memory (same text as engram load --id).',
      mimeType: MIME
    }]
  };
}

/** `engram://index` plus the top `mcp.resource_limit` memories ranked by injected + fetched usage (ties by id). */
export async function listResources(cwd = process.cwd()) {
  const ctx = await getContext(cwd);
  if (!exposed(ctx)) return { resources: [] };
  const usage = ctx.roots.workspace ? await readUsage(ctx.roots.workspace) : {};
  const score = (entry: MemoryEntry) => {
    const row = usage[memoryKey(entry)];
    return row ? row.injected + row.fetched : 0;
  };
  const seen = new Set<string>();
  const ranked = ctx.index.entries.filter((entry) => listable(ctx, entry))
    .sort((a, b) => score(b) - score(a) || a.id.localeCompare(b.id) || a.scope.localeCompare(b.scope))
    .filter((entry) => !seen.has(entry.id) && seen.add(entry.id))   // one URI per id
    .slice(0, mcpResourceLimit(ctx.config));
  return {
    resources: [
      { uri: INDEX_URI, name: 'index', title: 'Engram memory index', description: 'One-line cards for every visible durable memory.', mimeType: MIME },
      ...ranked.map((entry) => ({
        uri: `${MEMORY_URI_PREFIX}${encodeURIComponent(entry.id)}`,
        name: entry.id,
        title: `${entry.id} [${entry.type}]`,
        description: safeText(entry.summary),
        mimeType: MIME
      }))
    ]
  };
}

/** The index is cards only; a memory read reuses loadForAgent({ id }) and so counts as `fetched` under the usage lock. */
export async function readResource(uri: unknown, cwd = process.cwd()) {
  if (typeof uri !== 'string') throw new ResourceNotFound(String(uri));
  const ctx = await getContext(cwd);
  if (!exposed(ctx)) throw new ResourceNotFound(uri);
  if (uri === INDEX_URI) {
    const cards = ctx.index.entries.filter((entry) => listable(ctx, entry))
      .sort((a, b) => a.id.localeCompare(b.id) || a.scope.localeCompare(b.scope))
      .map(safeCard);
    return { contents: [{ uri, mimeType: MIME, text: cards.join('\n') || '(no memories)' }] };
  }
  const id = uri.startsWith(MEMORY_URI_PREFIX) ? safeDecode(uri.slice(MEMORY_URI_PREFIX.length)) : '';
  const matches = ctx.index.entries.filter((entry) => entry.id === id);
  // A retired (superseded or archived) id is not readable; working-tier ids stay readable by template, like load --id.
  // An ignored row with the same id keeps the whole id unreadable: load --id would otherwise render it.
  if (!id || !ID_PATTERN.test(id) || !matches.some((entry) => entry.lifecycle !== 'superseded' && entry.lifecycle !== 'archived') || matches.some((entry) => entry.ignored || isIgnored(entry.file, ctx.ignorePatterns))) {
    throw new ResourceNotFound(uri);
  }
  const load = await loadForAgent('', { cwd, id: [id] });
  if (!load.text) throw new ResourceNotFound(uri);   // never return empty contents
  return { contents: [{ uri, mimeType: MIME, text: withholdFlaggedLines(load.text) }] };
}

export function promptList() {
  return {
    prompts: [{
      name: PROPOSE_PROMPT,
      title: 'Propose Engram memories',
      description: 'Review this session and propose durable Engram memory candidates for human approval (nothing is saved without approval).'
    }]
  };
}

/** The `propose` prompt body is the shared proposal protocol; any other name is unknown (undefined). */
export function getPrompt(name: unknown) {
  if (name !== PROPOSE_PROMPT) return undefined;
  return {
    description: promptList().prompts[0].description,
    messages: [{ role: 'user', content: { type: 'text', text: agentMemoryProtocolText() } }]
  };
}

/** A guarded read reports a flagged body as `SKIPPED <file>: <flagged line>`; for an injection hit that line is the hostile text itself, so resources drop it. */
function withholdFlaggedLines(text: string): string {
  return text.split('\n').map((line) => {
    const skipped = /^SKIPPED (.+?): (.*)$/u.exec(line);
    return skipped && scanInjection(skipped[2]).length ? `SKIPPED ${skipped[1]}: ${WITHHELD}` : line;
  }).join('\n');
}

function safeDecode(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return '';
  }
}
