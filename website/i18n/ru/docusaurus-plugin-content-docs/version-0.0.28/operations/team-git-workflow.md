---
title: Team workflow with Git
sidebar_position: 1
description: Use Git to carry Engram memory between machines and give review history.
---

# Team workflow with Git

Git carries memory between machines and gives review history. Engram is Git-native: memory is plain Markdown, so the normal Git workflow applies.

## Workspace memory as a submodule

If the human wants `.agents/.engram` tracked as a separate repository:

```bash
engram inject --submodule
engram inject --submodule-remote <git-url>
```

Engram validates the URL, initializes the submodule on `main`, and creates the first submodule commit as `Initialize engram`.

## Shared global Git origin

If `engram entry` shows no `global_git_detected.remote_url`, ask the human whether global memory should be shared through Git. When they provide a URL:

```bash
engram inject --global-remote <git-url>
```

Configure sync behavior with the `global_git.*` fields:

- `global_git.enabled` — enables Git behavior for global memory
- `global_git.remote` — remote name (default `origin`)
- `global_git.remote_url` — shared global memory remote URL
- `global_git.branch` — target branch (default `main`)
- `global_git.auto_sync` — auto pull/push behavior
- `global_git.auto_resolve` — auto conflict handling

:::warning
Auto conflict handling can mask memory diffs. Review memory diffs before relying on `global_git.auto_resolve`.
:::

## Review workflow

1. Agent proposes memory candidates.
2. Human approves via the A/B/C gate (terminal) or `yes`/`audit`/`cancel` (chat).
3. Engram writes approved Markdown and refreshes hashes, index, graph, and changelog.
4. Commit and push the memory change through Git.
5. Teammates pull and run `engram upgrade` to reconcile.

## Next steps

- [Release and upgrade process](release-upgrade.md)
- [Concepts: write path and approval](../concepts/write-path.md)
