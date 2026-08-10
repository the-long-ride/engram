---
title: Cursor
sidebar_position: 5
description: Engram integration with Cursor via rules, MCP, local plugin, slash commands, and session-start hooks.
---

# Cursor

Cursor reads project rules from `.cursor/rules/*.mdc` files. Engram writes `.cursor/rules/engram.mdc` with valid frontmatter (`alwaysApply: true`) and a bootstrap instruction block.

## Install

```bash
engram link cursor
```

## Files written

| File | Purpose |
| --- | --- |
| `.cursor/rules/engram.mdc` | Project rules with `alwaysApply: true` |
| `.cursor/mcp.json` | MCP registration (`type: "stdio"`) |
| `.cursor/hooks.json` | `sessionStart` hook |
| `.cursor/commands/engram.md` | `/engram` slash adapter |

## Global install

```bash
engram link --global cursor
```

Engram creates a local plugin at `~/.cursor/plugins/local/engram/` containing the plugin manifest, rules, skills, commands, MCP config, and hooks.

## Runtime-first target

Cursor is a runtime-first target. Project rules contain short bootstrap instructions that rely on MCP tools and hooks for detailed protocol; the Agent Skill file carries the full write/approval workflow.

## Hook behavior

The `sessionStart` hook injects Engram startup context through the `additional_context` output field. `beforeSubmitPrompt` is allow/block-only and is not used for context injection.

## Next steps

- [Agent Integrations overview](overview.md)
- [Hooks and proof lines](hooks.md)
