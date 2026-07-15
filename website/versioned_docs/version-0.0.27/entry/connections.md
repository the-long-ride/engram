---
title: Connections tab
sidebar_position: 3
description: Detect and link supported AI agents from the Entry Web UI.
---

import RiskCallout from '@site/src/components/RiskCallout';

# Connections tab

The Connections tab scans your machine for supported AI agent surfaces and lets you link Engram to each one at the workspace or global level.

## Agent scan

The tab shows a card per supported agent. Each card reports a detected or missing status.

- **Detected** — Engram found a supported local agent surface (config path or app present).
- **Missing** — Engram did not find the agent surface. Missing does not always mean unsupported; it can mean the app or config path is not present yet.

<RiskCallout level="caution">
Missing does not always mean unsupported. It can mean the app or config path is not present on this machine yet.
</RiskCallout>

## Workspace link toggle

Links Engram to the current repo/workspace for that agent. Use when memory should follow the repository: per-project rules, repo-specific memory, team-shared instructions.

## Global link toggle

Links Engram globally for that agent. Use for personal memory, cross-project workflows, and reusable style/rules.

<RiskCallout level="risky">
Use global links carefully on shared machines. Engram writes managed blocks into shared instruction files. Review what files Engram writes per agent before linking globally.
</RiskCallout>

## What files Engram writes per agent

| Target | File |
| --- | --- |
| `codex` | `AGENTS.md`, `.agents/skills/engram/SKILL.md` |
| `agents-md` | `AGENTS.md` |
| `copilot` | `.github/copilot-instructions.md`; global: `~/.copilot/copilot-instructions.md` |
| `claude` | `CLAUDE.md` |
| `cursor` | `.cursor/rules/engram.mdc`; global: `~/.cursor/plugins/local/engram/` |
| `gemini` | `GEMINI.md`; global: `~/.gemini/GEMINI.md`, `~/.gemini/skills/engram/SKILL.md` |
| `cline` | `.clinerules` |
| `windsurf` | `.windsurf/rules/engram.md`; global: `~/.codeium/windsurf/memories/global_rules.md` |
| `opencode` | `AGENTS.md`, `.opencode/engram.md`, `.opencode/skills/engram/SKILL.md`, `opencode.json` |
| `mcp` | `.mcp.json`; global: host MCP config files |
| `slash` | `.claude/commands/engram.md`, `.cursor/commands/engram.md`, `.gemini/commands/engram.toml`, `.opencode/commands/engram.md` |

## When to unlink

- Archiving a repo or test workspace
- Switching an agent away from Engram
- Cleaning stale managed blocks before a fresh `engram upgrade --latest`

`engram unlink` removes only Engram-managed hook entries and adapter files. Human-authored files are preserved unless `--force` is explicit.

## CLI equivalent

```bash
engram link codex
engram link claude
engram link --global opencode
engram unlink
```

## Next steps

- [Construct tab](construct.md)
- [Agent Integrations overview](../integrations/overview.md)
