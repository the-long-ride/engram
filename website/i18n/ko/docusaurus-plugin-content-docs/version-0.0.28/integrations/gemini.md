---
title: Gemini
sidebar_position: 4
description: Engram integration with Gemini CLI and Antigravity Gemini-compatible surfaces.
---

# Gemini

Gemini CLI searches for `GEMINI.md` files as context. The `slash` target writes `.gemini/commands/engram.toml` so `/engram <args>` becomes a project custom command in Gemini CLI.

Engram also treats `gemini` as the advertised target for Antigravity 2.0, Antigravity CLI, and Antigravity IDE because current Google docs still tie Antigravity context and skills to Gemini-compatible locations. The hidden `antigravity` and `antigravity-cli` target names remain explicit compatibility paths, but they are not shown in `engram link list`, help, completion, or `all`.

## Install

```bash
engram link gemini
```

## Files written

| File | Purpose |
| --- | --- |
| `GEMINI.md` | Project context bootstrap |
| `.gemini/commands/engram.toml` | `/engram` slash adapter |
| `.gemini/settings.json` | `SessionStart` and `BeforeAgent` hooks |
| Gemini MCP config | MCP registration |

## Global install

```bash
engram link --global gemini
```

Writes `~/.gemini/GEMINI.md`, `~/.gemini/skills/engram/SKILL.md`, and the Gemini MCP config file.

## Runtime-first target

Gemini is a runtime-first target. `GEMINI.md` contains short bootstrap instructions that rely on MCP tools and hooks for detailed protocol; the Agent Skill file carries the full write/approval workflow.

## Hook behavior

Gemini supports startup and prompt-time `hookSpecificOutput.additionalContext` injection via `SessionStart` and `BeforeAgent` events.

## Antigravity compatibility

For hooks, `gemini` is also the public Antigravity fallback. The hidden `antigravity` and `antigravity-cli` hook targets normalize to Gemini hook behavior and paths until Google publishes stable primary Antigravity hook/config documentation.

## Next steps

- [Agent Integrations overview](overview.md)
- [Hooks and proof lines](hooks.md)
