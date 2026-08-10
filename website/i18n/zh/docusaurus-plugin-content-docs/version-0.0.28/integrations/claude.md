---
title: Claude
sidebar_position: 3
description: Engram integration with Claude Code via CLAUDE.md, slash commands, Agent Skills, MCP, and hooks.
---

# Claude

Claude Code reads `CLAUDE.md` for project guidance and supports external tool configuration through `.mcp.json`.

## Install

```bash
engram link claude
```

## Files written

| File | Purpose |
| --- | --- |
| `CLAUDE.md` | Project guidance bootstrap |
| `.claude/commands/engram.md` | Classic `/engram` slash command |
| `.claude/skills/engram/SKILL.md` | Agent Skill for slash invocation |
| `.claude/settings.json` | `SessionStart` and `UserPromptSubmit` hooks |
| `.mcp.json` | MCP registration |

Claude receives both `.claude/commands/engram.md` and `.claude/skills/engram/SKILL.md` so `/engram` appears in older command menus and newer skill-aware Claude Code sessions.

## Global install

```bash
engram link --global claude
```

Engram appends a managed block to `~/.claude/CLAUDE.md` (preserving user text) and writes the Claude skill to `~/.claude/skills/engram/SKILL.md`. Global MCP writes to `~/.claude/mcp.json`.

## Runtime-first target

Claude is a runtime-first target. `CLAUDE.md` contains short bootstrap instructions that rely on MCP tools and hooks for detailed protocol; the Agent Skill file carries the full write/approval workflow.

## Hook behavior

Claude supports startup and prompt-time additional context injection. `SessionStart` loads routed memory at startup; `UserPromptSubmit` reinjects only when routed Engram context changes.

## Next steps

- [Agent Integrations overview](overview.md)
- [Slash adapters](slash.md)
- [MCP tools](mcp.md)
