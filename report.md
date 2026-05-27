# Engram v0.8 Implementation Report

## What Was Done

- Built `@the-long-ride/engram` as a Node 20+ TypeScript package with npm `bin`
  entries for `engram` and `engram-mcp`.
- Added deterministic core modules for config, workspace/global scope resolution,
  schema validation, ignore matching, index rebuilds, SHA-256 hashes, routing,
  quality scoring, search, export, encryption helpers, conflict previews, Git
  integration, and human approval.
- Implemented CLI command coverage from the plan: `init`, `help`, `update-help`,
  `save`, `load`, `dry-run`, `verify`, `audit`, `health`, `quality-check`,
  `deduplicate`, `export`, `import`, `search`, `stats`, `ignore`, `set-role`,
  `resolve-conflicts`, `install-hooks`, `sync`, `propose`, and
  `team-dashboard`.
- Implemented an MCP stdio wrapper with `engram_load`, `engram_save`,
  `engram_search`, `engram_verify`, and `engram_status`. `engram_save` returns a
  proposal only and never writes silently.
- Added prompt assets and starter templates from the blueprint direction.
- Added agent skillset adapters for OpenAI Codex, AGENTS.md-compatible agents,
  GitHub Copilot, Claude, Cursor, Gemini CLI, Cline, Windsurf, Antigravity CLI,
  OpenCode, and MCP-capable clients.
- Added agent-assisted `engram save knowledge` with no inline text. It collects
  generated knowledge first and still requires A/B/C approval before writing.
- Added `README.md`, `GUIDELINE.md`, `LICENSE`, tests, line-count checks, and npm
  publish guidance.

## Out Of Spec Or Reduced Scope

- Export bundles are deterministic JSON files instead of ZIP archives. This keeps
  runtime dependencies at zero; ZIP support can be added later if needed.
- Semantic features use lexical heuristics plus shipped prompts instead of
  embeddings or LLM calls, matching the agent-native deterministic decision.
- PR workflow produces a proposal body instead of opening GitHub/GitLab PRs.
- Conflict resolution is deterministic and scoped to `.engram/**/*.md`. It can
  auto-write and stage Engram-owned files after an explicit
  `engram resolve-conflicts` command.
- AES-256-GCM helpers are present, but OS keychain integration is documented as a
  future adapter rather than implemented in v0.8.
- `LICENSE` is a concise GPL-3.0-only notice with an FSF URL rather than the full
  GPL text.

## Tradeoffs And Concerns

- I chose zero runtime dependencies so `npx @the-long-ride/engram` stays small,
  inspectable, and fast. The tradeoff is that globbing, bundles, and semantic
  behavior are intentionally modest.
- TypeScript is the only dev dependency. A tiny local Node shim file avoids
  pulling `@types/node`, which keeps the package lean but gives less rich Node
  type coverage.
- The default save scope follows the blueprint config (`both`), so global writes
  can initialize and commit `$ENGRAM_GLOBAL_DIR`. Tests override that env var to
  avoid touching a real user folder.
- Human approval is enforced for memory import/save writes. Explicit operational
  commands like `init`, `ignore add`, `set-role`, `install-hooks`, and
  `resolve-conflicts` write their own scoped files because they are direct user
  commands, not memory capture.

## Final Decisions

- TypeScript ESM package, Node 20+ target, package name
  `@the-long-ride/engram`, binary names `engram` and `engram-mcp`.
- Deterministic local behavior first; prompts are shipped for AI-agent judgment
  where the blueprint expects semantic reasoning.
- Small modules, every code file under 200 lines, with command handlers kept thin
  and core behavior shared between CLI, tests, and MCP.
- Workspace source code is never staged by Engram. Conflict resolution may stage
  only `.engram` files after an explicit human command. Global memory commits are
  attempted after approved global writes, using the human's existing Git config.

## Verification

- `npm run typecheck` passed.
- `npm run build` passed.
- `npm run lint:lines` passed, confirming all code files are <= 200 lines.
- `npm test` passed: 21 tests across core helpers, CLI workflows, MCP behavior,
  safety guards, tamper detection, skillset adapters, and scoped conflict
  resolution.
- `npm run coverage` passed with 88.18% line coverage.
- `npm pack --dry-run` passed and produced a publishable package preview with 114
  files and both binaries included.
