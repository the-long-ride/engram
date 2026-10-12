/** Resolve the Engram MCP launch command and render the host-specific MCP config fragments. */
import { accessSync, constants, statSync } from 'node:fs';
import path from 'node:path';
import { VERSION } from '../runtime/version.js';

export type McpCommand = { command: string; args: string[] };
/** `alwaysLoad` appends `--always-load`, which marks `engram_load` with `anthropic/alwaysLoad` (Claude Code only). */
export type McpCommandOptions = { pathEnv?: string; pathExt?: string; platform?: typeof process.platform; alwaysLoad?: boolean };

export const MCP_ALWAYS_LOAD_FLAG = '--always-load';
const MCP_BIN = 'engram-mcp';
/** Pinned to the running release so `npx -y` never fetches an unreviewed version; `engram upgrade` / `link` re-pin. */
const NPX_ARGS = ['-y', '--package', `@the-long-ride/engram@${VERSION}`, MCP_BIN];

/** Prefer the installed `engram-mcp` binary; fall back to npx. PATH, PATHEXT, and platform are injectable for tests. */
export function resolveMcpCommand(options: McpCommandOptions = {}): McpCommand {
  const platform = options.platform ?? process.platform;
  const pathEnv = options.pathEnv ?? process.env.PATH ?? process.env.Path ?? '';
  const pathExt = options.pathExt ?? process.env.PATHEXT ?? '.COM;.EXE;.BAT;.CMD';
  const exts = platform === 'win32' ? ['', ...pathExt.split(';').filter(Boolean)] : [''];
  const delimiter = platform === 'win32' ? ';' : ':';
  const extra = options.alwaysLoad ? [MCP_ALWAYS_LOAD_FLAG] : [];
  for (const dir of pathEnv.split(delimiter).filter(Boolean)) {
    for (const ext of exts) {
      if (isRunnableFile(path.join(dir, `${MCP_BIN}${ext}`), platform)) return { command: MCP_BIN, args: [...extra] };
    }
  }
  // npx passes trailing args to the package bin.
  return { command: 'npx', args: [...NPX_ARGS, ...extra] };
}

function isRunnableFile(file: string, platform: typeof process.platform): boolean {
  try {
    if (!statSync(file).isFile()) return false;
    if (platform !== 'win32') accessSync(file, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

/** Shell-style command line for hints, e.g. `engram-mcp` or `npx -y --package ... engram-mcp`. */
export function mcpCommandLine(options: McpCommandOptions = {}): string {
  const { command, args } = resolveMcpCommand(options);
  return [command, ...args].join(' ');
}

/** Claude Code reads user-scope MCP servers from `~/.claude.json`, so it is registered through its CLI. */
export function claudeUserMcpCommand(options: McpCommandOptions = {}): string {
  return `claude mcp add --scope user engram -- ${mcpCommandLine(options)}`;
}

export function claudeUserMcpHint(options: McpCommandOptions = {}): string {
  return `run \`${claudeUserMcpCommand(options)}\` (Claude Code does not read ~/.claude/mcp.json)`;
}

export const CODEX_MCP_BEGIN = '# BEGIN ENGRAM MANAGED MCP';
export const CODEX_MCP_END = '# END ENGRAM MANAGED MCP';

function tomlString(value: string): string {
  return JSON.stringify(value);
}

/** Codex per-tool approval: engram_commit always prompts; read tools keep the host default. */
export const CODEX_COMMIT_APPROVAL_MODE = 'approve';

/** Render the managed `[mcp_servers.engram]` block (plus the `engram_commit` approval sub-table) for `~/.codex/config.toml`. */
export function renderCodexMcpBlock(options: McpCommandOptions = {}): string {
  // Codex has no `alwaysLoad`: never forward the flag.
  const { command, args } = resolveMcpCommand({ ...options, alwaysLoad: false });
  return [
    CODEX_MCP_BEGIN,
    '[mcp_servers.engram]',
    `command = ${tomlString(command)}`,
    `args = [${args.map(tomlString).join(', ')}]`,
    '[mcp_servers.engram.tools.engram_commit]',
    `approval_mode = ${tomlString(CODEX_COMMIT_APPROVAL_MODE)}`,
    CODEX_MCP_END,
    ''
  ].join('\n');
}

function managedBlockPattern(): RegExp {
  const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`\\r?\\n?${escape(CODEX_MCP_BEGIN)}[\\s\\S]*?${escape(CODEX_MCP_END)}[ \\t]*\\r?\\n?`, 'g');
}

export function hasCodexMcpBlock(existing: string): boolean {
  return existing.includes(CODEX_MCP_BEGIN) && existing.includes(CODEX_MCP_END);
}

/** Split a TOML (dotted) key into segments, honouring "basic" and 'literal' quoted keys. */
export function tomlKeyPath(raw: string): string[] {
  const parts: string[] = [];
  let current = '';
  let quote = '';
  for (const ch of raw.trim()) {
    if (quote) {
      if (ch === quote) quote = '';
      else current += ch;
    } else if (ch === '"' || ch === "'") quote = ch;
    else if (ch === '.') { parts.push(current.trim()); current = ''; }
    else current += ch;
  }
  parts.push(current.trim());
  return parts;
}

function isEngramServerPath(path: string[]): boolean {
  return path[0] === 'mcp_servers' && path[1] === 'engram';
}

/**
 * True when the user already defines `mcp_servers.engram` outside the managed block, in any TOML spelling: a
 * `[mcp_servers.engram]` table (bare or quoted keys), `engram = {...}` under `[mcp_servers]`, a dotted key such as
 * `mcp_servers.engram.command = ...`, or an inline `mcp_servers = { engram = ... }`. A second definition would make
 * the file invalid TOML, so callers must leave such files untouched. The managed `engram_commit` sub-table sits inside
 * the stripped region and never trips this check; a user's own `[mcp_servers.engram.tools.*]` table outside the markers
 * does, so link skips it rather than writing a duplicate table.
 */
export function hasUnmanagedCodexEngramTable(existing: string): boolean {
  let table: string[] = [];
  for (const line of existing.replace(managedBlockPattern(), '\n').split(/\r?\n/)) {
    // The capture starts and ends on a non-space, non-`]` char, so a long whitespace run cannot backtrack cubically.
    const header = /^\s*\[\[?\s*([^\]\s](?:[^\]]*[^\]\s])?)\s*\]\]?\s*(?:#.*)?$/.exec(line);
    if (header) {
      table = tomlKeyPath(header[1]);
      if (isEngramServerPath(table)) return true;
      continue;
    }
    const key = /^\s*((?:"[^"]*"|'[^']*'|[A-Za-z0-9_-]+)(?:\s*\.\s*(?:"[^"]*"|'[^']*'|[A-Za-z0-9_-]+))*)\s*=(.*)$/.exec(line);
    if (!key) continue;
    if (isEngramServerPath([...table, ...tomlKeyPath(key[1])])) return true;
    if ([...table, ...tomlKeyPath(key[1])].join('.') === 'mcp_servers' && /(^|[\s{,])["']?engram["']?\s*[=.]/.test(key[2])) return true;
  }
  return false;
}

/** Insert or replace the managed block, preserving every other byte of the user's config. */
export function upsertCodexMcpBlock(existing: string, block: string): string {
  if (hasCodexMcpBlock(existing)) {
    return existing.replace(managedBlockPattern(), (match) => {
      const lead = match.startsWith('\r\n') ? '\r\n' : match.startsWith('\n') ? '\n' : '';
      return `${lead}${block}`;
    });
  }
  if (!existing.trim()) return block;
  const base = existing.endsWith('\n') ? existing : `${existing}\n`;
  return `${base}\n${block}`;
}

/** Remove the managed block; returns '' when nothing else remains in the file. */
export function removeCodexMcpBlock(existing: string): string {
  const cleaned = existing.replace(managedBlockPattern(), '');
  if (!cleaned.trim()) return '';
  return cleaned.endsWith('\n') ? cleaned : `${cleaned}\n`;
}
