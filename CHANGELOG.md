# Changelog

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
