---
schema_version: 1
id: "feature.working-memory-and-freshness"
title: "Working memory, observations, and source freshness"
kind: "feature"
status: "verified"
summary: "Manages gitignored expiring working-tier memories and scratch notes, promotion to durable memory, expiry pruning, source-file freshness hashing (`stale.json`), stale-memory refresh planning, sanitized inbox observations, and the opt-in SessionEnd transcript queue."
tags: ["feature","working-tier","working-note","freshness","refresh","observe","session-queue"]
source_paths: ["src/core/memory/freshness.ts","src/core/memory/observe.ts","src/core/memory/refresh.ts","src/core/memory/session-queue.ts","src/core/memory/working-note.ts","src/core/memory/working-tier.ts"]
related_specs: ["architecture.memory-schema-and-storage","feature.retrieval-routing-and-ordering","feature.memory-save-and-take-control","workflow.session-learning-and-traces","architecture.safety-policy-and-review","feature.agent-hooks-and-skillsets"]
last_doc_update_at: "2026-11-25T03:58:47Z"
last_verified_at: "2026-11-25T07:13:34Z"
last_verified_code_commit: "4cc4f6a"
last_source_change_commit: "339cada"
last_source_change_at: "2026-10-13T06:25:24+07:00"
source_fingerprint: "sha256:a63884f7316cc52d12d7b5dee11f9646e9a10c0893ff96bae8f20f2931d930d4"
---
# Working memory, observations, and source freshness

## Purpose and boundaries

This feature covers Engram's local-only, short-lived, and evidence-tracking memory subsystems:
- **Working tier (`working-tier.ts`)**: gitignored, task-scoped memories under `<scope>/working/` with TTL expiry (`valid_until`), explicit promotion to durable memory, and safe expiry pruning.
- **Working notes (`working-note.ts`)**: sanitized scratch notes (`source: note`, <= 2000 chars) planned inside the working tier and written only after human approval.
- **Source freshness (`freshness.ts`) & refresh (`refresh.ts`)**: re-hashing `take-control` and `host-memory` `source_files` against `source_hashes` into gitignored `stale.json`, and planning per-memory `UPDATE` refresh targets.
- **Observations & SessionEnd queue (`observe.ts`, `session-queue.ts`)**: explicit sanitized trace + non-indexed `inbox/` wrappers, and an opt-in locked `session-queue.json` drained into traces via `engram observe --queue`.

Out of scope:
- Durable memory schema, index splitting, and `writeApprovedMemory` internals (see `architecture.memory-schema-and-storage`).
- Routing demotion of stale memories and objective-based carding of working notes (see `feature.retrieval-routing-and-ordering`).
- Workspace `take-control` scanning and host-memory root resolution (see `feature.memory-save-and-take-control`).
- Trace storage codec, sanitization rules, and transcript ingestion internals (see `workflow.session-learning-and-traces`).

## Observable behavior

- **Working-tier lifecycle (`working-tier.ts`)**:
  - Working memories live at `working/{rules,skills,knowledge}/<id>.md` with `tier: working`, `valid_until` (`today + workingTtlDays(config)`), and optional `objective`.
  - `crossTierUpdateAdvice` explains why explicit `UPDATE:` never crosses between working and durable tiers.
  - `promoteWorking` refuses expired memories, missing files (stale index), or durable filename collisions. After approval, it strips `tier` and `valid_until`, preserves `objective`, increments `revision`, removes the working copy/hash, and writes the durable target via `writeApprovedMemory`; if the durable write fails (e.g., safety scan), it restores the working file, hash, and index.
  - `pruneWorking` scans regular `.md` files under `<scope>/working/` (skipping symlinks and realpath escapes), deletes files whose `valid_until < day` (or lists them in `dryRun`), removes their hashes, and reindexes without touching global Git or `CHANGELOG.md`. `undatedWorkingFiles` reports working files lacking a parseable `valid_until`.
- **Working notes (`working-note.ts`)**:
  - `prepareNote` enforces non-empty text <= 2000 chars (`NOTE_MAX_CHARS`), `type` in `knowledge` | `rule` (default `knowledge`), and optional `objective` <= 200 chars; it runs `sanitizeTraceText` and refuses outright if any instruction-like lines are detected (`removedInjectionLines > 0`).
  - `noteScopes` targets a single scope (`workspace` or `global`, never `both`).
  - `planNote` re-validates via `prepareNote` (defense in depth against tampered approval tokens) and plans within the working tier with `source: note`. `writeNote` skips writes on `NOOP` verdicts.
- **Source freshness (`freshness.ts`)**:
  - `freshnessEntries` selects indexed memories having both `source_files` and `source_hashes` where `source` is `take-control` or `host-memory`, or `source_hash_mode` is set.
  - `checkFreshnessDetailed` evaluates each entry:
    - Workspace sources are read through `readWorkspaceSource`, which rejects outside paths, ignored paths, protected secret/VCS/Engram paths, convertible documents, symlinks or hard links (`nlink > 1`), non-files, realpath escapes, and files failing `sourceFileGuard`.
    - Global workspace-derived memories are checked only when `source_origin` matches `workspaceOrigin(cwd)` (SHA-256 of normalized real `cwd`); otherwise skipped (`OTHER_WORKSPACE` / `NO_ORIGIN`).
    - Host-memory entries are checked only when the resolved host preset store matches `hostMemoryOrigin(root.dir)`; otherwise skipped (`HOST_OTHER_MACHINE`).
    - Raw hashes accept LF/CRLF/BOM line-ending variants; `source_hash_mode: 'digest'` also accepts untruncated `sourceDigestHash` for `code`/`config`/`manifest` kinds. Missing files are recorded as `missing: <file>`.
  - `writeStale` writes sorted `stale.json` atomically after reconciling `.gitignore`, and deletes `stale.json` when empty. `clearStaleKeys` drops refreshed keys fail-open.
- **Stale memory refresh (`refresh.ts`)**:
  - `planRefresh` reads `stale.json`, ignores unknown keys, host-memory imports, and global memories from other workspaces, re-digests remaining readable workspace sources (`kind: 'all'`, max 100 sources), and builds `RefreshTarget` entries with `replaceSources: true`.
  - `refreshCandidate` accepts only candidates with an `UPDATE:` matching a stale `RefreshTarget` (and matching scope if specified), preserving working tier (`objective: 'task'`). Non-matching candidates are rejected via `refreshRejection`.
- **Observations and SessionEnd queue (`observe.ts`, `session-queue.ts`)**:
  - `writeObservation` sanitizes text via `sanitizeTraceText`, writes an immutable trace (`writeTrace`), and creates a non-indexed `inbox/<timestamp>-<slug>.md` review wrapper with `authority: evidence`.
  - `enqueueSession` appends `{ transcript_path, host, session, at }` (`host`: `claude` | `codex`) to gitignored `session-queue.json` under `withFileLock` (800 ms fail-open timeout), deduplicating by `(host, session)` and capping at `SESSION_QUEUE_MAX` (50).
  - `drainSessionQueue` skips missing files, symlinks, hard links (`nlink > 1`), non-regular files, and files > 5 MiB (`SESSION_QUEUE_MAX_BYTES`); ingests valid transcripts via `ingestTranscript` (`source: 'session-end'`, `trust_level: 'generated'`); removes `stored` and `skipped` records while keeping `limited` (inbox quota) or transient read/write failures queued.

## Workflow

1. **Working note capture (`working-note.ts`)**:
   - `prepareNote` (redact + reject injection) -> `noteScopes` -> `planNote` (working-tier `planMemorySave`) -> `renderNotePreview` -> human approval -> `writeNote` (`writeApprovedMemory` unless `NOOP`).
2. **Working promotion (`promoteWorking`)**:
   - Locate working entry -> check not expired, source exists, durable target absent -> preview `promotedContent` -> on approval, delete working file/hash -> `writeApprovedMemory` to durable path (restore working file/hash/index on failure).
3. **Freshness check and refresh (`freshness.ts` -> `refresh.ts`)**:
   - `freshnessEntries` -> `checkFreshnessDetailed` -> `writeStale` (`stale.json`) -> `planRefresh` re-digests changed sources -> agent generates `UPDATE: <id>` candidates -> `refreshCandidate` binds replacement `MemorySourceMeta` (`replaceSources: true`) -> after approved write, `clearStaleKeys` removes refreshed keys.
4. **SessionEnd transcript queue (`session-queue.ts`)**:
   - Hook calls `enqueueSession` (fail-open on busy lock) -> user/agent runs `engram observe --queue` -> `drainSessionQueue` validates and ingests transcripts into traces/inbox -> `removeEntries` drops drained records under lock.

## Code map

- `src/core/memory/working-tier.ts` — `workingPath`, `crossTierUpdateAdvice`, `workingTierMeta`, `addDays`, `promoteWorking`, `pruneWorking`, `undatedWorkingFiles`, `scanWorkingFiles`.
- `src/core/memory/working-note.ts` — `NOTE_SOURCE`, `NOTE_MAX_CHARS`, `prepareNote`, `noteScopes`, `noteCandidate`, `planNote`, `renderNotePreview`, `writeNote`, `describeNote`.
- `src/core/memory/freshness.ts` — `STALE_FILE`, `OTHER_WORKSPACE`, `NO_ORIGIN`, `HOST_OTHER_MACHINE`, `sourceDigestHash`, `workspaceOrigin`, `checkFreshnessDetailed`, `freshnessEntries`, `sourceHashMode`, `readWorkspaceSource`, `workspaceRelPath`, `readStale`, `writeStale`, `clearStaleKeys`.
- `src/core/memory/refresh.ts` — `planRefresh`, `refreshCandidate`, `refreshRejection`, `RefreshTarget`, `RefreshPlan`.
- `src/core/memory/observe.ts` — `writeObservation`, `ObservationMetadata`, `ObservationWrite`.
- `src/core/memory/session-queue.ts` — `SESSION_QUEUE_FILE`, `SESSION_QUEUE_MAX`, `SESSION_QUEUE_MAX_BYTES`, `readSessionQueue`, `enqueueSession`, `drainSessionQueue`.

## Interfaces and data

- **Local gitignored state files**:
  - `<workspace-root>/stale.json`: JSON object mapping `<scope>:<file>` -> `string[]` of changed or `missing: <file>` paths.
  - `<scope-root>/session-queue.json`: `{ version: 1, entries: SessionQueueEntry[] }` (max 50 entries, locked via `.lock` sidecar).
  - `<scope-root>/working/{rules,skills,knowledge}/*.md`: expiring working-tier memories and notes.
  - `<scope-root>/inbox/<timestamp>-<slug>.md`: non-indexed observation wrappers linked to `trace_id`.
- **Origin hashes**:
  - Workspace origin: `sha256("engram-source-origin:" + normalizedRealCwd)` (lowercased on `win32`).
  - Host origin: delegated to `hostMemoryOrigin` (`host-memory.ts`).

## Verification

- **Verified by direct source inspection**: All 6 listed `source_paths` were read in full at HEAD `4cc4f6a` (plus current working tree), confirming symlink/hardlink guards, atomic writes, rollback on failed promotion, and fail-open locking.
- **Inferred / not executed here**: Automated tests for TTL expiry, lock contention, and cross-platform line-ending freshness were not executed in this read-only pass.

## Related documentation

- [Memory schema, storage, and lifecycle persistence](../architecture/memory-schema-and-storage.md)
- [Retrieval routing, ranking, and ordering](../features/retrieval-routing-and-ordering.md)
- [Memory save planning and take-control discovery](../features/memory-save-and-take-control.md)
- [Session learning and traces](../workflows/session-learning-and-traces.md)
- [Safety policy and review](../architecture/safety-policy-and-review.md)
- [Agent hooks and skillsets](../features/agent-hooks-and-skillsets.md)

## Known limitations and open questions

- Convertible documents (e.g., PDF/Office handled by `markdown-them`) are reported as `unchecked: 'converted document'` during `readWorkspaceSource` freshness checks rather than re-converted on every `verify --sources`.
- `planRefresh` intentionally skips `source: host-memory` entries; refreshing host-local memories requires re-running `take-control --from <preset>` rather than `--refresh`.
- Working memories without a valid `valid_until` date never expire and are only reported by `undatedWorkingFiles`, not deleted by `pruneWorking`.

<!-- BEGIN MANUAL NOTES -->
<!-- END MANUAL NOTES -->
