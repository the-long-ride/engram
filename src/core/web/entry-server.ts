/** Lightweight HTTP server for the Engram control panel. Zero runtime dependencies. */
import http from 'node:http';
import net from 'node:net';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { renderEntry } from '../runtime/entry.js';
import {
  loadPanelData,
  apiConfigSet,
  apiWorkspaceAdd,
  apiWorkspaceRemove,
  apiWorkspaceLink,
  apiProfileAdd,
  apiProfileRemove,
  apiProfileActivate,
} from './api.js';

// ── Infrastructure ──────────────────────────────────────────────────────────

const PREFERRED_PORT = 14620;
const RESERVED_PORTS = new Set([80, 443, 3000, 5001, 8080]);

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
    srv.listen(port, 'localhost');
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
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (chunk: any) => { data += String(chunk); });
    req.on('end', () => resolve(data));
    req.on('error', () => resolve(''));
  });
}

// ── Request handler ─────────────────────────────────────────────────────────

let activeServer: any = null;

async function handleRequest(req: any, res: any, cwd: string): Promise<void> {
  const url = ((req.url as string) || '/').split('?')[0];
  const method = (req.method as string) || 'GET';

  const json = (status: number, body: any) => {
    const s = JSON.stringify(body);
    res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(s);
  };

  if (url === '/shutdown') {
    res.writeHead(204).end();
    setTimeout(() => { if (activeServer) activeServer.close(); }, 200);
    return;
  }

  if (url === '/' && method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(readAsset('panel.html'));
    return;
  }

  if (url === '/panel.css' && method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'text/css; charset=utf-8' });
    res.end(readAsset('panel.css'));
    return;
  }

  if (url === '/panel.js' && method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8' });
    res.end(readAsset('panel.js'));
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

  if (method === 'POST' && url.startsWith('/api/')) {
    let body: any = {};
    try { body = JSON.parse(await readBody(req)); } catch { json(400, { error: 'Invalid JSON' }); return; }
    try {
      let message = '';
      if (url === '/api/config') message = await apiConfigSet(body.key, String(body.value ?? ''), cwd);
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
    srv.listen(port, 'localhost', () => resolve('http://localhost:' + port));
    srv.on('error', reject);
  });
}

export async function launchEntryUi(cwd: string): Promise<string> {
  const url = await servePanel(cwd);
  openBrowser(url);
  return 'engram: Control panel at ' + url + '\n(Click "Close Server" in the browser or press Ctrl+C to stop)';
}
