// Codex config.toml table-header detection: linear on huge whitespace lines, same captures for real headers.
import test from 'node:test';
import assert from 'node:assert/strict';
import { hasUnmanagedCodexEngramTable, renderCodexMcpBlock, tomlKeyPath, upsertCodexMcpBlock } from '../../dist/core/integrations/mcp-config.js';

test('a 100k-space header-like line is scanned in linear time', () => {
  for (const line of [`[${' '.repeat(100_000)}`, `[${' '.repeat(100_000)}x`, `[[${' '.repeat(100_000)}]`]) {
    const started = performance.now();
    assert.equal(hasUnmanagedCodexEngramTable(`${line}\n`), false);
    assert.ok(performance.now() - started < 100, `took ${Math.round(performance.now() - started)} ms`);
  }
});

test('managed Codex block gates engram_commit and upgrades old blocks', () => {
  const block = renderCodexMcpBlock({ pathEnv: '', platform: 'linux' });
  const headers = [...block.matchAll(/^\[([^\]]+)\]$/gm)].map((m) => tomlKeyPath(m[1]).join('.'));
  assert.deepEqual(headers, ['mcp_servers.engram', 'mcp_servers.engram.tools.engram_commit']);
  assert.match(block, /^\[mcp_servers\.engram\.tools\.engram_commit\]\napproval_mode = "approve"$/m);
  assert.equal(hasUnmanagedCodexEngramTable(`model = "x"\n${block}`), false);
  const old = 'model = "x"\n\n# BEGIN ENGRAM MANAGED MCP\n[mcp_servers.engram]\ncommand = "npx"\nargs = []\n# END ENGRAM MANAGED MCP\n';
  const next = upsertCodexMcpBlock(old, block);
  assert.ok(next.startsWith('model = "x"\n\n'));
  assert.equal((next.match(/# BEGIN ENGRAM MANAGED MCP/g) ?? []).length, 1);
  assert.match(next, /approval_mode = "approve"/);
  assert.equal(upsertCodexMcpBlock(next, block), next, 're-upsert is idempotent');
  assert.equal(hasUnmanagedCodexEngramTable('[mcp_servers.engram.tools.engram_commit]\napproval_mode = "auto"\n'), true);
});

test('table headers keep their captures in every spelling', () => {
  assert.equal(hasUnmanagedCodexEngramTable('[mcp_servers.engram]\ncommand = "x"\n'), true);
  assert.equal(hasUnmanagedCodexEngramTable('[ mcp_servers.engram ] # comment\ncommand = "x"\n'), true);
  assert.equal(hasUnmanagedCodexEngramTable('["mcp_servers" . "engram"]\ncommand = "x"\n'), true);
  // An array-of-tables header is a table context: a dotted key below it resolves against it.
  assert.equal(hasUnmanagedCodexEngramTable('[[mcp_servers]]\nengram.command = "x"\n'), true);
  assert.equal(hasUnmanagedCodexEngramTable('[[a.b]]\nengram.command = "x"\n'), false);
  assert.equal(hasUnmanagedCodexEngramTable('[mcp_servers.other]\ncommand = "x"\n'), false);
});
