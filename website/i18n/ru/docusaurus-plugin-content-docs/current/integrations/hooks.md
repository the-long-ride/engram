---
title: Hooks and proof lines
sidebar_position: 12
description: Engram agent hooks inject routed memory at session start and prompt turns. Proof lines make injection visible.
---

# Hooks and proof lines

Agent hooks are opt-in host hooks that inject routed Engram context at session start and later task-change turns when the host exposes a safe prompt-time context channel.

## Install hooks

```bash
engram link codex
engram link claude
engram link gemini
engram link cursor
engram link windsurf
engram link --global opencode
engram set-proof compact
```

Use `--global` for user-level config and `engram unlink` to remove only Engram-managed hook entries.

## Read mode

`engram set-read startup|auto|always|manual|off` controls runtime behavior:

- `auto` loads on session start and reinjects only when routed Engram context changes.
- `startup` loads only at session start.
- `always` reinjects on every eligible turn.
- `manual` and `off` reduce automation.

The hook cache stores hashes, session ids, host, cwd, and routed signatures — never raw prompt text.

## Proof mode

`engram set-proof off|compact` controls whether supported hooks also append a compact `Engram proof:` line on each eligible turn. Proof visibility is separate from `set-read`: `compact` can report loaded, reused, or skipped turns without changing when full Engram memory is injected.

## Hook capability matrix

| Host | Config path | Events |
| --- | --- | --- |
| `codex` | `.codex/hooks.json`; global `~/.codex/hooks.json` | `SessionStart`, `UserPromptSubmit` |
| `claude` | `.claude/settings.json`; global `~/.claude/settings.json` | `SessionStart`, `UserPromptSubmit` |
| `gemini` | `.gemini/settings.json`; global `~/.gemini/settings.json` | `SessionStart`, `BeforeAgent` |
| `cursor` | `.cursor/hooks.json`; global plugin `hooks/hooks.json` | `sessionStart` |
| `windsurf` / `cascade` | `.windsurf/hooks.json`; global `~/.codeium/windsurf/hooks.json` | `pre_user_prompt` |
| `opencode` | `~/.config/opencode/plugins/engram.js` | `chat.message`, `experimental.chat.system.transform` |
| `copilot` | None written | N/A |
| `cline` | None written | N/A |

## Next steps

- [Agent Integrations overview](overview.md)
- [CLI: inject / link / upgrade](../cli/inject-link-upgrade.md)
