---
title: MCP tools
sidebar_position: 11
description: Engram MCP server exposes load, search, and proposal-only tools to MCP-capable hosts.
---

# MCP tools

Engram ships an MCP server binary `engram-mcp` that exposes tools to MCP-capable hosts.

## Registration

`engram link <target>` also installs the known MCP registration for that target by default.

| Scope | Path |
| --- | --- |
| Workspace Claude Code and other hosts that read `.mcp.json` (not Codex, which reads only `~/.codex/config.toml`; see Global Codex) | `.mcp.json` |
| Gemini workspace | `mcpServers.engram` in `.gemini/settings.json` |
| Cursor workspace | `.cursor/mcp.json` |
| OpenCode workspace | `mcp` field in `opencode.json` / `opencode.jsonc` |
| Global Claude | Not a file: Engram prints `claude mcp add --scope user engram -- engram-mcp` (Claude Code keeps user MCP servers in `~/.claude.json`) |
| Global Gemini | `mcpServers.engram` merged into `~/.gemini/settings.json` |
| Global Codex | Managed `[mcp_servers.engram]` block in `~/.codex/config.toml` |
| Global Antigravity | Gemini MCP config file |
| Global OpenCode | `mcp` field in `~/.config/opencode/opencode.jsonc` / `opencode.json` |
| Global Cursor | Bundled in the local plugin |
| Global Windsurf | `~/.codeium/windsurf/mcp_config.json` |

Windsurf workspace MCP is skipped because the official contract documents only user-level MCP config.

The server command is `engram-mcp` when it is on `PATH`, otherwise the `npx` form pinned to the installed release (`npx -y --package @the-long-ride/engram@<version> engram-mcp`); `engram upgrade` and `engram link <host>` re-pin existing entries. Unlink removes only the Engram entry or managed block and leaves other servers and keys untouched.

## Protocol versions

One `engram-mcp` process serves two protocol eras:

- **Legacy**: `initialize` returns the client's `protocolVersion` when it is `2024-11-05`, `2025-03-26`, `2025-06-18`, or `2025-11-25`, and `2025-11-25` otherwise. An unknown version string is never echoed.
- **MCP 2026-07-28**: a request whose `params._meta` carries `io.modelcontextprotocol/protocolVersion` is served statelessly (`server/discover`, `tools/list`, `tools/call`, `resources/*`, `prompts/*`). It must also carry `io.modelcontextprotocol/clientCapabilities` (`-32602` when missing). Results carry `resultType: "complete"`, and the list methods add `ttlMs` and `cacheScope`. An unsupported modern version returns `-32022` with `data.supported` and `data.requested`; `ping`, `initialize`, and bare tool methods return `-32601` in this era.

Stdout carries only JSON-RPC, one message per line.

## Server instructions and tool search

Both the legacy `initialize` result and the MCP 2026-07-28 `server/discover` result carry the same `instructions` string (at most 512 characters, self-contained). It tells the host when to use the Engram tools (recall project rules and decisions, save project knowledge) and that `engram_commit` needs the human. Codex reads the first 512 characters; Claude Code loads only tool names plus `instructions` up front and defers the tool definitions behind tool search.

`engram-mcp --always-load` marks `engram_load` with `_meta["anthropic/alwaysLoad"]: true`, so Claude Code loads that tool upfront. Engram Claude hooks already inject context, so `engram link` adds the flag only when no Engram Claude hook is installed or being installed, and only to configs Claude Code reads: `.mcp.json` and the printed `claude mcp add --scope user` command. Codex, Cursor, Gemini, and Windsurf configs never get it. An existing `engram` entry in `.mcp.json` changes only with `--force`, `engram upgrade`, or a refresh. `engram-mcp --no-elicitation` keeps the chat `approval_token` flow even for clients that support the approval dialog (see below). An unknown `engram-mcp` option is ignored with a note on stderr.

## Tools

| Tool | Purpose | Writes |
| --- | --- | --- |
| `engram_load` | Route and return memory for a task (`query`, `id`, `budget_tokens`, `disclosure`, `full`, `explain`) | No |
| `engram_route` | Classify a task and list the memories it routes to | No |
| `engram_search` | Search memory by query | No |
| `engram_verify`, `engram_status` | Check hashes; report health and counts | No |
| `engram_save`, `engram_save_session` | Return a numbered proposal and an `approval_token` | No |
| `engram_commit` | Write an approved proposal | Yes, after human approval |
| `engram_set_role`, `engram_set_rule_variant` | Update roles or rule-variant mode | Yes |
| `engram_note` | Save a redacted working-tier task note (`text`, `objective`, `type`, `scope`); returns `{id, file, valid_until}` | Yes, after one yes/cancel approval |

`engram_load` defaults to the tiered output described in [Read path and routing](../concepts/read-path.md); pass `full: true` for broader legacy output. `budget_tokens` has no effect together with `id`.

## Structured results

The human text is in `content[0].text`. `structuredContent` is the `{contract_version, ok, data, diagnostics}` envelope, where `data` carries:

- `engram_load`: `selected_keys`, `body_keys`, `card_ids`, `omitted_ids` (ids shed by the token budget, fetchable through `id`), and `tokens`.
- `engram_search` and `engram_route`: `entries` with `id`, `type`, `scope`, and `score`. Route entries are in load order, not sorted by score.

## Approval and commit

`engram_save` and `engram_save_session` are **proposal-only**: they return the preview and an `approval_token`. After the human approves the exact candidates in chat, call `engram_commit` with `approval_token` and `approve: "all"` or a list of 1-based candidate numbers. It writes through the same path as `save-session --force`, so related or duplicate candidates are deferred as usual.

- Tokens are random, bound to the workspace, single use, and expire after 30 minutes.
- Only a hash of the token is stored, in the gitignored `pending-approvals.json`; editing a pending candidate fails the integrity check.
- Never call `engram_commit` before the human has approved the displayed candidates.
- `engram_commit` carries `_meta["anthropic/requiresUserInteraction"]: true` in `tools/list`, which makes Claude Code prompt on every call, even in bypass modes. The managed Codex block adds `[mcp_servers.engram.tools.engram_commit]` with `approval_mode = "approve"`, and `engram doctor` warns (`host.gemini_trust`) when a Gemini `mcpServers.engram` entry sets `trust: true`, which would skip the confirmation.
- Each candidate carries a deterministic `Verdict:` line (`ADD`, `UPDATE <id>`, `SUPERSEDE <id>`, `NOOP duplicate of <id>`). The token pins the verdicts, and `engram_commit` applies a `SUPERSEDE` only while the recomputed verdict still matches.
- The `approval_token` is returned to the agent. It proves that a proposal exists, not that a human approved it. The human gate is the host's per-tool permission prompt for `engram_commit`, so do not allowlist or auto-approve `mcp__engram__engram_commit` (or your host's equivalent).

### Approval dialog (elicitation)

When the client declares form elicitation, `engram_save` and `engram_save_session` ask the human in the host's own dialog instead of returning a token:

- The form lists the candidate numbers with `ADD`/`UPDATE` and id titles (never memory text) and a save scope; `both` can be narrowed to one scope, never widened.
- `accept` writes exactly the selected candidates through the same path as `engram_commit`. No `approval_token` is returned.
- `decline` revokes the proposal: a later `engram_commit` with its token fails with `approval was declined in the approval dialog`. An invalid answer revokes it too.
- `cancel`, a 60 second timeout, or a client error fall back to the token text above, prefixed with `nothing was saved`, so hosts that declare elicitation but dismiss the dialog keep working. A host that auto-declines needs `engram-mcp --no-elicitation`.
- Legacy clients receive a server-to-client `elicitation/create` request. MCP 2026-07-28 clients receive an `input_required` result whose `requestState` is an HMAC-sealed, expiring envelope bound to the tool, workspace, and arguments; they retry `tools/call` with `inputResponses` and that `requestState`. A forged, expired, or mismatched state returns `-32602` and writes nothing. A server restart invalidates open states, so the agent proposes again.
- Calls without the capability and `--no-elicitation` use the token flow unchanged.

### Working-tier notes

`engram_note` saves one short task note to the gitignored `working/` tier (`source: note`, `tier: working`, `valid_until` = today + `load.working_ttl_days`). The text is redacted and instruction-like lines are refused before the preview. The human answers one yes/cancel prompt through the same dialog, `input_required` retry, or `approval_token` flow described above; `decline`, `cancel`, and a timeout write nothing. A note never updates a durable memory with the same id, and `engram promote` is the only way it becomes durable. SessionStart leaves a note out unless `ENGRAM_SESSION_OBJECTIVE` matches the note's objective; otherwise it appears as a one-line card. The tool carries `readOnlyHint: false` and no `destructiveHint`.

## Force rule

Explicit `/engram save-session --force` requests, including the shortcut `/engram ss -f`, should use the CLI write path. The counted shortcut `/engram ss -f last 50 sessions` should use `engram save-session --query-level 50 --force`. MCP-only hosts commit through `engram_commit`.

## OpenCode MCP entry

```json
"engram": {
  "type": "local",
  "command": ["engram-mcp"],
  "args": [],
  "enabled": true
}
```

The MCP server implements the standard JSON-RPC handshake (`initialize`, `notifications/initialized`, `tools/list`, and `tools/call`) and answers `ping`. Memories are also exposed as MCP resources (`engram://index` lists one-line cards, `engram://memory/{id}` reads the same body as `engram load --id` and counts as a fetch), and one prompt, `propose`, returns the memory proposal protocol. `resources/list` returns the index plus the top `mcp.resource_limit` memories by usage (JSON config, default 20, 0 to 200). Read tools carry `annotations.readOnlyHint: true`. A malformed JSON line gets a `-32700` error response and the server keeps running. Requests without an `id` are notifications and receive no response, and a bare method call that is not `tools/call` returns plain text.

## Next steps

- [Agent Integrations overview](overview.md)
- [Hooks and proof lines](hooks.md)
