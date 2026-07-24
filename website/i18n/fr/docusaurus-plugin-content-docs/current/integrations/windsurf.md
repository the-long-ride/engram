---
title: Windsurf / Cascade
sidebar_position: 6
description: Engram integration with Windsurf Cascade via rules, MCP, hooks, and global memories.
---

# Windsurf / Cascade

Windsurf reads workspace rules from `.windsurf/rules/*.md`. Engram writes `.windsurf/rules/engram.md` with `trigger: always_on` frontmatter. `cascade` is an alias for `windsurf`.

## Install

```bash
engram link windsurf
```

Workspace MCP is not generated because the official contract documents only user-level MCP config. `engram link windsurf` reports this explicitly and suggests `engram link --global windsurf` for MCP.

## Files written

| File | Purpose |
| --- | --- |
| `.windsurf/rules/engram.md` | Project rules with `trigger: always_on` |
| `.windsurf/hooks.json` | `pre_user_prompt` hook |

## Global install

```bash
engram link --global windsurf
```

Engram writes a managed block into `~/.codeium/windsurf/memories/global_rules.md` (preserving user text and staying below the character budget), merges MCP into `~/.codeium/windsurf/mcp_config.json`, and merges hooks into `~/.codeium/windsurf/hooks.json`.

## Hook behavior

The `pre_user_prompt` hook can audit/preload/block but cannot inject model context directly. Rules and MCP provide the reliable AI context channels.

## Next steps

- [Agent Integrations overview](overview.md)
- [Hooks and proof lines](hooks.md)
