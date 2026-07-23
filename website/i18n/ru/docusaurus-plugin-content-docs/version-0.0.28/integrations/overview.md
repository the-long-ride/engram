---
title: Agent Integrations overview
sidebar_position: 1
description: Engram supports skill files, slash adapters, MCP tools, and agent hooks across many AI hosts.
---

# Agent Integrations overview

Engram supports two integration layers:

- **Skill files** — generated instructions for agents that read project context.
- **Slash adapters** — generated `/engram` command prompts for agents that support project slash commands or Agent Skills.
- **MCP-style tools** — a JSON-lines wrapper for agents that can register external tool processes.
- **Agent hooks** — opt-in host hooks that inject routed Engram context at session start and later task-change turns.

## Quick start

```bash
engram inject
engram link all
```

`engram link all` installs the public target set and reports deterministic `SKIPPED` reasons for partial hosts across skillset instruction files, MCP config, slash adapters, and agent hooks in one unified install.

## Target categories

| Category | Targets | Behavior |
| --- | --- | --- |
| Runtime-first | `codex`, `claude`, `cursor`, `gemini` | Short bootstrap instructions plus full Agent Skills and MCP config |
| Hook-capable | `codex`, `claude`, `gemini`, `opencode`, `cursor`, `windsurf`/`cascade` | Agent hooks with host-specific event schemas |
| Compact/manual fallback | `agents-md`, `copilot`, `cline` | Full compact protocol; no reliable runtime context injection in v1 |

## Supported targets

| Target | File | Main use |
| --- | --- | --- |
| `codex` | `AGENTS.md`, `.agents/skills/engram/SKILL.md` | OpenAI Codex project instructions and Agent Skill |
| `agents-md` | `AGENTS.md` | Generic fallback for unlisted AGENTS.md-compatible agents |
| `copilot` | `.github/copilot-instructions.md`; global: `~/.copilot/copilot-instructions.md` | GitHub Copilot repository and user instructions |
| `claude` | `CLAUDE.md` | Claude Code project guidance |
| `cursor` | `.cursor/rules/engram.mdc`; global: `~/.cursor/plugins/local/engram/` | Cursor project rules and local plugin |
| `gemini` | `GEMINI.md`; global: `~/.gemini/GEMINI.md`, `~/.gemini/skills/engram/SKILL.md` | Gemini CLI context, including Antigravity Gemini-compatible surfaces |
| `cline` | `.clinerules` | Cline-style workspace rules |
| `windsurf` | `.windsurf/rules/engram.md`; global: `~/.codeium/windsurf/memories/global_rules.md` | Windsurf workspace rules and global rules/MCP |
| `opencode` | `AGENTS.md`, `.opencode/engram.md`, `.opencode/skills/engram/SKILL.md`, `opencode.json` | OpenCode rules, Agent Skill, MCP tools, custom commands, plugin hooks |
| `mcp` | `.mcp.json`; global: Claude and Gemini MCP config files | MCP-style JSON-lines wrapper registration |
| `slash` | `.claude/commands/engram.md`, `.cursor/commands/engram.md`, `.gemini/commands/engram.toml`, `.opencode/commands/engram.md` | Native `/engram` slash adapters |

Aliases: `codex` installs the `agents-md` adapter plus the generic Agent Skill file, `open-code` maps to `opencode`, and `cascade` maps to `windsurf`. The old `antigravity` and `antigravity-cli` targets are hidden compatibility aliases for now.

## Hook capability matrix

| Host | Hook install in v1 | Events |
| --- | --- | --- |
| `codex` | Yes | `SessionStart`, `UserPromptSubmit` |
| `claude` | Yes | `SessionStart`, `UserPromptSubmit` |
| `gemini` | Yes | `SessionStart`, `BeforeAgent` |
| `cursor` | Yes | `sessionStart` |
| `windsurf` / `cascade` | Yes | `pre_user_prompt` |
| `opencode` | Supported via local plugin | `chat.message`, `experimental.chat.system.transform` |
| `copilot` | Skipped | N/A |
| `cline` | Skipped | N/A |

## Next steps

- [Codex](codex.md)
- [Claude](claude.md)
- [Gemini](gemini.md)
- [Cursor](cursor.md)
- [Windsurf / Cascade](windsurf.md)
- [OpenCode](opencode.md)
- [Copilot](copilot.md)
- [Cline](cline.md)
- [Slash adapters](slash.md)
- [MCP tools](mcp.md)
- [Hooks and proof lines](hooks.md)
