---
title: verify / repair / quality-check
sidebar_position: 6
description: Maintenance commands — verify hashes, repair invalid files, check quality, and resolve conflicts.
---

# verify / repair / quality-check

Maintenance commands keep memory healthy.

## status

```bash
engram status
engram stat
engram status --json
```

Prints a single-screen overview of workspace and global memory roots, active profile, linked hosts, pending review receipts, working-tier counts, and integrity/freshness health. `engram stat` is a short alias, and `--json` outputs the structured snapshot for scripts.

## verify

```bash
engram verify
engram verify --sources
engram verify --sources --json
```

Checks hashes for integrity. Run after manual edits or imports.

`--sources` also re-hashes the `source_files` of take-control memories against their `source_hashes` and records changed or missing ones in the local, gitignored `.agents/.engram/stale.json`. Stale sources never fail `verify`: `load` ranks stale memories lower and ends their cards with ` (stale)`, and `engram take-control --refresh` proposes updates for them. Source paths must stay inside the workspace; absolute paths, `..`, symlinks and hard links, secret files, `.git`, and Engram data are reported as unchecked and never read. In `--json`, `skipped` lists `{key, reason}` objects. A global take-control memory records the workspace it came from and is checked only there.

## stats

```bash
engram stats
engram stats --usage
engram stats --backfill [--git <range>] [--limit <n>]
```

`--usage` reads the local, gitignored `.agents/.engram/usage.json` and shows fetch counts (`engram load --id`), closed-loop outcome counters (`applied`, `corrected`, and `noisy` / zero-utility injections), and memories that were injected but never fetched in 30 days. `--backfill` seeds `injected`/`applied` counters from recent non-merge Git commit history (`backfillUsageFromGit`, optional `[--git <range>] [--limit <n>]`) into `usage.json`.

## repair

```bash
engram repair
engram rebuild-index
```

Use `repair` after manual edits or imports to find malformed memory files skipped by index rebuild.

```bash
engram repair --move-backups
engram repair workspace --move-backups --confirm
```

`--move-backups` plans moving stray `*.bak` migration backups from `rules`, `skills`, and `knowledge` into the gitignored `backups/<kind>-<label>/` folder (for example `backups/schema-v3/rules/x.md.pre-v3.bak`). Add `--confirm` to move them; a different file already at the destination is reported as a conflict and left in place. `engram doctor` reports these files as `memory.stray_backups`.

## quality-check

```bash
engram quality-check
```

Reports contradiction candidates compactly. Contradiction detection is heuristic and advisory.

## graph

```bash
engram graph "package manager"
engram graph --rebuild
engram graph link <parent-id> <child-id...>
```

Inspect graph routing before archiving, link explicit `depends_on` prerequisites with `engram graph link <parent-id> <child-id...>`, or run `engram graph --rebuild` after manual edits.

## archive

```bash
engram archive --reason "Repo migrated to npm." rules/use-pnpm.md
```

Archive wrong or superseded memory. Use archive, not delete, for auditability. The file leaves active routing only after approval and remains preserved under `archive/`.

## resolve-conflicts

```bash
engram resolve-conflicts --dry-run --metacognize
engram resolve-conflicts --metacognize
```

Preview or resolve only Engram-owned workspace memory conflicts. Add `--metacognize` when an agent should review the memory folder after conflict handling. The command keeps deterministic conflict handling scoped to `.agents/.engram/`, then appends the workspace metacognize source pack for concise `TYPE/TEXT` candidates.

## benchmark

```bash
engram benchmark <cases.json> --json
engram benchmark <cases.json> --baseline <baseline.json> --fail-on forbidden,recall
engram benchmark <cases.json> --write-report <report.json>
engram benchmark --from-git [--out <path>]
```

Runs versioned retrieval regression suites, including `freshness-ordering` (freshness boost and attention-aware body ordering), `multi-turn-session` (hook token savings across turns), and `telemetry-loop` (`real-stacks-v1` closed-loop outcome telemetry and noise decay). Use `--from-git [--out <path>]` to synthesize repo-local benchmark cases from recent Git history, `--baseline` to compare against saved metrics, `--write-report` to write an ID-only JSON report, and `--fail-on` to fail CI on specific regressions.

## Next steps

- [sync / archive](sync-archive.md)
- [Operations troubleshooting](../operations/troubleshooting.md)
