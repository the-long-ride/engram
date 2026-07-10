/** Lightweight HTTP server for the Engram control panel. Zero runtime dependencies. */
import http from 'node:http';
import net from 'node:net';
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
  apiBrowseDirectories,
  apiMemoriesGraphData,
  apiResolveMemoryFile,
  apiArchiveMemory,
} from './api.js';

// ── Infrastructure ──────────────────────────────────────────────────────────

const PREFERRED_PORT = 14620;
const RESERVED_PORTS = new Set([80, 443, 3000, 5001, 8080]);
const MAX_POST_BODY_BYTES = 1024 * 1024;
const SECURITY_HEADERS = {
  'Content-Security-Policy': "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'",
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

// ── Request handler ─────────────────────────────────────────────────────────

let activeServer: any = null;

async function handleRequest(req: any, res: any, cwd: string): Promise<void> {
  const url = ((req.url as string) || '/').split('?')[0];
  const method = (req.method as string) || 'GET';

  const json = (status: number, body: any) => {
    const s = JSON.stringify(body);
    res.writeHead(status, { ...SECURITY_HEADERS, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(s);
  };

  if (url === '/shutdown') {
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

  if (url === '/' && method === 'GET') {
    res.writeHead(200, { ...SECURITY_HEADERS, 'Content-Type': 'text/html; charset=utf-8' });
    res.end(readAsset('panel.html'));
    return;
  }

  if ((url === '/panel.css' || /^\/panel-[a-z0-9-]+\.css$/u.test(url)) && method === 'GET') {
    res.writeHead(200, { ...SECURITY_HEADERS, 'Content-Type': 'text/css; charset=utf-8' });
    res.end(readAsset(url.slice(1)));
    return;
  }

  if (url === '/panel.js' && method === 'GET') {
    res.writeHead(200, { ...SECURITY_HEADERS, 'Content-Type': 'application/javascript; charset=utf-8' });
    res.end(readAsset('panel.js'));
    return;
  }

  if (url === '/engram-logo-black-transparent.svg' && method === 'GET') {
    res.writeHead(200, { ...SECURITY_HEADERS, 'Content-Type': 'image/svg+xml' });
    res.end(readAsset('engram-logo-black-transparent.svg'));
    return;
  }

  if ((url === '/favicon.svg' || url === '/favicon.ico') && method === 'GET') {
    res.writeHead(200, { ...SECURITY_HEADERS, 'Content-Type': 'image/svg+xml' });
    res.end(readAsset('favicon.svg'));
    return;
  }

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
      const content = await apiGetMemoryContent(cwd, profile, scope, file);
      json(200, { ok: true, content });
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

  if (method === 'POST' && url.startsWith('/api/')) {
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
      else { json(404, { error: 'Not found' }); return; }
      json(200, { ok: true, message });
    } catch (e: any) { json(400, { error: e.message }); }
    return;
  }

  res.writeHead(404).end('Not found');
}



// ── Server exports ────────────────────────────────────────────────────────────

export async function servePanel(cwd: string): Promise<string> {
  const port = await freePort(PREFERRED_PORT);
  return new Promise((resolve, reject) => {
    const srv = http.createServer(async (req: any, res: any) => {
      try {
        await handleRequest(req, res, cwd);
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
