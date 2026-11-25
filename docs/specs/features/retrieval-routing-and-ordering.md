---
schema_version: 1
id: "feature.retrieval-routing-and-ordering"
title: "Retrieval routing, ranking, and ordering"
kind: "feature"
status: "verified"
summary: "Implements deterministic task-intent extraction, BM25/graph/sqlite-vec candidate fusion, prompt-path and tool-path triggers, attention-aware prerequisite ordering, tiered token-budget packing, route explanations, usage signals, and search/duplicate analysis."
tags: ["feature","retrieval","routing","ordering","graph","vector","load-plan","search"]
source_paths: ["src/core/analysis/search.ts","src/core/memory/concepts.ts","src/core/memory/graph-route.ts","src/core/memory/graph-vector.ts","src/core/memory/graph.ts","src/core/memory/load-plan.ts","src/core/memory/ordering.ts","src/core/memory/path-anchors.ts","src/core/memory/path-triggers.ts","src/core/memory/payload-plan.ts","src/core/memory/route-explain.ts","src/core/memory/routing.ts","src/core/memory/task-classifier.ts","src/core/memory/task-intent.ts","src/core/memory/usage-backfill.ts","src/core/memory/usage.ts","src/core/memory/vector-db.ts"]
related_specs: ["architecture.memory-schema-and-storage","feature.working-memory-and-freshness","feature.memory-save-and-take-control","architecture.safety-policy-and-review","architecture.runtime-config-and-profiles","feature.agent-hooks-and-skillsets","interface.cli-commands-and-dispatch","interface.mcp-server-and-protocol"]
last_doc_update_at: "2026-11-25T05:29:08Z"
last_verified_at: "2026-11-25T07:13:34Z"
last_verified_code_commit: "4cc4f6a"
last_source_change_commit: "7076b79"
last_source_change_at: "2026-10-13T04:40:05+07:00"
source_fingerprint: "sha256:cf1e6de09bb2676633934cefe34125e54a27b8b8082d4939854a9d75c3c58cd4"
---
# Retrieval routing, ranking, and ordering

## Purpose and boundaries

This feature governs how Engram selects, ranks, orders, explains, and token-packs relevant memories for agents, CLI `load`/`search`/`graph`/`stats`, MCP reads, and hook injections.

In scope:
- Deterministic task-type classification (`task-classifier.ts`) and structured task-intent extraction (`task-intent.ts`) with zero network calls.
- Multi-signal candidate routing (`routing.ts`): visibility/expiry prefiltering, BM25 with strong-field weighting, anchor gating, prompt-path anchoring (`path-anchors.ts`), knowledge-graph routing (`graph.ts`, `graph-route.ts`, `graph-vector.ts`), optional `sqlite-vec` routing (`vector-db.ts`), freshness/usage refinement (`usage.ts`), and prerequisite expansion.
- Tool-event path triggers (`path-triggers.ts`) matching `applies_to` globs for Claude, Gemini, and Codex file tools.
- Unified `LoadPlan` orchestration (`load-plan.ts`), attention-aware Kahn topological ordering (`ordering.ts`), and hard-capped flat/tiered payload packing (`payload-plan.ts`).
- Safe route explanation serialization (`route-explain.ts`) and standalone lexical/semantic search, duplicate detection, and index stats (`search.ts`).

Out of scope:
- Schema parsing, storage writes, and index persistence (see `architecture.memory-schema-and-storage`).
- Source freshness verification (`stale.json` generation) and working-tier lifecycle commands (see `feature.working-memory-and-freshness`).
- Guarded file reads (`readGuardedMemory`) and ignore-rule loading (see `architecture.safety-policy-and-review`).
- Hook transport/caching and CLI/MCP argument parsing (see `feature.agent-hooks-and-skillsets`, `interface.cli-commands-and-dispatch`, `interface.mcp-server-and-protocol`).

## Observable behavior

- **Visibility, lifecycle, and validity (`routing.ts`)**:
  - `visibleEntries` filters out ignored files, `archived`/`superseded` lifecycles, `low` confidence (unless `manual = true`), and role mismatches when `config.roles` is set.
  - `validityFactor` returns `'exclude'` for expired `valid_until`; otherwise multiplies `review_due` (`0.7`), stale (`0.6`), `medium` confidence (`0.9`), and `workspace` scope (`1.1`).
  - On literal `current session` queries (without `all`), only explicit startup memories (`session-start`, `always-load`, `start-session`, `always`, or matching phrase) and general rules without `applies_to` score; working-tier notes require a matching `sessionObjective` (`ENGRAM_SESSION_OBJECTIVE`).
- **Task intent, BM25F, concept fallback, and anchor gating (`task-intent.ts`, `concepts.ts`, `path-anchors.ts`, `routing.ts`)**:
  - `inferTaskIntent` extracts `domains`, `workKinds`, `artifacts`, `technologies`, `styles`, `constraints`, `retrievalTerms`, and `confidence` (`low`/`medium`/`high`) using exact/inflection/stem matching while stripping `session start`/`startup` phrases.
  - Lexical ranking uses 3-stream `buildBm25F` field weighting: `title` (`id`, `directive`, `applies_to`, weight `2.2`, `b = 0.65`), `tags` (authored `tags` + `routingTerms`, weight `2.0`, `b = 0.65`), and `body` (`summary` + type/auto-tag terms, weight `1.0`, `b = 0.75`).
  - Anchor gate (`GATE_MIN_ANCHORS = 4`): queries with < 4 raw stems need 1 exact anchor hit; queries with >= 4 raw stems need either 2 anchor hits, 1 strong-field hit (`id`, authored `tags`, `directive`, `applies_to`), or a `pathAnchorHit` (`+0.5` bonus against non-universal `applies_to` globs).
  - Gated concept synonym fallback (`concepts.ts`): when `exactAnchoredCount === 0` (`allowConceptFallback = true`), `expandConceptStems` expands query stems across 24 deterministic technical/bilingual clusters (`RAW_CONCEPT_CLUSTERS`) plus symmetric corpus co-occurrence bridges from `buildCorpusConceptMap` (built from authored tags and IDs across durable entries when `>= 4` durable entries exist, with `>= 2` co-occurrences and `<= 35%` document frequency), adds `0.45 * synScores` (`CONCEPT_SYNONYM_WEIGHT = 0.45`), and gates candidates with `hasStrongConceptOverlap` (requiring at least one synonym hit in strong fields, plus >= 2 total hits for 4+ stem queries).
  - Graph and vector hits must also pass `hasAnchorOverlap` before blending (`lexical + 0.22`, `graph * 0.4`, `vector * 0.36`).
- **Refinement and large-pool floor (`routing.ts`, `usage.ts`, `usage-backfill.ts`)**:
  - `refinementScore` adds `+0.15` per authored tag stem hit, `knowledgeFreshnessBoost` (recency decay up to `+0.12`, working tier `+0.08`, revision bonus up to `+0.06`), and closed-loop `usageBoost` from gitignored `usage.json` (`UsageKind`: `'injected' | 'fetched' | 'applied' | 'corrected'`, batch-updated via `recordUsageCounts` and optionally seeded from Git commit history via `backfillUsageFromGit`).
  - `usageBoost` computes `utility = fetched + 0.5 * applied` (`+0.03 * ln(1 + utility)` when `utility > 0`); when `utility === 0`, applies log noise decay (`NOISE_DECAY_MIN_INJECTIONS = 20`, up to `-0.12`) and correction penalty (`-0.02 * min(3, corrected)`), clamped to `[-0.15, 0.25]`. `noisyMemories` surfaces `>= 20` zero-utility memories for `stats --usage`.
  - When candidate count exceeds `2 * max`, entries scoring below 40% of the top score are dropped.
- **Knowledge graph (`graph.ts`, `graph-route.ts`, `graph-vector.ts`)**:
  - Derived JSON graph (`graph.json` for durable, gitignored `working/graph.json` for working) contains `scope`, `type`, `topic`, and `memory` nodes with 48-dim FNV-1a hashed bag-of-words embeddings (`graph-vector.ts`), plus `contains`, `tagged_as`, `depends_on`, `related_to` (capped by `max_related`/`min_related_score`), and `contradicts` (polarity opposite with >= 2 shared words) edges.
  - `dependencyContextEntries` pulls transitive `depends_on` prerequisites and orders foundations before dependents.
- **Optional sqlite-vec layer (`vector-db.ts`)**:
  - Experimental and off by default (`config.vector.enabled`). Activates per scope only when eligible entries >= `config.vector.auto_threshold` and `sqlite-vec` + (`node:sqlite` or `better-sqlite3`) are dynamically available.
  - Rebuilds `memory.vec.sqlite` (WAL mode, `vec0` virtual table) when `schema_version`, `dimensions`, or entry `fingerprint` changes; degrades gracefully to `skipped` on runtime/DB errors.
- **Attention-aware ordering (`ordering.ts`)**:
  - `orderForAgentConsumption` runs Kahn's priority topological sort over `depends_on` and graph prerequisite edges, partitioning ready nodes into Bucket 0 (primacy: `rule`, `instruction` authority, or prerequisites of other rows), Bucket 1 (middle: older durable skills/knowledge), and Bucket 2 (recency: `working` tier or fresh leaves <= 14 days old), breaking ties by score, scope (`workspace` first), and file path. Cycles fall back deterministically.
- **LoadPlan and tiered disclosure (`load-plan.ts`, `payload-plan.ts`)**:
  - `planLoad` supports direct `--id` fetches (bypassing budget and exclusion) or routed loads.
  - In `disclosure: 'auto'` (default for agents), `packTiered` expands up to `expand_top` (default 3) primary bodies within `maxTokens - reserve`, expands their prerequisites into the dependency reserve (`dependency_reserve_ratio`, default `0.2`), and renders remaining selected rows plus up to `CANDIDATE_CARD_LIMIT` (5) omitted candidates as one-line cards with a `fetch: engram load --id ...` hint.
  - Session delta suppression (`deliveredKeys`, `cardedKeys`) preserves slot ranking while suppressing already-delivered bodies and repeat cards; `hookStartupAuto` prioritizes explicit startup memories as bodies and cards general rules.
  - Working-tier notes whose objective does not match the session stay cards in tiered disclosure.
- **Path triggers (`path-triggers.ts`)**:
  - `toolPaths` extracts workspace-relative paths from Claude (`Read`, `Edit`, `Write`, `MultiEdit`), Gemini (`read_file`, `write_file`, `replace`), and Codex (`apply_patch`) inputs, rejecting paths outside `cwd`.
  - `loadForPaths` injects up to `PATH_TRIGGER_LIMIT` (3) guarded bodies matching `applies_to` (with `{a,b}` brace expansion), skipping delivered keys and bodies that exceed the token budget.
- **Route explanations and search (`route-explain.ts`, `search.ts`)**:
  - `explainRoute` produces a body-free, author-free `RouteExplanation` with ranks, sources (`direct-id`, `lexical`, `vector`, `dependency`, `graph`), signals, omitted reasons, and empty/fallback diagnostics.
  - `search.ts` provides lexical and local semantic search (`scoredSearchEntries`, `scoredSemanticSearchEntries`), duplicate pair detection (lexical >= 0.75, semantic >= 0.58), and structured/formatted `stats`.

## Workflow

1. **Query intake (`planLoad`)**:
   - If `options.id` is provided, select exact IDs directly and bypass budget/intent.
   - Otherwise, infer `TaskIntent` (skipped for literal `'current session'`), build `routingQuery` when `intentIsActionable`, and query `vectorRouteHits` if enabled.
2. **Routing (`routeDetailed`)**:
   - `prefilter` visible, non-expired entries -> filter session-start notes by objective -> compute `routeContext` (BM25 + validity factors + prompt `queryPaths`) -> blend lexical, graph, and vector candidates (each passing `hasAnchorOverlap`) -> apply `refinementScore` -> apply 40% floor for large pools -> expand `depends_on` prerequisites via `dependencyContextEntries` -> record `RouteReason` and `lifecycleOmitted`.
3. **Guarded read, packing, and ordering (`planLoad`)**:
   - Load entry bodies via `loadEntries` (`readGuardedMemory`) -> separate `skippedRows` -> run `packTiered` (auto) or `packPayload` (compact full) -> order expanded bodies with `orderForAgentConsumption` -> suppress `deliveredKeys`/`cardedKeys` -> emit `LoadPlan` (`contract_version: 1`) and render via `renderLoadPlan`.

## Code map

- `src/core/memory/concepts.ts` — `RAW_CONCEPT_CLUSTERS` (24 clusters), `buildCorpusConceptMap`, `expandConceptStems`, `hasStrongConceptOverlap`; deterministic technical/bilingual concept synonym expansion and corpus co-occurrence bridges for zero-cloud paraphrase fallback.
- `src/core/memory/task-classifier.ts` — `TASK_TYPES`, `classifyTaskType`, `normalizeTaskType`, `taskTypeSaveTags`; 39-category deterministic task classifier.
- `src/core/memory/task-intent.ts` — `inferTaskIntent`, `taskIntentQuery`, `intentIsActionable`, `TaskIntent`; domain/work-kind/artifact/tech/style/constraint extraction.
- `src/core/memory/path-anchors.ts` — `queryPaths`, `pathAnchorHit`, `QueryPath`; extracts file-path tokens from prompts to match `applies_to`.
- `src/core/memory/path-triggers.ts` — `PATH_TRIGGER_LIMIT`, `entriesForPath`, `toolPaths`, `loadForPaths`, `PathLoad`; tool-call path matching and budgeted body injection.
- `src/core/memory/routing.ts` — `prefilter`, `validityFactor`, `visibleEntries`, `hasExplicitStartupSignal`, `sessionObjectiveFromEnv`, `noteMatchesObjective`, `route`, `routeDetailed`, `freshestTimestamp`, `loadEntries`.
- `src/core/memory/route-explain.ts` — `explainRoute`, `RouteExplanation`, `ExplainSelected`, `ExplainOmitted`; safe body-free routing trace.
- `src/core/memory/ordering.ts` — `orderForAgentConsumption`; Kahn priority topological sort (primacy / middle / recency).
- `src/core/memory/load-plan.ts` — `planLoad`, `renderLoadPlan`, `renderCompactPayload`, `LoadPlan`, `PlanLoadOptions` / `LoadPlanOptions` (including `LoadPlanOptions.usage` override for in-memory telemetry simulation).
- `src/core/memory/payload-plan.ts` — `estimateTokens`, `estimateEntryTokens`, `packPayload`, `packTiered`, `CANDIDATE_CARD_LIMIT`, `ProjectionSection`.
- `src/core/memory/graph.ts` — `emptyGraph`, `loadGraph`, `writeGraph`, `rebuildGraph`, `mergeGraphs`, `contradictionEdges`, `dependencyEdges`, `dependencyContextEntries`, `orderByDependencies`, `renderGraphReport`.
- `src/core/memory/graph-route.ts` — `routeWithGraph`; scores memory nodes, topic nodes, and `depends_on`/`related_to` edges.
- `src/core/memory/graph-vector.ts` — `embed`, `cosine`; 48-dimension FNV-1a unit vector helpers.
- `src/core/memory/vector-db.ts` — `vectorRouteHits`, `ensureVectorIndex`, `__insertVectorEntriesForTest`, `VectorIndexStatus`, `VectorRouteHit`.
- `src/core/memory/usage.ts` — `USAGE_FILE`, `NEVER_FETCHED_DAYS`, `NOISE_DECAY_MIN_INJECTIONS`, `UsageKind`, `readUsage`, `recordUsage`, `recordUsageCounts`, `neverFetched`, `noisyMemories`, `usageBoost`; locked fail-open usage counters with batch increment support, closed-loop utility, log noise decay, and correction penalty.
- `src/core/memory/usage-backfill.ts` — `UsageBackfillSummary`, `backfillUsageFromGit`; scans recent non-merge Git commits to backfill `injected` and `applied` usage counts in one locked write.
- `src/core/analysis/search.ts` — `searchEntries`, `scoredSearchEntries`, `semanticSearchEntries`, `scoredSemanticSearchEntries`, `duplicatePairs`, `semanticDuplicatePairs`, `statsData`, `stats`.

## Interfaces and data

- **`LoadPlan` contract (`contract_version: 1`)**: Exposes `query`, `candidates_by_source` (`lexical`, `graph`, `vector`, `feedback`), `fused_rank`, `dependency_additions`, `selected_ids`, `projected_payload`, `token_budget`, `omitted`, `profile_scope`, `payload_rows`, `card_rows`, `already_loaded`, optional `stale_keys`, `disclosure`, `skipped_rows`, and `routeDetail`.
- **Local derived files**: `graph.json`, `working/graph.json`, `memory.vec.sqlite` (+ `-wal`/`-shm`), and `usage.json` (guarded by `withFileLock`, 1500 ms fail-open timeout).
- **Environment variables**: `ENGRAM_SESSION_OBJECTIVE` read by `sessionObjectiveFromEnv()`.
- **Token estimation**: `estimateTokens` uses `Math.ceil(text.length / 4)`.

## Verification

- **Verified by direct source inspection**: All 15 listed `source_paths` were inspected at HEAD `4cc4f6a` (plus current working tree), including scoring constants, topological bucketing, tiered packing, and fail-open vector/usage behavior.
- **Inferred / not executed here**: Retrieval benchmarks and unit tests were not executed in this read-only pass; `sqlite-vec` runtime behavior depends on optional native packages (`sqlite-vec`, `node:sqlite`, or `better-sqlite3`).

## Related documentation

- [Memory schema, storage, and lifecycle persistence](../architecture/memory-schema-and-storage.md)
- [Working memory, observations, and source freshness](../features/working-memory-and-freshness.md)
- [Memory save planning and take-control discovery](../features/memory-save-and-take-control.md)
- [Safety policy and review](../architecture/safety-policy-and-review.md)
- [Runtime config and profiles](../architecture/runtime-config-and-profiles.md)
- [Agent hooks and skillsets](../features/agent-hooks-and-skillsets.md)
- [CLI commands and dispatch](../interfaces/cli-commands-and-dispatch.md)
- [MCP server and protocol](../interfaces/mcp-server-and-protocol.md)

## Known limitations and open questions

- `LoadPlan.candidates_by_source.feedback`, `query.entities`, and `query.negative` are currently reserved empty arrays in `planLoad`.
- Hashed vector embeddings (`graph-vector.ts` 48-dim, `vector-db.ts` via `routingVector`) are lexical-hash approximations rather than neural embeddings, which is why `routing.ts` enforces the same `hasAnchorOverlap` gate on graph and vector hits.
- `vector-db.ts` suppresses Node's experimental SQLite warning at module import time via `suppressSqliteExperimentalWarning()`.

<!-- BEGIN MANUAL NOTES -->
<!-- END MANUAL NOTES -->
