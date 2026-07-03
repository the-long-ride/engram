# Changelog

## 0.0.25

- Corrected global OpenCode integration to always use `~/.config/opencode/` for rules, skills, plugin, and MCP configuration.
- Switched the global OpenCode default MCP config file to `~/.config/opencode/opencode.jsonc`, while still merging existing `opencode.json` files in place.
- Confirmed OpenCode local plugin setup uses `~/.config/opencode/plugins/engram.js` without adding an npm-style `plugin` entry to `opencode.jsonc`.
- Implemented the MCP JSON-RPC handshake for OpenCode by supporting `initialize`, `notifications/initialized`, `tools/list`, and `tools/call` content responses.
- Added regression coverage for global OpenCode config-home isolation, plugin installation, JSON/JSONC upgrade refresh, unlink, and web API connection flows.

## 0.0.24

- Fixed workspace-profile precedence so DB-backed config, CLI loads, MCP/shared loads, and agent-hook injections all resolve global memory with `--profile`/`ENGRAM_PROFILE`, then workspace default profile, then user default profile.
- Fixed SQLite/JSON config persistence so workspace configs keep raw `default_profile` settings without storing profile-derived `global_path` values, preventing cross-profile memory leaks after reload.
- Fixed OpenCode integration paths so workspace links use `AGENTS.md`, `.opencode/engram.md`, `.opencode/skills/engram/SKILL.md`, and `opencode.json` or an existing `opencode.jsonc`, while global links use `~/.config/opencode/AGENTS.md`, `~/.config/opencode/engram.md`, `~/.config/opencode/skills/engram/SKILL.md`, and `~/.config/opencode/opencode.jsonc` or an existing `opencode.json`.
- Updated OpenCode hook/plugin and MCP merge flows so `engram upgrade --latest` refreshes only Engram-managed entries, preserves unrelated user settings, and skips invalid existing JSON/JSONC instead of overwriting it.
- Hardened shared JSON/JSONC merge helpers and refresh logic for other linked agents, including Cursor, Claude, Gemini, and Windsurf, so user-authored config stays intact while Engram-managed MCP and hook entries update cleanly.
- Added regression coverage for OpenCode and shared MCP refresh/force-link cases, including malformed config preservation and user-setting-safe merges.

## 0.0.23

- Added an agent chat memory approval flow so agents can propose memories through a chat approval protocol, with updated README, protocol, quickstart, skillset contract, `llm.txt`, and translated docs.
- Added `engram upgrade --latest` refresh support for linked agent integrations so generated hook and skillset files update with the latest templates.
- Improved the `/engram` slash/menu entry and upgrade hook refresh behavior, plus refreshed related integration documentation.
- Updated translated operations guides for the new approval and upgrade flows.

## 0.0.22

- Added Cursor as a `link` target: workspace rules (`.cursor/rules/engram.mdc`), MCP (`.cursor/mcp.json` with `type: "stdio"`), sessionStart hook, and guide file. Global install creates a local Cursor plugin with rules, skills, commands, MCP, and hooks.
- Added Windsurf as a `link` target: workspace rules (`.windsurf/rules/engram.md`), pre_user_prompt hook (proof-only, no AI context injection), and guide file. Global install writes global rules, MCP (`mcp_config.json` with `type: "stdio"`), and hooks. Workspace MCP is not generated for Windsurf.
- Added `cascade` as a compatibility alias for `windsurf` in both `link`/`unlink` and `agent-hook` commands.
- Shared `mergeFlatHooks`/`unmergeFlatHooks` for flat cursor/windsurf hook schemas, replacing duplicated per-target merge logic.
- Added `ensureRequiredFrontmatter` to merge `alwaysApply: true` (Cursor) and `trigger: always_on` (Windsurf) into human-authored rule files, with CRLF line-ending support.
- Added `_managedBy: 'engram'` marker to Cursor plugin.json so `unlink --global cursor` detects and removes the plugin.
- Fixed `sessionStart`/`SessionStart` case mismatch in hook runtime using `isSessionStart()` helper.
- Fixed Windsurf hook output: `shouldInject` forced `false`, output is always `{ proof }` (no AI context injection).
- Fixed `unlink --global cascade` by normalizing the alias to `windsurf` in `normalizeGlobalTarget`.
- Added 297 new tests covering Cursor/Windsurf workspace link, global link/unlink, hooks, MCP merge, frontmatter (LF/CRLF), plugin.json marker, cascade alias, and proof-only output.
- Updated all documentation (README, AGENT_INTEGRATIONS, SKILLSET_CONTRACT, llm.txt, 8-language translations) for Cursor and Windsurf.

## 0.0.21

- Restructured memory file content for `engram load` and `engram save`.
- Added sticky load/save for human requests so re-routed context stays active.
- Upgraded global link targets to minimal instruction blocks for skillsets.
- Fixed `engram link` with OpenCode and synced agent documentation.
- Enhanced save and save-session flows for Antigravity agents.
- Updated demo image.

## 0.0.20

- Added a remote origin URL input field to the Global Git settings block in the Construct tab.
- Validated remote origin URL input and updated Git config on saving changes.
- Added `--host-only` flag support for `engram entry` command to start the Web UI server without opening a browser tab.
- Added an Escape key event listener to the Memory Graph to exit fullscreen mode.
- Optimized/merged duplicate CSS rules in the Memory Graph Web UI to keep file size within static asset budgets.

## 0.0.19

- Release v0.0.19 covers the 24 commits since v0.0.18.
- Renamed `engram init` to `engram inject` as the primary initialization flow, with connection-tab setup, scope guards, and safer workspace/global linking.
- Hardened `engram entry` config editing with shared schema validation, staged browser edits, review-before-save, risky-change confirmation, and batch API updates.
- Expanded the control panel with a core dashboard tab, duplicate analysis, guarded unlink actions, copy-prefix behavior, folder-browser modal, memory-content modal, and connection sorting.
- Polished the Web UI shell with visible icons, a processor icon for Core, a lightweight SVG favicon, and better clipboard prompt text.
- Fixed Gemini/Antigravity `BeforeAgent` hook installation to include `matcher: "*"`, and blocked workspace unlink commands when the scope is `global`.
- Updated README files, `AGENT_INTEGRATIONS.md`, `SKILLSET_CONTRACT.md`, and localized docs to match the new `inject` and `entry` flows.
- Suppressed `ExperimentalWarning: SQLite` at CLI startup for cleaner command execution.

## 0.0.18

- Merged `engram install-agent-hooks` and `engram install-skillset` into `engram link`. A single `engram link` now installs skillset files, MCP config, slash adapters, and agent hooks together. `engram unlink` removes all of these together. The old command names remain as backward-compatible aliases.
- Updated all documentation (README, AGENT_INTEGRATIONS.md, SKILLSET_CONTRACT.md, llm.txt, engram-blueprint-v8.md, engram.report.md/vi.md) and 8-language translations to reflect the unified `link`/`unlink` surface.
- Removed `install-agent-hooks`/`uninstall-agent-hooks` from help topics, shell completions, and command registry while preserving CLI routing.

## 0.0.17

- Added a zero-dependency responsive Web UI served via `engram entry`.
- Added an in-app workspace initialization button and status banner in the Web UI.
- Enabled configuration editing capability directly in the Web UI.
- Added the `--for-agents` flag to `engram load` to provide slimmed memory output optimized for AI agents.

## 0.0.16

- Added `engram set-proof off|compact|status` so supported agent hooks can append a compact `Engram proof:` line showing whether Engram memory was loaded, reused, or skipped on each eligible turn.
- Kept proof visibility separate from `engram set-read`, so teams can expose proof without changing the existing hook injection rules.
- Improved broad `engram load` routing and upgrade reconciliation, including stronger query term anchoring, better dry-run reporting, and refreshed release-to-release root maintenance coverage.
- Added optional `CONTEXT: ...` support for generated save-session, take-control, and metacognize memory candidates.
- Added `engram llm` and packaged `llm.txt` so AI agents can print a stable local Engram usage guide before workspace initialization.

## 0.0.15

- Added `engram install-agent-hooks`, `engram uninstall-agent-hooks`, and the internal `engram agent-hook` runtime for opt-in Codex, Claude, and Gemini context injection.
- Extended `engram set-read` with `startup`, `auto`, `always`, `manual`, and `off` so automatic memory loading can follow host hook behavior and only reinject when routed context changes.
- Documented the v1 hook capability matrix, including Gemini as the current public Antigravity fallback and deterministic skip reasons for Cursor, Copilot, Cline, and Windsurf or Cascade.

## 0.0.14

- Bumped the package release version to `0.0.14`.

## 0.0.13

- Added `engram route` to classify tasks before the first action and surface the `task_type:*` tag a save will receive.
- Updated save flows to tag memories with `task_type:*` and prompt for an explicit task type when the text is unclear.
- Updated `engram link` to register the known MCP config for a target AI agent by default, including Gemini-compatible and Claude global paths.

## 0.0.12

- Added `engram link` / `engram unlink` as the primary agent integration
  commands for skillsets, MCP config, slash adapters, and global cleanup.
- Added global MCP config generation for supported hosts and regression
  coverage for link/unlink behavior.
- Added `engram set-read` / `engram sr` for always-read session startup,
  including auto-loading rule memories without extra approval.
- Added `engram rehash` / `engram rh` to recompute memory hashes and repair
  tampered or drifted workspace/global memory files.
- Improved broad `engram load` routing with lexical + vector blending,
  refined dry-run candidate counts, and better top-match relevance.
- Added repository metadata to `package.json` for package publishing context.
- Refreshed README and localized README comparison pages for the current Hermes Agent positioning.
- Split CLI tests into scoped files by command/feature area and updated
  `npm run test:cli` to cover `tests/cli/**/*.test.mjs`.
- Fixed MCP `tools/call` argument handling so `engram_load` uses the provided
  query instead of falling back to `current session`.

## 0.0.11

- Added `engram metacognize` / `engram mc` for memory restructuring, so
  save-session, take-control, and clone-memory can reroute related candidates
  through a separate approval pass.
- Renamed the clone-memory restructure flag to `--metacognize` and updated the
  related help, docs, and tests.
- Fixed global Copilot skillset installs to append Engram instructions to
  `~/.copilot/copilot-instructions.md`.

## 0.0.10

- Added `engram set-load-limit` / `engram ll` so normal loads can use a
  configurable compact memory cap while `--all` still loads every routed
  memory.
- Updated load summaries and dry-run output to report selected and total
  related memory counts, making agent-facing replies shorter by default.
- Updated generated agent instructions to answer load requests with a compact
  count line unless the human asks for IDs, rules, or raw memory output.
- Added MCP regression coverage for save proposals that surface related memory
  dependency hints.

## 0.0.9

- Updated `engram init` to create or select the default profile when global
  memory is configured, matching the existing upgrade migration behavior.
- Documented profile isolation as the reason profiles exist: separate company,
  client, and personal memory so context used with external APIs or
  company-provided agents does not leak across projects.
- Added missing documentation coverage for `engram profile`,
  `engram set-save-target`, and `engram clone-memory` across README,
  operations docs, and localized entrypoints.

## 0.0.8

- Added upgrade migration that creates or selects a machine-named default
  profile from an existing global memory path when older installs did not have
  profiles configured.
- Updated explicit `engram upgrade` and quiet startup auto-upgrade to preserve
  global path, save target, and global Git settings for the migrated default
  profile.
- Updated `engram upgrade` to refresh existing generated workspace skillset
  adapters, while preserving human-authored files.
- Added a README link to the GitHub changelog for release history.
- Added CLI regression coverage for legacy workspace/global and global-only
  upgrade paths.

## 0.0.7

- Added publish-only package metadata checks so README packaging regressions are
  caught before npm release.
- Updated release automation to run package checks explicitly before dry-run
  packing and keep `npm run publish` limited to the publish action.
- Enabled Test and Code Coverage workflows on every push to origin.

## 0.0.6

- Pinned optional peer dependencies for Markdown conversion and vector routing
  to the current tested releases.

## 0.0.5

- Added generated runtime version support so `engram --version` follows
  `package.json` during builds.
- Updated global skillset installs to preserve human-authored shared instruction
  files, refresh a single managed Engram block at the end, and write host
  `SKILL.md` files where supported.
- Changed Antigravity handling to keep dedicated targets as hidden
  compatibility aliases while advertising the Gemini-compatible target.
- Added `install skill set` natural parsing plus refreshed CLI help,
  completions, docs, and tests for the updated skillset behavior.

## 0.0.4

- Added configurable default save targets with `engram set-save-target
  workspace|global|both|status`.
- Changed fresh installs to default normal saves to both workspace and global
  when global memory is configured.
- Made `--scope workspace`, `--scope global`, and `--scope both` literal
  per-command save targets instead of treating workspace saves as implicit
  global copies.
- Updated CLI help, completions, MCP save proposals, README, and integration
  docs for the new save-target behavior.

## 0.0.3

- Added `engram update-global-folder` / `engram ugf` to retarget the configured
  global memory folder and optionally move an old root safely.
- Added natural phrase parsing for chat-style global memory path updates, such
  as `engram set global memory path to <path>` and
  `engram move global folder from <old> to <new>`.
- Updated README, agent integration docs, and skillset contract entries for
  global folder setup, aliases, and natural phrase usage.

## 1.0.1

- Added optional sqlite-vec routing sidecars for large workspace and global
  memory scopes while keeping Markdown as the source of truth and lexical/graph
  routing as fallback.
- Improved `engram load` for broad queries with top-8 refinement, dry-run
  candidate counts, suggested narrowing tags, and `--all` for intentional broad
  context loads.
- Added `engram save-session --query-level <n>` and natural
  `engram ss -a last 50 sessions` handling so agents can mine recent accessible
  chat sessions without inventing unavailable history.
- Added the unified `antigravity` skillset target for Antigravity 2.0, CLI, IDE,
  and `.antigravityrules`, while keeping `antigravity-cli` as a compatibility
  alias.
- Clarified `agents-md` as the generic AGENTS.md fallback target for unlisted
  AGENTS.md-compatible agents and updated the skillset list output.
- Refreshed README guidance and localized README entrypoints for recent routing,
  vector sidecar, save-session, and skillset changes.

## 0.0.1

- Added explicit agent skillset adapters for Codex, AGENTS.md-compatible agents,
  Copilot, Claude, Cursor, Gemini CLI, Cline, Windsurf, Antigravity CLI,
  OpenCode, and MCP-capable clients.
- Added agent-assisted `engram save` capture with no inline text. The agent can
  generate a concise rule, workflow/skill, or objective knowledge candidate,
  then the normal A/B/C approval gate runs before writing.
- Added `engram autosave` for long sessions with multiple proposed memory
  candidates behind the same approval gate, including `--file transcript.md`
  input and numbered approval for selected candidates.
- Added role metadata on save/autosave with `--role` and `--roles`.
- Added PowerShell support to `engram completion`, `engram -v`, short command
  aliases, and detailed `engram help <topic>` command examples and use cases.
- Added MCP proposal parity for auto-detected saves, workflow saves, roles, and
  autosave proposals.
- Added Markdown style validation before memory writes.
- Added safety, skillset, MCP, conflict-resolution, coverage, and package
  preview checks for the initial unpublished implementation.
