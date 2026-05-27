# Changelog

## 0.8.0

- Added explicit agent skillset adapters for Codex, AGENTS.md-compatible agents,
  Copilot, Claude, Cursor, Gemini CLI, Cline, Windsurf, Antigravity CLI,
  OpenCode, and MCP-capable clients.
- Added agent-assisted `engram save knowledge` capture with no inline text. The
  agent can generate a concise knowledge summary from its current work, then the
  normal A/B/C approval gate runs before writing.
- Added safety, skillset, MCP, conflict-resolution, coverage, and package
  preview checks for the v0.8 implementation.
