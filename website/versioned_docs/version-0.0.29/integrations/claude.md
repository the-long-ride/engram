---
title: Claude
sidebar_position: 3
description: Engram integration with Claude Code via CLAUDE.md, slash commands, Agent Skills, MCP, and hooks.
---

# Claude

Claude Code reads `CLAUDE.md` for project guidance (and a project `AGENTS.md` only when no `CLAUDE.md` exists) and supports external tool configuration through `.mcp.json`. Engram's bootstrap is AGENTS.md-first.

## Install

```bash
engram link claude
```

## Files written

| File | Purpose |
| --- | --- |
| `AGENTS.md` | Project guidance bootstrap (the managed block, shared with Codex and OpenCode) |
| `CLAUDE.md` or `.claude/CLAUDE.md` | A bootstrap block, only when that file already exists and does not import `@AGENTS.md`; never created |
| `.claude/engram.md`, `.agents/engram.md` | Companion guides with the full write/approval workflow |
| `.claude/rules/engram/<id>.md` | One generated path rule per workspace memory with `applies_to` (`hooks.path_rules native`) |
| `.claude/commands/engram.md` | Classic `/engram` slash command |
| `.claude/skills/engram/SKILL.md` | Agent Skill for slash invocation |
| `.claude/settings.json` | `SessionStart`, `UserPromptSubmit`, `InstructionsLoaded`, `PreCompact`, and `SubagentStart` hooks |
| `.mcp.json` | MCP registration |

Claude receives both `.claude/commands/engram.md` and `.claude/skills/engram/SKILL.md` so `/engram` appears in older command menus and newer skill-aware Claude Code sessions.

## Global install

```bash
engram link --global claude
```

Engram appends a managed block to `~/.claude/CLAUDE.md` (preserving user text) and writes the Claude skill to `~/.claude/skills/engram/SKILL.md`. Claude Code does not read `~/.claude/mcp.json`, so global MCP is a hint: Engram prints `claude mcp add --scope user engram -- engram-mcp` for you to run.

## Runtime-first target

Claude is a runtime-first target. The `AGENTS.md` block (and a `CLAUDE.md` block where that file exists) contains short bootstrap instructions that rely on MCP tools and hooks for detailed protocol; the companion guide carries the full write/approval workflow, and the Agent Skill file is a short pointer to it. An existing `CLAUDE.md` block is refreshed and never removed, and `engram link` reports a `CLAUDE.local.md` or a parent-directory `CLAUDE.md` that hides `AGENTS.md` from Claude. The generated skill follows the Agent Skills spec and adds `when_to_use` and `user-invocable: true`; `engram doctor` validates it (`host.skill_frontmatter`). The global install still writes `~/.claude/CLAUDE.md`, because Claude reads no user-level `AGENTS.md`.

## Hook behavior

Claude supports startup and prompt-time additional context injection. `SessionStart` loads routed memory at startup; `UserPromptSubmit` injects only memory bodies not yet delivered in the session. `PreCompact` resets the delivered set. `SubagentStart` (matcher `*`) injects the routed context into each subagent under its own delivered set, and hook output stays under 9,500 characters. Memories with `applies_to` globs reach Claude as native path rules: `engram link claude` writes `.claude/rules/engram/<id>.md` (paths-only frontmatter plus an `<!-- engram:<scope>:<file> sha:<8> -->` marker), and the `InstructionsLoaded` hook (matcher `path_glob_match`) records each load in the delivered set and `usage.json`. Working-tier memories are never written, global memories go to `~/.claude/rules/engram/` on `engram link --global claude`, and files without the marker are left alone. Brace globs need Claude Code v2.1.217 or newer. To keep the older `PreToolUse` injection instead, run `engram config set hooks.path_rules hook` and `engram link claude`; that also removes the generated rule files.

## MCP approval

`engram_commit` carries `_meta["anthropic/requiresUserInteraction"]: true`, so Claude Code asks you before every call, even in bypass modes. Keep it that way: the `approval_token` proves only that a proposal exists. See [MCP tools](mcp.md).

## Next steps

- [Agent Integrations overview](overview.md)
- [Slash adapters](slash.md)
- [MCP tools](mcp.md)
