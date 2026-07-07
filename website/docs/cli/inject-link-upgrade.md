---
title: inject / link / upgrade
sidebar_position: 4
description: Setup and adapter commands — initialize workspaces, link agents, and reconcile after package updates.
---

# inject / link / upgrade

Setup and adapter commands initialize workspaces, link agents, and reconcile after package updates.

## inject

```bash
engram inject
engram inject --global-only --global-path <path>
engram inject --submodule
engram inject --submodule-remote <git-url>
engram inject --global-remote <git-url>
engram inject --no-skillset
engram inject --skillset all
```

`engram inject` creates `.agents/.engram/` and installs the compact Codex target by default. Existing human-authored files are skipped.

Interactive inject asks in this order: whether to add `./.agents/.engram` as a submodule, whether to use a global Engram path, and whether to add a shared global Git origin.

Use `engram update-global-folder <new-path>` or `engram ugf <new-path>` to update only the configured global path. Chat-style forms such as `engram set global memory path to <new-path>` and `engram move global folder from <old-path> to <new-path>` normalize to the same command. Add `--move-from-path <old-path>` when they also want Engram to move the whole old global root.

## link

```bash
engram link codex
engram link claude
engram link gemini
engram link cursor
engram link windsurf
engram link --global opencode
engram link all
engram unlink
```

`engram link all` installs the public target set and reports deterministic `SKIPPED` reasons for partial hosts across skillset instruction files, MCP config, slash adapters, and agent hooks in one unified install. `engram unlink` removes all of these together. `engram unlink --global <target>` removes only the Engram-generated global plugin; a human-authored file is preserved unless `--force` is explicit.

## upgrade

```bash
engram upgrade
engram upgrade --plan
engram upgrade --latest
```

Use `engram upgrade` after installing a newer Engram package. The command compares initialized memory roots from v0.0.8 onward to the current release schema and refreshes generated `HELP.md`, memory indexes, graph files, eligible vector sidecars, generated workspace skillsets, global memory scaffolding, and registered global agent skillsets while preserving human-authored files.

Normal commands also run the same root reconciliation quietly once per package version unless `--no-auto-upgrade` or `ENGRAM_NO_AUTO_UPGRADE=1` is set.

Use `engram upgrade --latest` when the new package output must overwrite current Engram-managed linked agent artifacts. That path reapplies linked workspace instruction files, rules, MCP/plugin config, and managed hooks, and also refreshes registered global agent installs with the latest generated files.

Use `--force` only when replacing generated Engram adapter files intentionally.

## take-control

```bash
engram take-control --plan
engram take-control --all
engram take-control --file AGENTS.md
engram take-control --dir docs
engram take-control --include "docs/**/*.md" --exclude "docs/private/**"
engram take-control --max-sources 5 --max-chars 900
engram take-control --all --metacognize --accept-all
```

`take-control` is the agent-assisted takeover flow for existing workspace guidance. It builds a compact source pack from files such as `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, Cursor rules, memory-bank notes, and top-level `rules/`, `skills/`, `workflows/`, `knowledge/`, or `notes/` folders, including `.txt` notes.

Saved take-control memories record `source_files` and `source_hashes`, so unchanged sources are skipped later.

## metacognize

```bash
engram metacognize --workspace
engram metacognize --global --dry-run
engram metacognize --all --accept-all
```

Use `metacognize` when you want an AI agent to review an existing Engram memory folder and propose safer structure through the same save-session approval flow. Agents should use `UPDATE: memory-id` for consolidation or wording cleanup and `DEPENDS_ON: memory-id` for layered memories.

## Next steps

- [profiles / workspaces / config](profiles-workspaces-config.md)
- [Agent Integrations overview](../integrations/overview.md)
