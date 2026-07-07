---
title: Daily workflow
sidebar_position: 4
description: The everyday Engram loop — load, work, search, save, and keep memory healthy.
---

# Daily workflow

The Engram daily loop is intentionally boring: load memory at the start, search when you need more, save when something durable emerges, and audit at the end.

## Start of session

```text
/engram load --for-agents "current task"
```

Or from the terminal:

```bash
engram load --for-agents "<task>"
```

The agent should reply with a compact count line such as `Engram loaded: 8 memories / 24 total related memories.` unless the human asks for IDs, rules, or raw output.

## During work

Search when the task changes or you suspect project knowledge is missing:

```text
/engram search "topic I might be missing"
```

Preview which memory files would route without printing their contents:

```bash
engram load --dry-run "<query>"
```

Return every visible routed match instead of the compact limit:

```bash
engram load --all "<query>"
```

## Save one durable fact

```text
/engram save knowledge
```

`engram save` captures the best single memory candidate, automatically updates a matching memory or creates a new one, and always shows the A/B/C approval gate before writing.

## Save several memories from a session

```text
/engram save-session
/engram ss
```

Provide candidates in this shape:

```text
TYPE: rule | TEXT: Always run tests before release. | CONTEXT: Created from release planning so future agents preserve the test gate.
TYPE: knowledge | TEXT: Release notes live in CHANGELOG.md.
TYPE: workflow | TEXT: When releasing, run tests, update changelog, then tag.
```

`CONTEXT: ...` is optional. Add it only when it explains why the memory exists.

## Mine recent chats

```text
/engram save-session --query-level 3
/engram ss -a last 50 sessions
```

`--query-level` must be a positive integer. The agent may use up to that many recent human-agent chat sessions, including the current one, and must not invent unavailable history.

## Accept-all shortcut

```text
/engram ss -a
```

`-a` means the human explicitly approves every agent-recommended candidate. Agents must not add `--accept-all` unless the human requested it.

When an accept-all run reports related memories before writing, no file was saved yet. The agent should rerun with structured candidates:

```text
TYPE: rule | TEXT: OAuth rotation follows release foundations. | DEPENDS_ON: release-foundation | LEVEL: advanced
TYPE: knowledge | TEXT: Invoice retries use exponential backoff. | UPDATE: invoice-retry-baseline
```

## Role routing

Save role-specific memory:

```bash
engram save --role frontend ...
engram save-session --role backend ...
```

Tune role routing:

```bash
engram set-role frontend
engram set-role backend security
engram set-role
```

When `engram set-role ...` or `engram set-rule-variant ...` succeeds, the CLI returns an `Agent action:` line. Engram-aware slash adapters and MCP hosts should immediately rerun `engram load "<current task/request>"` and treat that result as replacing prior Engram-loaded context.

## End of meaningful work

```text
Check Engram health, report invalid memories, and propose anything worth saving from this session.
```

Useful commands:

```bash
engram upgrade
engram verify
engram repair
engram graph "<topic>"
engram quality-check
engram archive --reason "<why>" <id-or-file>
```

## Next steps

- [CLI Reference](cli/overview.md)
- [Operations troubleshooting](operations/troubleshooting.md)
- [Entry Web UI](entry/index.md)
