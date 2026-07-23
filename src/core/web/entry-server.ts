/** Lightweight HTTP server for the Engram control panel. Zero runtime dependencies. */
import http from 'node:http';
import net from 'node:net';
import crypto from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { renderEntry } from '../runtime/entry.js';
import type { Scope } from '../runtime/types.js';
import {
  loadPanelData,
  apiConfigSet,
  apiConfigValidate,
  apiConfigUpdate,
  apiPolicyUpdate,
  apiReviewPreview,
  apiReviewWrite,
  apiWorkspaceAdd,
  apiWorkspaceRemove,
  apiWorkspaceLink,
  apiProfileAdd,
  apiProfileRemove,
  apiProfileActivate,
  apiAgentsScan,
  apiAgentLink,
  apiAgentUnlink,
  apiCoreData,
  apiGetMemoryContent,
  apiGetMemoryPreview,
  apiBrowseDirectories,
  apiMemoriesGraphData,
  apiResolveMemoryFile,
  apiArchiveMemory,
} from './api.js';
import { CONTRACT_VERSION } from '../contracts/result.js';
import { cmdCapabilities } from '../../commands/capabilities.js';
import { cmdPolicy } from '../../commands/policy.js';
import { cmdReview } from '../../commands/review.js';
import { cmdDoctor, cmdLoad } from '../../commands/read.js';

// ── Infrastructure ──────────────────────────────────────────────────────────

const PREFERRED_PORT = 14620;
const RESERVED_PORTS = new Set([80, 443, 3000, 5001, 8080]);
const MAX_POST_BODY_BYTES = 1024 * 1024;
const CSRF_TOKEN_HEADER = 'x-engram-csrf';
const CSRF_TOKEN_PLACEHOLDER = '__ENGRA_CSRF_TOKEN__';
const SECURITY_HEADERS = {
  'Content-Security-Policy': "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'",
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff'
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function readAsset(filename: string): string {
  return readFileSync(path.join(__dirname, filename), 'utf8');
}


/** Check if a port is available by attempting to bind it. */
function isPortFree(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const srv = net.createServer();
    srv.once('error', () => resolve(false));
    srv.once('listening', () => srv.close(() => resolve(true)));
    srv.listen(port, '127.0.0.1');
  });
}

/** Find a free port: try preferred first, then fall back to a random port in 10000–65000 range (avoiding reserved ports). */
async function freePort(preferred: number): Promise<number> {
  if (!RESERVED_PORTS.has(preferred) && await isPortFree(preferred)) return preferred;
  // Preferred is busy — pick a random port in a safe range
  for (let attempts = 0; attempts < 20; attempts++) {
    const candidate = 10000 + Math.floor(Math.random() * 55000);
    if (RESERVED_PORTS.has(candidate)) continue;
    if (await isPortFree(candidate)) return candidate;
  }
  throw new Error('Could not find a free port after 20 attempts');
}

function openBrowser(url: string): void {
  try {
    const p = process.platform;
    if (p === 'win32') execSync('start "" "' + url + '"', { stdio: 'ignore' });
    else if (p === 'darwin') execSync('open "' + url + '"', { stdio: 'ignore' });
    else execSync('xdg-open "' + url + '"', { stdio: 'ignore' });
  } catch { /* best-effort */ }
}

function readBody(req: any): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    let bytes = 0;
    req.on('data', (chunk: any) => {
      const text = String(chunk);
      bytes += Buffer.byteLength(text);
      if (bytes > MAX_POST_BODY_BYTES) {
        reject(new Error('Request body too large'));
        req.destroy();
        return;
      }
      data += text;
    });
    req.on('end', () => resolve(data));
    req.on('error', (error: Error) => reject(error));
  });
}

// ── Request guard ───────────────────────────────────────────────────────────

interface RequestContext {
  cwd: string;
  token: string;
  /** Set of allowed Host header values, e.g. `127.0.0.1:<port>` and `localhost:<port>`. */
  allowedHosts: Set<string>;
  /** Set of allowed Origin header values, e.g. `http://127.0.0.1:<port>` and `http://localhost:<port>`. */
  allowedOrigins: Set<string>;
}

let activeServer: any = null;
let activeContext: RequestContext | null = null;

/** Expose the live CSRF token. The token is also published to the served HTML via a `<meta name="engram-csrf-token">` element so the bundled panel can read it without inline script. */
export function getActiveServerToken(): string | null {
  return activeContext ? activeContext.token : null;
}

/** Build an error envelope in the wire contract shape and end the response. */
function endError(res: any, status: number, code: string, message: string, extraHeaders: Record<string, string> = {}): void {
  res.writeHead(status, {
    ...SECURITY_HEADERS,
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    ...extraHeaders
  });
  res.end(JSON.stringify({
    contract_version: CONTRACT_VERSION,
    ok: false,
    error: { code, message },
    diagnostics: []
  }));
}

/** Validate the per-request security invariants: Origin (if present) and Host (if present). */
function checkOriginAndHost(req: any, ctx: RequestContext): { ok: true } | { ok: false; status: number; code: string; message: string } {
  const origin = req.headers.origin;
  if (origin !== undefined && origin !== '' && !ctx.allowedOrigins.has(String(origin))) {
    return { ok: false, status: 403, code: 'ENG_HTTP_FORBIDDEN_ORIGIN', message: 'Request origin is not allowed' };
  }
  const host = req.headers.host;
  if (host !== undefined && host !== '' && !ctx.allowedHosts.has(String(host))) {
    return { ok: false, status: 403, code: 'ENG_HTTP_FORBIDDEN_HOST', message: 'Request host is not allowed' };
  }
  return { ok: true };
}

/** Validate the per-mutation CSRF token. Returns true when the request carries the expected token. */
function checkCsrf(req: any, ctx: RequestContext): boolean {
  const tokenRaw = req.headers[CSRF_TOKEN_HEADER] ?? req.headers['x-csrf-token'];
  if (typeof tokenRaw !== 'string' || tokenRaw.length === 0) return false;
  // Constant-time compare to avoid timing-leak of the secret token.
  const a = Buffer.from(tokenRaw);
  const b = Buffer.from(ctx.token);
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a[i] ^ b[i];
  return result === 0;
}

// ── Request handler ─────────────────────────────────────────────────────────

async function handleRequest(req: any, res: any, ctx: RequestContext): Promise<void> {
  const url = ((req.url as string) || '/').split('?')[0];
  const method = (req.method as string) || 'GET';

  const json = (status: number, body: any) => {
    const normalized = body && typeof body === 'object'
      ? body.error
        ? { contract_version: CONTRACT_VERSION, ok: false, error: typeof body.error === 'object' ? body.error : { code: 'ENG_HTTP_ERROR', message: String(body.error) }, diagnostics: body.diagnostics ?? [] }
        : body.ok === true
          ? { contract_version: CONTRACT_VERSION, ok: true, data: body.data ?? body, diagnostics: body.diagnostics ?? [], ...body }
          : { contract_version: CONTRACT_VERSION, ok: true, data: body, diagnostics: [], ...body }
      : { contract_version: CONTRACT_VERSION, ok: true, data: body, diagnostics: [] };
    const s = JSON.stringify(normalized);
    res.writeHead(status, { ...SECURITY_HEADERS, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(s);
  };

  // Origin/Host guard runs before anything else, including static assets.
  const guard = checkOriginAndHost(req, ctx);
  if (!guard.ok) {
    endError(res, guard.status, guard.code, guard.message);
    return;
  }

  if (url === '/shutdown') {
    if (method !== 'POST') {
      endError(res, 405, 'ENG_HTTP_METHOD_NOT_ALLOWED', 'Method ' + method + ' not allowed for /shutdown; use POST', { Allow: 'POST' });
      return;
    }
    if (!checkCsrf(req, ctx)) {
      endError(res, 403, 'ENG_HTTP_CSRF', 'CSRF token missing or invalid');
      return;
    }
    res.writeHead(204, { 'Connection': 'close' }).end();
    setTimeout(() => {
      if (activeServer) {
        activeServer.close();
        if (typeof activeServer.closeAllConnections === 'function') {
          activeServer.closeAllConnections();
        }
      }
    }, 200);
    return;
  }

  if (url === '/') {
    if (method !== 'GET') {
      endError(res, 405, 'ENG_HTTP_METHOD_NOT_ALLOWED', 'Method ' + method + ' not allowed for /', { Allow: 'GET' });
      return;
    }
    const html = readAsset('panel.html').replace(CSRF_TOKEN_PLACEHOLDER, ctx.token);
    res.writeHead(200, { ...SECURITY_HEADERS, 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
    return;
  }

  if (url === '/panel.css' || /^\/panel-[a-z0-9-]+\.css$/u.test(url)) {
    if (method !== 'GET') {
      endError(res, 405, 'ENG_HTTP_METHOD_NOT_ALLOWED', 'Method ' + method + ' not allowed for ' + url, { Allow: 'GET' });
      return;
    }
    res.writeHead(200, { ...SECURITY_HEADERS, 'Content-Type': 'text/css; charset=utf-8' });
    res.end(readAsset(url.slice(1)));
    return;
  }

  if (url === '/panel.js') {
    if (method !== 'GET') {
      endError(res, 405, 'ENG_HTTP_METHOD_NOT_ALLOWED', 'Method ' + method + ' not allowed for ' + url, { Allow: 'GET' });
      return;
    }
    res.writeHead(200, { ...SECURITY_HEADERS, 'Content-Type': 'application/javascript; charset=utf-8' });
    res.end(readAsset('panel.js'));
    return;
  }

  if (url === '/engram-logo-black-transparent.svg') {
    if (method !== 'GET') {
      endError(res, 405, 'ENG_HTTP_METHOD_NOT_ALLOWED', 'Method ' + method + ' not allowed for ' + url, { Allow: 'GET' });
      return;
    }
    res.writeHead(200, { ...SECURITY_HEADERS, 'Content-Type': 'image/svg+xml' });
    res.end(readAsset('engram-logo-black-transparent.svg'));
    return;
  }

  if (url === '/favicon.svg' || url === '/favicon.ico') {
    if (method !== 'GET') {
      endError(res, 405, 'ENG_HTTP_METHOD_NOT_ALLOWED', 'Method ' + method + ' not allowed for ' + url, { Allow: 'GET' });
      return;
    }
    res.writeHead(200, { ...SECURITY_HEADERS, 'Content-Type': 'image/svg+xml' });
    res.end(readAsset('favicon.svg'));
    return;
  }

  if (url.startsWith('/api/')) {
    // All `/api/*` routes only accept GET (read) or POST (mutate). Anything else is 405.
    if (method !== 'GET' && method !== 'POST') {
      endError(res, 405, 'ENG_HTTP_METHOD_NOT_ALLOWED', 'Method ' + method + ' not allowed for ' + url, { Allow: 'GET, POST' });
      return;
    }
    // Mutating requests need the CSRF token plus an explicit JSON content type. This blocks
    // cross-site form/text POSTs from a foreign page reaching the local server.
    if (method === 'POST') {
      if (!checkCsrf(req, ctx)) {
        endError(res, 403, 'ENG_HTTP_CSRF', 'CSRF token missing or invalid');
        return;
      }
      const contentType = String(req.headers['content-type'] || '').toLowerCase();
      if (!contentType.startsWith('application/json')) {
        endError(res, 415, 'ENG_HTTP_CONTENT_TYPE', 'Content-Type must be application/json');
        return;
      }
    }
    return handleApiRequest(req, res, ctx, url, method, json);
  }

  res.writeHead(404, { ...SECURITY_HEADERS, 'Content-Type': 'text/plain' }).end('Not found');
}

async function handleApiRequest(req: any, res: any, ctx: RequestContext, url: string, method: string, json: (status: number, body: any) => void): Promise<void> {
  const cwd = ctx.cwd;

  if (url === '/api/data' && method === 'GET') {
    try {
      let entryText = '';
      try { entryText = await renderEntry(cwd); } catch { /* non-fatal: show panel without runtime section */ }
      const data = await loadPanelData(cwd, entryText);
      json(200, data);
    } catch (e: any) { json(500, { error: e.message }); }
    return;
  }

  if (url === '/api/core' && method === 'GET') {
    try {
      const data = await apiCoreData(cwd, {});
      json(200, { ok: true, data });
    } catch (e: any) { json(500, { error: e.message }); }
    return;
  }

  if (url === '/api/memories' && method === 'GET') {
    try {
      const data = await apiMemoriesGraphData(cwd, {});
      json(200, { ok: true, data });
    } catch (e: any) { json(500, { error: e.message }); }
    return;
  }

  if (url === '/api/memory' && method === 'GET') {
    try {
      const parsed = new URL(req.url, 'http://localhost');
      const profile = parsed.searchParams.get('profile') || '';
      const scope = parsed.searchParams.get('scope') as Scope || 'global';
      const file = parsed.searchParams.get('file') || '';
      const data = await apiGetMemoryPreview(cwd, profile, scope, file);
      json(200, { ok: true, ...data });
    } catch (e: any) { json(500, { error: e.message }); }
    return;
  }

  if (url === '/api/memory/file' && method === 'GET') {
    try {
      const parsed = new URL(req.url, 'http://localhost');
      const profile = parsed.searchParams.get('profile') || '';
      const scope = parsed.searchParams.get('scope') as Scope || 'global';
      const file = parsed.searchParams.get('file') || '';
      const data = await apiResolveMemoryFile(cwd, profile, scope, file);
      json(200, { ok: true, data });
    } catch (e: any) { json(500, { error: e.message }); }
    return;
  }

  if (url === '/api/agents/scan' && method === 'GET') {
    try {
      const data = await apiAgentsScan(cwd);
      json(200, { ok: true, data });
    } catch (e: any) { json(500, { error: e.message }); }
    return;
  }

  if (url === '/api/capabilities' && method === 'GET') {
    try { json(200, JSON.parse(await cmdCapabilities([], { json: true }))); }
    catch (e: any) { json(500, { error: e.message }); }
    return;
  }

  if (url === '/api/policy' && method === 'GET') {
    try { json(200, JSON.parse(await cmdPolicy(['show'], { json: true, cwd }))); }
    catch (e: any) { json(500, { error: e.message }); }
    return;
  }

  if (url === '/api/review' && method === 'GET') {
    try {
      const findings = JSON.parse(await cmdReview(['list'], { json: true, cwd })).data;
      const inbox = JSON.parse(await cmdReview(['inbox'], { json: true, cwd })).data;
      json(200, { ok: true, data: { ...findings, ...inbox } });
    }
    catch (e: any) { json(500, { error: e.message }); }
    return;
  }

  if (url === '/api/review/inspect' && method === 'GET') {
    try {
      const parsed = new URL(req.url, 'http://localhost');
      const id = parsed.searchParams.get('id') || '';
      json(200, JSON.parse(await cmdReview(['inspect', id], { json: true, cwd })));
    } catch (e: any) { json(404, { error: e.message }); }
    return;
  }

  if (url === '/api/review/preview' && method === 'GET') {
    try {
      const parsed = new URL(req.url, 'http://localhost');
      const id = parsed.searchParams.get('id') || '';
      const memoryIds = (parsed.searchParams.get('memory_ids') || '').split(',').filter(Boolean);
      json(200, { ok: true, data: await apiReviewPreview(cwd, id, memoryIds) });
    } catch (e: any) { json(404, { error: e.message }); }
    return;
  }

  if (url === '/api/doctor' && method === 'GET') {
    try { json(200, JSON.parse(await cmdDoctor([], { json: true, cwd }))); }
    catch (e: any) { json(500, { error: e.message }); }
    return;
  }

  if (url === '/api/recall' && method === 'GET') {
    try {
      const parsed = new URL(req.url, 'http://localhost');
      const query = parsed.searchParams.get('query') || 'current session';
      const explain = parsed.searchParams.get('explain') === 'true';
      json(200, JSON.parse(await cmdLoad([query], { json: true, cwd, ...(explain ? { explain: true } : {}) })));
    } catch (e: any) { json(500, { error: e.message }); }
    return;
  }

  // From here on, the route is a POST. The CSRF + content-type guard in handleRequest already ran.
  let body: any = {};
  try {
    body = JSON.parse(await readBody(req));
  } catch (error: any) {
    if (error.message === 'Request body too large') {
      json(413, { error: error.message });
      return;
    }
    json(400, { error: 'Invalid JSON' });
    return;
  }
  try {
    if (url === '/api/memories') {
      const data = await apiMemoriesGraphData(cwd, {
        scopes: body.scopes,
        types: Array.isArray(body.types) ? body.types : undefined,
        semantic: body.semantic === true,
        rebuild: body.rebuild === true,
        limit: Number(body.limit || 100),
        search: typeof body.search === 'string' ? body.search : undefined,
        searchMode: body.searchMode === 'related' ? 'related' : 'direct'
      });
      json(200, { ok: true, data });
      return;
    }
    if (url === '/api/memory/archive') {
      const result = await apiArchiveMemory(cwd, body);
      json(200, { ok: true, data: result });
      return;
    }
    if (url === '/api/core') {
      const data = await apiCoreData(cwd, {
        semantic: body.semantic === true,
        rebuild: body.rebuild === true,
        scope: body.scope,
        scopes: Array.isArray(body.scopes) ? body.scopes : undefined,
        types: Array.isArray(body.types) ? body.types : undefined,
        limit: Number(body.limit || 50)
      });
      json(200, { ok: true, data });
      return;
    }
    if (url === '/api/config/validate') {
      json(200, apiConfigValidate(body.patch ?? body));
      return;
    }
    if (url === '/api/review/write') {
      const data = await apiReviewWrite(cwd, body);
      json(200, { ok: true, data });
      return;
    }
    if (url === '/api/policy') {
      const message = await apiPolicyUpdate(body.patch ?? body.policy ?? body, cwd);
      json(200, { ok: true, message });
      return;
    }
    if (url === '/api/browse') {
      const result = await apiBrowseDirectories(body.path, cwd);
      json(200, result);
      return;
    }
    let message = '';
    if (url === '/api/config') message = await apiConfigUpdate(body.patch ?? { [body.key]: body.value }, cwd);
    else if (url === '/api/init') {
      const { initWorkspace } = await import('../memory/storage.js');
      const lines = await initWorkspace(cwd, false, 'main', '', {});
      message = 'Workspace initialized successfully:\n' + lines.join('\n');
    }
    else if (url === '/api/workspace/add') message = await apiWorkspaceAdd(body.path, body.name || '');
    else if (url === '/api/workspace/remove') message = await apiWorkspaceRemove(body.path);
    else if (url === '/api/workspace/link') message = await apiWorkspaceLink(body.path, Boolean(body.linked));
    else if (url === '/api/profile/add') message = await apiProfileAdd(body.name, body.globalPath, body.scope || 'global');
    else if (url === '/api/profile/remove') message = await apiProfileRemove(body.name);
    else if (url === '/api/profile/activate') message = await apiProfileActivate(body.name);
    else if (url === '/api/agents/link') message = await apiAgentLink(cwd, body.agentId, Boolean(body.global));
    else if (url === '/api/agents/unlink') message = await apiAgentUnlink(cwd, body.agentId, Boolean(body.global));
    else { endError(res, 404, 'ENG_HTTP_NOT_FOUND', 'Not found'); return; }
    json(200, { ok: true, message });
  } catch (e: any) { json(400, { error: e.message }); }
}



// ── Server exports ────────────────────────────────────────────────────────────

/** Build the request context for the bound address+port: it lists the only `Host` and `Origin` values we will accept. */
function buildContext(cwd: string, port: number, token: string): RequestContext {
  const hosts = new Set<string>([
    '127.0.0.1:' + port,
    'localhost:' + port,
    '[::1]:' + port
  ]);
  const origins = new Set<string>([
    'http://127.0.0.1:' + port,
    'http://localhost:' + port,
    'http://[::1]:' + port
  ]);
  return { cwd, token, allowedHosts: hosts, allowedOrigins: origins };
}

export async function servePanel(cwd: string): Promise<string> {
  const port = await freePort(PREFERRED_PORT);
  const token = crypto.randomBytes(24).toString('hex');
  const ctx = buildContext(cwd, port, token);
  activeContext = ctx;
  return new Promise((resolve, reject) => {
    const srv = http.createServer(async (req: any, res: any) => {
      try {
        await handleRequest(req, res, ctx);
      } catch (e: any) {
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: e.message }));
        }
      }
    });
    activeServer = srv;
    srv.listen(port, '127.0.0.1', () => resolve('http://127.0.0.1:' + port));
    srv.on('error', reject);
  });
}

/** Force-close the active server and all open connections. Safe to call even when no server is running. */
export function stopServer(): void {
  if (activeServer) {
    if (typeof activeServer.closeAllConnections === 'function') {
      activeServer.closeAllConnections();
    }
    activeServer.close();
    activeServer = null;
  }
  activeContext = null;
}

export async function launchEntryUi(cwd: string, options: { hostOnly?: boolean } = {}): Promise<string> {
  const url = await servePanel(cwd);
  if (!options.hostOnly) {
    openBrowser(url);
  }
  const isTTY = !!process.stdout.isTTY;
  if (isTTY) {
    const bold = (t: string) => `\x1b[1m${t}\x1b[0m`;
    const green = (t: string) => `\x1b[32m${t}\x1b[0m`;
    const gray = (t: string) => `\x1b[90m${t}\x1b[0m`;
    return [
      `${bold('engram')}: Control panel at ${green(url)}`,
      `${gray('(Note: Only users on this device can access this server)')}`,
      `${gray('(Click "Close Server" in the browser or press Ctrl+C to stop)')}`
    ].join('\n');
  }
  return 'engram: Control panel at ' + url + '\n(Note: Only users on this device can access this server)\n(Click "Close Server" in the browser or press Ctrl+C to stop)';
}
