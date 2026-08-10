---
title: Release and upgrade process
sidebar_position: 2
description: Upgrade Engram packages and reconcile memory roots safely.
---

# Release and upgrade process

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

## Skillset render profiles

For runtime-capable hosts, Engram installs small bootstrap instructions instead of the full protocol. Hooks provide routed task context, MCP tools provide load/search/proposal behavior, and slash adapters or Agent Skills carry detailed command workflows. Fallback targets without reliable runtime context injection still receive compact manual instructions.

## SQLite config DB fallback

Engram's SQLite config DB is an optimization for workspace/profile management. If the DB cannot be opened or initialized, normal read/write commands fall back to JSON config snapshots. DB-specific commands report SQLite as unavailable instead of blocking normal memory use.

## Next steps

- [Troubleshooting](troubleshooting.md)
- [CLI: inject / link / upgrade](../cli/inject-link-upgrade.md)
