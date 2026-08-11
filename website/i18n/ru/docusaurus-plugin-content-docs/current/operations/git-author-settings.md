---
title: Настройки автора Git
sidebar_position: 2
description: Configure the identity written to future Engram memories and Engram-created Git commits.
---

# Настройки автора Git

Engram хранит переносимый профиль автора; разрешённая личность применяется к будущей памяти и не изменяет Git-конфигурацию репозитория.

Engram owns an author profile so memory authorship is explicit and portable. The resolved identity is written to future memory frontmatter and supplied to Engram-created Git commits through process-local environment variables. Repository Git configuration is not changed.

<!-- future-memories-only -->
Author settings affect **future memories only**. Existing memories change only through the explicit migration command.

<a id="global-author"></a>
## Global author

Set the default Engram identity for all workspaces:

```bash
engram author set --name "Jane Doe" --email "jane@example.com"
engram author show
engram author --help
engram author set --help
```

New memory files use separate fields:

```yaml
author_name: Jane Doe
author_email: jane@example.com
```

Legacy `author: jane@example.com` remains readable, but new memories do not write it.

<a id="workspace-override"></a>
## Workspace override

A workspace can override the global Engram profile without changing other workspaces:

```bash
engram author set --scope workspace --name "Workspace Jane" --email "jane@work.com"
engram author show --scope workspace
```

<!-- workspace-never-syncs-global-git -->
A workspace override never changes global Git config. It is stored in the workspace and is used only for memories and Engram-created commits in that workspace.

<a id="resolution-order"></a>
## Resolution order

Engram resolves identity in this order:

1. Workspace Engram author.
2. Global Engram author.
3. Read-only effective Git `user.name` and `user.email` fallback.
4. Unresolved.

```bash
engram author show
engram author show --json
engram author show --help
```

A complete valid name and email are required before a memory write. Engram-created commits receive `GIT_AUTHOR_NAME`, `GIT_AUTHOR_EMAIL`, `GIT_COMMITTER_NAME`, and `GIT_COMMITTER_EMAIL`; local and global Git config remain unchanged.

In Entry, the resolved name is followed by a compact source badge: `WORKSPACE` for a workspace override, `GLOBAL` for the Engram global profile, `GIT` for Git fallback, and `UNRESOLVED` when no complete identity exists.

<a id="remove-an-author-profile"></a>
## Remove an author profile

```bash
engram author unset --scope workspace
engram author unset --scope global
engram author unset --help
```

The Web UI requires confirmation. The CLI removes the profile immediately after the explicit `unset` command. After removal, the next source in the resolution order becomes active.

<a id="global-git-configuration"></a>
## Global Git configuration

Entry exposes the existing global-memory Git settings **only in the Global tab** under **Settings → Git**. They continue to use the shared configuration backend; moving the controls does not create a second Git config store.

The Global tab can edit `global_git.enabled`, `global_git.remote`, `global_git.remote_url`, `global_git.branch`, `global_git.auto_sync`, and `global_git.auto_resolve`. These fields are risky, so Entry validates the patch, shows the exact changed keys, and requires review before saving. The Workspace tab never renders these global controls.

<a id="sync-to-global-git"></a>
## Sync to global Git

Only the global Engram profile can be copied to global Git configuration. Preview first, then explicitly confirm:

```bash
engram author sync-git-global --plan
engram author sync-git-global --confirm
engram author sync-git-global --help
```

The confirmed operation writes `git config --global user.name` and `git config --global user.email`, verifies both values, and restores the exact previous values if either write or verification fails. A workspace profile is never eligible for this operation.

<a id="migrate-existing-memories"></a>
## Migrate existing memories

Backfill `author_name` and `author_email` only when a complete deterministic identity is available:

```bash
engram author migrate-memories --plan
engram author migrate-memories --scope workspace --confirm
engram author migrate-memories --scope both --confirm
engram author migrate-memories --help
```

Migration preserves the Markdown body, creates a `.pre-author-v3.bak` backup, skips archives and invalid files, and is idempotent. It never guesses a missing name. Preview output lists eligible, current, skipped, and invalid files before any write.

## Entry Web UI

Open `engram entry`, then choose **Settings → Git**. Global and Workspace tabs show stored profiles, the resolved source badge, review-before-save dialogs, and memory migration preview. The Global tab additionally owns **Global Git configuration** and the explicit Git sync preview; those controls are hidden from Workspace. Every information button opens this localized page in a new tab and shows the matching CLI `--help` command.

## Privacy and troubleshooting

Names and email addresses become durable metadata in Markdown and Git history. Use an address appropriate for the repository's visibility. If saving reports an unresolved author, run `engram author show`, set a global or workspace profile, or configure Git fallback values. Global Git sync is never automatic.
