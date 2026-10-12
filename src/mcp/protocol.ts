/** MCP era detection, legacy version negotiation, server/discover, and 2026-07-28 result fields. */
import { VERSION } from '../core/runtime/version.js';

export const LEGACY_VERSIONS = ['2024-11-05', '2025-03-26', '2025-06-18', '2025-11-25'] as const;
export const LEGACY_DEFAULT_VERSION = '2025-11-25';
export const MODERN_VERSIONS = ['2026-07-28'] as const;
/** Newest first: what `server/discover` and -32022 advertise. */
export const SUPPORTED_VERSIONS: string[] = [...MODERN_VERSIONS, ...[...LEGACY_VERSIONS].reverse()];
export const META_PROTOCOL_VERSION = 'io.modelcontextprotocol/protocolVersion';
export const META_CLIENT_CAPABILITIES = 'io.modelcontextprotocol/clientCapabilities';
export const META_SERVER_INFO = 'io.modelcontextprotocol/serverInfo';
export const RPC = {
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL: -32603,
  UNSUPPORTED_VERSION: -32022,
  LEGACY_RESOURCE_NOT_FOUND: -32002,
  LEGACY_SERVER_ERROR: -32000
} as const;
export type Era = 'legacy' | 'modern';
export type ModernMeta = { protocolVersion: string; clientCapabilities: Record<string, unknown> };
export type RpcError = { code: number; message: string; data?: unknown };
/** A server-to-client request the stdio loop gave up on because the client did not answer in time. */
export class OutboundTimeout extends Error {}
/** A server-to-client request abandoned because the client cancelled the call it belonged to (or stdin closed). */
export class OutboundAborted extends Error {}

/**
 * Per-process state; `handleMcp` callers without one get a fresh stateless session. `alwaysLoad` comes from
 * `engram-mcp --always-load`, `elicitation: false` from `--no-elicitation`. `request` exists only on the stdio loop.
 */
export type McpSession = {
  legacyClientCapabilities?: Record<string, unknown>;
  alwaysLoad?: boolean;
  elicitation?: boolean;
  /** stdio only: send a server-to-client request (legacy era only) and await its result. */
  request?: (method: string, params: unknown, options: { timeoutMs: number; signal?: AbortSignal }) => Promise<unknown>;
};

/** Tool-search hint for hosts that defer tool definitions; <= 512 chars, self-contained (Codex reads the first 512). */
export const SERVER_INSTRUCTIONS = [
  'Engram is this project\'s shared, human-reviewed memory.',
  'Before non-trivial work, or when the user asks what was decided or how something is done here, use engram_load or engram_search to recall project rules, decisions, and workflows.',
  'When the user asks to remember or save project knowledge, call engram_save or engram_save_session to show a proposal.',
  'Nothing is saved until the human approves; call engram_commit only after the human approved the exact candidates.'
].join(' ');
export const SERVER_INSTRUCTIONS_MAX = 512;

export const SERVER_INFO = { name: 'engram', version: VERSION };
/** Cache hints per cacheable method; resource data is workspace-private. */
const CACHE_HINTS: Record<string, { ttlMs: number; cacheScope: 'public' | 'private' }> = {
  'server/discover': { ttlMs: 300000, cacheScope: 'public' },
  'tools/list': { ttlMs: 300000, cacheScope: 'public' },
  'prompts/list': { ttlMs: 300000, cacheScope: 'public' },
  'resources/templates/list': { ttlMs: 300000, cacheScope: 'public' },
  'resources/list': { ttlMs: 60000, cacheScope: 'private' },
  'resources/read': { ttlMs: 60000, cacheScope: 'private' }
};

/** Pick the legacy version to answer `initialize` with; an unknown or missing string never gets echoed. */
export function negotiateLegacy(requested: unknown): string {
  return typeof requested === 'string' && (LEGACY_VERSIONS as readonly string[]).includes(requested) ? requested : LEGACY_DEFAULT_VERSION;
}

/** A request whose `params._meta` carries the protocol-version key is modern; everything else is legacy. */
export function requestEra(request: any): Era {
  const meta = request?.params?._meta;
  return meta && typeof meta === 'object' && Object.prototype.hasOwnProperty.call(meta, META_PROTOCOL_VERSION) ? 'modern' : 'legacy';
}

/** Validate the required per-request fields; version first, so a bad version is -32022, not -32602. */
export function modernMeta(request: any): ModernMeta | { error: RpcError } {
  const meta = request.params._meta;
  const version = meta[META_PROTOCOL_VERSION];
  if (typeof version !== 'string' || !version) return { error: { code: RPC.INVALID_PARAMS, message: `missing required _meta field ${META_PROTOCOL_VERSION}` } };
  if (!(MODERN_VERSIONS as readonly string[]).includes(version)) return { error: unsupportedVersionError(version) };
  const caps = meta[META_CLIENT_CAPABILITIES];
  if (!caps || typeof caps !== 'object' || Array.isArray(caps)) return { error: { code: RPC.INVALID_PARAMS, message: `missing required _meta field ${META_CLIENT_CAPABILITIES}` } };
  return { protocolVersion: version, clientCapabilities: caps as Record<string, unknown> };
}

export function unsupportedVersionError(requested: string): RpcError {
  return { code: RPC.UNSUPPORTED_VERSION, message: 'Unsupported protocol version', data: { supported: SUPPORTED_VERSIONS, requested } };
}

export function unsupportedVersion(id: unknown, requested: string): { jsonrpc: '2.0'; id: unknown; error: RpcError } {
  return { jsonrpc: '2.0', id, error: unsupportedVersionError(requested) };
}

/** JSON-RPC error response; `data` is omitted when undefined. */
export function rpcError(id: unknown, code: number, message: string, data?: unknown): { jsonrpc: '2.0'; id: unknown; error: RpcError } {
  return { jsonrpc: '2.0', id, error: { code, message, ...(data === undefined ? {} : { data }) } };
}

/** `value` when it is a plain (non-array) object, else `{}`. */
export function objectOrEmpty(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

/** No `listChanged` or `subscribe`: Engram sends no notifications. */
export function serverCapabilities(): Record<string, object> {
  return { tools: {}, resources: {}, prompts: {} };
}

export function discoverResult(instructions: string | undefined = SERVER_INSTRUCTIONS): Record<string, unknown> {
  return withModernFields({ supportedVersions: SUPPORTED_VERSIONS, capabilities: serverCapabilities(), ...(instructions ? { instructions } : {}) }, 'server/discover');
}

/** Add `resultType`, serverInfo `_meta`, and (complete results of cacheable methods only) `ttlMs`/`cacheScope`. */
export function withModernFields<T extends Record<string, any>>(result: T, method: string): T & { resultType: string } {
  const resultType = typeof result.resultType === 'string' ? result.resultType : 'complete';
  const hints = resultType === 'complete' ? CACHE_HINTS[method] : undefined;
  return { ...result, resultType, ...(hints ?? {}), _meta: { ...(result._meta ?? {}), [META_SERVER_INFO]: SERVER_INFO } };
}
