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
| `.gemini/settings.json` | `SessionStart`, `BeforeAgent`, `AfterTool`, and `PreCompress` hooks |
| `.gemini/settings.json` | MCP registration (`mcpServers.engram`, merged next to the hooks) |

## Global install

```bash
engram link --global gemini
```

Writes `~/.gemini/GEMINI.md`, `~/.gemini/skills/engram/SKILL.md`, and merges `mcpServers.engram` into `~/.gemini/settings.json`.

## Runtime-first target

Gemini is a runtime-first target. `GEMINI.md` contains short bootstrap instructions that rely on MCP tools and hooks for detailed protocol; the companion guide carries the full write/approval workflow, and the Agent Skill file is a short pointer to it.

## Hook behavior

Gemini supports startup and prompt-time `hookSpecificOutput.additionalContext` injection via `SessionStart` and `BeforeAgent` events; `PreCompress` (before the CLI summarizes history) resets the delivered set. `AfterTool` (matcher `read_file|write_file|replace`, timeout in milliseconds) injects up to 3 undelivered memories whose `applies_to` globs match the file the tool touched; the context is appended to the tool result, so it lands one step after the read. It shares the delivered set with `BeforeAgent` and never returns a decision. `engram link gemini` or `engram upgrade --latest` adds the event to an existing install.

If `mcpServers.engram` in `.gemini/settings.json` sets `trust: true`, Gemini skips its confirmation for `engram_commit`; `engram doctor` warns about it (`host.gemini_trust`).

## Antigravity compatibility

For hooks, `gemini` is also the public Antigravity fallback. The hidden `antigravity` and `antigravity-cli` hook targets normalize to Gemini hook behavior and paths until Google publishes stable primary Antigravity hook/config documentation.

## Next steps

- [Agent Integrations overview](overview.md)
- [Hooks and proof lines](hooks.md)
