---
title: Release and upgrade process
sidebar_position: 2
description: Upgrade Engram packages and reconcile memory roots safely.
---

# Release and upgrade process

## Localized upgrade safety summary

Diff affiche les suppressions en rouge et les ajouts en vert. **Force upgrade** permet de forcer uniquement un **bloc Engram** ou un **fichier généré** dont la propriété est prouvée ; le lot ne force jamais les changements et la vérification de convergence évite les faux succès.

## After an npm package update

The next normal Engram command quietly reconciles already-initialized workspace/global roots once for the new version. This covers release-to-release memory schema changes from v0.0.8 onward by refreshing generated help, memory indexes, graph files, and eligible vector sidecars when older metadata is detected.

The startup check is intentionally cheap after the first run: it only reads small config markers when the current version is already recorded. It does not run from npm postinstall, create new memory roots, or replace human-authored files. Use `--no-auto-upgrade` or `ENGRAM_NO_AUTO_UPGRADE=1` to skip it for a command.

## Explicit upgrade

```bash
engram upgrade
engram upgrade --plan
engram upgrade --latest
```

`engram upgrade` refreshes generated workspace help, memory indexes, graph files, eligible vector sidecars, existing Engram-generated workspace skillset files, and registered global skillsets while preserving human-authored files.

`engram upgrade --latest` is stronger: it overwrites current Engram-managed linked agent artifacts for already-linked workspace agents and registered global installs, including instruction files, rules, MCP/plugin config, and managed hooks, so linked hosts pick up the new package output immediately.

Use `--force` only when replacing generated Engram adapter files intentionally.

## Ownership-aware configuration reconciliation

The latest-upgrade inventory deduplicates registered integrations by physical file. If several hosts share the same Engram guide, Engram renders and writes that file once instead of letting host-specific rows rewrite one another.

When manual edits make a known Engram artifact unsafe for normal replacement, Entry can offer **Force upgrade** only when ownership is provable. For a marked Engram block, force replaces only that block and preserves surrounding user text. For a registered/generated Engram file, force can replace the entire generated file. Unknown ownership is never forceable, and bulk confirmation never performs force actions.

A successful apply is verified by a post-write rescan. Rolled-back or failed transactions and expected-updated artifacts that do not converge to `current` are reported as errors; Entry does not show an upgrade-success toast for those cases.

## Skillset render profiles

For runtime-capable hosts, Engram installs small bootstrap instructions instead of the full protocol. Hooks provide routed task context, MCP tools provide load/search/proposal behavior, and slash adapters or Agent Skills carry detailed command workflows. Fallback targets without reliable runtime context injection still receive compact manual instructions.

## SQLite config DB fallback

Engram's SQLite config DB is an optimization for workspace/profile management. If the DB cannot be opened or initialized, normal read/write commands fall back to JSON config snapshots. DB-specific commands report SQLite as unavailable instead of blocking normal memory use.


## Legacy memory migration to schema v3

`engram upgrade --latest` also migrates active v1/v2 memory files in the workspace and configured global roots to schema v3. Engram preserves each Markdown body exactly, creates `<memory-file>.pre-v3.bak`, fills only deterministic metadata, refreshes integrity hashes, and rebuilds the index, graph, and eligible vector sidecars. It never invents `evidence_refs`; a memory without verified trace links is marked `evidence_status: unverified`. Invalid memories are reported and skipped, archived memories are not rewritten, and a second run is idempotent.

Preview all changes without writing:

```bash
engram upgrade --latest --plan
```

Run only the memory migration, without overwriting linked agent artifacts:

```bash
engram upgrade --migrate-memories
```

Skip memory migration during a latest upgrade:

```bash
engram upgrade --latest --no-migrate-memories
```

## Next steps

- [Troubleshooting](troubleshooting.md)
- [CLI: inject / link / upgrade](../cli/inject-link-upgrade.md)


## Git author identity

Engram can store a global author and an optional workspace override. Resolution is workspace, global, then read-only Git fallback. Settings affect future memories only; a workspace override never changes global Git configuration. Use explicit plan and confirmation for global Git sync or legacy-memory migration.

```bash
engram author show
engram author set --name "Jane Doe" --email "jane@example.com"
engram author unset --scope workspace
engram author sync-git-global --plan
engram author sync-git-global --confirm
engram author migrate-memories --plan
engram author migrate-memories --confirm
```

Read the complete [Git author settings guide](git-author-settings.md).


<!-- configuration-upgrade-inventory -->

Conflict review uses the same shared plan in CLI and Entry. Run `engram upgrade --latest --review` to accept the latest type-aware proposal, edit it via `$VISUAL`/`$EDITOR`, or confirm **Keep current**. Entry provides **Current**, **Proposed**, and **Diff** views; **Diff** defaults to **Inline** and can switch to **Parallel**, with removed content highlighted red and added content green. Final apply is blocked while `pendingReviewCount` is non-zero, and `engram upgrade --latest --yes` refuses unresolved or stale decisions. Each decision is checked against its source hash before writing.

## Configuration upgrade inventory

After a package update, run `engram upgrade --latest --plan` before `engram upgrade --latest`. The shared inventory scans workspace and global Engram-managed memories, instructions, skillsets, configs, hooks, and plugins. User-authored bytes are preserved; ambiguous mixed files are reported as conflicts that require explicit review before apply. See [Configuration upgrades](configuration-upgrades.md).
