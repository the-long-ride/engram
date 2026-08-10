---
title: Install and configure
sidebar_position: 3
description: Install the Engram CLI, initialize a workspace, configure global memory, and link AI agents.
---

# Install and configure

## Requirements

- Node.js `>=20`
- A supported AI agent (Codex, Claude, Gemini, Cursor, Windsurf, OpenCode, Copilot, Cline, or any AGENTS.md-compatible host)

## Install the CLI

```bash
npm install -g @the-long-ride/engram
```

Verify:

```bash
engram --version
```

Two binaries are installed:

- `engram` — main CLI
- `engram-mcp` — MCP server binary for hosts that register external tool processes

## Initialize a workspace

From the project root:

```bash
engram inject
```

This creates `.agents/.engram/` and installs the compact Codex target by default: `AGENTS.md` plus `.agents/skills/engram/SKILL.md`.

Use `engram inject --no-skillset` to skip agent files, or `engram inject --skillset all` to install every supported adapter during inject. Existing human-authored files are skipped.

## Configure with the Entry Web UI

The friendliest setup path:

```bash
engram entry
```

This launches a local-only control panel. Configure memory roots, link agents, and tune routing without editing JSON by hand. See [Entry Web UI](entry/index.md) for every tab and field.

## Configure global memory

Global memory is optional and lives wherever you configure it. It holds preferences and team context that should follow you across repos.

```bash
engram inject --global-only --global-path ~/Documents/engram
```

Or update the global folder later:

```bash
engram update-global-folder ~/Documents/engram
engram ugf ~/Documents/engram
```

Chat-style forms such as `engram set global memory path to <new-path>` and `engram move global folder from <old-path> to <new-path>` normalize to the same command. Add `--move-from-path <old-path>` when they also want Engram to move the whole old global root into the new location.

## Link AI agents

Install agent hooks and MCP registration for a host:

```bash
engram link codex
engram link claude
engram link gemini
engram link cursor
engram link windsurf
engram link --global opencode
engram set-proof compact
```

`engram link all` installs the public target set and reports deterministic `SKIPPED` reasons for partial hosts across skillset instruction files, MCP config, slash adapters, and agent hooks in one unified install. `engram unlink` removes all of these together.

See [Agent Integrations](integrations/overview.md) for the full target matrix.

## Submodule workflow

If the human wants `.agents/.engram` tracked as a separate repository:

```bash
engram inject --submodule
```

Add `--submodule-remote <git-url>` only after the human provides a URL. Engram validates the URL, initializes the submodule on `main`, and creates the first submodule commit as `Initialize engram`.

## Shared global Git origin

If `engram entry` shows no `global_git_detected.remote_url`, ask the human whether global memory should be shared through Git. When they provide a URL:

```bash
engram inject --global-remote <git-url>
```

## Verify the install

```bash
engram verify
engram load --dry-run "setup"
engram llm
```

`engram llm` prints the packaged AI-agent usage guide and does not require an injected workspace.

## Next steps

- [Daily workflow](daily-workflow.md)
- [Entry Web UI](entry/index.md)
- [Agent Integrations](integrations/overview.md)
