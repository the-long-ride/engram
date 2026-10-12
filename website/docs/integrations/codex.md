---
title: Codex
sidebar_position: 2
description: Engram integration with OpenAI Codex via AGENTS.md and Agent Skills.
---

# Codex

OpenAI Codex and other AGENTS.md-compatible agents use `AGENTS.md` as a project instruction file. The `codex` alias also writes `.agents/skills/engram/SKILL.md` so agents that discover Agent Skills can route Engram as an invokable skill.

## Install

```bash
engram link codex
```

## Files written

| File | Purpose |
| --- | --- |
| `AGENTS.md` | Project instructions bootstrap |
| `.agents/skills/engram/SKILL.md` | Short Agent Skill pointer to the guide |
| `.agents/engram.md` | Companion guide with the full write/approval workflow |
| `.codex/hooks.json` | `SessionStart`, `UserPromptSubmit`, `PreToolUse`, `PreCompact`, and `SubagentStart` hooks |
| `.mcp.json` | MCP registration |

## Global install

```bash
engram link --global codex
```

Writes the Codex skill to `~/.codex/skills/engram/SKILL.md` and appends a managed block to shared Codex instruction files. Global MCP is a managed `[mcp_servers.engram]` block in `~/.codex/config.toml`; it also sets `approval_mode = "approve"` on `[mcp_servers.engram.tools.engram_commit]` so Codex asks before each commit (`engram upgrade` or `engram link codex` refreshes older blocks). `engram doctor` reports the size of your AGENTS.md chain against Codex's 32 KiB limit (`host.agents_md_chain`).

## Hook behavior

Codex supports startup and prompt-time additional context injection. `SessionStart` loads routed memory at startup; `UserPromptSubmit` injects only memory bodies not yet delivered in the session. `PreToolUse` injects memories whose `applies_to` globs match files edited through `apply_patch` (it does not fire on reads), and `PreCompact` resets the delivered set. `SubagentStart` (matcher `*`) injects the routed context into each subagent; the subagent's delivered set is keyed `<session_id>#agent:<agent_id>`, so it never touches the parent's. Codex limits a hook message to about 2,500 tokens, so Engram keeps `additionalContext` at or below 2,400 tokens and demotes bodies to cards instead of cutting them.

## Runtime-first target

Codex is a runtime-first target. `AGENTS.md` contains short bootstrap instructions that rely on MCP tools and hooks for detailed protocol; the companion guide carries the full write/approval workflow, and the Agent Skill file is a short pointer to it.

## Next steps

- [Agent Integrations overview](overview.md)
- [Hooks and proof lines](hooks.md)
