# Changelog

## Unreleased

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
