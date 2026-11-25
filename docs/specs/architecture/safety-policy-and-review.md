---
schema_version: 1
id: "architecture.safety-policy-and-review"
title: "Safety guards, autonomous-write policy, and review workflows"
kind: "architecture"
status: "verified"
summary: "Write-time and read-time safety primitives (sensitive redaction, prompt-injection scanning, SHA-256 tamper verification, guarded reads, ignore matching, human approval UI, AES-256-GCM encryption), fail-closed autonomous-write policy with rollback snapshots and audit logs, and deterministic review findings, actions, records, and inbox receipts."
tags: ["safety","security","policy","audit","rollback","review","inbox","approval","hashing","encryption"]
source_paths: ["src/core/policy/audit.ts","src/core/policy/evaluate.ts","src/core/policy/load.ts","src/core/policy/rollback.ts","src/core/policy/schema.ts","src/core/policy/snapshot.ts","src/core/review/actions.ts","src/core/review/findings.ts","src/core/review/inbox.ts","src/core/review/records.ts","src/core/safety/approval.ts","src/core/safety/encryption.ts","src/core/safety/hash.ts","src/core/safety/ignore.ts","src/core/safety/safe-read.ts","src/core/safety/security.ts"]
related_specs: ["architecture.memory-schema-and-storage","feature.memory-save-and-take-control","feature.retrieval-routing-and-ordering","feature.working-memory-and-freshness","workflow.session-learning-and-traces","architecture.runtime-config-and-profiles","interface.cli-commands-and-dispatch","interface.entry-web-api"]
last_doc_update_at: "2026-11-25T03:58:47Z"
last_verified_at: "2026-11-25T07:13:34Z"
last_verified_code_commit: "4cc4f6a"
last_source_change_commit: "339cada"
last_source_change_at: "2026-10-13T06:25:24+07:00"
source_fingerprint: "sha256:86de2a1639c5800634be6db687740fee434718c9954f645a5094c4ee66384700"
---
# Safety guards, autonomous-write policy, and review workflows

## Purpose and boundaries

This architecture layer enforces Engram's core trust, integrity, and human-control guarantees across every read, write, autonomous save, and maintenance review path:

- **Safety primitives (`src/core/safety/*`)**: sensitive-data detection/redaction, prompt-injection detection, SHA-256 tamper verification, guarded reads, `.engramignore`/`.gitignore` glob filtering, terminal human-approval prompts (`A/B/C` and `Y/C`), and portable AES-256-GCM helpers.
- **Autonomous-write policy (`src/core/policy/*`)**: repository-local versioned policy (`.agents/engram.policy.json`), fail-closed allowlist evaluation, append-only audit logs (split between durable and gitignored working-tier logs), private user-local rollback snapshots, and archive/restore rollback execution.
- **Review subsystem (`src/core/review/*`)**: deterministic derivation of maintenance findings (`duplicate`, `contradiction`, `stale`, `invalid_dependency`), fingerprint-keyed status persistence, audited review actions (`dismiss`, `verify`, `supersede`, `archive`), and TTL-bounded inbox receipts (`inbox/r-*.json`) for deferred save candidates.

Out of scope:
- Core memory file storage, frontmatter parsing, index/graph/vector builders, and archive internals (covered by `architecture.memory-schema-and-storage`).
- CLI command handlers (`src/commands/policy.ts`, `src/commands/review.ts`, `src/commands/autosave.ts`) and Entry Web API endpoints (covered by `interface.cli-commands-and-dispatch` and `interface.entry-web-api`).

## Observable behavior

### Safety primitives (`src/core/safety/*`)
- **Sensitive & injection scanning (`security.ts`)**:
  - `scanSensitive(text)` scans line-by-line for 9 pattern classes: `api-key` (`sk-...`, `ghp_...`), `jwt`, `private-key`, `password`, `secret` (`*_SECRET/TOKEN/KEY=...`), `email`, `card`, `internal-ip` (`10.*`, `192.168.*`), and `gps`. Frontmatter `author:` and `author_email:` lines are exempted.
  - `redactSensitive(text)` replaces matches with typed placeholders (`<api-key>`, `<private-key>`, `<password>`, `<team-email>`, `<card-number>`, `<internal-host>`, `<location>`).
  - `scanInjection(text)` strips leading Markdown blockquotes, headings, list bullets/checkboxes, and ordered list prefixes before testing 12 prompt-injection patterns (`ignore`, `forget`, `disregard`, `override`, `you are now`, `act as`, `pretend you are`, `your new instructions`, `your true purpose`, `<system>`, `[INST]`, `<<<`).
- **SHA-256 integrity (`hash.ts`)**:
  - `loadHashes(root)` merges committed `HASH_FILE` and gitignored `WORKING_HASH_FILE`.
  - `saveHashes(root, hashes)` partitions keys by `isWorkingPath(file)` so working-tier hashes never pollute the committed hash store (and removes `WORKING_HASH_FILE` when empty).
  - `verifyMemoryHash` returns `{ ok: false, reason: 'missing hash' | 'hash mismatch' }` on failure; `verifyRoot` checks every active `.md` file under a scope root (excluding `HELP.md`, `README.md`, `changelog.md`).
- **Guarded reads (`safe-read.ts`)**:
  - `readGuardedMemory(cwd, entry, config, options)` enforces root resolution, `inside(root, entry.file)` path confinement, optional hash verification (`verifyHashes !== false`), sensitive scan (`scanSensitive !== false`), and injection scan (`scanInjection !== false`). Any failure returns `{ entry, content: '', flagged }`.
  - When all checks pass, renders via `renderMemoryForAgent` (LF-normalized when `forAgents` is true) or `renderMemoryForConfig`, unless `render === false`.
- **Ignore matching (`ignore.ts`)**:
  - `loadIgnore(cwd, config)` combines `also_ignore`, `global_patterns`, workspace `.engramignore` / `.gitignore` (per `config.ignore.source`), and optional global `.engramignore`. Comments (`#`) and negations (`!`) are skipped by `parseIgnore`.
  - `matchPattern` supports `*`, `?`, `**`, `**/`, trailing `/`, trailing `/**`, and exact segment/prefix matching.
- **Human approval UI (`approval.ts`)**:
  - Supports interactive TTY (`readline/promises`) and piped stdin (with speculative-read queueing via `queuePromptAnswer` / `readPipedPromptAnswer`).
  - `requestApproval` / `requestSelectionApproval` parse `A` (accept all), `A 1,3` (selected indices), `B <note>` / `B 1,3 <note>` (accept with note), and `C` (or anything else -> reject).
  - `requestNoteApproval` requires explicit `y` or `yes` for working-tier notes; anything else cancels.
  - `applyApprovalEdit` appends a `## Human Note` section when a `B` note is provided.
- **Encryption (`encryption.ts`)**:
  - `deriveKey(secret)` hashes passphrase via SHA-256 to 32 bytes; `encryptText` / `decryptText` use AES-256-GCM with a random 12-byte IV and 16-byte auth tag encoded as `base64(iv || tag || ciphertext)`.

### Autonomous-write policy (`src/core/policy/*`)
- **Schema & defaults (`schema.ts`)**:
  - `DEFAULT_POLICY` is fail-closed: `version: 1`, `autonomous_writes.enabled: false`, `mode: 'review_only'`, `allowed_types: ['knowledge']`, `allowed_scopes: ['workspace']`, `allowed_sources: ['autosave']`, `confidence_threshold: 'high'`, `daily_limit: 5`, `rollback_retention_days: 30`, `review.max_rule_lines: 100`, `benchmark_min_recall_at_k: 0.9`.
  - `validatePolicy` returns `{ policy, diagnostics }` and rejects any missing/invalid field (returning no `policy` if `diagnostics.length > 0`).
- **Loading & writing (`load.ts`)**:
  - `policyPath` defaults to `<cwd>/.agents/engram.policy.json` (or `inside(cwd, requested)`).
  - `loadPolicy` validates on read; `writeDefaultPolicy` writes `DEFAULT_POLICY`; `writePolicy` validates before writing and throws on diagnostics.
- **Evaluation (`evaluate.ts`)**:
  - `evaluatePolicy(policy, candidate)` checks in order: policy present -> `enabled` -> `mode === 'autonomous'` -> `allowed_types` -> `allowed_scopes` -> `allowed_sources` -> `confidence_threshold` (`low < medium < high`) -> `review.mandatory_metadata` (`context`, `triggers`, `role`) -> `rule` line count `<= review.max_rule_lines`.
- **Audit & snapshots (`audit.ts`, `snapshot.ts`)**:
  - `appendPolicyAudit` routes records whose `output_files` and `actions` are all working-tier paths to `<root>/working/policy-audit.jsonl`, and all other records to `<root>/policy-audit.jsonl`. `readPolicyAudit` merges both logs sorted by timestamp.
  - `countWrittenToday` counts `status === 'written'` records for the current UTC day.
  - `stagePolicySnapshots` stores before-images of `action === 'update'` plans in user-local `<userConfigDir>/policy-rollbacks/<sha256(root)[0..16]>/<auditId>/<file>` (validating `auditId` matches `/^autosave-[a-z0-9-]+$/i`).
- **Rollback (`rollback.ts`)**:
  - `rollbackPolicyAudit(id, cwd)` locates the latest `status === 'written'` audit record across workspace/global roots, enforces `rollback_until` expiry, restores `update` files from snapshots via `writeApprovedMemory`, archives `add` files via `planArchiveSet` + `archiveMemory`, purges snapshots, and appends a `status: 'rolled_back'` audit record.

### Review subsystem (`src/core/review/*`)
- **Finding derivation (`findings.ts`)**:
  - `deriveFindings(entries, graph, options)` deterministically derives 4 finding kinds sorted by `(kind, id)`:
    - `duplicate`: lexical `duplicatePairs` + non-overlapping `semanticDuplicatePairs`.
    - `contradiction`: `contradictionEdges(graph)`.
    - `stale`: entries with `reviewAfter <= now` or active entries (not `archived`/`superseded`) without `reviewAfter` whose `updated` is older than `staleDays` (default `180`).
    - `invalid_dependency`: `dependsOn` references missing from `entries`.
  - Every finding has a stable `fingerprint = "${kind}:${sortedIds.join(',')}"` so dismissals and resolutions survive index rebuilds.
- **Persisted records (`records.ts`)**:
  - Stored under `<root>/review/records.json` (`REVIEW_DIR`). Deleting it loses only status annotations, never approved memories.
  - `applyPersistedStatus` overlays `dismissed` / `resolved` statuses onto newly derived findings.
- **Audited review actions (`actions.ts`)**:
  - `dismissFindingAction`: marks finding resolved/dismissed in `records.json` (seeding if absent) and appends a changelog entry.
  - `verifyAction`: patches `last_verified: today()`, `lifecycle: 'active'`, increments `revision`, updates `last_confirmed`, updates hash, rebuilds index/graph/vector index, resolves linked findings, and logs to changelog.
  - `supersedeAction`: rejects identical IDs and cross-scope pairs; marks old memory `lifecycle: 'superseded'` + `superseded_by: newId` and appends `oldId` to new memory's `supersedes`; updates hashes, rebuilds index/graph/vector index, resolves linked findings for `oldId`, and logs to changelog.
  - `archiveAction`: archives via `planArchive` + `archiveMemory` and resolves linked findings.
  - `patchReviewedMemory` is exported for shared `revision` + `last_confirmed` frontmatter updates.
- **Inbox receipts (`inbox.ts`)**:
  - `buildReceipt` creates short alnum IDs (`r-<ts36><rand>`, up to 14 chars), SHA-256 `candidate_hash` over `canonicalCandidateText`, `related_ids` (IDs only, never bodies), and `expires_at` (`INBOX_DEFAULT_TTL_DAYS`).
  - `writeReceipt`, `loadReceipt`, `listReceipts`, `cleanupExpired`, and `purgeReceipt` manage `<root>/inbox/<id>.json`, opportunistically deleting expired receipt files on read/list.
  - `serializeCandidateForApply` renders an `InboxCandidate` back to `TYPE: ... | TEXT: ...` syntax for `parseMemoryCandidate`.

## Workflow

1. **Guarded read flow**
   - `readGuardedMemory` -> `verifyMemoryHash` -> `scanSensitive` -> `scanInjection` -> `renderMemoryForAgent` / `renderMemoryForConfig`.
2. **Policy-gated autonomous write & rollback flow**
   - `loadPolicy` -> `evaluatePolicy` + `countWrittenToday` check -> `stagePolicySnapshots` (for updates) -> write -> `appendPolicyAudit`.
   - Rollback: `rollbackPolicyAudit` -> verify `rollback_until` -> restore snapshots / archive additions -> `purgePolicySnapshots` -> append `rolled_back` audit record.
3. **Maintenance review & inbox flow**
   - `deriveFindings` -> `loadReviewStore` -> `applyPersistedStatus` -> human invokes `dismiss` / `verify` / `supersede` / `archive` -> file + hash + index/graph/vector rebuild + `writeReviewStore` + `appendChangelog`.
   - Deferred candidates -> `buildReceipt` + `writeReceipt` -> `listReceipts` -> human applies via `serializeCandidateForApply` -> `purgeReceipt`.

## Code map

- `src/core/safety/security.ts` — `scanSensitive`, `redactSensitive`, `scanInjection`, and Markdown prefix normalization.
- `src/core/safety/hash.ts` — `sha256`, `loadHashes`, `saveHashes` (durable/working split), `updateHash`, `removeHash`, `verifyMemoryHash`, `verifyRoot`.
- `src/core/safety/safe-read.ts` — `readGuardedMemory` combining hash, sensitive, and injection gates before rendering.
- `src/core/safety/ignore.ts` — `loadIgnore`, `parseIgnore`, `isIgnored`, `matchPattern` glob engine.
- `src/core/safety/approval.ts` — `requestApproval`, `requestSelectionApproval`, `requestNoteApproval`, `requestGenerated*`, piped-stdin queueing, `applyApprovalEdit`.
- `src/core/safety/encryption.ts` — `deriveKey`, `encryptText`, `decryptText` (AES-256-GCM).
- `src/core/policy/schema.ts` — `EngramPolicy`, `DEFAULT_POLICY`, `validatePolicy`.
- `src/core/policy/load.ts` — `policyPath`, `loadPolicy`, `writeDefaultPolicy`, `writePolicy`.
- `src/core/policy/evaluate.ts` — `evaluatePolicy` pure allowlist evaluator.
- `src/core/policy/audit.ts` — `policyAuditPath`, `workingPolicyAuditPath`, `readPolicyAudit`, `appendPolicyAudit`, `candidateHash`, `countWrittenToday`, `latestAuditRecord`.
- `src/core/policy/snapshot.ts` — `stagePolicySnapshots`, `readPolicySnapshot`, `purgePolicySnapshots`.
- `src/core/policy/rollback.ts` — `rollbackPolicyAudit` for restoring updates and archiving additions.
- `src/core/review/findings.ts` — `deriveFindings` (`duplicate`, `contradiction`, `stale`, `invalid_dependency`) and `fingerprintOf`.
- `src/core/review/records.ts` — `loadReviewStore`, `writeReviewStore`, `applyPersistedStatus`, `dismissFinding`, `resolveFinding`, `seedRecord`, `seedAllRecords`.
- `src/core/review/actions.ts` — `dismissFindingAction`, `verifyAction`, `supersedeAction`, `archiveAction`, `patchReviewedMemory`.
- `src/core/review/inbox.ts` — `canonicalCandidateText`, `serializeCandidateForApply`, `nextReceiptId`, `isReceiptId`, `buildReceipt`, `writeReceipt`, `loadReceipt`, `listReceipts`, `cleanupExpired`, `purgeReceipt`.

## Interfaces and data

- **Persisted files**:
  - `.agents/engram.policy.json` — versioned team policy (`version: 1`).
  - `<root>/policy-audit.jsonl` and `<root>/working/policy-audit.jsonl` — append-only JSONL `PolicyAuditRecord` logs.
  - `<userConfigDir>/policy-rollbacks/<rootHash16>/<auditId>/<file>` — private before-images for autonomous updates.
  - `<root>/hashes.json` (`HASH_FILE`) and `<root>/working/hashes.json` (`WORKING_HASH_FILE`) — SHA-256 integrity maps.
  - `<root>/review/records.json` — persisted `ReviewStore` keyed by finding fingerprint.
  - `<root>/inbox/r-*.json` — TTL-bounded `InboxReceipt` files.
- **Invariants**:
  - Missing or invalid policy always fails closed (`allowed: false`).
  - Working-tier hashes and working-only policy audit receipts never modify committed files.
  - `dismissFindingAction` calls `resolveFinding` on existing records (marking `status: 'resolved'`) while seeding missing records with `status: 'dismissed'` (see Known limitations).

## Verification

- Existing test suites (observed in repository test structure and coordinator runs):
  - `tests/tamper.test.mjs` — SHA-256 hash verification and tamper rejection.
  - `tests/core.test.mjs` — safety scanning, redaction, ignore matching, policy evaluation, and review findings.
  - `tests/cli/inbox.test.mjs` — inbox receipt lifecycle, TTL expiry, and apply/purge flows.
- Inspection scope: all 16 source files listed in `source_paths` were directly read and verified against `HEAD` `4cc4f6a` plus the current working tree. Test commands were not executed from this read-only spec worker.

## Related documentation

- [Memory schema and storage](../architecture/memory-schema-and-storage.md)
- [Memory save and take-control](../features/memory-save-and-take-control.md)
- [Retrieval routing and ordering](../features/retrieval-routing-and-ordering.md)
- [Working memory and freshness](../features/working-memory-and-freshness.md)
- [Session learning and traces](../workflows/session-learning-and-traces.md)
- [Runtime configuration and profiles](../architecture/runtime-config-and-profiles.md)
- [CLI commands and dispatch](../interfaces/cli-commands-and-dispatch.md)
- [Entry web API](../interfaces/entry-web-api.md)

## Known limitations and open questions

- In `src/core/review/actions.ts` (`dismissFindingAction`, line 30), dismissing an already-seeded finding calls `resolveFinding(...)` (setting `status: 'resolved'`) rather than `dismissFinding(...)` (setting `status: 'dismissed'`), whereas unseeded dismissals seed `status: 'dismissed'`.
- In `src/core/safety/security.ts`, the email regex caps the local part at 64 characters (RFC 5321): longer local parts are still detected, but characters before the last 64 chars survive redaction.
- In `src/core/safety/ignore.ts`, `parseIgnore` intentionally drops negation rules (`!pattern`) rather than implementing full gitignore re-inclusion semantics.
- `src/core/review/actions.ts` (`supersedeAction`) explicitly disallows cross-scope superseding (`workspace` <-> `global`).

<!-- BEGIN MANUAL NOTES -->
<!-- END MANUAL NOTES -->
