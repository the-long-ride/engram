# Changelog

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
