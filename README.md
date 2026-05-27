# Engram

![Engram cover](media/cover/engram-cover.png)

**Engram grows with you & your teams, across agents, projects, and devices.**

Engram is a portable, file-system-based memory skill set for AI agents. It lets agents detect, generate, and persist structured knowledge - rules, skills, and project context - from real human-agent work without relying on any agent's private memory or proprietary storage.

All memory is plain Markdown. That means humans can read it, teams can review it in Git, and any AI agent can use it as external context, even without installing Engram directly.

## Why It Is Different

- **Agent-agnostic:** any agent can read Markdown memory, even without a plugin.
- **Human-approved:** every write goes through an A/B/C review gate.
- **Workspace-first:** project memory wins; global memory follows you elsewhere.
- **Safe by default:** ignore rules, secret scans, injection checks, and hashes.
- **Git-friendly:** memory is reviewable, portable, auditable, and recoverable.
- **npx-ready:** install nothing globally: `npx @the-long-ride/engram init`.

## Memory Scopes

| Scope | Path | Who it serves |
| --- | --- | --- |
| Workspace | `<project_root>/.engram/` | Everyone sharing the repository |
| Global | `$ENGRAM_GLOBAL_DIR` | You, across agents, projects, and devices |

Resolution is simple: workspace memory is checked first, global memory is the
fallback. If both scopes contain the same topic, the workspace version wins. No
merging, no ambiguity, no hidden platform state.

## Why Files, Not Agent Brain?

| Property | Engram files | Agent memory |
| --- | --- | --- |
| Portability | Any device, any app | Tied to one platform |
| Team sharing | Commit `.engram/` to Git | Not shareable |
| Transparency | Human-readable Markdown | Opaque |
| Cross-agent use | Any agent can read it | Usually locked in |
| Offline use | Just files on disk | Often cloud/session based |
| Version history | Full Git history | No useful history |
| Token efficiency | Route-load only what matters | Often all or nothing |
| Access control | `.engramignore` and `.gitignore` | Coarse controls |
| Privacy | You own every byte | Stored by a vendor |

## Quick Start

```bash
npx @the-long-ride/engram init
npx @the-long-ride/engram save rule "Use pnpm for package management."
npx @the-long-ride/engram load "package setup"
```

## What Is Included

Engram ships a deterministic CLI, MCP wrapper, cached help, memory schema,
indexing, routing, safety guards, import/export, live-sync renderers, conflict
previews, health checks, and prompt templates for agent-assisted workflows.

Core commands include:

```bash
engram init
engram save rule "Never commit secrets."
engram load "deployment workflow"
engram verify
engram health
engram export --format agents-md
engram-mcp
```

Every memory write is reviewed before it touches disk. Sensitive content is
blocked, prompt-injection patterns are skipped, and hashes are checked so changes
outside Engram are visible.

## Author recommendations

- You guys can use [the-long-ride/markdown-explorer | MIT](https://github.com/the-long-ride/markdown-explorer) to reading Markdown files. Available as VSCode extension and desktop app (Windows, Mac, Linux).

## License

[GPL-3.0 License](LICENSE)
