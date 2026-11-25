---
schema_version: 1
id: "interface.mcp-server-and-protocol"
title: "MCP Server, Dual-Era Protocol, Approval Flows, and Binary Entrypoints"
kind: "interface"
status: "verified"
summary: "Executable CLI/MCP wrappers, versioned Engram wire contract envelope, dual-era (legacy + 2026-07-28) JSON-RPC stdio MCP server, 11 tools with annotations, resources and propose prompt, and fail-closed token and elicitation approval flows."
tags: ["interface"]
source_paths: ["src/bin/engram-mcp.ts","src/bin/engram.ts","src/core/contracts/result.ts","src/mcp/approval-flow.ts","src/mcp/approval-tokens.ts","src/mcp/elicitation.ts","src/mcp/protocol.ts","src/mcp/resources.ts","src/mcp/server.ts"]
related_specs: ["feature.retrieval-routing-and-ordering","feature.working-memory-and-freshness","feature.memory-save-and-take-control","feature.agent-hooks-and-skillsets","interface.cli-commands-and-dispatch","architecture.safety-policy-and-review"]
last_doc_update_at: "2026-11-25T03:58:47Z"
last_verified_at: "2026-11-25T07:13:34Z"
last_verified_code_commit: "4cc4f6a"
last_source_change_commit: "7076b79"
last_source_change_at: "2026-10-13T04:40:05+07:00"
source_fingerprint: "sha256:ed19169043d28b44ab5589416917e0be76fdb7f0a44550d3705e95d98b4b4f7f"
---
# MCP Server, Dual-Era Protocol, Approval Flows, and Binary Entrypoints

## Purpose and boundaries

This interface layer exposes Engram to MCP hosts and shell users. It owns:

- The two published Node executable entrypoints: `engram` (`src/bin/engram.ts`) and `engram-mcp` (`src/bin/engram-mcp.ts`).
- The versioned JSON wire envelope (`CONTRACT_VERSION = '1'`) shared by CLI JSON output, MCP `structuredContent`, and the Entry API (`src/core/contracts/result.ts`).
- The JSON-lines stdio MCP server (`runMcp` / `handleMcp`), supporting both legacy MCP sessions (`2024-11-05` through `2025-11-25`) and stateless modern MCP (`2026-07-28`) with `server/discover`, cache hints, and `input_required` multi-round tool retries.
- All 11 MCP tools, their tool annotations/meta flags, MCP resources (`engram://index`, `engram://memory/{id}`), the `propose` prompt, and fail-closed human approval via single-use approval tokens or MCP form elicitation.

Out of scope: underlying CLI command implementations (`src/commands/*`), memory storage/routing internals (`src/core/memory/*`), and host MCP config file generation (`src/core/integrations/mcp-config.ts`).

## Observable behavior

### Binary entrypoints and shared wire contract
- `src/bin/engram.ts` suppresses the Node `node:sqlite` experimental warning (`suppressSqliteExperimentalWarning()`) before invoking `main()` from `src/cli.ts`.
- `src/bin/engram-mcp.ts` invokes `runMcp()` from `src/mcp/server.ts`.
- `src/core/contracts/result.ts` defines `CONTRACT_VERSION = '1'` and `EngramEnvelope<T>` (`ok: true` with `data` + `diagnostics`, or `ok: false` with `error: { code, message }` + `diagnostics`). `serializeResult()` recursively strips ANSI escape codes and formats 2-space JSON; `isEngramEnvelope()` validates the shape.

### Dual-era MCP protocol and stdio loop
- **Stdout discipline**: `runMcp()` writes only one JSON-RPC 2.0 object per line to `stdout`; all diagnostics and unknown argv warnings (`--always-load`, `--no-elicitation` are recognized; unknown flags fail open to stderr) go to `stderr`.
- **Era detection (`requestEra`)**: any request whose `params._meta` contains `io.modelcontextprotocol/protocolVersion` is routed to `handleModern()`; all other requests with an `id` go to `handleLegacy()`. Notifications (missing `id`) never produce a response.
- **Legacy era**:
  - Supported versions: `2024-11-05`, `2025-03-26`, `2025-06-18`, `2025-11-25` (default `2025-11-25`; unknown versions are never echoed).
  - `initialize` records `legacyClientCapabilities` on the process `McpSession` and returns `protocolVersion`, `capabilities: { tools: {}, resources: {}, prompts: {} }`, `serverInfo`, and `SERVER_INSTRUCTIONS` (<= 512 chars).
  - Supports `ping`, `tools/list`, `tools/call`, resource/prompt methods, and non-standard bare `engram_*` method calls (which return plain text and never trigger elicitation dialogs).
- **Modern era (`2026-07-28`)**:
  - Stateless per request: validates `io.modelcontextprotocol/protocolVersion` (unsupported versions return `-32022` with `data: { supported, requested }`) and `io.modelcontextprotocol/clientCapabilities` (`-32602` if missing).
  - Supports `server/discover` (advertising `SUPPORTED_VERSIONS`, `capabilities`, `instructions`), `tools/list`, `tools/call`, and resource/prompt methods; `ping`, `initialize`, and bare `engram_*` methods return `-32601` (`Method not found`).
  - `withModernFields()` attaches `resultType` (`'complete'` by default, or `'input_required'`), `_meta['io.modelcontextprotocol/serverInfo']`, and cache hints on complete cacheable methods (`300000ms` public for `server/discover`, `tools/list`, `prompts/list`, `resources/templates/list`; `60000ms` private for `resources/list`, `resources/read`).
- **Concurrency and cancellation**:
  - `tools/call` and bare `engram_*` requests execute sequentially in arrival order via `toolQueue` so pipelined mutations remain deterministic, while non-tool requests and client responses to server-initiated `elicitation/create` requests run concurrently without deadlocking.
  - `notifications/cancelled` aborts the matching in-flight `AbortController`; cancelled queued calls never run, and cancelled active calls emit no response. On `stdin` EOF, all pending outbound elicitation waiters reject with `OutboundAborted` before draining `tasks`.

### Tool catalog, annotations, and structured output
Tool order in `tools/list` is fixed for prompt-cache stability:
1. `engram_load` (read-only; gets `_meta['anthropic/alwaysLoad']: true` when started with `--always-load`): supports `query`, `id`, `budget_tokens` (200–16000), `disclosure` (`auto` | `full`), `full`, `explain`. Returns `StructuredOutput` with `selected_keys`, `body_keys`, `card_ids`, `omitted_ids`, `tokens`.
2. `engram_route` (read-only): returns task classification plus dry-run routed entries (`id`, `type`, `scope`, `score`) in load order.
3. `engram_search` (read-only): returns search text plus `{ query, count, entries }`.
4. `engram_verify` (read-only): runs `cmdVerify(scope)`.
5. `engram_status` (read-only): runs `cmdHealth()`.
6. `engram_set_role` (`readOnlyHint: false`): updates active role filters.
7. `engram_set_rule_variant` (`readOnlyHint: false`): sets `light`, `balanced`, `strict`, or `status`.
8. `engram_save` (unannotated preview): plans one memory candidate and runs `approve()`; never writes silently.
9. `engram_save_session` (unannotated preview): plans multiple `TYPE/TEXT` candidates and runs `approve()`; never writes silently.
10. `engram_commit` (`readOnlyHint: false, destructiveHint: true, idempotentHint: false`, `_meta['anthropic/requiresUserInteraction']: true`): redeems a single-use `approval_token` with `approve: "all"` or 1-based candidate numbers and commits via `commitApprovedCandidates()`.
11. `engram_note` (`readOnlyHint: false`): proposes one gitignored, expiring working-tier note via `approve()` (returns immediately with `written: false` when verdict is `NOOP`).

Every `tools/call` response includes `content: [{ type: 'text', text }]`, `contract_version: '1'`, and `structuredContent` conforming to `EngramEnvelope` (errors set `isError: true` and `error.code = 'ENG_TOOL_ERROR'`).

### Human approval flows (token and elicitation)
- **Approval tokens (`approval-tokens.ts`)**:
  - `issueToken()` generates a 32-byte `base64url` token, stores only its `sha256` (`token_hash`) plus `cwd`, `scope`, `candidates`, optional pinned `verdicts`, and a canonical-JSON tamper-evident `hash` in gitignored `pending-approvals.json` under the target scope root.
  - All issue, redeem, and revoke operations run inside a cross-process file lock (`APPROVAL_LOCK_TIMEOUT_MS = 5000`) and **fail closed** on lock timeout or write failure.
  - Tokens expire after `APPROVAL_TTL_MS` (30 minutes) and are single-use. `redeemTokenHash()` checks `revoked`, `used`, `expired`, and `mismatch` in order, runs optional `validate` before marking `used_at`, and returns `unknown` if not found for `path.resolve(cwd)`.
- **Form elicitation (`elicitation.ts`, `approval-flow.ts`)**:
  - Used when `elicitation !== false`, candidate count `<= MAX_CHOICES` (20), and client capabilities advertise form elicitation (`elicitation: {}` or `elicitation.form` object); otherwise falls back to the chat `approval_token` flow.
  - Choice titles pass `redactSensitive()` and `scanInjection()` (any flagged/modified label degrades to `Candidate N`, max 120 chars). Scope choices only allow narrowing `both` to `workspace` or `global`.
  - **Legacy elicitation**: sends server-to-client `elicitation/create` with a 60s timeout (`ENGRAM_MCP_ELICITATION_TIMEOUT_MS` override only under `NODE_ENV=test`). Cancellation aborts and revokes the token; timeout or dialog dismissal falls back to returning the chat `approval_token`; `decline` or `invalid` revokes the token and writes nothing; `accept` redeems and commits.
  - **Modern (`2026-07-28`) elicitation**: seals `{ v: 1, th, cwd, tool, args, exp, choices, scopes }` into `v1.<base64url>.<hmac-sha256>` using an ephemeral per-process 32-byte `STATE_KEY` (max 8192 chars, falling back to token if larger) and returns `resultType: 'input_required'` with `inputRequests.engram_approval`. On retry, `completeModernApproval()` reads `requestState`/`inputResponses` strictly from `params` (never tool `arguments`), verifies MAC (constant-time), expiry, tool, cwd digest, and args digest, and commits the pending hash-verified candidates without re-planning. Forged/expired state throws `McpProtocolError` (`-32602`).

### Resources and `propose` prompt
- `resources/list` returns `engram://index` plus up to `mcp.resource_limit` visible, durable, non-working, non-retired memories with URI-safe IDs (`^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$`), ranked by `injected + fetched` usage (empty when disabled or `read: off`).
- `resources/templates/list` advertises `engram://memory/{id}` (`text/markdown`).
- `resources/read` serves sanitized cards for `engram://index` and delegates `engram://memory/{id}` to `loadForAgent('', { cwd, id: [id] })` (recording `fetched` usage and withholding any `SKIPPED` line flagged by `scanInjection`). Missing, retired, or ignored IDs throw `ResourceNotFound` (mapped to `-32002` in legacy, `-32602` in modern).
- `prompts/list` and `prompts/get` expose a single prompt, `propose`, whose user message body is `agentMemoryProtocolText()`.

## Workflow

```text
stdin JSON-RPC line
  │
  ▼
runMcp() ──► parse JSON / handle client response / handle notifications/cancelled
  │
  ▼ (tool requests serialized in toolQueue; others concurrent)
handleMcp(request, session, signal)
  ├─ requestEra() === 'modern' ──► handleModern() (validate _meta, route, withModernFields)
  └─ requestEra() === 'legacy' ──► handleLegacy() (initialize, ping, route)
        │
        ▼
      callTool()
        ├─ read/admin tools ──► cmdLoad/loadForAgent/search/route/verify/status/set_*
        ├─ engram_save / engram_save_session / engram_note
        │    ├─ modern retry (requestState/inputResponses) ──► completeModernApproval()
        │    └─ new proposal ──► planCandidates/planNote ──► approve()
        │         ├─ token mode ──► issueToken() ──► StructuredOutput + approval_token
        │         ├─ modern-elicit ──► sealRequestState() ──► InputRequired
        │         └─ legacy-elicit ──► session.request('elicitation/create') ──► settleApproval()
        └─ engram_commit ──► redeemToken() ──► commitApprovedCandidates()
```

## Code map

| File | Responsibility |
| --- | --- |
| `src/bin/engram.ts` | Published `engram` CLI executable wrapper; suppresses SQLite experimental warning and runs `main()` |
| `src/bin/engram-mcp.ts` | Published `engram-mcp` MCP stdio executable wrapper; runs `runMcp()` |
| `src/core/contracts/result.ts` | `CONTRACT_VERSION = '1'`, `EngramEnvelope<T>`, `ok()`, `fail()`, `serializeResult()` (ANSI-stripped), `isEngramEnvelope()` |
| `src/mcp/protocol.ts` | Era detection (`requestEra`), legacy negotiation, modern `_meta` validation, `server/discover`, `withModernFields` cache hints, `SERVER_INSTRUCTIONS`, RPC error codes, `McpSession` |
| `src/mcp/server.ts` | `runMcp()` stdio loop, `handleMcp()`, `handleLegacy()`, `handleModern()`, 11 tool definitions/annotations, proposal/commit/read handlers, `parseServerArgs()` |
| `src/mcp/approval-flow.ts` | `approve()`, `withApprovalToken()`, `completeModernApproval()`, `settleApproval()`, `StructuredOutput`, `InputRequired`, `McpProtocolError` |
| `src/mcp/approval-tokens.ts` | Locked `pending-approvals.json` token store (`issueToken`, `redeemToken`, `redeemTokenHash`, `revokeTokenHash`), 30m TTL, canonical JSON hashing |
| `src/mcp/elicitation.ts` | Form schema (`approvalForm`), `parseElicitResult()`, sanitized `choiceTitle()`, HMAC-SHA256 `sealRequestState()` / `openRequestState()`, capability checks |
| `src/mcp/resources.ts` | `listResources()`, `resourceTemplates()`, `readResource()`, `promptList()`, `getPrompt('propose')`, injection-safe text/card withholding |

## Interfaces and data

- **`EngramEnvelope<T>`**: `{ contract_version: '1', ok: true, data: T, diagnostics: Diagnostic[] }` | `{ contract_version: '1', ok: false, error: { code: string, message: string }, diagnostics: Diagnostic[] }`.
- **RPC error codes (`RPC`)**: `METHOD_NOT_FOUND (-32601)`, `INVALID_PARAMS (-32602)`, `INTERNAL (-32603)`, `UNSUPPORTED_VERSION (-32022)`, `LEGACY_RESOURCE_NOT_FOUND (-32002)`, `LEGACY_SERVER_ERROR (-32000)`, plus parse `-32700` and invalid request `-32600`.
- **`PendingApproval`** (`pending-approvals.json`): `{ token_hash, cwd, scope, candidates, verdicts?, hash, issued_at, used_at?, revoked_at? }`.
- **`SealedApproval`**: `{ v: 1, th, cwd, tool, args, exp, choices, scopes }`, encoded as `v1.<base64url>.<hmac>`.
- **Tool `_meta` flags**: `anthropic/requiresUserInteraction` (on `engram_commit`), `anthropic/alwaysLoad` (on `engram_load` with `--always-load`).
- **CLI flags on `engram-mcp`**: `--always-load`, `--no-elicitation`.

## Verification

- `npm run test:mcp` (`node --test tests/mcp.test.mjs`) covers legacy and 2026-07-28 protocol routing, tool schemas/annotations, approval tokens, legacy and modern elicitation, cancellation, resources, and `propose` prompt.
- `npm run test:package` verifies published bin wrappers (`dist/bin/engram.js`, `dist/bin/engram-mcp.js`).
- `npm run typecheck` checks contract and MCP module typing.

## Related documentation

- [Retrieval Routing and Ordering](../features/retrieval-routing-and-ordering.md)
- [Working Memory and Freshness](../features/working-memory-and-freshness.md)
- [Memory Save and Take Control](../features/memory-save-and-take-control.md)
- [Agent Hooks, Path Rules, and Skillset Adapters](../features/agent-hooks-and-skillsets.md)
- [CLI Commands and Dispatch](../interfaces/cli-commands-and-dispatch.md)
- [Safety Policy and Review](../architecture/safety-policy-and-review.md)

## Known limitations and open questions

- Modern `2026-07-28` `requestState` is signed with an in-memory per-process `STATE_KEY`; restarting `engram-mcp` invalidates any in-flight `input_required` dialog and requires re-proposing (intentional fail-closed behavior).
- `serverCapabilities()` intentionally omits `listChanged` and `subscribe` because Engram emits no server-initiated notifications.
- Elicitation forms cap at `MAX_CHOICES = 20` candidates and `MAX_STATE_CHARS = 8192` bytes; larger proposals transparently fall back to the chat `approval_token` flow.

<!-- BEGIN MANUAL NOTES -->
<!-- END MANUAL NOTES -->
