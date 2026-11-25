---
schema_version: 1
id: "feature.memory-save-and-take-control"
title: "Memory save planning and take-control discovery"
kind: "feature"
status: "verified"
summary: "Defines AI-agent memory proposal protocol, candidate parsing, deterministic ADD/UPDATE/SUPERSEDE/NOOP save planning, approved supersede retirement, guarded workspace take-control discovery, and host-memory imports from Claude and Codex stores."
tags: ["feature","save","take-control","host-memory","candidates","supersede","protocol"]
source_paths: ["src/core/memory/agent-proposal-protocol.ts","src/core/memory/host-memory-plan.ts","src/core/memory/host-memory.ts","src/core/memory/memory-candidate.ts","src/core/memory/save-plan.ts","src/core/memory/save-supersede.ts","src/core/memory/take-control-guards.ts","src/core/memory/take-control.ts"]
related_specs: ["architecture.memory-schema-and-storage","feature.retrieval-routing-and-ordering","feature.working-memory-and-freshness","architecture.safety-policy-and-review","feature.ingest-author-and-benchmarks","interface.cli-commands-and-dispatch","interface.mcp-server-and-protocol"]
last_doc_update_at: "2026-11-25T03:58:47Z"
last_verified_at: "2026-11-25T07:13:34Z"
last_verified_code_commit: "4cc4f6a"
last_source_change_commit: "7076b79"
last_source_change_at: "2026-10-13T04:40:05+07:00"
source_fingerprint: "sha256:cf21e6cc9d496205199a733830efd41cdf87e9a8d36116d4c245da66efcd35b3"
---
# Memory save planning and take-control discovery

## Purpose and boundaries

This feature covers how human and AI-agent memory candidates are proposed, parsed, deduplicated, previewed with deterministic verdicts, retired when superseded, and bootstrapped from existing workspace guidance or host-local agent memory stores.

In scope:
- Shared AI-agent value gate and exact-candidate chat approval protocol (`agent-proposal-protocol.ts`).
- Structured and freeform memory candidate parsing (`memory-candidate.ts`), including D15 distilled fields (`OBJECTIVE`, `SCOPE`, `APPLIES_TO`, `DIRECTIVE`), rule variants, dependencies, and parent/child declarations.
- Upsert and verdict planning (`save-plan.ts`) producing `ADD`, `UPDATE`, `SUPERSEDE`, or `NOOP` verdicts, related-memory hints, collision avoidance, and MCP approval-token verdict pinning.
- Post-write retirement of superseded memories (`save-supersede.ts`).
- Workspace `take-control` file discovery, security/size/binary guards, token-budgeted repo-map/excerpt guidance (`take-control.ts`, `take-control-guards.ts`), and read-only host-memory store imports (`host-memory.ts`, `host-memory-plan.ts`).

Out of scope:
- Final approved write execution, schema validation, and Git commits (see `architecture.memory-schema-and-storage`).
- Stale memory refresh targeting (`take-control --refresh`, see `feature.working-memory-and-freshness`).
- Low-level source extractors/repo-map formatting and author resolution (see `feature.ingest-author-and-benchmarks`).
- Review patching (`patchReviewedMemory`) and interactive approval prompts (see `architecture.safety-policy-and-review`).

## Observable behavior

- **Agent proposal protocol (`agent-proposal-protocol.ts`)**:
  - Exports canonical prompt text (`agentMemoryValueGateText`, `agentMemoryChatApprovalText`, `agentMemoryProposalText`, `agentMemoryProtocolText`) requiring agents to apply the durability/objectivity value gate, show refined `TYPE: ... | TEXT: ...` candidates with their `Verdict` lines, and never invoke `--force` or `engram_commit` before explicit human approval.
- **Candidate parsing (`memory-candidate.ts`)**:
  - Supports single-line pipe syntax (`TYPE: ... | TEXT: ... | ORIGIN: ...`) and multi-line key-value format; `parseMemoryCandidates` splits multi-candidate outputs, deduplicates, and caps at 8 candidates.
  - Normalizes type aliases (`workflow`/`workflows` -> `skill`) or falls back to deterministic `inferMemoryType`.
  - Validates distilled fields: `OBJECTIVE` (`task` | `durable`), `SCOPE` (`workspace` | `global`, rejecting conflicting duplicate `SCOPE` declarations), `APPLIES_TO` (up to `APPLIES_TO_MAX_GLOBS = 8` workspace-relative globs; rejects absolute paths, drive letters, `~`, and `..`), and `DIRECTIVE` (<= 160 chars).
- **Save planning and deterministic verdicts (`save-plan.ts`)**:
  - `planMemorySave` resolves each target scope via `explicitMatch` (when `UPDATE:` is set, never crossing working/durable tiers and refusing expired working targets) or `bestMatch` (same scope, type, and tier; requires lexical score >= `0.25` and >= 2 overlapping words).
  - If an implicit upsert match has a contradicting `directive`, `planMemorySave` converts it from an update into an `add` with a `SUPERSEDE` verdict so contradicting guidance is not merged into the old memory.
  - `candidateVerdict` evaluates deterministically in order:
    1. Explicit `UPDATE:` -> `UPDATE` (even if text is unchanged, supporting `take-control --refresh`).
    2. Same-type non-child related hint with score >= `NOOP_MIN_SCORE` (`0.995`) -> `NOOP`.
    3. Implicit update whose `## Content`, `directive`, and `applies_to` are unchanged -> `NOOP`.
    4. Implicit update -> `UPDATE`.
    5. Same-type, same-tier `possible-duplicate` hint with score >= `SUPERSEDE_MIN_SCORE` (`0.6`) and contradicting `directive` on overlapping `applies_to` globs or non-`task_type:` tags -> `SUPERSEDE` (draft includes `supersedes: [<target>]`).
    6. Otherwise -> `ADD`.
  - `avoidCollision` checks both durable and working tiers so a new ID never collides on future `engram promote`, appending an 8-char SHA-256 suffix (and counter if needed).
  - `previewSavePlans` renders each plan's action, type, scope, file, `Verdict:` line, related hints, and balanced rule preview (or all three derived/stored variants when `showRuleVariants` is enabled). `pinVerdicts` produces `PinnedVerdict[]` for MCP approval tokens.
  - Author email is gated through `includeAuthorEmail(ctx.config)` so emails only reach frontmatter on opt-in.
- **Approved supersede execution (`save-supersede.ts`)**:
  - `applyApprovedSupersedes` runs only after approved new writes; for each `SUPERSEDE` plan, it locates the active same-scope, same-tier target, patches `lifecycle: superseded` and `superseded_by: <newId>` via `patchReviewedMemory`, and persists via `writeApprovedMemory`.
- **Workspace take-control discovery and guards (`take-control.ts`, `take-control-guards.ts`)**:
  - `parseSourceKinds` maps `--kind` values: `docs` (default), `code` (`code` + `manifest`), `config`, or `all`.
  - Guards never read secret filenames (`.env*`, `.npmrc`, `id_rsa`, `*.pem`/`*.key`, `*credentials*.json`, `.kube/config`, `.docker/config.json`), VCS metadata (`.git`, `.hg`, `.svn`), Engram's own dirs (`.agents/.engram`, `.engram`), realpath escapes outside `cwd`, files > 256 KB (`MAX_SOURCE_BYTES`), or binary files (NUL byte in first 8 KB); code/config scans also skip lockfiles, minified JS bundles, and build/cache directories (`SKIP_DIRS`).
  - `planTakeControlSources` bounds reads by `--max-sources` (default 12, force 5, code 40), `--max-chars` (default 1800, force 900), and `--budget-tokens` (default 6000 for non-docs scans; stops opening non-required files once < 64 tokens remain or after 3 budget misses). Already-imported source hashes are skipped unless explicitly passed via `--file`.
  - `takeControlGuidance` packs docs/config as per-file excerpts and collapses code/manifest digests into a budgeted `repoMap` with suggested `APPLIES_TO` directory globs.
- **Host-memory import (`host-memory.ts`, `host-memory-plan.ts`)**:
  - `take-control --from <preset>` supports `claude-auto-memory` and `codex-memories`, rejecting incompatible workspace-scan flags (`--refresh`, `--kind`, `--include`, `--file`, `--exclude`, `--budget-tokens`, `--all`) and multiple `--dir` flags.
  - `resolveHostMemoryRoot` resolves Claude stores via user `~/.claude/settings.json` or untracked `.claude/settings.local.json` `autoMemoryDirectory` (ignoring committed repo settings as potentially hostile), or `<claudeHome>/projects/<encoded-repo-root>/memory` (handling 200-char truncation via unambiguous prefix match), and Codex stores via `$CODEX_HOME/memories` or `~/.codex/memories`.
  - `walkHostMemory` and `readHostMemorySource` are strictly read-only, skip `MEMORY.md` (Claude index), symlinks/hard links, secret names, unsafe names, and realpath escapes.
  - `planHostMemorySources` skips `type: user` (personal profile data) and untyped Claude files, maps `feedback` -> `rule` and `project`/`reference` -> `knowledge`, redacts/filters excerpts via `digestHostMemory`, and labels files as `<preset>/<rel>`. `hostImportSourceMeta` records `source: 'host-memory'` and `source_origin: hostMemoryOrigin(root.dir)` without `source_hash_mode`.

## Workflow

1. **Candidate save planning (`memory-candidate.ts` -> `save-plan.ts` -> `save-supersede.ts`)**:
   - Parse raw candidate(s) with `parseMemoryCandidate` / `parseMemoryCandidates` -> plan per-scope actions and verdicts via `planMemorySave` -> preview with `previewSavePlans` (and `pinVerdicts` for MCP) -> after human approval, write new/updated memories via `writeApprovedMemory` -> call `applyApprovedSupersedes` to mark replaced memories `lifecycle: superseded`.
2. **Workspace `take-control` (`take-control.ts`)**:
   - Parse options/kinds -> `resolveTakeControlFiles` (explicit `--file`, `--dir`, `--include`, or default walk) -> apply secret/ignore/realpath/size/binary guards -> digest sources and track token budget -> render `--plan` (`renderTakeControlPlan`) or build agent prompt (`takeControlGuidance`).
3. **Host-memory `take-control --from` (`host-memory-plan.ts` -> `host-memory.ts`)**:
   - Validate `--from` preset and flag compatibility (`hostPresetFromFlags`) -> resolve store root (`resolveHostMemoryRoot`) -> walk Markdown topic files (`walkHostMemory`) -> read, filter `type: user`, redact, and deduplicate against known hashes (`planHostMemorySources`) -> attach `hostImportSourceMeta` to resulting saves.

## Code map

- `src/core/memory/agent-proposal-protocol.ts` — `agentMemoryValueGateText`, `agentMemoryChatApprovalText`, `agentMemoryProposalText`, `agentMemoryProtocolText`.
- `src/core/memory/memory-candidate.ts` — `APPLIES_TO_MAX_GLOBS`, `parseMemoryCandidate`, `parseMemoryCandidates`, `normalizeMemoryType`, `inferMemoryType`, `generatedMemoryGuidance`, `saveSessionGuidance`, `MemoryCandidate`.
- `src/core/memory/save-plan.ts` — `NOOP_MIN_SCORE`, `SUPERSEDE_MIN_SCORE`, `planMemorySave`, `previewSavePlans`, `scoreDisplaysAsExactDuplicate`, `displayExactDuplicateScore`, `pinVerdicts`, `candidateVerdict`, `SavePlan`, `SaveVerdict`, `PinnedVerdict`.
- `src/core/memory/save-supersede.ts` — `applyApprovedSupersedes`; retires superseded targets through `patchReviewedMemory` and `writeApprovedMemory`.
- `src/core/memory/take-control-guards.ts` — `parseSourceKinds`, `isSecretFile`, `protectedSourceReason`, `resolvedSourceGuard`, `isGeneratedArtifact`, `sourceFileGuard`.
- `src/core/memory/take-control.ts` — `discoverTakeControlSources`, `planTakeControlSources`, `renderTakeControlPlan`, `takeControlGuidance`, `takeControlRefreshGuidance`, `estimateTokens`, `proposedTypesFor`, `takeControlLimits`, `TakeControlPlan`, `TakeControlSource`.
- `src/core/memory/host-memory.ts` — `HOST_MEMORY_PRESETS`, `HOST_OTHER_MACHINE`, `claudeProjectDirName`, `resolveHostMemoryRoot`, `hostMemoryOrigin`, `hostLabel`, `parseHostLabel`, `walkHostMemory`, `readHostMemorySource`.
- `src/core/memory/host-memory-plan.ts` — `hostPresetFromFlags`, `planHostImport`, `planHostMemorySources`, `hostImportSourceMeta`, `HostImport`.

## Interfaces and data

- **Verdict types**: `SaveVerdictKind = 'ADD' | 'UPDATE' | 'SUPERSEDE' | 'NOOP'`; `PinnedVerdict` binds `{ candidate, scope, kind, target? }` into MCP approval tokens.
- **Host-memory labels and origins**: Files are represented externally only as `<preset>/<relative-path>` (`claude-auto-memory/...` or `codex-memories/...`); store paths are stored only as `sha256("engram-host-origin:" + normalizedRealDir)`.
- **Environment variables read by host-memory resolution**: `CLAUDE_CONFIG_DIR`, `CLAUDE_CODE_PROJECT_DIR_NAME`, `CODEX_HOME`.
- **Error contract**: `host-memory-plan.ts` throws `EngramError('ENG_USAGE', ..., ExitCode.UsageError)` on invalid presets, incompatible flags, or unresolvable host roots.

## Verification

- **Verified by direct source inspection**: All 8 listed `source_paths` were inspected at HEAD `4cc4f6a` (plus current working tree), including verdict precedence, cross-tier update guards, collision suffixing, secret/symlink guards, and host-store isolation.
- **Inferred / not executed here**: End-to-end CLI/MCP save approval loops and host-memory integration tests were not run during this read-only pass.

## Related documentation

- [Memory schema, storage, and lifecycle persistence](../architecture/memory-schema-and-storage.md)
- [Retrieval routing, ranking, and ordering](../features/retrieval-routing-and-ordering.md)
- [Working memory, observations, and source freshness](../features/working-memory-and-freshness.md)
- [Safety policy and review](../architecture/safety-policy-and-review.md)
- [Ingest, author resolution, and benchmarks](../features/ingest-author-and-benchmarks.md)
- [CLI commands and dispatch](../interfaces/cli-commands-and-dispatch.md)
- [MCP server and protocol](../interfaces/mcp-server-and-protocol.md)

## Known limitations and open questions

- `takeControlGuidance` token budgets bound source excerpts only; per-source headers and preamble add roughly 5% overhead, as noted in `TakeControlPlan.budgetTokens`.
- `contradicts` in `save-plan.ts` triggers `SUPERSEDE` only when both the incoming candidate and the existing related memory have non-empty, differing `directive` fields; candidates without a `directive` will not automatically produce `SUPERSEDE`.
- `resolveHostMemoryRoot` for Claude refuses truncated project directory names when multiple directories share the 200-character prefix, requiring an explicit `--dir <path>`.

<!-- BEGIN MANUAL NOTES -->
<!-- END MANUAL NOTES -->
