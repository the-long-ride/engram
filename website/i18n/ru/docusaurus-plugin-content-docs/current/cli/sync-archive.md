---
title: sync / clone-memory / archive
sidebar_position: 7
description: Sync, clone, and archive commands for moving memory between scopes.
---

# sync / clone-memory / archive

Move memory between scopes and retire wrong memory safely.

## clone-memory

```bash
engram clone-memory workspace global
engram clone-memory global workspace --force
engram clone-memory workspace global --metacognize
```

Copy active `rules/`, `skills/`, and `knowledge/` Markdown between workspace and global scopes. Add `--metacognize` when you want cloned memories proposed through the save-session approval flow instead of copied verbatim.

Agents may normalize natural clone requests into `engram clone-memory`, for example "clone workspace memory to global" -> `engram clone-memory workspace global`. Reverse the scopes to copy global memory into a workspace; use `--force` only when the human explicitly asks to overwrite destination copies.

## archive

```bash
engram archive --reason "<why>" <id-or-file>
```

Archive wrong or superseded memory. The file leaves active routing only after approval and remains preserved under `archive/`. Use archive, not delete, for auditability.

## observe (inbox)

```bash
engram observe --file session.md
engram save-session --file .agents/.engram/inbox/<note>.md
```

`observe` stores sanitized raw notes in `inbox/`. Inbox notes are not active memory.

## Global Git sync

Global Git sync is controlled by the `global_git.*` config fields. See [Entry Web UI: Construct tab](../entry/construct.md) for every field. Use `engram entry` and the Construct tab, or `engram config view`, to inspect resolved Git detection.

## Next steps

- [profiles / workspaces / config](profiles-workspaces-config.md)
- [Operations: team Git workflow](../operations/team-git-workflow.md)
