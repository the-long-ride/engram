---
title: save / save-session / observe
sidebar_position: 3
description: Write commands — save one memory, save several from a session, and capture raw notes.
---

# save / save-session / observe

Write commands propose memory through the approval gate.

## save

```bash
engram save [rule|workflow|knowledge] "<text>"
engram save --role frontend "<text>"
engram save --scope global "<text>"
```

`engram save` captures the best single memory candidate, automatically updates a matching memory or creates a new one, and always shows the A/B/C approval gate before writing.

When `engram save` finds related active memories, the approval preview reports them with a suggested `depends_on` or possible-duplicate warning.

## save-session

```bash
engram save-session
engram ss
engram save-session --query-level 3
engram ss -f
engram ss -f last 50 sessions
engram save-session --file transcript.md
engram save-session --force
```

Use `save-session` when a long interaction produced multiple candidates:

```text
TYPE: rule | TEXT: Always run tests before release. | CONTEXT: Created from release planning so future agents preserve the test gate.
TYPE: knowledge | TEXT: Release notes live in CHANGELOG.md.
TYPE: workflow | TEXT: When releasing, run tests, update changelog, then tag.
```

`CONTEXT: ...` is optional. Add it only when it explains why the memory exists. Candidates may also add `DEPENDS_ON`, `LEVEL`, or `UPDATE` fields when restructuring related memory.

- `--query-level <n>` — mine up to n recent accessible human-agent chats; must be a positive integer; agents must not invent unavailable history
- `--force` / `-f` — every generated candidate is saved because the human explicitly approved that shortcut
- `--file <path>` — for transcripts or long summaries already on disk

For `/engram take-control --force` or natural `/engram take control accept all`, the slash adapter normalizes the wording, generates only concise `TYPE: ... | TEXT: ...` candidates, and lets Engram save them without a second approval prompt.

## observe

```bash
engram observe --file session.md
engram save-session --file .agents/.engram/inbox/<note>.md
```

`observe` stores sanitized raw notes in `inbox/`. Inbox notes are not active memory. Use this when you want to preserve rough notes before deciding what should become durable memory.

## Related-memory hints

When an accept-all run reports related memories before writing, no file was saved yet. The agent should rerun with structured candidates:

```text
TYPE: rule | TEXT: OAuth rotation follows release foundations. | DEPENDS_ON: release-foundation | LEVEL: advanced
TYPE: knowledge | TEXT: Invoice retries use exponential backoff. | UPDATE: invoice-retry-baseline
```

## Next steps

- [inject / link / upgrade](inject-link-upgrade.md)
- [Concepts: write path and approval](../concepts/write-path.md)

