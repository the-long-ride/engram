---
title: Slash adapters
sidebar_position: 10
description: Engram slash adapters expose /engram commands across Claude, Cursor, Gemini, and OpenCode.
---

# Slash adapters

The `slash` target writes native `/engram` slash adapters for hosts that support project slash commands or Agent Skills.

## Files written

| File | Host |
| --- | --- |
| `.claude/commands/engram.md` | Claude Code |
| `.claude/skills/engram/SKILL.md` | Claude Code (skill form) |
| `.cursor/commands/engram.md` | Cursor |
| `.gemini/commands/engram.toml` | Gemini CLI |
| `.opencode/commands/engram.md` | OpenCode |

## Common commands

```text
/engram
/engram propose
/engram load deployment workflow
/engram entry
/engram save knowledge
/engram save-session
/engram save-session --query-level 3
/engram ss
/engram ss -f
/engram ss -f last 50 sessions
/engram take-control
/engram take control force
/engram restructure workspace memory force
/engram resolve conflicts and metacognize
/engram graph release workflow
/engram archive --reason "Superseded" knowledge/old-fact.md
/engram set-rule-variant strict
/engram verify
```

## Behavior

If the host exposes only one visible `/engram` command, bare `/engram` should return a compact menu of `load`, `search`, `save`, `propose`, `entry`, and `help` instead of running the CLI. `/engram propose` is a slash-level alias: normalize it to `engram save-session` over the current chat/session.

`/engram ss -f` is the force shortcut. Agents must not add `--force` unless the human requested it.

## Natural wording normalization

| Natural wording | Normalizes to |
| --- | --- |
| `/engram auto save` | `engram save-session` |
| `/engram take control force` | `engram take-control --force` |
| `/engram restructure workspace memory force` | `engram metacognize --workspace --force` |
| `/engram take control force metacognize` | `engram take-control --force --metacognize` |
| `/engram resolve conflicts and metacognize` | `engram resolve-conflicts --metacognize` |
| `/engram ss -f last 50 sessions` | `engram save-session --query-level 50 --force` |

## Next steps

- [MCP tools](mcp.md)
- [Hooks and proof lines](hooks.md)
