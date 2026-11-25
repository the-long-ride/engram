---
schema_version: 1
id: "workflow.upgrade-vcs-and-diagnostics"
title: "Transactional Upgrades, VCS Sync/Conflicts, Diagnostics, and Config DB"
kind: "workflow"
status: "verified"
summary: "Fingerprinted transactional upgrade pipeline with resumable conflict review, Git global sync and workspace submodule setup, deterministic memory merge-conflict resolution, composed doctor diagnostics, SQLite config database/migration, and dependency-free Node type shims."
tags: ["upgrade","vcs","git","diagnostics","doctor","sqlite"]
source_paths: ["src/core/config-db/migrate.ts","src/core/config-db/queries.ts","src/core/config-db/schema.ts","src/core/diagnostics/agents-chain.ts","src/core/diagnostics/doctor.ts","src/core/diagnostics/skill-files.ts","src/core/upgrade/executor.ts","src/core/upgrade/fingerprint.ts","src/core/upgrade/integration-scanner.ts","src/core/upgrade/inventory.ts","src/core/upgrade/managed-block.ts","src/core/upgrade/memory-scanner.ts","src/core/upgrade/planner.ts","src/core/upgrade/proposals.ts","src/core/upgrade/review-policy.ts","src/core/upgrade/review-store.ts","src/core/upgrade/types.ts","src/core/vcs/conflict.ts","src/core/vcs/git.ts","src/core/vcs/submodule.ts","src/node-shims.d.ts"]
related_specs: ["architecture.memory-schema-and-storage","feature.agent-hooks-and-skillsets","architecture.runtime-config-and-profiles","architecture.safety-policy-and-review","interface.cli-commands-and-dispatch","interface.entry-web-api"]
last_doc_update_at: "2026-11-25T03:58:47Z"
last_verified_at: "2026-11-25T07:13:34Z"
last_verified_code_commit: "4cc4f6a"
last_source_change_commit: "7076b79"
last_source_change_at: "2026-10-13T04:40:05+07:00"
source_fingerprint: "sha256:d4f35011c80e1911e80b3ea50904a720cbe49fceaf6e07c3192f539a4f910097"
---
# Transactional Upgrades, VCS Sync/Conflicts, Diagnostics, and Config DB

## Purpose and boundaries

This workflow subsystem maintains long-lived Engram installations across versions, machines, and repositories. It owns:

- The shared transactional upgrade engine (`src/core/upgrade/*`): scanning workspace and global memory schemas plus connected-agent artifacts, building fingerprinted plans, persisting resumable conflict review decisions, executing atomic grouped transactions with backup and rollback, and verifying post-apply convergence.
- Version-control workflows (`src/core/vcs/*`): deterministic memory merge-conflict classification and resolution, global memory Git repository init/pull/commit/push, and optional `.agents/.engram` workspace Git submodule setup.
- Composed health diagnostics (`src/core/diagnostics/*`): `runDoctor()` checks across config, policy, roots, hashes, invalid files, stray backups, index/graph/working-tier/vector freshness, host adapters, Codex `AGENTS.md` chain byte budget, Gemini MCP trust warnings, and generated `SKILL.md` frontmatter validation.
- The optional SQLite configuration database (`src/core/config-db/*`): schema initialization, typed CRUD for workspaces/user config/profiles, dotted-key flatten/unflatten, and JSON-to-SQLite migration (`engram upgrade --db-migrate`).
- Minimal dependency-free Node.js ambient type shims (`src/node-shims.d.ts`) used by the TypeScript build.

Out of scope: CLI command wrappers (`src/commands/upgrade-review.ts`, `src/commands/ops.ts`), Entry API HTTP routes (`src/entry/*`), and underlying memory schema migration transforms (`src/core/memory/migrate-schema.ts`).

## Observable behavior

### Transactional upgrade pipeline (`src/core/upgrade/*`)
- **Inventory scanning (`inventory.ts`, `memory-scanner.ts`, `integration-scanner.ts`)**:
  - Scans both `workspace` and (when configured) `global` scopes for two families: memory files (`planMemorySchemaMigration()` -> `current` / `outdated` / `invalid`, grouped into `${scope}:memory`) and integration artifacts (skillsets via `previewLinkedWorkspaceSkillsets` / `previewRegisteredGlobalSkillsets` and hooks via `previewInstalledAgentHooks`).
  - Canonicalizes multiple skillset registrations targeting the same physical file into one `UpgradeInventoryItem`; if registrations disagree on expected content, status becomes `conflict` with `ownership: 'unknown'` and `forceMode: 'none'`. Hook-owned files take precedence over skillset entries for the same path.
  - Classifies ownership and force capability: instruction files with exactly one workspace (`<!-- engram:start -->` / `<!-- engram:end -->`) or global (`<!-- BEGIN ENGRAM GLOBAL SKILLSET -->` / `<!-- END ENGRAM GLOBAL SKILLSET -->`) managed region get `ownership: 'managed-region'`, `forceMode: 'replace-managed-region'`; recognized generated skillset files get `ownership: 'generated-file'`, `forceMode: 'replace-file'`; everything else gets `unknown` / `none`.
- **Fingerprinting and planning (`fingerprint.ts`, `planner.ts`)**:
  - Each item gets a deterministic 24-hex SHA-256 `id`; the plan gets a SHA-256 `fingerprint` covering target version, roots, and every item's scope, kind, agents, path, versions, status, strategy, hashes, ownership, and force mode.
  - `validateUpgradePlan()` re-scans and rejects stale plans if the fingerprint changed.
- **Conflict review and proposals (`proposals.ts`, `review-policy.ts`, `review-store.ts`, `managed-block.ts`)**:
  - Only `config`, `instruction`, and `skillset` conflicts are replaceable (`isReplaceableConflictKind`); `memory`, `hook`, and `plugin` conflicts can only be resolved with `keep-current` (unless `force-latest` is eligible).
  - `getConflictProposal()` verifies `sourceHash`, renders a unified diff, and attaches `forceWarning` when force replacement is available. `validateConflictProposal()` rejects empty content and invalid JSON/JSONC for `config` items.
  - Resumable review decisions (`accept-latest`, `edited`, `keep-current`, `force-latest`) are stored under `<userConfigDir>/upgrade-reviews/<fingerprint>.json` with `0o700` dir / `0o600` file permissions and atomic temp-rename writes. `loadUpgradeReview()` salvages compatible decisions across plan refreshes for the same `targetVersion` and `workspaceRoot` whenever `sourceHash` (and `force-latest` ownership evidence) still matches, marking changed files `stale: true`.
  - `managed-block.ts` provides newline-preserving replacement for both versioned `<!-- engram:<marker>:start ... -->` blocks and exact delimited regions (`replaceDelimitedManagedRegion`).
- **Transactional execution (`executor.ts`)**:
  - Requires `options.confirmed === true`, validates plan freshness, enforces that every `conflict`/`invalid` blocker has a non-stale review decision, and rejects duplicate physical file write intents.
  - Captures pre-write byte/mode snapshots and writes backups before mutating: memory backups go to `<scopeRoot>/backups/upgrade-<version>/` via `writeBackupOnce()`; integration backups write a non-overwriting sibling `.engram-upgrade-<version>.bak` (`flag: 'wx'`).
  - Memory groups run `migrateMemorySchema()`, `rebuildIndex()`, `rebuildGraph()`, and best-effort `ensureVectorIndex()` (degraded vector rebuilds surface as `vectorWarnings` rather than rolling back). Any failure in memory or integration writes restores all captured snapshots (including sidecars) and throws with status `rolled-back`.
  - After all groups succeed, `verifyUpgradeConvergence()` re-scans and throws if any updated item is not `current`.

### VCS sync, submodules, and conflict resolution (`src/core/vcs/*`)
- **Global Git (`git.ts`)**:
  - Workspace Git is intentionally left untouched; global Git operates only on the global memory root.
  - `ensureGlobalGit()` initializes a Git repo on a validated branch name (`normalizeBranchName`), `configureGlobalRemote()` validates URLs (`https:`, `http:`, `ssh:`, `git:`, `file:`, or SCP-like syntax) and redacts credentials in output.
  - `gitAddEngramOwned()` stages only Engram-owned paths (durable `MEMORY_DIRS` excluding `working/`, plus `index.json`, `graph.json`, `hashes.json`, `CHANGELOG.md`, `HELP.md`, `README.md`, `.gitignore`, `engram.config.json`).
  - `pullGlobalGit()` and `gitCommitGlobal()` require a complete `ResolvedAuthor` (`gitIdentityEnv`) for commits, pull with `--no-rebase --no-edit --allow-unrelated-histories`, invoke `onResolve` when `auto_resolve` is enabled, and retry push after pull on non-fast-forward rejection.
- **Workspace submodule (`submodule.ts`)**:
  - `configureWorkspaceSubmodule()` initializes `.agents/.engram` as a local Git repo, commits initial files with the resolved author, configures `.gitmodules`, refuses conversion if `.agents/.engram` is already tracked as regular files (`ls-files -s` mode != `160000`), and stages `.gitmodules` and the gitlink.
- **Memory conflict resolution (`conflict.ts`)**:
  - Scans `.md` files for `<<<<<<<` markers and classifies each as `DUPLICATE` (two `updated:` dates), `CONTRADICT` (prohibition + obligation keywords), `EXTEND` (>3 `## ` headings), or `UNRELATED`.
  - `CONTRADICT` conflicts are never auto-resolved (`needs human review`).
  - For other conflicts, `resolveConflictText()` resolves each conflict block by keeping identical text, picking the newer `updated: YYYY-MM-DD` side, keeping `ours` on block-level contradiction, or deduplicating/merging lines.
  - Resolved text must pass `scanSensitive()`, `scanInjection()`, and `validateMemoryRaw()` before being written; when applied (`dryRun = false`), updates hashes, rebuilds the scope index, appends to `CHANGELOG.md`, and stages resolved workspace files + metadata in Git.

### Composed diagnostics (`src/core/diagnostics/*`)
- `runDoctor(ctx, scope)` executes and summarizes (`passed`, `warned`, `failed`, `skipped`) checks across:
  - `config.resolved`, `config.profile`, `policy.configured` / `policy.invalid` / `policy.valid`.
  - Per scope (`workspace`, `global`): root existence (`root.*`), hash verification (`hash.*` / `hash.mismatch`), invalid memory files (`memory.invalid`), stray backups (`memory.stray_backups`), index and graph counts (`index.entries.*`, `index.graph.*`), working-tier sidecar drift and undated working files (`index.working.*`, `working.no-expiry`), and read-only experimental vector index status (`vector.*`).
  - Host adapters: detected executables (`host.executables`), linked workspace targets (`host.engram_linkage`), Codex `AGENTS.md` instruction chain byte usage (`host.agents_md_chain`, warning at >= 80% of `project_doc_max_bytes`, default 32 KiB, reading `CODEX_HOME` and `config.toml`), Gemini `mcpServers.engram.trust === true` warning (`host.gemini_trust`, since `trust: true` would bypass `engram_commit` confirmation), and generated `SKILL.md` frontmatter validation (`host.skill_frontmatter`).
- `doctorDiagnostics()` converts `fail`/`warn` checks into `Diagnostic[]` for `EngramEnvelope`.

### SQLite config DB and migration (`src/core/config-db/*`)
- `openConfigDb()` opens `~/.engram/engram.db` (`userConfigDir()`) in WAL mode using built-in `node:sqlite` (`DatabaseSync`) first and `better-sqlite3` as fallback, returning `undefined` when neither is available.
- Creates 5 tables (`schema_version` at version `1`, `workspaces`, `workspace_config` with cascade delete, `user_config`, `profiles`).
- `queries.ts` provides typed CRUD plus `ALLOWED_KEYS`, `flattenConfig()`, and `unflattenConfig()` for dotted config keys (`scope`, `read`, `proof`, `hooks.path_rules`, `ignore.*`, `load.limit`, `graph.*`, `vector.*`, `rule_variants.*`, `live_sync.*`, `pattern_mining.*`, `pr_workflow.*`, `encryption.*`, `global_git.*`, `memory.*`, `author.*`).
- `migrate.ts` (`runMigration`) discovers JSON user config, profiles, and workspace configs; supports `dryRun` preview and `--force` apply into SQLite tables without deleting legacy JSON files.

### Node type shims (`src/node-shims.d.ts`)
- Declares minimal ambient globals (`process`, `console`, `Buffer`) and `node:*` module shims (`fs`, `fs/promises`, `path`, `url`, `os`, `crypto`, `child_process`, `readline`, `process`, `http`, `net`) so TypeScript builds without requiring `@types/node`.

## Workflow

```text
Upgrade lifecycle:
  scanUpgradeInventory(cwd, config, targetVersion)
    ├─ scanMemoryUpgrades(workspace, global)
    └─ scanIntegrationUpgrades(workspace, global)
         │
         ▼
  buildUpgradePlan() ──► deterministic plan + SHA-256 fingerprint
         │
         ├─ (if blockers) getConflictProposal() ──► saveUpgradeResolutions() (0o600 review store)
         ▼
  applyUpgradePlan(confirmed: true, review)
    ├─ validateUpgradePlan() (reject stale fingerprint)
    ├─ verify all conflict/invalid blockers resolved + valid
    ├─ per transactionGroup: capture snapshots ──► write backups ──► atomic apply
    │    └─ on error: restore snapshots ──► status: 'rolled-back'
    └─ verifyUpgradeConvergence() (re-scan must be 'current')
```

## Code map

| File | Responsibility |
| --- | --- |
| `src/core/upgrade/types.ts` | Upgrade inventory, plan, conflict resolution/proposal, review summary, and apply result types |
| `src/core/upgrade/fingerprint.ts` | Deterministic 24-hex item IDs and SHA-256 plan fingerprints |
| `src/core/upgrade/inventory.ts` | Workspace/global inventory coordinator combining memory and integration scanners |
| `src/core/upgrade/memory-scanner.ts` | Adapts `planMemorySchemaMigration()` output into `UpgradeInventoryItem[]` |
| `src/core/upgrade/integration-scanner.ts` | Canonicalizes skillset and hook upgrade previews, detects multi-target conflicts and ownership |
| `src/core/upgrade/planner.ts` | Sorts items, computes per-scope status counts, builds `UpgradePlan` |
| `src/core/upgrade/review-policy.ts` | Defines replaceable conflict kinds (`config`, `instruction`, `skillset`) |
| `src/core/upgrade/proposals.ts` | Generates current/proposed/latest conflict proposals, unified diffs, and JSON/non-empty validation |
| `src/core/upgrade/review-store.ts` | Persists and salvages resumable review decisions in `<userConfigDir>/upgrade-reviews/` |
| `src/core/upgrade/managed-block.ts` | Newline-preserving managed block and delimited region replacement |
| `src/core/upgrade/executor.ts` | Plan validation, transactional memory/integration apply, backups, rollback, convergence verification |
| `src/core/vcs/git.ts` | Global memory Git init, remote config, Engram-owned staging, author-attributed commit/pull/push |
| `src/core/vcs/submodule.ts` | Optional `.agents/.engram` workspace Git submodule initialization and `.gitmodules` staging |
| `src/core/vcs/conflict.ts` | Conflict discovery, classification, safe auto-resolution, security/schema validation, rehash/reindex |
| `src/core/diagnostics/doctor.ts` | Composed `runDoctor()` checks and `doctorDiagnostics()` envelope adapter |
| `src/core/diagnostics/agents-chain.ts` | Codex `AGENTS.md` / `AGENTS.override.md` / fallback chain discovery and `project_doc_max_bytes` parsing |
| `src/core/diagnostics/skill-files.ts` | Discovers and validates Engram-generated `SKILL.md` files against Agent Skills + Claude specs |
| `src/core/config-db/schema.ts` | SQLite `engram.db` open (`node:sqlite` / `better-sqlite3`), WAL mode, schema DDL v1 |
| `src/core/config-db/queries.ts` | Typed CRUD for workspaces, workspace/user config, profiles, and dotted config flatten/unflatten |
| `src/core/config-db/migrate.ts` | JSON-to-SQLite config/profile/workspace discovery, dry-run preview, and `--force` migration |
| `src/node-shims.d.ts` | Dependency-free ambient Node.js type declarations for `tsc` |

## Interfaces and data

- **`UpgradePlan`**: `{ currentVersion, targetVersion, scannedAt, fingerprint, workspaceRoot, globalRoot?, summary, items, warnings, review? }`.
- **`UpgradeInventoryItem`**: `{ id, scope, kind: 'memory' | 'instruction' | 'skillset' | 'config' | 'hook' | 'plugin', agent?, agents?, file, installedVersion?, targetVersion, status: 'current' | 'outdated' | 'conflict' | 'invalid', strategy, userEditsPreserved, reason, currentHash?, expectedManagedHash?, ownership, forceMode, transactionGroup }`.
- **`Conflict` / `ConflictResult`**: `{ file, kind: 'EXTEND' | 'CONTRADICT' | 'DUPLICATE' | 'UNRELATED', summary, resolved, staged, decision }`.
- **`DoctorResult`**: `{ checks: DoctorCheck[], passed, warned, failed, skipped }`.
- **Config DB tables (`schema_version = 1`)**: `schema_version`, `workspaces`, `workspace_config`, `user_config`, `profiles`.

## Verification

- `node --test tests/conflict.test.mjs` and `node --test tests/init-migration.test.mjs` verify merge-conflict classification/resolution and schema/config migrations.
- `npm run test:cli` and `npm run test:core` exercise `engram upgrade` (plan, review, apply, rollback), `engram doctor`, global Git sync, and workspace submodules.
- `npm run typecheck` validates all modules against `src/node-shims.d.ts`.

## Related documentation

- [Memory Schema and Storage](../architecture/memory-schema-and-storage.md)
- [Agent Hooks, Path Rules, and Skillset Adapters](../features/agent-hooks-and-skillsets.md)
- [Runtime Config and Profiles](../architecture/runtime-config-and-profiles.md)
- [Safety Policy and Review](../architecture/safety-policy-and-review.md)
- [CLI Commands and Dispatch](../interfaces/cli-commands-and-dispatch.md)
- [Entry Web API](../interfaces/entry-web-api.md)

## Known limitations and open questions

- SQLite config DB requires either Node >= 22.5 (`node:sqlite`) or optional peer dependency `better-sqlite3`; otherwise `openConfigDb()` returns `undefined` and `runMigration()` reports SQLite unavailable.
- `migrate.ts` flattens a curated subset of scalar config keys (`scope`, `read`, `proof`, `global_path`, `default_profile`, `enabled`, `hooks.path_rules`, `load.limit`, `rule_variants.*`) during migration and intentionally leaves existing JSON files intact.
- `resolveConflictsInRoot()` uses conservative keyword heuristics for `CONTRADICT` detection and refuses to auto-resolve contradictory blocks, deferring them to human review.

<!-- BEGIN MANUAL NOTES -->
<!-- END MANUAL NOTES -->
