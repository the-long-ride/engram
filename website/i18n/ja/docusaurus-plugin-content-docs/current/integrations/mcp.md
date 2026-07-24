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
| Workspace (most hosts) | `.mcp.json` |
| Cursor workspace | `.cursor/mcp.json` |
| OpenCode workspace | `mcp` field in `opencode.json` / `opencode.jsonc` |
| Global Claude | `~/.claude/mcp.json` |
| Global Gemini / Antigravity | Gemini MCP config file |
| Global OpenCode | `mcp` field in `~/.config/opencode/opencode.jsonc` / `opencode.json` |
| Global Cursor | Bundled in the local plugin |
| Global Windsurf | `~/.codeium/windsurf/mcp_config.json` |

Windsurf workspace MCP is skipped because the official contract documents only user-level MCP config.

## Tools

MCP hosts should treat `engram_save` and `engram_autosave` as **proposal-only** tools; they must still route final writes through the human-visible CLI approval flow. `engram_load` defaults to compact output; pass `full: true` for broader legacy output.

## Force rule

Explicit `/engram save-session --force` requests, including the shortcut `/engram ss -f`, should use the CLI write path because MCP autosave remains proposal-only. The counted shortcut `/engram ss -f last 50 sessions` should use `engram save-session --query-level 50 --force`.

## OpenCode MCP entry

```json
"engram": {
  "type": "local",
  "command": ["engram-mcp"],
  "args": [],
  "enabled": true
}
```

The MCP server implements the standard JSON-RPC handshake (`initialize`, `notifications/initialized`, `tools/list`, and `tools/call`).

## Next steps

- [Agent Integrations overview](overview.md)
- [Hooks and proof lines](hooks.md)
