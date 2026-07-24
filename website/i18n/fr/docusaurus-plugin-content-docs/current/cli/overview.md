---
title: Command overview
sidebar_position: 1
description: Map of every Engram CLI command and what it does.
---

# Command overview

Run `engram -h` for the compact command surface. Run `engram help <topic>` or `engram -h <topic>` for command-specific examples and use cases.

## Command map

| Need | Command |
| --- | --- |
| Load task memory | `engram load "<task>"` |
| Load compact task memory | `engram load "<task>"` |
| Print AI-agent usage guide | `engram llm` |
| Preview routed memory files | `engram load --dry-run "<task>"` |
| Search memory | `engram search "<topic>"` |
| Save one memory | `engram save [rule\|workflow\|knowledge] "<text>"` |
| Save several session memories | `engram save-session` or `engram ss` |
| Mine recent accessible chats | `engram save-session --query-level 3` |
| Force-save session candidates | `engram ss -f` |
| Mine and force-save recent chats | `engram ss -f last 50 sessions` |
| Capture raw note | `engram observe --file session.md` |
| Convert existing docs/guidance | `engram take-control --all` |
| Preview source takeover | `engram take-control --plan` |
| Restructure existing memory folder | `engram metacognize --workspace\|--global\|--all` |
| Resolve conflicts and metacognize | `engram resolve-conflicts --metacognize` |
| Inspect graph routing | `engram graph "<topic>"` |
| Check hashes | `engram verify` |
| Find malformed memory files | `engram repair` |
| Archive wrong memory | `engram archive --reason "<why>" <id-or-file>` |
| Tune rule strength | `engram set-rule-variant strict\|balanced\|light\|off` |
| Set default save target | `engram set-save-target workspace\|global\|both\|status` |
| Set compact load limit | `engram set-load-limit 1..32\|status\|reset` |
| Set automatic hook reads | `engram set-read startup\|auto\|always\|manual\|off\|status` |
| Set hook proof visibility | `engram set-proof off\|compact\|status` |
| Install agent hooks | `engram link codex\|claude\|gemini\|opencode\|cursor\|windsurf` |
| Manage global profiles | `engram profile status\|list\|create\|use\|merge` |
| Clone workspace/global memory | `engram clone-memory workspace global [--metacognize]` |

## Command discovery

```bash
engram help save-session
engram help set-role
engram -h set-rule-variant
```

All commands listed in help include short aliases. Aliases route to the same CLI behavior and approval gates as their canonical commands.

## Shell completion

```bash
engram completion bash
engram completion zsh
engram completion powershell
```

## Next steps

- [load / search / graph](load-search-graph.md)
- [save / save-session / observe](save-session.md)
- [inject / link / upgrade](inject-link-upgrade.md)
