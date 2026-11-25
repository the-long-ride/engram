---
schema_version: 1
id: "feature.agent-hooks-and-skillsets"
title: "Agent Hooks, Path Rules, and Skillset Adapters"
kind: "feature"
status: "verified"
summary: "Host detection, prompt-time and startup hook runtime with delta/carded session tracking, native path-scoped rules, OpenCode plugin, MCP config fragments, document conversion bridge, and workspace/global skillset installation."
tags: ["hooks","skillsets","native-rules","opencode","exporter","integrations"]
source_paths: ["src/core/integrations/agent-detect.ts","src/core/integrations/agent-hook-runtime.ts","src/core/integrations/agent-hooks.ts","src/core/integrations/agent-paths.ts","src/core/integrations/capabilities.ts","src/core/integrations/claude-bootstrap.ts","src/core/integrations/exporter.ts","src/core/integrations/hook-caps.ts","src/core/integrations/hook-session.ts","src/core/integrations/hook-turn.ts","src/core/integrations/markdown-them.ts","src/core/integrations/mcp-config.ts","src/core/integrations/native-rules.ts","src/core/integrations/opencode-hook-plugin.ts","src/core/integrations/session-end.ts","src/core/integrations/skillset-render.ts","src/core/integrations/skillset.ts"]
related_specs: ["feature.retrieval-routing-and-ordering","workflow.session-learning-and-traces","interface.mcp-server-and-protocol","workflow.upgrade-vcs-and-diagnostics","architecture.runtime-config-and-profiles","architecture.safety-policy-and-review"]
last_doc_update_at: "2026-11-25T07:13:34Z"
last_verified_at: "2026-11-25T07:13:34Z"
last_verified_code_commit: "4cc4f6a"
last_source_change_commit: "7076b79"
last_source_change_at: "2026-10-13T04:40:05+07:00"
source_fingerprint: "sha256:83c875896b40445ec5233ff2c1bbc226dd956c229c73e14fa0d459e7c5e9c46c"
---
# Agent Hooks, Path Rules, and Skillset Adapters

## Purpose and boundaries

This subsystem connects Engram memory to external AI coding hosts (Codex, Claude Code, Gemini CLI / Antigravity, Cursor, Windsurf, OpenCode, Copilot, and Cline). It owns:

- Detecting installed AI agents and resolving user-level agent home/config directories.
- Installing, refreshing, previewing, and uninstalling managed host hooks (JSON hook configs and the OpenCode JS plugin) and skillset/instruction files.
- Executing the runtime hook entrypoint (`runAgentHook`) for session start, subagent start, prompt turns, tool-time path triggers, compaction resets, `InstructionsLoaded`, and opt-in `SessionEnd` transcript queuing.
- Emitting native path-scoped rule files for Claude (`.claude/rules/engram/*.md`) and Cursor (`.cursor/rules/engram/*.mdc`), rendering host-specific MCP config fragments, exporting interop instruction formats, and bridging optional document-to-Markdown conversion via `@the-long-ride/markdown-them`.

Out of scope: memory ranking/planning internals (`src/core/memory/load-plan.ts`), live learning capture/drain logic (`src/core/learning/capture.ts`), CLI command parsing (`src/commands/skillset-link.ts`), and the MCP server protocol (`src/mcp/*`).

## Observable behavior

### Host detection and capabilities
- `detectInstalledAgents(home)` probes home config directories (`.codex`, `.claude`, `.cursor`, `.gemini`, `.copilot`, `.cline`, `.antigravity*`, OpenCode config home, Windows `LOCALAPPDATA\Programs\{Cursor,Windsurf}`) and PATH executables (`where` on Windows, `which` on POSIX, 3s timeout).
- `resolveAllTargets()` always includes `mcp` and `slash` plus targets mapped to detected agents; `allSupportedTargets()` returns every supported target.
- `adapterCapabilities(host?)` returns the static capability matrix (`instruction`, `skillset`, `mcp`, `startup_injection`, `prompt_turn_injection`, `proof`, `transcript_events`, `unlink_cleanup`) across 8 hosts (`codex`, `claude`, `gemini`, `cursor`, `windsurf`, `copilot`, `cline`, `opencode`).
- `globalAgentHome()` honors `ENGRAM_AGENT_HOME` (default `os.homedir()`); `globalAgentConfigHome()` honors `ENGRAM_AGENT_CONFIG_HOME`, `XDG_CONFIG_HOME`, Windows `APPDATA`, or `<home>/.config`; `globalOpenCodeConfigHome()` returns `<home>/.config/opencode`.

### Hook runtime, delta/carded tracking, and `hookStartupAuto`
- `runAgentHook(host, rawInput)` parses stdin JSON and **always fails open** to `{}` on unhandled errors.
- `SessionEnd` (Claude/Codex only, opt-in via `link --session-end`): calls `recordSessionEnd()` to enqueue `{ transcript_path, host, session, at }` into `session-queue.json` and immediately returns `{}` without injecting context.
- Optional transcript ingestion (`maybeIngestTranscript`): runs only when `.agents/engram.transcripts.json` exists with `enabled: true`, the host is allowed and has `transcript_events: true`, and the event is not a context start. Persistence errors are swallowed.
- Per-session state (`agent-hook-cache.json` under workspace `.agents/.engram/`, gitignored, file-locked with 1500ms fail-open timeout):
  - Keyed by `${host}:${sha256(resolvedCwd)}:${deliveredSessionId}` where subagents with `agent_id` use `${base}#agent:${agent_id}`. A `SubagentStart` without `agent_id` is treated as a shared subagent and neither resets, reads, nor writes the parent's session record.
  - Tracks `delivered` (body keys), `carded` (card-only keys from `auto` disclosure), and `touched` (up to 16 recent relative tool paths).
  - Pruned on write: 7-day TTL (`SESSION_TTL_DAYS = 7`), max 100 subagent records (`MAX_SUBAGENT_RECORDS`) pruned first so subagent bursts cannot evict parent sessions, max 200 total records (`MAX_SESSION_RECORDS`).
- Session/context lifecycle:
  - `SessionStart` / `sessionStart` / `SubagentStart` and compaction events (`PreCompact`, `PreCompress`) reset an existing session record's delivered set to `[]` (without creating cache files in uninitialized workspaces). Compaction events return `{}`.
  - Task-scoped `SubagentStart` routing: `subagentQueryText` extracts task text from `prompt`, `task`, `subagent_prompt`, `agent_prompt`, `description`, `instructions`, `tool_input.prompt`, or `tool_input.description` (ignoring short `<3`-char values and literal `'current session'`/`'current task'`), optionally prefixing with non-generic `agent_type` (excluding `explore`, `general-purpose`, `default`, `plan`, `*`), and falling back to `'current session'` when no task text is present.
  - On `SessionStart` (non-shared), `maybeAutoDrainQueueOnStart(cwd)` runs fail-open to drain queued learning/session work before context planning.
  - When `isSessionStart(event) && config.read === 'auto'`, `hookStartupAuto: true` is passed to `planLoad()` so startup auto-injection follows startup budget/disclosure rules.
  - `read: manual` and `read: off` emit proof-only skipped output (and OpenCode action `clear`); `read: startup` on non-context-start turns emits `startup-only` skipped proof (OpenCode action `retain`).
  - `read: always` ignores stored `delivered`/`carded` for planning (`previous = []`, `cardedKeys = []`) while retaining the stored record structure.
  - For normal `auto` turns, `held = previous` keeps already-delivered bodies in their expansion slots so repeated prompts do not promote former cards; `cardedKeys = storedCarded` enables delta tracking of previously carded entries. OpenCode (`replacesSlot = true`) overwrites a single system-prompt slot on each `replace` and therefore passes `held = []`, `cardedKeys = undefined`.
  - `planHookTurn()` computes `fresh = bodyKeys - previous`, marks `reused` when `proofOnly` or no fresh bodies exist, formats proof lines (`loaded`, `reused`, `skipped`) and the sorted `already loaded: ...` line (which survives `proof: off`), and attaches a deterministic 8-hex `setSignature` of sorted `selectedKeys`.
- Per-host payload caps (`hook-caps.ts`):
  - `codex`: 2400 tokens (UTF-8 bytes / 4 rounded up); `claude`: 9500 chars; other hosts default to `config.load.max_tokens` tokens.
  - `planCappedTurn()` re-plans up to `CAP_REPLANS = 3` times (reducing budget by overflow + `REPLAN_MARGIN = 16` tokens) so bodies demote to cards cleanly without mid-body truncation; if still over cap, shrinks `already loaded:` to `(+N more)`, and as a last resort emits proof-only output.
- Prompt correction hook capture and closed-loop telemetry:
  - After computing hook output, for `PROMPT_LEARNING_EVENTS` (`UserPromptSubmit`, `BeforeAgent`, `pre_user_prompt`, `chat.message`), `runAgentHook()` checks `isLivePromptCorrection(prompt)`; when true and `touchedPaths` + `session.delivered` are non-empty, `matchedDeliveredForPaths(ctx, touchedPaths, session.delivered)` records `'corrected'` usage fail-open, then invokes `maybeCaptureHookLearning(cwd, { host, sessionId, prompt, touchedPaths })` fail-open.
- Host output formatting (`hostOutput`):
  - Default (`claude`, `codex`, `gemini`): `{ hookSpecificOutput: { hookEventName, additionalContext }, suppressOutput: true }` (`suppressOutput` omitted on Codex `SubagentStart` and Codex `PreToolUse`).
  - `opencode`: adds `engramHook: { action: 'replace' | 'retain' | 'clear' }`.
  - `cursor`: `{ additional_context }`.
  - `windsurf`: `{ proof }` (or `{}` when empty); Windsurf is `proofOnly = true` and never receives bodies.

### Path triggers and native path rules
- Runtime path triggers (`PreToolUse` on Claude/Codex, `AfterTool` on Gemini):
  - Active only when `config.enabled && (config.read === 'auto' || config.read === 'always')`.
  - Extracts relative file paths via `toolPaths()`, records `'applied'` usage fail-open for any previously delivered keys matching those paths (`matchedDeliveredForPaths`), records the paths in session `touched` (last 16), and loads undelivered `applies_to` memories via `loadForPaths()` within the host cap (re-planning up to 3 times; never cuts a body).
  - Under Claude `hooks.path_rules: native`, filters out keys already covered by `.claude/rules/engram/*.md` (workspace and global) to prevent double delivery.
- Native path rules (`native-rules.ts`):
  - Renders durable, visible, unflagged, non-working `applies_to` memories (ignoring developer `roles` to prevent repo churn) into `.claude/rules/engram/<slug>.md` (YAML `paths:` list) and `.cursor/rules/engram/<slug>.mdc` (`description`, comma-joined `globs`, `alwaysApply: false`).
  - Each generated file starts after frontmatter with `<!-- engram:<scope>:<file> sha:<8hex> -->`. Unmarked human-authored files are never overwritten or deleted (`preserved`).
  - Enforces `CLAUDE_BRACE_BUDGET = 1000` expanded brace patterns for Claude and expands braces up front for Cursor (skipping globs with nested/unbalanced braces or literal commas).
  - Under Claude `hooks.path_rules: native`, `agent-hooks.ts` registers `InstructionsLoaded` (matcher `path_glob_match`) instead of `PreToolUse` (stripping `PreToolUse` as a retired event). When `InstructionsLoaded` fires, `instructionsLoadedOutput()` parses the rule marker, appends the key to session `delivered`, records `injected` usage, and returns `{}`.
  - Under `hooks.path_rules: hook`, Claude native rule sync emits 0 desired files (removing marked files) and registers `PreToolUse` instead.

### OpenCode hook plugin
- `opencode-hook-plugin.ts` generates `.opencode/plugins/engram.js` (or `<globalOpenCodeConfigHome>/plugins/engram.js`) marked with `// Generated by Engram OpenCode hook installer. Edit with care.`.
- Subscribes to `chat.message` (fires `SessionStart` once per `sessionID`, then `UserPromptSubmit` with non-synthetic text parts by piping JSON into `engram agent-hook --host opencode` with a 10s timeout), `experimental.chat.system.transform` (pushes the cached context into `output.system`), and `event` (`session.deleted` clears per-session maps).
- Honors `engramHook.action`: `clear` deletes cached context, `replace` overwrites it, `retain` leaves the last valid context intact.

### Hook config installation, MCP configs, skillsets, and export
- `agent-hooks.ts` manages JSON hook configs for `codex` (`.codex/hooks.json`), `claude` (`.claude/settings.json`), `gemini` (`.gemini/settings.json`), `cursor` (`.cursor/hooks.json` / plugin path), `windsurf` (`.windsurf/hooks.json` / `.codeium/windsurf/hooks.json`), and plugin file for `opencode`. Targets `antigravity`/`antigravity-cli` normalize to `gemini`, `open-code` to `opencode`, `cascade` to `windsurf`; `copilot` and `cline` are reported as unsupported (`SKIPPED`).
- Unparseable existing JSON configs are never overwritten (`SKIPPED`). Timeouts are written in seconds (`10`, or `5`/`3` for `SessionEnd` on Claude/Codex) for Claude, Codex, and Cursor, and in milliseconds (`10000`) for Gemini and Windsurf.
- `claude-bootstrap.ts` resolves Claude instruction files: always `AGENTS.md`, plus the first existing `CLAUDE.md` or `.claude/CLAUDE.md` unless it imports `@AGENTS.md`, emitting advisory notes when `CLAUDE.local.md` or an ancestor `CLAUDE.md` between workspace and git root would hide `AGENTS.md`.
- `mcp-config.ts` resolves `engram-mcp` from `PATH` (respecting Windows `PATHEXT`) or falls back to `npx -y --package @the-long-ride/engram@<VERSION> engram-mcp`, optionally appending `--always-load` for Claude Code; renders and upserts/removes the managed TOML block (`# BEGIN ENGRAM MANAGED MCP` / `# END ENGRAM MANAGED MCP`, setting `engram_commit` `approval_mode = "approve"`) in `~/.codex/config.toml` while detecting unmanaged `mcp_servers.engram` tables to avoid invalid TOML.
- `skillset-render.ts` and `skillset.ts` install, refresh, preview, and unlink workspace and global skillset files across 12 targets (`agents-md`, `copilot`, `claude`, `cursor`, `gemini`, `cline`, `windsurf`, `agent-skill`, `antigravity`, `opencode`, `mcp`, `slash`), using minimal managed blocks (`<!-- engram:start -->` / `<!-- engram:end -->`) pointing to companion guides, thin pointer `SKILL.md` / slash files, Agent Skills frontmatter validation (`validateSkillFrontmatter`, `validateSkillFile`), JSON MCP/Gemini hook merging, and a global skillset install registry.
- `exporter.ts` renders guarded memories to `agents-md`, `claude-md`, and `cursor-rules` (accepting deprecated alias `cursorrules`), writes deterministic JSON bundles (`exportBundle`), and refuses to overwrite non-generated live-sync targets.
- `markdown-them.ts` lazily imports optional peer dependency `@the-long-ride/markdown-them` to convert 13 document extensions (`.adoc`, `.doc`, `.docx`, `.epub`, `.htm`, `.html`, `.odt`, `.pdf`, `.ppt`, `.pptx`, `.rtf`, `.xls`, `.xlsx`) to Markdown.

## Workflow

```text
Host event (stdin JSON)
  │
  ▼
runAgentHook(host, rawInput)
  ├─ SessionEnd ──► recordSessionEnd() ──► session-queue.json ──► "{}"
  ├─ maybeIngestTranscript() (if .agents/engram.transcripts.json enabled; fail-open)
  ├─ computeHookOutput()
  │    ├─ SessionStart/SubagentStart/PreCompact/PreCompress ──► reset delivered[]
  │    ├─ SessionStart ──► maybeAutoDrainQueueOnStart() (fail-open)
  │    ├─ InstructionsLoaded (Claude) ──► parseNativeRuleMarker() ──► delivered + usage
  │    ├─ PreToolUse / AfterTool ──► loadForPaths() (cap-checked, native-deduped)
  │    └─ Prompt / ContextStart ──► planCappedTurn(hookStartupAuto, cardedKeys, held)
  │                                  ──► saveDelivered(delivered, carded, touched)
  │                                  ──► recordUsage(..., 'injected')
  ├─ PROMPT_LEARNING_EVENTS ──► maybeCaptureHookLearning(prompt, touchedPaths) (fail-open)
  └─ hostOutput(host, output, openCodeAction) ──► stdout JSON
```

## Code map

| File | Responsibility |
| --- | --- |
| `src/core/integrations/agent-detect.ts` | Installed AI agent detection (`detectInstalledAgents`), `resolveAllTargets`, `allSupportedTargets` |
| `src/core/integrations/agent-paths.ts` | User-level path resolution (`globalAgentHome`, `globalAgentConfigHome`, `globalOpenCodeConfigHome`) |
| `src/core/integrations/capabilities.ts` | Static 8-host `AdapterCapabilities` registry |
| `src/core/integrations/agent-hook-runtime.ts` | Main `runAgentHook` pipeline: lifecycle resets, queue auto-drain, task-scoped `SubagentStart` routing (`subagentQueryText`), `hookStartupAuto`, delta/carded tracking, path triggers, closed-loop `applied`/`corrected` usage telemetry (`matchedDeliveredForPaths`), `InstructionsLoaded`, transcript ingest, prompt learning capture, host output shaping |
| `src/core/integrations/agent-hooks.ts` | Managed hook install/uninstall/refresh/preview/detection across JSON hosts and OpenCode plugin, event matchers, path-rules mode switching, opt-in `SessionEnd` |
| `src/core/integrations/hook-caps.ts` | Per-host payload cap definitions (`codex` 2400 tokens, `claude` 9500 chars) and size/budget conversion |
| `src/core/integrations/hook-session.ts` | Locked, atomic `agent-hook-cache.json` persistence (`delivered`, `carded`, `touched`) and TTL/subagent pruning |
| `src/core/integrations/hook-turn.ts` | Pure turn planner (`planHookTurn`), proof lines, sorted `already loaded:` truncation, deterministic `setSignature` |
| `src/core/integrations/opencode-hook-plugin.ts` | Generated OpenCode JS plugin (`EngramOpenCodePlugin`) and marker detection |
| `src/core/integrations/session-end.ts` | Opt-in Claude/Codex `SessionEnd` transcript queuing into `session-queue.json` |
| `src/core/integrations/native-rules.ts` | Claude `.md` and Cursor `.mdc` path-rule rendering, brace-budget checks, marker-safe sync/remove/refresh |
| `src/core/integrations/claude-bootstrap.ts` | Claude `AGENTS.md` vs `CLAUDE.md` / `.claude/CLAUDE.md` / `CLAUDE.local.md` / ancestor detection |
| `src/core/integrations/mcp-config.ts` | `engram-mcp` binary/npx command resolution, Claude CLI hint, Codex TOML managed block upsert/remove and conflict detection |
| `src/core/integrations/skillset-render.ts` | Managed instruction blocks, companion guide, pointer skills/slash commands, Cursor/Windsurf rules, MCP/Gemini JSON merge/unmerge, `SKILL.md` frontmatter validator |
| `src/core/integrations/skillset.ts` | Workspace/global skillset install, refresh, preview, unlink, detection, and global install registry |
| `src/core/integrations/exporter.ts` | Interop Markdown rendering (`agents-md`, `claude-md`, `cursor-rules`), JSON bundle export, guarded live-sync writes |
| `src/core/integrations/markdown-them.ts` | Optional dynamic import bridge to `@the-long-ride/markdown-them` for 13 document formats |

## Interfaces and data

- **`AgentHookHost`**: `'codex' | 'claude' | 'gemini' | 'opencode' | 'cursor' | 'windsurf'`.
- **`HookSessionRecord`** (`agent-hook-cache.json`): `{ delivered: string[]; updated: string; carded?: string[]; touched?: string[] }`.
- **`HookProof`**: `{ mode, decision: 'loaded' | 'reused' | 'skipped', readMode, selectedCount, bodyCount, relatedCount, signature, reason? }`.
- **`SkillsetTarget`**: `'agents-md' | 'copilot' | 'claude' | 'cursor' | 'gemini' | 'cline' | 'windsurf' | 'agent-skill' | 'antigravity' | 'opencode' | 'mcp' | 'slash'`.
- **`SkillsetUpgradePreview`**: `{ target, file, mode?, renderTarget?, current, expected, latest?, safe, userEditsPreserved, reason?, installedVersion? }`.
- **`NativeRuleSyncResult`**: `{ host: 'claude' | 'cursor', scope, dir, written, updated, removed, unchanged, skipped, preserved }`.
- **Managed markers**:
  - Workspace instruction block: `<!-- engram:start -->` ... `<!-- engram:end -->`
  - Codex MCP TOML block: `# BEGIN ENGRAM MANAGED MCP` ... `# END ENGRAM MANAGED MCP`
  - Native rule marker: `<!-- engram:<scope>:<file> sha:<8hex> -->`
  - OpenCode plugin marker: `// Generated by Engram OpenCode hook installer. Edit with care.`

## Verification

- `npm run test:built` / `node --test tests/skillset.test.mjs` covers skillset rendering, workspace/global install/unlink, managed blocks, MCP config fragments, and hook installation.
- `npm run test:cli` and `npm run test:core` exercise `engram agent-hook`, `engram link`/`unlink`, native path rules, and export targets.
- `npm run typecheck` validates TypeScript interfaces across all integration modules.

## Related documentation

- [Retrieval Routing and Ordering](../features/retrieval-routing-and-ordering.md)
- [Session Learning and Traces](../workflows/session-learning-and-traces.md)
- [MCP Server and Protocol](../interfaces/mcp-server-and-protocol.md)
- [Upgrade, VCS, and Diagnostics](../workflows/upgrade-vcs-and-diagnostics.md)
- [Runtime Config and Profiles](../architecture/runtime-config-and-profiles.md)
- [Safety Policy and Review](../architecture/safety-policy-and-review.md)

## Known limitations and open questions

- Copilot and Cline do not have file-first prompt-turn hook installers (`UNSUPPORTED` in `agent-hooks.ts`); they rely on skillset/instruction files and MCP or manual CLI load.
- Windsurf's `pre_user_prompt` hook only renders proof (`proofOnly = true`) and does not inject memory bodies.
- `src/core/integrations/skillset.ts` (1,687 lines): verified via symbol outline (`mcp_agy-fast_fast_read_slices`), generated `dist/core/integrations/skillset.d.ts`, and all call sites in `native-rules.ts`, `doctor.ts`, `skill-files.ts`, and `src/core/upgrade/*`.

<!-- BEGIN MANUAL NOTES -->
<!-- END MANUAL NOTES -->
