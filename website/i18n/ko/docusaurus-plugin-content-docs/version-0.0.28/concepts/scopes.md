---
title: Workspace vs global memory
sidebar_position: 3
description: Workspace memory wins. Global memory is fallback for reusable preferences and team context across projects.
---

# Workspace vs global memory

Engram resolves memory in two scopes.

## Workspace memory

Workspace memory lives in:

```text
<project>/.agents/.engram/
```

It holds project-specific rules, decisions, and workflows. Workspace memory wins over global duplicates.

## Global memory

Global memory is optional and lives wherever the user configures it. It holds preferences and team context that should follow you across repos.

```bash
engram inject --global-only --global-path ~/Documents/engram
```

Global memory is fallback for reusable preferences, personal habits, or team-wide defaults.

## Scope priority

1. Workspace memory: `<project>/.agents/.engram/`
2. Global memory: `$ENGRAM_GLOBAL_DIR` or `engram inject --global-path <path>`

Workspace memory wins. Global memory is fallback for reusable preferences and team context across projects.

## Choose a save target

Use `set-save-target` to choose where normal saves go:

```bash
engram set-save-target status
engram set-save-target workspace
engram set-save-target global
engram set-save-target both
```

Fresh workspace installs default normal saves to both workspace and global when global memory is configured. Agents can override one write with `--scope workspace|global|both`.

If the active configuration scope is set to `global` (`scope: "global"`), workspace-level skillset linking is disabled and skipped to prevent writing files to the running folder. To link agents in a global-scope setup, use `engram link --global`.

## Next steps

- [Profiles and scope resolution](profiles.md)
- [Read path and routing](read-path.md)
