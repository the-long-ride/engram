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
engram inject --scope workspace|global|both
engram inject --global-only --global-path <path>
engram inject --submodule
engram inject --submodule-remote <git-url>
engram inject --global-remote <git-url>
engram inject --global-branch <branch>
engram inject --no-skillset
engram inject --skillset all
engram inject --no-global
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
engram link list
engram link --all-supported
engram unlink
```

`engram link all` installs the public target set and reports deterministic `SKIPPED` reasons for partial hosts across skillset instruction files, MCP config, slash adapters, and agent hooks in one unified install. `engram unlink` removes all of these together. `engram unlink --global <target>` removes only the Engram-generated global plugin; a human-authored file is preserved unless `--force` is explicit.

## upgrade

```bash
engram upgrade
engram upgrade --plan
engram upgrade --latest
engram upgrade --self
engram upgrade --memory-only
engram upgrade --global-skillsets-only
engram upgrade --target codex
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
engram take-control --all --metacognize --force
engram take-control --plan --json --kind code
engram take-control --kind code --objective "add billing export"
engram take-control --refresh
engram take-control --from claude-auto-memory --plan
engram take-control --from codex-memories --plan
```

`take-control` is the agent-assisted takeover flow for existing workspace guidance. It builds a compact source pack from files such as `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, Cursor rules, memory-bank notes, and top-level `rules/`, `skills/`, `workflows/`, `knowledge/`, or `notes/` folders, including `.txt` notes.

Saved take-control memories record `source_files` and `source_hashes`, so unchanged sources are skipped later.

### Code and config digests

`--kind docs|code|config|all` (comma lists allowed; default `docs`, which keeps the behaviour above) adds extractors that emit a short digest per source instead of raw text:

- **code**: exported signatures, doc-comment first lines, and imports, never bodies. The guidance shows them as a per-directory repo map of symbol names and one imports line. Code scans default to `--max-sources 40`.
- **config** and build manifests: keys, plus values only for allowlisted keys (`scripts`, dependency names, `TargetFramework`, `engines`, `name`) and stack facts.

Every digest is redacted. `.env*` and credential files are always skipped as `secret file`, discovered files over 256 KB or that look binary are skipped with a reason, and code and config scans skip build output directories (`bin`, `obj`, `build`, `out`, `target`, `venv`, and similar) at any depth. `--budget-tokens` (default 6000 for code and config scans; docs scans have none unless asked), `--max-sources`, and `--max-chars` bound the pack. `--plan --json` prints the plan, including skipped files with reasons, as JSON; its `budgetTokens` is `null` for the default docs scan.

### Objective-aware candidates

`--objective "<text>"` names the current objective. The guidance then asks for two kinds of candidates: `OBJECTIVE: task` ones useful for the objective, and `OBJECTIVE: durable` ones worth keeping afterwards. The candidate grammar also accepts `SCOPE: workspace|global`, `APPLIES_TO: <globs>` (up to 8 relative globs), and `DIRECTIVE: <line>` (up to 160 characters); see [save-session](save-session.md#candidate-fields). Approved `OBJECTIVE: task` candidates go to the [working tier](save-session.md#working-memory-promote-and-prune).

### Freshness

Code, config, and manifest memories record the hash of their digest (`source_hash_mode: digest`), so whitespace-only and body-only edits do not make them stale; docs memories record the raw-file hash. `engram verify --sources` records changed or missing sources in the gitignored `stale.json`, and `engram take-control --refresh` re-digests only those sources and proposes one `UPDATE: <id>` candidate per stale memory through the normal approval gate. See [verify](verify-repair-quality.md#verify).

### Host memories

`--from claude-auto-memory|codex-memories` imports a host-local memory store for review instead of scanning the workspace. Claude auto memory is read from `~/.claude/projects/<project>/memory/` (or `autoMemoryDirectory` from your user or local Claude settings; `CLAUDE_CONFIG_DIR` replaces `~/.claude`), Codex memories from `~/.codex/memories/`; `--dir <path>` overrides the store when it cannot be found unambiguously. `type: feedback` proposes a rule, `project` and `reference` propose knowledge, and `type: user`, untyped files, and the `MEMORY.md` index are skipped. `--from` cannot be combined with `--file`, `--include`, `--exclude`, `--kind`, `--all`, `--budget-tokens`, or `--refresh`.

Engram never writes into a host store. Imports are redacted and injection-filtered, go through the normal approval gate, and record `source: host-memory` with preset-relative `source_files` (for example `claude-auto-memory/feedback_testing.md`, never a home path). `engram verify --sources` checks drift only on the machine that holds the store (elsewhere it reports `host memory store not on this machine`). There is no Gemini preset.

## metacognize

```bash
engram metacognize --workspace
engram metacognize --global --dry-run
engram metacognize --all --force
```

Use `metacognize` when you want an AI agent to review an existing Engram memory folder and propose safer structure through the same save-session approval flow. Agents should use `UPDATE: memory-id` for consolidation or wording cleanup and `DEPENDS_ON: memory-id` for layered memories.


## Legacy memory migration to schema v3

`engram upgrade --latest` also migrates active v1/v2 memory files in the workspace and configured global roots to schema v3. Engram preserves each Markdown body exactly, writes `backups/schema-v3/<memory-file>.pre-v3.bak` (a gitignored folder; `engram repair --move-backups` relocates older backups left beside memories), fills only deterministic metadata, refreshes integrity hashes, and rebuilds the index, graph, and eligible vector sidecars. It never invents `evidence_refs`; a memory without verified trace links is marked `evidence_status: unverified`. Invalid memories are reported and skipped, archived memories are not rewritten, and a second run is idempotent.

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

- [profiles / workspaces / config](profiles-workspaces-config.md)
- [Agent Integrations overview](../integrations/overview.md)


<!-- configuration-upgrade-inventory -->
## Configuration upgrade inventory

After a package update, run `engram upgrade --latest --plan` before `engram upgrade --latest`. The shared inventory scans workspace and global Engram-managed memories, instructions, skillsets, configs, hooks, and plugins. User-authored bytes are preserved; ambiguous mixed files are reported as conflicts. See [Configuration upgrades](../operations/configuration-upgrades.md).
