---
title: OpenCode
sidebar_position: 7
description: Engram integration with OpenCode via AGENTS.md, Agent Skills, MCP, custom commands, and a local plugin.
---

# OpenCode

OpenCode reads project `AGENTS.md` and global `~/.config/opencode/AGENTS.md` for rules. Engram writes a managed block there, writes the full guide to `.opencode/engram.md` or `~/.config/opencode/engram.md`, writes the full skill to `.opencode/skills/engram/SKILL.md` or `~/.config/opencode/skills/engram/SKILL.md`, and reserves project `opencode.json` (or an existing `opencode.jsonc`) and global `~/.config/opencode/opencode.jsonc` for MCP registration.

## Install

```bash
engram link opencode
```

## Files written

| File | Purpose |
| --- | --- |
| `AGENTS.md` | Project rules with managed block |
| `.opencode/engram.md` | Full guide |
| `.opencode/skills/engram/SKILL.md` | Agent Skill |
| `.opencode/commands/engram.md` | `/engram` slash adapter |
| `.opencode/plugins/engram.js` | Local plugin for hook context injection |
| `opencode.json` / `opencode.jsonc` | MCP registration (`mcp.engram`) |

## Global install

```bash
engram link --global opencode
```

Also installs a managed local JavaScript plugin at `~/.config/opencode/plugins/engram.js`. The plugin uses `chat.message` to route the current user prompt and `experimental.chat.system.transform` to inject routed memory before each LLM request.

:::warning
OpenCode must be restarted or reloaded after `link`/`unlink` because local plugin files are loaded at startup.
:::

## MCP registration

```json
"engram": {
  "type": "local",
  "command": ["engram-mcp"],
  "args": [],
  "enabled": true
}
```

The MCP server implements the standard JSON-RPC handshake (`initialize`, `notifications/initialized`, `tools/list`, and `tools/call`) so OpenCode can discover and call Engram tools.

## Plugin behavior

The plugin fails open and keeps raw routed memory only in the running OpenCode process. Engram's disk hook cache remains hashes, session IDs, host, cwd, and routed signatures only. `engram unlink --global opencode` removes only the Engram-generated plugin; a human-authored `engram.js` is preserved unless `--force` is explicit.

## Next steps

- [Agent Integrations overview](overview.md)
- [MCP tools](mcp.md)
- [Hooks and proof lines](hooks.md)
