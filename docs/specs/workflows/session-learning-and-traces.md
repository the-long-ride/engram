---
schema_version: 1
id: "workflow.session-learning-and-traces"
title: "Session learning, immutable traces, and transcript ingestion"
kind: "workflow"
status: "verified"
summary: "Deterministic session learning distillation, gitignored working-tier capture with staged durable inbox receipts, immutable one-record JSONL evidence traces, and opt-in host-neutral transcript ingestion."
tags: ["learning","session-learning","traces","transcripts","working-tier","inbox","sanitization"]
source_paths: ["src/core/learning/capture.ts","src/core/learning/distill.ts","src/core/traces/codec.ts","src/core/traces/migrate.ts","src/core/traces/sanitize.ts","src/core/traces/storage.ts","src/core/transcripts/ingest.ts","src/core/transcripts/types.ts"]
related_specs: ["architecture.safety-policy-and-review","feature.working-memory-and-freshness","feature.memory-save-and-take-control","feature.agent-hooks-and-skillsets","feature.ingest-author-and-benchmarks","architecture.runtime-config-and-profiles","interface.cli-commands-and-dispatch"]
last_doc_update_at: "2026-11-25T03:58:47Z"
last_verified_at: "2026-11-25T07:13:34Z"
last_verified_code_commit: "4cc4f6a"
last_source_change_commit: "1787ad9"
last_source_change_at: "2026-08-10T20:20:26+07:00"
source_fingerprint: "sha256:56a65f8e691fb88998a49202907ce8bb7e78b0081312e25895907beac1fd09c6"
---
# Session learning, immutable traces, and transcript ingestion

## Purpose and boundaries

This workflow captures actionable knowledge, rules, and workflows from live agent sessions, queued session transcripts, explicit `observe --learn` runs, and Git commit history without writing unapproved durable memories. It pairs deterministic distillation with two persistence layers:

- **Immutable evidence traces (`traces/tr_*.jsonl`)** storing sanitized, integrity-hashed raw evidence with explicit trust, sensitivity, and retention metadata (`authority: "evidence"`).
- **Session learning outputs** written either to the gitignored workspace `working/` tier (in `auto` mode) and/or staged as human-reviewable durable inbox receipts (`inbox/r-*.json`, `source: "session-learning"`).

Out of scope:
- Durable memory approval, index/graph storage, and working-tier expiry policy (covered by `feature.memory-save-and-take-control` and `feature.working-memory-and-freshness`).
- Sensitive-data and prompt-injection pattern definitions and inbox receipt management (covered by `architecture.safety-policy-and-review`).
- Hook dispatch wiring and CLI flag parsing (covered by `feature.agent-hooks-and-skillsets` and `interface.cli-commands-and-dispatch`).

## Observable behavior

### Deterministic distillation (`src/core/learning/distill.ts`)
- `isLivePromptCorrection(prompt)` performs a strict fast check on live user prompts (length `15..4000`, non-question lines): returns `true` only when a line matches an explicit teaching marker (`remember`, `correction`, `rule`, `convention`, `root cause`, `decision`, `from now on` followed by `:`, `,`, or `-`, >= 5 words) or a high-confidence imperative (`always`/`never` paired with `instead of`/`because`/`when editing`/`in this repo`, >= 7 words).
- `distillSessionLearnings({ text, touchedPaths, maxCandidates })`:
  - Extracts plain lines and JSONL message content (`message.content`, `content`, `text`, including arrays of `{ text }` blocks).
  - Sanitizes input via `sanitizeTraceText` before classification; drops lines over 320 chars (`MAX_SEGMENT_CHARS`) or containing redaction markers (`[REDACTED...]` or `<api-key>`, `<private-key>`, `<password>`, `<team-email>`, `<card-number>`, `<internal-host>`, `<location>`).
  - Classifies non-question lines into `DistilledLearning` candidates (default cap `8`):
    - Explicit workflow (`workflow|runbook|playbook|verification step`) -> `type: "skill"`, `kind: "workflow"`, `confidence: "high"`.
    - Explicit knowledge (`root cause|bug cause|decision|architecture|gotcha|invariant|workaround|lesson learned`) -> `type: "knowledge"`, `kind: "decision" | "root-cause"`, `confidence: "high"`.
    - Explicit rule (`remember|correction|rule|guideline|convention|from now on`) -> `type: "rule"`, `kind: "correction"`, `confidence: "high"`.
    - Pattern `fails? when ...; fix by ...` -> `type: "knowledge"`, `kind: "root-cause"`, `confidence: "high"`.
    - Strong imperative (`always|never|must not|do not|don't|prefer X over Y`) -> `type: "rule"`, `kind: "correction"`, `confidence: "high" | "medium"`.
  - Value gate rejects questions, redacted lines, stack traces, short shell commands, transient status messages, short greetings (< 10 words), and lines with fewer than `max(5, minWords)` meaningful words.
  - Deduplicates candidates by `slugify(directive)` (directive clipped at 160 chars), infers workspace-relative `appliesTo` paths (up to 8, rejecting absolute/`..`/drive paths) from `touchedPaths` + inline `queryPaths(text)`, and extracts up to 8 trigger keywords.

### Session learning capture (`src/core/learning/capture.ts`)
- `captureSessionLearnings(cwd, input)` is a no-op if the workspace root does not exist, `config.enabled` is false, `mode === 'off'` (resolved from `input.mode ?? config.learning?.mode ?? 'auto'`), or distillation yields zero candidates.
- Ensures `.agents/.engram/.gitignore` via `ensureScopeGitignore(root)` before writing.
- Reuses `input.traceId` if provided, otherwise persists a sanitized `tr_sl_<uuid>` trace (`trustLevel: 'repository'` for `source === 'git'`, else `'human'`; `sensitivity: 'private'`; `retention: '30d'`).
- Resolves author identity via `resolveAuthor(cwd)`, falling back to `'Engram Session Learner'` when unconfigured.
- For each candidate, calls `planMemorySave` targeting `scopes: ['workspace']` with `workingTierMeta(config, day, 'session-learning:<source>')` and `evidenceRefs: [traceId]`.
- Duplicate gating: skips writing to `working/` (incrementing `skippedDuplicates`) when `plan.verdict.kind === 'NOOP'` or any `related` hint has `action === 'possible-duplicate'` and `score >= 0.75` (`DUPLICATE_SCORE_THRESHOLD`).
- Mode behavior:
  - `mode === 'auto'`: writes non-duplicate candidates to gitignored `working/` via `writeApprovedMemory` and refreshes `getContext(cwd)`.
  - Stages a durable inbox receipt (`source: 'session-learning'`) whenever `(mode === 'inbox' || candidate.confidence === 'high') && !hasDurableDuplicate`, deduplicated by `candidate_hash` against existing non-expired receipts.
- `maybeCaptureHookLearning(cwd, input)` is fail-open: checks `isLivePromptCorrection(prompt)` and runs `captureSessionLearnings` with `source: 'agent-hook'`, swallowing errors so hook prompt delivery is never interrupted.
- `learnFromQueueOutcomes(cwd, root, outcomes)` iterates `status === 'stored'` outcomes with a `trace_id`, reads each trace, and runs `captureSessionLearnings` with `source: 'session-queue'`.
- `maybeAutoDrainQueueOnStart(cwd)` is fail-open: when `config.learning?.auto_drain === true`, reads `.agents/engram.transcripts.json`, drains the session queue via `drainSessionQueue`, and calls `learnFromQueueOutcomes`.
- `harvestGitLearnings(cwd, range?)` executes `git log` via `execFile` (no shell interpolation), rejects ranges starting with `-`, defaults to `-n 5 --no-merges`, and appends up to 5 changed file paths to each commit subject line.

### Immutable traces and legacy migration (`src/core/traces/*`)
- `sanitizeTraceText(text)` runs `scanSensitive` + `redactSensitive`, then drops any line matching `scanInjection`, returning `{ text, redactedFindings, removedInjectionLines }`.
- `buildTraceUnit` constructs a `TraceUnit` with `authority: 'evidence'`, `traceId` matching `/^tr_[A-Za-z0-9_-]+$/`, ISO timestamps (`eventTime`, `ingestedAt`), and `sourceHash: sha256:<hex>` over `text`.
- `serializeTraceUnit` validates and emits a single key-sorted JSONL line; `parseTraceUnit` enforces single-line JSONL, schema validation, and `sourceHash` integrity verification.
- `traceExpiresAt` / `isTraceExpired` compute expiry from `ingestedAt` + `Nd` retention (or `null` for `'permanent'`).
- `writeTrace` writes exclusively with `{ flag: 'wx' }` under `<root>/traces/<traceId>.jsonl`, guaranteeing immutability once created.
- `migrateLegacyObservations(root, scope)` idempotently scans `<root>/inbox/*.md` for `source === 'observe'` files lacking `trace_id`, extracts the `## Raw Note` section, sanitizes it, writes a deterministic `tr_legacy_<sha256-24>` trace, and updates the observation frontmatter with trace metadata.

### Opt-in transcript ingestion (`src/core/transcripts/*`)
- `ingestTranscript(root, event, options)` requires `options.enabled === true`; otherwise returns `{ status: 'disabled', ... }`.
- Clamps `max_chars` to `[1, 100_000]` (default `20_000`), truncating oversized text and returning `{ status: 'empty' }` if blank.
- Clamps `max_files` to `[1, 1000]` (default `100`) against existing `<root>/inbox/*.md` count, returning `{ status: 'limited' }` when at capacity.
- Delegates persistence to `writeObservation` (creating both the non-indexed inbox markdown observation and its immutable trace) with defaults `sessionId: 'default'`, `source: 'transcript'`, `trustLevel: 'human'`, `sensitivity: 'private'`, `retention: '30d'`.

## Workflow

1. **Trigger & input collection**
   - Live prompt hook -> `maybeCaptureHookLearning` gates on `isLivePromptCorrection`.
   - Session start -> `maybeAutoDrainQueueOnStart` drains queued transcripts when `config.learning.auto_drain` is enabled.
   - CLI `observe --learn [--file | --git]` or `observe --queue --learn` -> calls `harvestGitLearnings` / `captureSessionLearnings` / `learnFromQueueOutcomes`.
   - External/host transcript -> `ingestTranscript` checks opt-in, size, and inbox file-count caps, then calls `writeObservation`.
2. **Sanitization & trace creation**
   - `sanitizeTraceText` redacts secrets and removes prompt-injection lines.
   - `writeTrace` persists an immutable `traces/tr_*.jsonl` record (`flag: 'wx'`) with `sourceHash`.
3. **Distillation & duplicate check**
   - `distillSessionLearnings` extracts, classifies, value-gates, and deduplicates candidates, inferring `appliesTo` paths and triggers.
   - `planMemorySave` evaluates each candidate against current workspace/global memories for `NOOP` or `possible-duplicate` (`score >= 0.75`).
4. **Tiered persistence**
   - In `auto` mode, non-duplicate candidates are written to gitignored `working/` with `workingTierMeta`.
   - High-confidence candidates (and all non-durable-duplicate candidates in `inbox` mode) are staged as `inbox/r-*.json` receipts (`source: 'session-learning'`) for explicit human review via `engram review inbox` / `engram review apply`.
   - On error in hook paths (`maybeCaptureHookLearning`, `maybeAutoDrainQueueOnStart`), execution fails open without blocking the host agent.

## Code map

- `src/core/learning/distill.ts` — `isLivePromptCorrection`, `distillSessionLearnings`, JSONL extraction, rule/knowledge/workflow classifiers, value gate, directive normalization, and `appliesTo` path normalization.
- `src/core/learning/capture.ts` — `captureSessionLearnings`, `maybeCaptureHookLearning`, `learnFromQueueOutcomes`, `maybeAutoDrainQueueOnStart`, `harvestGitLearnings`, `tr_sl_*` trace persistence, and fallback author resolution.
- `src/core/traces/sanitize.ts` — `sanitizeTraceText` combining `scanSensitive`, `redactSensitive`, and line-level `scanInjection` removal.
- `src/core/traces/codec.ts` — `buildTraceUnit`, `serializeTraceUnit`, `parseTraceUnit`, `traceExpiresAt`, `isTraceExpired`, and strict field/hash validation.
- `src/core/traces/storage.ts` — `traceFile`, `writeTrace` (`flag: 'wx'`), `readTrace`, and `traceExists` under `TRACE_DIR`.
- `src/core/traces/migrate.ts` — `migrateLegacyObservations` for deterministic `tr_legacy_*` backfill of legacy `inbox/*.md` observations.
- `src/core/transcripts/ingest.ts` — `ingestTranscript` enforcing opt-in, `max_chars`, and `max_files` bounds before calling `writeObservation`.
- `src/core/transcripts/types.ts` — `TranscriptEvent`, `TranscriptIngestOptions`, and `TranscriptIngestResult` contracts.

## Interfaces and data

- **Filesystem artifacts**:
  - `<root>/traces/tr_<id>.jsonl` — single-line key-sorted JSONL `TraceUnit` (`authority: "evidence"`, `sourceHash: "sha256:..."`), written once with `wx`.
  - `<root>/working/<type>/*.md` — gitignored working-tier memories written in `learning.mode === 'auto'`.
  - `<root>/inbox/r-*.json` — staged durable `InboxReceipt` files (`source: "session-learning"`).
  - `<root>/inbox/*.md` — non-indexed observation markdown files produced by `ingestTranscript` -> `writeObservation` and backfilled by `migrateLegacyObservations`.
  - `.agents/engram.transcripts.json` — optional transcript ingest configuration read by `maybeAutoDrainQueueOnStart`.
- **Key exported types & functions**:
  - `CaptureLearningInput`, `CaptureLearningResult`, `CaptureLearningSource`, `QueueLearnSummary` (`src/core/learning/capture.ts`).
  - `DistilledLearning`, `DistillResult` (`src/core/learning/distill.ts`).
  - `SanitizedTraceText` (`src/core/traces/sanitize.ts`).
  - `TranscriptEvent`, `TranscriptIngestOptions`, `TranscriptIngestResult` (`src/core/transcripts/types.ts`).
- **Safety invariants**:
  - Session learning never writes directly to durable committed memory directories; durable promotion always requires human approval via inbox receipts.
  - All trace text is redacted and stripped of prompt-injection lines before persistence.
  - `harvestGitLearnings` rejects leading `-` ranges and invokes `git` via `execFile` without a shell.

## Verification

- Existing test suites (observed in repository test structure and coordinator runs):
  - `tests/core/learning-distill.test.mjs` — distillation classification, value gating, JSONL parsing, redaction/injection filtering, and `isLivePromptCorrection`.
  - `tests/cli/session-learning.test.mjs` — end-to-end `observe --learn`, `observe --queue --learn`, git harvest, working-tier capture, and inbox receipt staging.
  - `tests/cli/transcript.test.mjs` — opt-in transcript ingestion, truncation, file-count limits, and trace creation.
- Inspection scope: all 8 source files listed in `source_paths` were directly read and verified against `HEAD` `4cc4f6a` plus the current working tree. Test commands were not executed from this read-only spec worker.

## Related documentation

- [Safety, policy, and review architecture](../architecture/safety-policy-and-review.md)
- [Working memory and freshness](../features/working-memory-and-freshness.md)
- [Memory save and take-control](../features/memory-save-and-take-control.md)
- [Agent hooks and skillsets](../features/agent-hooks-and-skillsets.md)
- [Ingest, author identity, and benchmarks](../features/ingest-author-and-benchmarks.md)
- [Runtime configuration and profiles](../architecture/runtime-config-and-profiles.md)
- [CLI commands and dispatch](../interfaces/cli-commands-and-dispatch.md)

## Known limitations and open questions

- Distillation is intentionally regex/heuristic-based (deterministic, offline, zero-LLM), so implicit multi-sentence lessons without explicit markers or strong imperatives are not extracted.
- `captureSessionLearnings` targets only `scopes: ['workspace']`; global-scope session learning is not currently emitted.
- `writeTrace` uses `flag: 'wx'` and will throw `EEXIST` if a caller supplies a colliding explicit `traceId`; `migrateLegacyObservations` guards against this with `traceExists` first.

<!-- BEGIN MANUAL NOTES -->
<!-- END MANUAL NOTES -->
