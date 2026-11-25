---
schema_version: 1
id: "feature.ingest-author-and-benchmarks"
title: "Source ingestion, author identity management, and retrieval benchmarks"
kind: "feature"
status: "verified"
summary: "Pluggable take-control source extractors and token-budgeted repo maps, transactional layered author identity with Git sync and legacy memory migration, and versioned retrieval benchmark execution including freshness-ordering and multi-turn-session suites."
tags: ["ingest","extractors","repo-map","author","git-sync","migration","benchmark","freshness-ordering","multi-turn-session"]
source_paths: ["src/core/author/config.ts","src/core/author/git-sync.ts","src/core/author/migrate-memories.ts","src/core/author/resolve.ts","src/core/author/types.ts","src/core/author/validate.ts","src/core/benchmark/mine-git.ts","src/core/benchmark/run.ts","src/core/benchmark/schema.ts","src/core/ingest/extractors/code.ts","src/core/ingest/extractors/config.ts","src/core/ingest/extractors/docs.ts","src/core/ingest/extractors/host-memory.ts","src/core/ingest/extractors/manifest.ts","src/core/ingest/registry.ts","src/core/ingest/repo-map.ts","src/core/ingest/structured.ts","src/core/ingest/text.ts","src/core/ingest/types.ts"]
related_specs: ["architecture.safety-policy-and-review","feature.memory-save-and-take-control","feature.retrieval-routing-and-ordering","feature.working-memory-and-freshness","feature.agent-hooks-and-skillsets","architecture.runtime-config-and-profiles","workflow.upgrade-vcs-and-diagnostics","interface.cli-commands-and-dispatch"]
last_doc_update_at: "2026-11-25T05:29:08Z"
last_verified_at: "2026-11-25T07:13:34Z"
last_verified_code_commit: "4cc4f6a"
last_source_change_commit: "7076b79"
last_source_change_at: "2026-10-13T04:40:05+07:00"
source_fingerprint: "sha256:fb321bd8c0d1e34dab01d5922d0ee3b38695b22556d4d67cf4a45fe9ea33fdff"
---
# Source ingestion, author identity management, and retrieval benchmarks

## Purpose and boundaries

This specification covers three supporting feature engines in `src/core/`:

1. **Pluggable source ingestion & repo map (`src/core/ingest/**`)**: converts workspace documents, source code, config files, build manifests, and host-local memory files into sanitized, secret-redacted `SourceDigest` objects and token-budgeted `repoMap` summaries for `take-control`.
2. **Author identity management (`src/core/author/*`)**: validates, resolves, transactionally persists, syncs to global Git config, and migrates legacy memory frontmatter author metadata across workspace and global scopes.
3. **Retrieval benchmark runner (`src/core/benchmark/*`)**: validates versioned benchmark suites (`v1` / `v2`) and evaluates routed retrieval, path-triggers, working-tier lifecycle omission, `freshness-ordering`, and `multi-turn-session` delta hook efficiency.

Out of scope:
- `take-control` orchestration and memory candidate saving (covered by `feature.memory-save-and-take-control`).
- Underlying routing, freshness scoring, and topological ordering algorithms (covered by `feature.retrieval-routing-and-ordering` and `feature.working-memory-and-freshness`).
- Hook session state storage and CLI command wrappers (`src/commands/author-cmd.ts`, `src/commands/ops.ts`, `src/commands/read.ts`) (covered by `feature.agent-hooks-and-skillsets` and `interface.cli-commands-and-dispatch`).

## Observable behavior

### Source ingestion and repo map (`src/core/ingest/**`)
- **Registry precedence (`registry.ts`)**: `EXTRACTORS` checks extractors in specificity order `[manifestExtractor, configExtractor, codeExtractor, docsExtractor]`, filtered by the caller's allowed `Set<SourceKind>` (`SOURCE_KINDS = ['docs', 'code', 'config', 'manifest']`).
- **Safe digesting (`registry.ts`, `text.ts`)**:
  - `digestSource(relPath, text, kinds, maxChars)` extracts, runs `sanitizeSource` (drops lines matching `scanInjection`, redacts URL passwords `//user:pass@`, redacts `--*token/password/secret/key/auth/otp/credential*` flags, and applies `redactSensitive`), compacts whole lines to `maxChars` via `compactExcerpt` (defanging triple backticks to `~~~`), filters symbols (<= 120 chars, no sensitive/injection findings), and hashes both `hash` (digest text) and `rawHash` (raw source text). Extractor errors degrade safely to an empty digest.
  - `digestHostMemory(relPath, text, maxChars)` bypasses `EXTRACTORS` and runs `hostMemoryExtractor` exclusively for `take-control --from`.
- **Extractors (`extractors/*`)**:
  - `manifestExtractor`: extracts stack facts (never secret values) from `package.json` (script names only, engines, deps), MSBuild (`.csproj`/`.fsproj`/`.vbproj`), `pyproject.toml`, `go.mod`, `Cargo.toml`, `Dockerfile*` (base images, env/arg *names* only, exposed ports), and `.github/workflows/*.yml|yaml`.
  - `configExtractor`: reads `.json`, `.jsonc`, `.yaml`, `.yml`, `.toml` keys to depth 2 (`a.b`). Emits values only for the D14 allowlist (`TargetFramework(s)`, `engines.*`, `scripts.*` when not a manifest, and top-level/`project`/`package` `name`).
  - `codeExtractor`: supports TS/JS (`ts, tsx, mts, cts, js, jsx, mjs, cjs`), C# (`cs`), Java (`java`), Kotlin (`kt, kts`), Python (`py`), Go (`go`), and Rust (`rs`). Emits one `imports:` line, first doc-comment lines, and public/exported signatures cut before bodies with string literals emptied and parameter defaults stripped so secrets never leak.
  - `docsExtractor`: matches `.md, .mdx, .mdc, .txt, .rst, .adoc, .json`, `.clinerules`, `.windsurfrules`, `.cursorrules`, and `isConvertibleDocument(relPath)`; keeps all lines and extracts Markdown headings as symbols.
  - `hostMemoryExtractor`: strips host frontmatter (`name`, `description`, `modified`), maps `type` (`feedback -> rule`, `project -> knowledge`, `reference -> knowledge`; deliberately omits `user`), emits a `host type: ... -> propose TYPE: ...` hint line, and keeps only the body.
- **Structured readers (`structured.ts`)**: dependency-free, never-throwing parsers for JSON/JSONC (`parseJsonLoose`, `jsonEntries`), indentation-based YAML (`yamlEntries`), and line-based TOML (`tomlEntries`, `quotedItems`).
- **Repo map (`repo-map.ts`)**: `repoMap(digests, budgetTokens)` renders `docs`/`config` as per-file blocks (`renderFileBlock`) and aggregates `code`/`manifest` per directory (top 12 ranked symbols, deduplicated imports up to 300 chars, manifest facts up to 400 chars). When over `budgetTokens`, trims directories largest-first (file count, then path), then per-file blocks from the end, appending `omitted: <names>` (up to 20 listed). `repoMapDirectoryGlobs(map)` returns `dir/**` globs for kept non-root directories.

### Author identity management (`src/core/author/*`)
- **Validation (`validate.ts`)**: `normalizeAuthorName` requires 1-200 Unicode characters without control chars; `normalizeAuthorEmail` requires exactly one `@`, <= 320 chars, no whitespace/controls/`<>`. `tryNormalizeAuthorProfile` returns `null` on invalid input.
- **Layered resolution (`resolve.ts`)**: `getAuthorState(cwd)` resolves in strict precedence: `workspace` -> `global` -> effective `git` (`user.name` + `user.email`) -> `unresolved`. `requireResolvedAuthor` throws actionable CLI guidance when unresolved.
- **Transactional persistence (`config.ts`)**:
  - `readConfiguredAuthorLayers` reads `author.name`/`author.email` from SQLite config DB first, falling back to `userConfigPath()` and `<workspaceRoot>/engram.config.json`.
  - `setAuthorProfile` / `unsetAuthorProfile` acquire an exclusive lock (`<userConfigDir>/author.lock`, up to 50 retries x 20ms), update both config DB and JSON file atomically (`0o600` temp file + rename), and roll back both DB and file bytes on any failure.
- **Global Git sync (`git-sync.ts`)**:
  - `planGlobalGitAuthorSync` requires a configured global Engram author and previews `user.name` / `user.email` diffs.
  - `syncGlobalGitAuthor` requires `{ confirmed: true }`, writes both keys, re-reads to verify, and restores previous global Git values (or unsets if previously absent) on failure.
- **Legacy memory migration (`migrate-memories.ts`)**:
  - `planAuthorMemoryMigration(cwd, scope, { stripEmail })` scans active memory files, validates each with `validateMemoryRaw`, and classifies rows as `current`, `migrate`, `skipped`, or `invalid`. Global migration never falls back to Git identity.
  - `migrateMemoryAuthors(cwd, scope, { confirmed: true, stripEmail })` snapshots all target files and sidecars (`hashes`, `index`, `graph`, `working/*`, `vector.db*`), writes one-time backups (`.pre-author-v3.bak` or `.pre-strip-email.bak`), updates frontmatter (`author_name`, optional `author_email` per `includeAuthorEmail(config)`, removing legacy `author`), updates hashes, and rebuilds index, graph, and vector index. On any failure, restores all file and sidecar snapshots and throws `AuthorMigrationError`.

### Retrieval benchmarks (`src/core/benchmark/*`)
- **Schema (`schema.ts`)**:
  - `parseBenchmarkDocument` accepts legacy arrays (`version: 1`) or `{ version: 1 | 2, cases }` objects.
  - Supports 15 `BenchmarkCategory` values: `zero-match`, `paraphrase`, `negation`, `dependency-chain`, `profile-isolation`, `duplicate`, `mixed-intent`, `disagreement`, `security`, `session-start`, `path-trigger`, `working-expired`, `freshness-ordering`, `multi-turn-session`, and `telemetry-loop`.
  - Validates `max_tokens` via `parseMaxTokens`, forbids absolute paths in `path-trigger` queries, and validates optional `expect_omitted`, `expect_expanded`, `expect_body_order`, non-empty `turns`, and `applied_ids`.
- **Execution & metrics (`run.ts`)**:
  - `SEPARATE_CATEGORIES` (`path-trigger`, `working-expired`, `freshness-ordering`, `multi-turn-session`, `telemetry-loop`) are excluded from primary `metrics` so adding specialized suites never shifts baseline `tokens_mean` or `recall_at_k`.
  - Primary routed cases run `planLoad`, score `precision_at_k`, `recall_at_k`, `forbidden_hits`, `dependency_failures`, `isolation_failures`, `zero_result_correctness`, `tokens_mean`, `tokens_p95`, and simulated 4-turn hook token cost (`SessionStart` + `HOOK_SIM_PROMPT_TURNS = 3` prompts via `simulateHookTurns`, reporting `hook_tokens_mean` and `hook_tokens_p95`).
  - `path-trigger` cases invoke `loadForPaths(ctx, [item.query])` and emit `path_trigger` metrics.
  - `working-expired` cases verify `expect_omitted` IDs appear in `plan.omitted` (`reason === 'lifecycle'`) and not in routed results, emitting `lifecycle.omitted_correctness`.
  - `freshness-ordering` cases verify `expect_expanded` (or `expect`) are present in `plan.payload_rows`, verify `expect_body_order` is a strict in-order subsequence of expanded bodies, and compute MRR over `[...payload_rows, ...card_rows]`, emitting `ordering: { cases, expansion_accuracy, order_accuracy, mrr, tokens_mean }`.
  - `multi-turn-session` cases run `simulateHookTurns` (tracking `delivered`, `carded`, and `hookStartupAuto` when `SessionStart` + `read === 'auto'`) with `measureNaive: true` (comparing against untiered `full: true` reloads on non-start turns), emitting `multi_turn: { cases, recall_across_turns, session_hook_tokens_mean, naive_tokens_mean, token_savings_ratio }`.
  - `telemetry-loop` cases run `telemetryLoopResult`, simulating repeated turns (default 22) against an in-memory mutable `UsageMap` passed via `LoadPlanOptions.usage`, crediting `applied_ids` (or `expect`) as applied while leaving noisy `forbid` entries at zero utility, verifying that noisy entries drop in rank or exit `payload_rows` while `expect` stays matched, and emitting `telemetry_loop: { cases, noisy_demoted_rate, initial_tokens_mean, final_tokens_mean }`.
- **Git benchmark mining (`mine-git.ts`)**:
  - `mineBenchmarkCasesFromGit(ctx, { range?, maxCases?, cwd? })` scans recent non-merge commits, redacts commit subjects via `redactSensitive`, matches workspace memories via `entriesForPath` (`applies_to`) and `>= 2` stem hits against touched paths, and returns a redacted `version: 2` `BenchmarkDocument` without memory bodies.

## Workflow

1. **Take-control ingestion**: `digestSource` / `digestHostMemory` -> extractor match -> `sanitizeSource` -> `compactExcerpt` -> `repoMap(digests, budgetTokens)` -> directory globs & excerpts fed to save-plan guidance.
2. **Author lifecycle**: `setAuthorProfile` (lock -> DB + atomic JSON -> rollback on error) -> `resolveAuthor` (`workspace > global > git`) -> optional `syncGlobalGitAuthor` (`--confirm` -> verify -> rollback on error) -> optional `migrateMemoryAuthors` (`--confirm` -> snapshot -> backup -> rewrite -> rehash/rebuild -> rollback on error).
3. **Benchmark run**: `parseBenchmarkDocument` -> `runBenchmark(ctx, cases)` -> dispatch by category (`path-trigger`, `multi-turn-session`, or `planLoad` for routed/`working-expired`/`freshness-ordering`) -> aggregate `metrics`, `path_trigger`, `lifecycle`, `ordering`, and `multi_turn`.

## Code map

- `src/core/ingest/types.ts` — `SourceKind`, `SOURCE_KINDS`, `SourceDigest`, `ExtractedSource`, `SourceExtractor`.
- `src/core/ingest/text.ts` — `sanitizeSource`, `compactExcerpt`, `safeClip`, `nameList`, `normalizeRelPath`, `baseName`, `extensionOf`.
- `src/core/ingest/structured.ts` — `parseJsonLoose`, `jsonEntries`, `yamlEntries`, `tomlEntries`, `quotedItems`.
- `src/core/ingest/registry.ts` — `extractorFor`, `digestSource`, `digestHostMemory`.
- `src/core/ingest/repo-map.ts` — `repoMap`, `renderFileBlock`, `repoMapDirectoryGlobs`.
- `src/core/ingest/extractors/manifest.ts` — `manifestExtractor` for `package.json`, MSBuild, `pyproject.toml`, `go.mod`, `Cargo.toml`, Dockerfiles, and GitHub Actions workflows.
- `src/core/ingest/extractors/config.ts` — `configExtractor`, `configEntries`, `isAllowlistedValue`.
- `src/core/ingest/extractors/code.ts` — `codeExtractor` (TS/JS, C#, Java, Kotlin, Python, Go, Rust signature/doc/import scanner).
- `src/core/ingest/extractors/docs.ts` — `docsExtractor` for Markdown, text, rule files, and convertible documents.
- `src/core/ingest/extractors/host-memory.ts` — `hostMemoryExtractor`, `HOST_TYPE_MAP`, `hostMemoryType`.
- `src/core/author/types.ts` — `AuthorProfile`, `AuthorState`, `ResolvedAuthor`, `GitAuthorSyncPlan`, `AuthorMigrationPlan`, `AuthorMigrationError`.
- `src/core/author/validate.ts` — `normalizeAuthorName`, `normalizeAuthorEmail`, `normalizeAuthorProfile`, `tryNormalizeAuthorProfile`.
- `src/core/author/config.ts` — `readConfiguredAuthorLayers`, `setAuthorProfile`, `unsetAuthorProfile`, file-lock + DB/JSON rollback.
- `src/core/author/resolve.ts` — `readEffectiveGitAuthor`, `getAuthorState`, `resolveAuthor`, `requireResolvedAuthor`.
- `src/core/author/git-sync.ts` — `defaultGitConfigAdapter`, `planGlobalGitAuthorSync`, `syncGlobalGitAuthor`.
- `src/core/author/migrate-memories.ts` — `planAuthorMemoryMigration`, `migrateMemoryAuthors` with full file + sidecar rollback.
- `src/core/benchmark/mine-git.ts` — `mineBenchmarkCasesFromGit`; mines redacted `version: 2` benchmark cases from non-merge Git history without memory bodies.
- `src/core/benchmark/schema.ts` — `BenchmarkCategory`, `BenchmarkCase`, `BenchmarkDocument`, `parseBenchmarkDocument`.
- `src/core/benchmark/run.ts` — `runBenchmark`, `HOOK_SIM_PROMPT_TURNS`, `BenchmarkRun`, `BenchmarkMetrics`, `BenchmarkOrderingMetrics`, `BenchmarkMultiTurnMetrics`, `BenchmarkTelemetryLoopMetrics` (including `telemetryLoopResult`).

## Interfaces and data

- **Persisted state & locks**:
  - `<userConfigDir>/author.lock` — short-lived exclusive lock for author mutations.
  - `<userConfigDir>/config.json` and `<workspaceRoot>/engram.config.json` (plus SQLite config DB `author.name`/`author.email`) — author profile storage.
  - Global Git config (`user.name`, `user.email`) — updated only via `syncGlobalGitAuthor` with `confirmed: true`.
  - `<root>/backups/author/v3/...` and `<root>/backups/author-strip-email/<day>/...` — pre-migration backups.
- **Test hooks**:
  - `setAuthorSnapshotWriterForTests` (`src/core/author/config.ts`) and `setAuthorMigrationWriterForTests` (`src/core/author/migrate-memories.ts`) inject write failures to verify rollback paths.
  - `GitConfigAdapter` (`src/core/author/git-sync.ts`) and `ResolveAuthorDeps` (`src/core/author/resolve.ts`) allow dependency injection in unit tests.

## Verification

- Existing test suites (observed in repository test structure and coordinator runs):
  - `tests/core/benchmark.test.mjs` and `tests/cli/benchmark.test.mjs` — schema validation, `routing-v2`, `learning-ordering-v1`, `freshness-ordering`, and `multi-turn-session` metrics and baselines.
  - `tests/core.test.mjs` — source extractors, `repoMap`, and author resolution/validation/migration.
- Inspection scope: all 18 source files listed in `source_paths` were directly read and verified against `HEAD` `4cc4f6a` plus the current working tree. Test commands were not executed from this read-only spec worker.

## Related documentation

- [Safety, policy, and review architecture](../architecture/safety-policy-and-review.md)
- [Memory save and take-control](../features/memory-save-and-take-control.md)
- [Retrieval routing and ordering](../features/retrieval-routing-and-ordering.md)
- [Working memory and freshness](../features/working-memory-and-freshness.md)
- [Agent hooks and skillsets](../features/agent-hooks-and-skillsets.md)
- [Runtime configuration and profiles](../architecture/runtime-config-and-profiles.md)
- [Upgrade, VCS, and diagnostics workflow](../workflows/upgrade-vcs-and-diagnostics.md)
- [CLI commands and dispatch](../interfaces/cli-commands-and-dispatch.md)

## Known limitations and open questions

- In `src/core/ingest/text.ts`, `SECRET_FLAG` matches compound `--*key` flags, so benign flags such as `--sort-key <value>` are conservatively redacted as a known false positive.
- In `src/core/ingest/text.ts`, `sanitizeSource` does not recognize short password flags like `-p<password>`.
- `src/core/ingest/extractors/code.ts` uses linear regex/line-scanning rather than full AST parsing, so multiline declarations or non-standard formatting outside anchored patterns may be omitted from digests.
- `src/core/benchmark/run.ts` simulates `multi-turn-session` hook turns in-memory (`simulateHookTurns`) rather than executing host hook scripts over stdio.

<!-- BEGIN MANUAL NOTES -->
<!-- END MANUAL NOTES -->
