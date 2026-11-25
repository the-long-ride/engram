---
schema_version: 1
id: "architecture.memory-schema-and-storage"
title: "Memory schema, storage, and lifecycle persistence"
kind: "architecture"
status: "verified"
summary: "Defines the canonical Markdown memory schema (v1–v3), safe YAML frontmatter, workspace/global scope layout, derived index persistence, rule-variant rendering, archival, linking, migration, and quality scoring."
tags: ["architecture","memory","schema","storage","frontmatter","index","migration"]
source_paths: ["src/core/analysis/quality.ts","src/core/memory/agent-render.ts","src/core/memory/archive.ts","src/core/memory/backups.ts","src/core/memory/context.ts","src/core/memory/frontmatter.ts","src/core/memory/global-folder.ts","src/core/memory/index.ts","src/core/memory/link-memory.ts","src/core/memory/memory-ref.ts","src/core/memory/memory-template.ts","src/core/memory/migrate-schema.ts","src/core/memory/rule-variants.ts","src/core/memory/schema.ts","src/core/memory/scope-gitignore.ts","src/core/memory/storage.ts"]
related_specs: ["feature.retrieval-routing-and-ordering","feature.working-memory-and-freshness","feature.memory-save-and-take-control","architecture.safety-policy-and-review","architecture.runtime-config-and-profiles","workflow.session-learning-and-traces","workflow.upgrade-vcs-and-diagnostics"]
last_doc_update_at: "2026-11-25T03:58:47Z"
last_verified_at: "2026-11-25T07:13:34Z"
last_verified_code_commit: "4cc4f6a"
last_source_change_commit: "7076b79"
last_source_change_at: "2026-10-13T04:40:05+07:00"
source_fingerprint: "sha256:5ec8f5df85f9599b2102be2c5c53c5c11ad7ad2da7fcf139b1c9f508126b78e4"
---
# Memory schema, storage, and lifecycle persistence

## Purpose and boundaries

This architecture establishes Engram's authoritative on-disk memory representation, validation rules, scope initialization, approved write pipeline, and derived index/context loading across `workspace` (`.agents/.engram/`) and `global` memory scopes.

In scope:
- Safe YAML frontmatter parsing, canonical sorted rendering, and top-level patching without YAML alias/merge hazards.
- Memory schema validation across v1 (legacy `Context`/`Content`/`Example`), v2 (`Content` + optional `Origin`), and v3 (`schema_version: 3`, `authority`, `revision`, `valid_from`, `last_confirmed`).
- Canonical memory drafting (`draftMemory`) and in-place merging (`updateMemory`), including rule variants (`light`, `balanced`, `strict`) and lean agent-facing rendering.
- Scope initialization (`initWorkspace`, `createScope`), managed scope `.gitignore`, gitignored migration backups, legacy schema/directory migration, global-folder retargeting, approved writes (`writeApprovedMemory`), archival (`archiveMemory`), and dependency wiring (`linkMemoryChildren`).
- Derived JSON index build/merge (`index.ts`), shared command context assembly (`getContext`), canonical memory references (`memory-ref.ts`), and deterministic memory quality/health scoring (`quality.ts`).

Out of scope:
- Retrieval ranking, graph/vector routing, and token-budget payload packing (see `feature.retrieval-routing-and-ordering`).
- Working-tier TTL promotion/pruning and source freshness hashing (see `feature.working-memory-and-freshness`).
- Candidate parsing, upsert/verdict planning, and `take-control` discovery (see `feature.memory-save-and-take-control`).
- Low-level secret/injection scanning, hash store internals, and Git conflict resolution (see `architecture.safety-policy-and-review`, `workflow.upgrade-vcs-and-diagnostics`).

## Observable behavior

- **Frontmatter safety (`frontmatter.ts`)**: `parseFrontmatter` rejects tab indentation, YAML anchors/aliases (`&`, `*`, `<<:`), duplicate keys, and non-mapping roots. `renderFrontmatter` recursively sorts keys for deterministic diffs. `updateFrontmatter` patches top-level keys while preserving the Markdown body.
- **Schema validation (`schema.ts`)**:
  - Supported `type`: `rule`, `skill`, `knowledge`; `scope`: `workspace`, `global`; `confidence`: `high`, `medium`, `low`; `lifecycle`: `active`, `review_due`, `superseded`, `archived`; `authority`: `instruction` (default for `rule`/`skill`) or `reference` (default for `knowledge`); `tier`: `durable`, `working`.
  - Author metadata requires either `author_name` (with optional `author_email`) or legacy `author`.
  - Schema v3 requires `schema_version: 3`, `authority`, positive integer `revision`, and valid dates for `valid_from` and `last_confirmed`. Optional `valid_until` must be a valid date or `null`. `evidence_refs` entries must match `/^tr_[A-Za-z0-9_-]+$/`.
  - Distilled field caps: `directive` <= 160 chars (`DIRECTIVE_MAX_CHARS`), `objective` <= 200 chars (`OBJECTIVE_MAX_CHARS`). `source_hash_mode` must be `digest` or `raw`.
  - Markdown style checks enforce a `## Content` section (legacy v1 with `## Context` must also include `## Example` in `Context -> Content -> Example` order), a blank line after every heading, and Markdown link syntax outside fenced code blocks.
  - Rule length limits default to 70 effective lines target (`RULE_EFFECTIVE_LINE_TARGET`) and 100 hard limit (`RULE_EFFECTIVE_LINE_HARD_LIMIT`), clamped to `[50, 200]`.
  - **Tier-by-location invariant**: `entryFromMemory` sets `tier: 'working'` and `note: true` solely from `isWorkingPath(file)` — a durable file claiming `tier: working` in frontmatter stays durable.
  - `routingTerms` caps at 256 deduplicated terms with `triggers`, `task_types`, and `directive` words leading before `Content` words.
- **Rule variants and rendering (`rule-variants.ts`, `agent-render.ts`)**:
  - Default `light`/`strict` variants are derived from `## Content` at render time and are not stored unless customized (`variantsDifferFromDefaults`).
  - `renderMemoryForConfig` selects the active variant (`config.rule_variants.active`, defaulting to `balanced`) and strips `## Rule Variants`.
  - `renderAgentCard` renders `- <id> [<type>(, working)] <directive-or-summary>( (stale))`.
  - `renderAgentBody` renders `### <id> [<type>, <authority>(, working...)]`, optional `requires: ...`, and the `## Content` text, dropping `Context`, `Example`, `Origin`, and `Rule Variants`.
- **Index and context (`index.ts`, `context.ts`)**:
  - `writeIndex` splits durable entries into the committed `index.json` (rewritten only when content other than `last_updated` changes) and working entries into the gitignored `working/index.json` (deleted when empty).
  - `loadIndex` unions committed durable entries with local working entries whose files still exist on disk, preventing phantom entries in fresh clones.
  - `mergeIndexes` gives `workspace` priority over `global` on duplicate IDs and sorts `workspace` before `global`, then by `file`.
  - `getContext` loads config, resolves profile/scope roots (clearing `workspace` when `!profile.workspace_allowed`), loads ignore rules, reads/rebuilds workspace and global indexes and graphs, and computes `hiddenCount`.
- **Approved writes (`storage.ts`)**:
  - `writeApprovedMemory` enforces secret scanning (`scanSensitive`), injection scanning (`scanInjection`), schema validation (`validateMemoryRaw`), and live non-expired `evidence_refs` verification against traces before writing.
  - Durable global writes pull global Git, write file, update hash, rebuild index/graph/vector index, append `CHANGELOG.md`, and commit global Git. Working-tier writes reconcile `.gitignore` first, skip `CHANGELOG.md`, and never pull or commit global Git.
- **Archival, linking, migration, and global folder (`archive.ts`, `link-memory.ts`, `migrate-schema.ts`, `backups.ts`, `global-folder.ts`)**:
  - `planArchiveSet` resolves by ID, file path, or `<scope>:<path>` and includes same-tier active global twins when archiving a workspace memory. Working memories archive under `working/archive/<date>/...`; durable memories archive under `archive/<date>/...`.
  - `linkMemoryChildren` idempotently appends a parent ID to each child's `depends_on` frontmatter and refreshes `updated`.
  - `migrateMemorySchema` upgrades active v1/v2 memories to v3 with `wx` backup files under `backups/schema-v3/`, atomic file replacement, and rollback if `updateHash` fails.
  - `updateGlobalFolder` retargets `global_path` (in profile store, workspace config, or user config), optionally moving an existing folder with cross-device fallback (`EXDEV` copy+remove) while refusing to overwrite non-empty targets.
- **Quality and health (`quality.ts`)**:
  - `scoreMemory` starts at 100 and deducts for missing v1 `## Example` (-25) or `## Context` (-20), missing v3 `authority` (-20), vague wording (`usually|typically|maybe|might`, -15), rule exceeding target lines (-10), and age > 180 days (-20).
  - `healthData` computes `max(0, 100 - stale * 5 - low_confidence * 8)` plus `coverage` and `hidden_by_ignore`.

## Workflow

1. **Scope initialization (`initWorkspace` / `createScope`)**:
   - Migrate legacy workspace root if present -> create `MEMORY_DIRS` (`rules`, `skills`, `knowledge`) -> migrate legacy dir names (`workflow`, `workflows`, `skill`, `rule`) and legacy observations -> write merged `engram.config.json`, hash store, help/README/changelog, and managed `.gitignore` -> rebuild index, graph, and vector index when missing, forced, or stale (`needsIndexRefresh`) -> ensure global Git branch and initial commit when global scope is configured.
2. **Approved durable or working write (`writeApprovedMemory`)**:
   - Resolve target scope root -> run `scanSensitive` and `scanInjection` -> run `validateMemoryRaw` with configured rule line limits -> verify every `evidence_refs` trace exists and is unexpired -> if working, ensure `.gitignore` covers `working/` -> if durable global, pull global Git -> write file -> `updateHash` -> `rebuildIndex` -> `rebuildGraph` -> `ensureVectorIndex` -> `appendChangelog` (durable only) -> if durable global, commit global Git.
3. **Schema v3 migration (`migrateMemorySchema`)**:
   - Scan active memory files -> skip v3 files -> build v3 frontmatter (`authority`, `revision`, `valid_from`, `last_confirmed`, `evidence_status`) -> validate migrated raw text -> write immutable backup via `writeBackupOnce` -> atomic rename -> `updateHash` (on hash error, restore original bytes and `utimes`).

## Code map

- `src/core/memory/frontmatter.ts` — `parseFrontmatter`, `renderFrontmatter`, `updateFrontmatter`, `frontmatterStringList`; safe YAML subset parser/serializer.
- `src/core/memory/schema.ts` — `parseMemory`, `validateMemory`, `validateMemoryRaw`, `entryFromMemory`, `memorySchemaVersion`, `defaultMemoryAuthority`, `resolveMemoryLimits`, `effectiveMemoryLines`, `frontmatter`.
- `src/core/memory/memory-ref.ts` — `memoryKey`, `normalizeRef`, `matchesMemoryRef`, `isExpired`.
- `src/core/memory/memory-template.ts` — `draftMemory`, `updateMemory`, `MemorySourceMeta`, `WorkingTierMeta`; v3 Markdown template rendering and bullet merging.
- `src/core/memory/rule-variants.ts` — `extractRuleVariants`, `canonicalRuleText`, `ruleVariantText`, `ruleVariantsFor`, `stripRuleVariantSection`, `canonicalRuleMemory`, `ruleVariantsAreCustomized`, `variantsDifferFromDefaults`, `renderMemoryForConfig`, `renderMemoryForAgent`, `defaultRuleVariants`, `extractContentSection`, `plainContentText`.
- `src/core/memory/agent-render.ts` — `renderAgentCard`, `renderAgentBody`; lean card and body formatting for agents.
- `src/core/memory/index.ts` — `emptyIndex`, `loadIndex`, `writeIndex`, `rebuildIndex`, `mergeIndexes`, `invalidMemoryFiles`, `staleWorkingEntries`, `committedWorkingRefs`.
- `src/core/memory/context.ts` — `getContext`, `loadSummary`, `entryPath`, `EngramContext`.
- `src/core/memory/storage.ts` — `initWorkspace`, `createScope`, `writeApprovedMemory`, `syncGlobalMemoryGit`, `appendChangelog`.
- `src/core/memory/scope-gitignore.ts` — `SCOPE_GITIGNORE`, `ensureScopeGitignore`; manages gitignored local sidecars (`memory.vec.sqlite`, `usage.json`, `agent-hook-cache.json`, `pending-approvals.json`, `session-queue.json`, `working/`, `stale.json`, `exports/`, `backups/`, session-learning traces/inbox receipts).
- `src/core/memory/backups.ts` — `BACKUPS_DIR`, `backupPath`, `backupRelative`, `writeBackupOnce`, `strayBackups`, `planBackupMoves`, `applyBackupMoves`.
- `src/core/memory/migrate-schema.ts` — `planMemorySchemaMigration`, `migrateMemorySchema`; v1/v2 to v3 migration with atomic writes and rollback.
- `src/core/memory/global-folder.ts` — `updateGlobalFolder`; global memory root retargeting and cross-device folder migration.
- `src/core/memory/archive.ts` — `planArchive`, `planArchiveSet`, `archiveMemory`; moves memories to `archive/` or `working/archive/` with twin handling.
- `src/core/memory/link-memory.ts` — `linkMemoryChildren`, `findEntry`; bulk `depends_on` frontmatter wiring.
- `src/core/analysis/quality.ts` — `scoreMemory`, `healthData`, `health`; deterministic per-memory quality and index health scoring.

## Interfaces and data

- **On-disk scope layout**:
  - Durable memory files: `<root>/{rules,skills,knowledge}/<id>.md`
  - Working-tier files (gitignored): `<root>/working/{rules,skills,knowledge}/<id>.md`, `working/index.json`, `working/graph.json`, `working/archive/<date>/...`
  - Derived/metadata files: `index.json`, `graph.json`, `hashes.json`, `CHANGELOG.md`, `engram.config.json`, `.gitignore`, `HELP.md`, `README.md`
  - Gitignored local sidecars: `memory.vec.sqlite*`, `usage.json`, `stale.json`, `agent-hook-cache.json`, `pending-approvals.json`, `session-queue.json`, `backups/`, `exports/`
- **Core types**: `EngramContext`, `ParsedFrontmatter`, `MemoryLimits`, `MemorySourceMeta`, `WorkingTierMeta`, `ArchivePlan`, `LinkResult`, `LinkSummary`, `BackupMove`, `MemorySchemaMigrationResult`, `InvalidMemoryFile`, `HealthData`.
- **Cross-module dependencies**: Imports config/profiles (`../runtime/config.js`), constants/types (`../runtime/constants.js`, `../runtime/types.js`), safety scans/hashes/ignore (`../safety/*`), traces (`../traces/*`), author validation/resolution (`../author/*`), and VCS git/conflict helpers (`../vcs/*`).

## Verification

- **Verified by direct source inspection**: All 16 listed `source_paths` were read in full or across their primary public exports and invariants at HEAD `4cc4f6a` (plus current working tree).
- **Inferred / not executed here**: Unit and integration test suites were not run during this read-only documentation pass; runtime behavior of external git/filesystem edge cases is inferred from the source implementation.

## Related documentation

- [Retrieval routing, ranking, and ordering](../features/retrieval-routing-and-ordering.md)
- [Working memory, observations, and source freshness](../features/working-memory-and-freshness.md)
- [Memory save planning and take-control discovery](../features/memory-save-and-take-control.md)
- [Safety policy and review](../architecture/safety-policy-and-review.md)
- [Runtime config and profiles](../architecture/runtime-config-and-profiles.md)
- [Session learning and traces](../workflows/session-learning-and-traces.md)
- [Upgrade, VCS, and diagnostics](../workflows/upgrade-vcs-and-diagnostics.md)

## Known limitations and open questions

- `linkMemoryChildren` modifies `depends_on:` via regex on raw frontmatter rather than `updateFrontmatter`, and does not itself invoke `updateHash` or `rebuildIndex`/`rebuildGraph` (callers must rehash/reindex if needed).
- `frontmatter.ts` intentionally supports a strict YAML subset without aliases, anchors, or merge keys; external tools writing arbitrary YAML features into memory files will fail `parseFrontmatter`.
- `archiveMemory` calls `appendChangelog` unconditionally, relying on `appendChangelog`'s internal `isWorkingPath` guard to skip working-tier archives.

<!-- BEGIN MANUAL NOTES -->
<!-- END MANUAL NOTES -->
