---
title: verify / repair / quality-check
sidebar_position: 6
description: Maintenance commands — verify hashes, repair invalid files, check quality, and resolve conflicts.
---

# verify / repair / quality-check

Maintenance commands keep memory healthy.

## verify

```bash
engram verify
```

Checks hashes for integrity. Run after manual edits or imports.

## repair

```bash
engram repair
engram rebuild-index
```

Use `repair` after manual edits or imports to find malformed memory files skipped by index rebuild.

## quality-check

```bash
engram quality-check
```

Reports contradiction candidates compactly. Contradiction detection is heuristic and advisory.

## graph

```bash
engram graph "package manager"
engram graph --rebuild
```

Inspect graph routing before archiving. Run `engram graph --rebuild` after manual edits.

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
engram benchmark
```

Retrieval regression checks.

## Next steps

- [sync / archive](sync-archive.md)
- [Operations troubleshooting](../operations/troubleshooting.md)
