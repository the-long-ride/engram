---
schema_version: 1
id: "interface.entry-web-api"
title: "Entry Web Server and HTTP API"
kind: "interface"
status: "verified"
summary: "Loopback HTTP control-panel server, security guards, configuration schema validation, path containment, and JSON API handlers backing the Engram Entry Web UI."
tags: ["entry","web-server","http-api","csrf","config-schema","control-panel"]
source_paths: ["src/core/web/api.ts","src/core/web/app/api-client.ts","src/core/web/app/types.ts","src/core/web/config-schema.ts","src/core/web/entry-server.ts","src/core/web/memories-search.ts","src/core/web/path-utils.ts"]
related_specs: ["feature.entry-web-ui","architecture.runtime-config-and-profiles","architecture.memory-schema-and-storage","architecture.safety-policy-and-review","feature.ingest-author-and-benchmarks","feature.agent-hooks-and-skillsets","workflow.upgrade-vcs-and-diagnostics","interface.cli-commands-and-dispatch"]
last_doc_update_at: "2026-11-25T05:29:08Z"
last_verified_at: "2026-11-25T07:13:34Z"
last_verified_code_commit: "4cc4f6a"
last_source_change_commit: "7076b79"
last_source_change_at: "2026-10-13T04:40:05+07:00"
source_fingerprint: "sha256:624e77472427e0796a5ef5e0c4c12511c54b3e6c864e2a27ee19a022d5e83067"
---
# Entry Web Server and HTTP API

## Purpose and boundaries

This interface defines the zero-dependency Node.js loopback HTTP server (`entry-server.ts`), its backend data/mutation handlers (`api.ts`), config patch schema and validation (`config-schema.ts`), memory graph search filtering (`memories-search.ts`), path containment guards (`path-utils.ts`), and the typed browser client/DTO layer (`app/api-client.ts`, `app/types.ts`) for the Engram Entry control panel.

**In scope:**
- Binding and lifecycle of the local HTTP server (`servePanel`, `stopServer`, `launchEntryUi`, `getActiveServerToken`).
- Security boundaries: loopback-only binding (`127.0.0.1`), `Host`/`Origin` allow-listing, per-start CSRF token injection and constant-time verification, `Content-Type: application/json` enforcement, 1 MiB body size cap, strict CSP/security headers, and root-contained file resolution.
- Static asset serving for the bundled React control panel (`panel.html`, `panel.js`, `panel*.css`, logo/favicon SVGs).
- All `GET` and `POST` `/api/*` endpoints and `/shutdown`, normalized to Engram's `CONTRACT_VERSION` JSON wire envelope.
- Control-panel config field definitions (`CONFIG_FIELDS`), normalization, risk classification, and validation (`validateConfigPatch`).
- Browser-side `fetch` wrappers (`getJson`, `postJson`, domain functions) and shared frontend DTOs.

**Out of scope:**
- React component rendering, interactive UI workflows, and graph layout math (owned by [Entry Web UI](../features/entry-web-ui.md)).
- Underlying storage, config-db SQLite schema, author resolution, skillset installation, review inbox persistence, and upgrade execution engines (delegated to core domain modules).

## Observable behavior

- **Loopback binding & port selection:** `servePanel(cwd)` binds exclusively to `127.0.0.1`. It attempts preferred port `14620` first, then up to 20 random ports in `10000–64999` excluding reserved ports (`80, 443, 3000, 5001, 8080`). `launchEntryUi(cwd, { hostOnly })` starts the server, optionally opens the default OS browser (`start`, `open`, or `xdg-open`), and returns a terminal banner with the URL.
- **Origin & Host guard:** Every request (including static assets) is checked by `checkOriginAndHost` against `127.0.0.1:<port>`, `localhost:<port>`, and `[::1]:<port>` (and `http://...` origins). Violations immediately return HTTP `403` with `ENG_HTTP_FORBIDDEN_ORIGIN` or `ENG_HTTP_FORBIDDEN_HOST`.
- **CSRF & mutation guards:** On startup, a 24-byte random hex token is generated and injected into `panel.html` by replacing `__ENGRA_CSRF_TOKEN__` inside `<meta name="engram-csrf-token">`. `POST /shutdown` and all `POST /api/*` routes require a matching `X-Engram-CSRF` (or `x-csrf-token`) header verified in constant time (`403 ENG_HTTP_CSRF` on failure). All `POST /api/*` routes additionally require `Content-Type: application/json` (`415 ENG_HTTP_CONTENT_TYPE`) and reject bodies over `1048576` bytes (`413`).
- **Method enforcement & security headers:** Static asset routes allow `GET` only; `/shutdown` allows `POST` only; `/api/*` routes allow `GET` and `POST` only (`405 ENG_HTTP_METHOD_NOT_ALLOWED` with `Allow` header). All JSON responses carry `Cache-Control: no-store` plus `Content-Security-Policy` (`default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'`), `Referrer-Policy: no-referrer`, and `X-Content-Type-Options: nosniff`.
- **Wire envelope normalization:** JSON responses are wrapped with `contract_version: CONTRACT_VERSION`, `ok`, `data` (or `error: { code, message }`), and `diagnostics` while preserving top-level fields for backward compatibility.
- **Stale upgrade protection:** Upgrade review, file-open, single/batch resolve, and apply handlers recompute a fresh `UpgradePlan` and reject requests whose `fingerprint` does not match the current disk state.
- **Explicit confirmation gates:** Mutating operations for review writes (`apiReviewWrite`), batch receipt apply (`apiReviewApplyReceipts`), author set/unset/sync/migration (`apiAuthorSet`, `apiAuthorUnset`, `apiAuthorSync`, `apiAuthorMigration`), and upgrade apply (`apiUpgradeApply`) require `confirmed: true` in the request body.
- **Path containment:** Memory preview (`apiGetMemoryContent`, `apiReviewPreview`), full-text graph search (`apiMemoriesGraphData`), and editor path resolution (`apiResolveMemoryFile`) resolve every requested relative path through `resolveUnderRoot`, throwing if the resolved path escapes the allowed workspace, global, or profile root.
- **Graceful SQLite fallback:** `loadPanelData` and `writeConfigPatch` degrade gracefully when the SQLite config DB is unavailable (`sqliteAvailable: false`, JSON-only config persistence). Workspace and profile CRUD endpoints require SQLite and throw `SQLite unavailable` otherwise.

## Workflow

1. **Startup & bootstrap:**
   - CLI invokes `launchEntryUi(cwd, options)` -> `servePanel(cwd)` allocates a loopback port, generates the CSRF token, constructs `RequestContext`, and starts `http.createServer`.
   - Browser requests `GET /`; server injects the live token into `panel.html` and serves `panel.js`, `panel*.css`, and SVG assets.
   - Frontend calls `GET /api/data` (`loadPanelData`) to load config, `configFields` (non-hidden `CONFIG_FIELDS` with derived `docsAnchor`), autonomous-write `policy`, `author` state, `upgradePlan` (with saved `review` state), `workspaces`, `profiles`, parsed `entry` runtime sections, `isInitialized`, `version`, and cached npm `latestVersion` (10-minute TTL, skipped when `NODE_ENV=test` or overridden by `ENGRAM_LATEST_VERSION`).
2. **Configuration validation & save:**
   - Frontend calls `POST /api/config/validate` -> `validateConfigPatch` normalizes booleans, selects, bounded numbers, role lists (`^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$`), comma-lists, and text fields (checking ancestor writability for `global_path` via `canCreateDir` and Git URL validity for `global_git.remote_url`), returning `{ ok, patch, issues, riskyKeys }`.
   - Frontend calls `POST /api/config` -> `apiConfigUpdate` writes dotted keys to SQLite (when usable), applies parsed values to config, optionally runs `configureGlobalRemote` for `global_git.remote_url`, ensures `global_path` exists, and writes user config JSON.
3. **Memories graph, search & actions:**
   - `GET /api/memories` or `POST /api/memories` invokes `apiMemoriesGraphData`, collecting visible entries across the active profile and configured profiles, filtering by `scopes` (`profile`, `global`, `workspace`) and `types` (`rule`, `skill`, `workflow`, `knowledge`), attaching `dependsOn` links and strict/semantic duplicate thin links, and optionally running `filterMemoryGraph` (`direct` or transitive `related` mode) over metadata + file contents.
   - Node inspection uses `GET /api/memory` (`apiGetMemoryPreview`), editor launch uses `GET /api/memory/file` (`apiResolveMemoryFile` -> `vscode://file/...`), and archival uses `POST /api/memory/archive` (`apiArchiveMemory` via `planArchiveSet`/`archiveMemory`).
4. **Review, Core, Connections, Author, and Upgrade flows:**
   - Review endpoints delegate queue/inspect/dismiss to `cmdReview`, preview memories/receipts via `apiReviewPreview`, batch-apply confirmed `r-*` receipts via `apiReviewApplyReceipts` (planning with `planMemorySave`, deferring `SUPERSEDE` or unresolved duplicate/dependency hints, purging `NOOP`/applied receipts, and returning `{ applied, skipped, deferred, errors, message }`), and write explicitly confirmed AI-reviewed proposals via `apiReviewWrite` (parsing candidate, checking scope/relation completeness, and writing via `planMemorySave`/`writeApprovedMemory`, including `working` tier metadata for `OBJECTIVE: task`).
   - Core endpoints (`GET`/`POST /api/core`) return scoped duplicate pairs, relationship graph nodes/links, and copyable AI prompts (`resolveDuplicates`, `metacognize`).
   - Agent connection endpoints scan installed agents (`GET /api/agents/scan`) and install/uninstall skillsets + hooks (`POST /api/agents/link`, `POST /api/agents/unlink`).
   - Author endpoints expose state, set/unset profiles, global Git sync plan/apply, and memory author migration plan/apply.
   - Upgrade endpoints expose plan generation, per-item conflict proposal review, editor launch (`apiUpgradeOpenFile`), single and batch conflict resolution persistence, and transactional apply.
5. **Shutdown:**
   - `POST /shutdown` (with valid CSRF token) returns `204` with `Connection: close` and closes the HTTP server and active connections after 200 ms.

## Code map

| Path | Responsibility |
| --- | --- |
| `src/core/web/entry-server.ts` | Loopback HTTP server, port allocator, Origin/Host/CSRF/Content-Type/body-size guards, static asset serving, `/api/*` and `/shutdown` routing, `servePanel`, `stopServer`, `launchEntryUi`, `getActiveServerToken`. |
| `src/core/web/api.ts` | Backend handlers for panel bootstrap (`loadPanelData`), config/policy updates, workspaces/profiles CRUD, agent scan/link/unlink (`supportsSessionEnd`/`sessionEndLinked`/`sessionEnd`), Core duplicate/relationship data, Memories graph/preview/file/archive/promote (`apiMemoryPromote`), Review preview/write/apply (`apiReviewApplyReceipts`), Author CRUD/sync/migration, Upgrade plan/review/resolve/open-file/apply, and directory browsing (`apiBrowseDirectories`). |
| `src/core/web/config-schema.ts` | `CONFIG_FIELDS` catalog (49 settings across 13 groups), `deriveDocsAnchor`, `configFieldsForPanel`, `isKnownConfigKey`, `isRiskyConfigKey`, and `validateConfigPatch` (type normalization, bounds, role regex, writable `global_path`, Git remote URL check). |
| `src/core/web/memories-search.ts` | Pure `filterMemoryGraph` helper supporting case-insensitive full-text matching across `memoryId`, `file`, `summary`, and `content` in `direct` or transitive-component `related` mode. |
| `src/core/web/path-utils.ts` | Path containment utilities (`isPathInsideRoot`, `resolveUnderRoot`) preventing path traversal outside allowed memory roots. |
| `src/core/web/app/api-client.ts` | Browser `fetch` wrappers (`getJson`, `postJson`) with `<meta name="engram-csrf-token">` injection (`X-Engram-CSRF`) and typed endpoint helpers for all control-panel actions. |
| `src/core/web/app/types.ts` | Shared frontend TypeScript types (`TabName`, `PanelData`, `ConfigField`, `ApiResult`, `Author*Dto`, `Upgrade*Dto`, `ModalState`, `ModalController`, `ToastState`, `ShowToast`). |

## Interfaces and data

### HTTP Endpoints

| Method | Path | Handler / Delegation | Notes |
| --- | --- | --- | --- |
| `GET` | `/`, `/panel.js`, `/panel*.css`, `/engram-logo-black-transparent.svg`, `/favicon.svg`, `/favicon.ico` | `readAsset` | `/` injects CSRF token into `panel.html`. |
| `POST` | `/shutdown` | Server teardown | Requires CSRF; responds `204` then closes server. |
| `GET` | `/api/data` | `loadPanelData` + `renderEntry` | Initial panel bootstrap payload (`PanelData`). |
| `GET` | `/api/core` | `apiCoreData` | Default Core duplicate & relationship snapshot. |
| `POST` | `/api/core` | `apiCoreData` | Filtered by `scopes`, `types`, `semantic`, `rebuild`, `limit`. |
| `GET` | `/api/memories` | `apiMemoriesGraphData` | Default Memories graph nodes, links, stats. |
| `POST` | `/api/memories` | `apiMemoriesGraphData` | Filtered by `scopes`, `types`, `semantic`, `rebuild`, `limit`, `search`, `searchMode`. |
| `GET` | `/api/memory` | `apiGetMemoryPreview` | Query: `profile`, `scope`, `file`. Returns `{ content, properties }`. |
| `GET` | `/api/memory/file` | `apiResolveMemoryFile` | Query: `profile`, `scope`, `file`. Returns `{ path, editorUrl }`. |
| `POST` | `/api/memory/archive` | `apiArchiveMemory` | Archives a memory from active/default profile. |
| `POST` | `/api/memory/promote` | `apiMemoryPromote` | Requires `confirmed: true` and `id`. Promotes an unexpired working-tier memory to durable memory. Client helper: `promoteMemory`. |
| `GET` | `/api/agents/scan` | `apiAgentsScan` | Detects 9 supported agents, workspace/global link status, and `supportsSessionEnd`/`sessionEndLinked` state. |
| `POST` | `/api/agents/link`, `/api/agents/unlink` | `apiAgentLink`, `apiAgentUnlink` | Body: `{ agentId, global, sessionEnd? }`. Installs/uninstalls skillsets, hooks, and optional `SessionEnd` queue registration. |
| `POST` | `/api/config/validate`, `/api/config` | `apiConfigValidate`, `apiConfigUpdate` | Validates or persists config patch (`{ patch }` or `{ key, value }`). |
| `GET` | `/api/policy` | `cmdPolicy(['show'])` | Returns current autonomous-write policy JSON. |
| `POST` | `/api/policy` | `apiPolicyUpdate` | Merges and writes `.agents/engram.policy.json`. |
| `GET` | `/api/review` | `cmdReview(['list'])` + `cmdReview(['inbox'])` | Combined findings and deferred receipts queue. |
| `GET` | `/api/review/inspect` | `cmdReview(['inspect', id])` | Query: `id`. Returns finding or receipt detail. |
| `GET` | `/api/review/preview` | `apiReviewPreview` | Query: `id`, optional `memory_ids`. Returns `ReviewMemoryPreview[]`. |
| `POST` | `/api/review/write` | `apiReviewWrite` | Requires `confirmed: true`, `proposal`, `scope`, optional `relations`. |
| `POST` | `/api/review/apply` | `apiReviewApplyReceipts` | Requires `confirmed: true`, `ids` (`r-*` receipts), optional `scope`. Client helper: `reviewApplyReceipts`. |
| `POST` | `/api/review/dismiss` | `cmdReview(['dismiss', id])` | Body: `{ ids }` or `{ id }`. Batch-dismisses review items (findings and `r-*` receipts). |
| `GET` | `/api/author` | `apiAuthorState` | Global, workspace, git fallback, and resolved author. |
| `POST` | `/api/author/set`, `/api/author/unset` | `apiAuthorSet`, `apiAuthorUnset` | Requires `confirmed: true`. |
| `POST` | `/api/author/sync-git-global/plan`, `/api/author/sync-git-global` | `apiAuthorSyncPlan`, `apiAuthorSync` | Plan or apply sync of Engram author to global Git. |
| `POST` | `/api/author/migrate/plan`, `/api/author/migrate` | `apiAuthorMigrationPlan`, `apiAuthorMigration` | Plan or execute legacy memory author backfill. |
| `GET` | `/api/upgrade/plan`, `/api/upgrade/review` | `apiUpgradePlan`, `apiUpgradeReview` | Full upgrade plan and per-item conflict proposal. |
| `POST` | `/api/upgrade/review`, `/api/upgrade/review/batch`, `/api/upgrade/open-file`, `/api/upgrade/apply` | `apiUpgradeResolve`, `apiUpgradeResolveBatch`, `apiUpgradeOpenFile`, `apiUpgradeApply` | Fingerprint-checked resolution, editor launch, and apply. |
| `POST` | `/api/init` | `initWorkspace` | Initializes Engram workspace in `cwd`. |
| `POST` | `/api/browse` | `apiBrowseDirectories` | Lists subdirectories and Windows drives (5 s cache). |
| `POST` | `/api/workspace/add`, `/api/workspace/remove`, `/api/workspace/link` | `apiWorkspaceAdd`, `apiWorkspaceRemove`, `apiWorkspaceLink` | SQLite workspace registry mutations. |
| `POST` | `/api/profile/add`, `/api/profile/remove`, `/api/profile/activate` | `apiProfileAdd`, `apiProfileRemove`, `apiProfileActivate` | SQLite + profile store mutations. |
| `GET` | `/api/capabilities`, `/api/doctor`, `/api/recall` | `cmdCapabilities`, `cmdDoctor`, `cmdLoad` / `planLoad` | CLI JSON passthrough endpoints; `/api/recall?simulate=true` runs `planLoad` directly and returns `{ query, tokens, budgetTokens, bodyIds, cardIds, omittedIds }` (client helper: `simulateRecall`). |

## Verification

- Security & contract tests cover `Host`/`Origin` rejection, CSRF token enforcement, `Content-Type` checking, body size limits (`413`), method checks (`405`), and wire envelope fields.
- Unit/integration tests cover `validateConfigPatch` (all input types, bounds, risky key classification, `global_path` writability), `filterMemoryGraph` (`direct` and `related` modes), `resolveUnderRoot` traversal rejection, and API handlers (`apiReviewWrite`, `apiUpgrade*`, `apiAuthor*`, `apiMemoriesGraphData`, `apiCoreData`).
- Parity tests verify `CONFIG_FIELDS` docs anchors against published Entry reference docs.

## Related documentation

- [Entry Web UI](../features/entry-web-ui.md)
- [Runtime Config and Profiles](../architecture/runtime-config-and-profiles.md)
- [Memory Schema and Storage](../architecture/memory-schema-and-storage.md)
- [Safety Policy and Review](../architecture/safety-policy-and-review.md)
- [Ingest, Author, and Benchmarks](../features/ingest-author-and-benchmarks.md)
- [Agent Hooks and Skillsets](../features/agent-hooks-and-skillsets.md)
- [Upgrade, VCS, and Diagnostics](../workflows/upgrade-vcs-and-diagnostics.md)
- [CLI Commands and Dispatch](../interfaces/cli-commands-and-dispatch.md)

## Known limitations and open questions

- **Single active server instance:** `entry-server.ts` stores `activeServer` and `activeContext` in module-level singletons, so only one panel instance can be tracked per Node process.
- **Unreferenced endpoints in active UI:** `/api/workspace/*` and `/api/profile/*` are wired via `ConfigTab` sub-views (`WorkspacesTab`, `ProfilesTab`, alongside `RuntimeTab`), `/api/recall?simulate=true` is consumed by `MemoriesTab`, and `/api/doctor` is consumed by `ConnectionsTab`; only `/api/browse` and `/api/capabilities` remain implemented and exposed in `entry-server.ts` and `api-client.ts` without direct callers in the mounted Entry React UI.
- **Single-origin loopback assumption:** `allowedHosts` and `allowedOrigins` only permit `127.0.0.1`, `localhost`, and `[::1]` on the bound port; reverse-proxied or remote browser access is intentionally rejected.

<!-- BEGIN MANUAL NOTES -->
<!-- END MANUAL NOTES -->
