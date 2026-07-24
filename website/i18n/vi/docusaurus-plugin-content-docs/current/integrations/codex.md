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
| `.agents/skills/engram/SKILL.md` | Agent Skill with full write/approval workflow |
| `.codex/hooks.json` | `SessionStart` and `UserPromptSubmit` hooks |
| `.mcp.json` | MCP registration |

## Global install

```bash
engram link --global codex
```

Writes the Codex skill to `~/.codex/skills/engram/SKILL.md` and appends a managed block to shared Codex instruction files.

## Hook behavior

Codex supports startup and prompt-time additional context injection. `SessionStart` loads routed memory at startup; `UserPromptSubmit` reinjects only when routed Engram context changes.

## Runtime-first target

Codex is a runtime-first target. `AGENTS.md` contains short bootstrap instructions that rely on MCP tools and hooks for detailed protocol; the Agent Skill file carries the full write/approval workflow.

## Next steps

- [Agent Integrations overview](overview.md)
- [Hooks and proof lines](hooks.md)
