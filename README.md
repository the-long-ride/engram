# Engram

![Engram cover](media/cover/engram-cover.png)

**Engram grows with you & your teams, across agents, projects, and devices.**

Engram is a portable, file-system-based memory management system for AI agents. It lets agents detect, generate, and persist structured knowledge - rules, skills, and project context - from real human-agent work without relying on any agent's private memory or proprietary storage.

All memory is plain Markdown. That means humans can read it, teams can review it in Git, and any AI agent can use it as external context, even without installing Engram directly.

## Why It Is Different

- **Agent-agnostic:** any agent can read Markdown memory, even without a plugin.
- **Human-approved:** every write goes through an A/B/C review gate.
- **Workspace-first:** project memory wins; global memory follows you elsewhere.
- **Adaptive rules:** rule memories can render as light, balanced, or strict.
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

Global memory is also a Git repository. `engram init` creates or reuses the
global folder, runs `git init` there, and defaults to the `main` branch. To share
it with a team or across devices, add an origin during init:

```bash
engram init --global-remote https://github.com/example/team-engram.git
```

If you run `engram init` in an interactive terminal, Engram offers to collect
that origin URL for you. Agents should ask before adding the remote. Engram uses
the currently checked-out global branch when it saves or syncs, so a user can
switch the single supported branch outside Engram and `engram entry` will show
the detected branch.

Workspace memory can also be made into a local `.engram` Git submodule. In an
interactive terminal, `engram init` asks before doing this. Non-interactive
flows can opt in explicitly:

```bash
engram init --submodule --submodule-remote https://github.com/example/project-engram.git
```

Engram initializes `.engram` on `main`, creates the first submodule commit as
`Initialize engram`, validates any provided remote URL, and stages only
`.gitmodules` plus the `.engram` gitlink in the parent repository.

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
npx @the-long-ride/engram save knowledge
npx @the-long-ride/engram load "package setup"
```

`engram save knowledge` can be run without text by an AI agent. Engram asks the
agent to summarize durable knowledge from its current work in objective wording,
then automatically chooses whether to update a matching memory or create a new
one. The normal A/B/C approval preview still appears before anything is written.

Rule output can be tuned per agent/model:

```bash
engram set-rule-variant light
engram set-rule-variant balanced
engram set-rule-variant strict
engram set-rule-variant off
```

When rule variants are off, Engram renders balanced rule wording by default. When
variants are enabled, new or updated rule memories include light, balanced, and
strict versions, and `engram load`, `engram export`, and `engram sync` emit only
the selected variant.

## Shell Completion

Engram can print shell completion scripts for Tab suggestions. Source the script
in a matching shell session:

```bash
source <(engram completion bash)
```

For zsh:

```zsh
source <(engram completion zsh)
```

`engram completion` prints the completion script; it does not install shell
startup files by itself.

## What Is Included

Engram ships a deterministic CLI, MCP-style JSON-lines wrapper, cached help,
memory schema, indexing, routing, safety guards, import/export, live-sync
renderers, conflict previews, and health checks. Prompt templates, pattern
mining, encryption, and PR workflow ideas are design assets until wired into
runtime commands.

Engram can also install itself as an agent skillset:

```bash
engram install-skillset all
```

This creates host-specific instruction files for AGENTS.md-compatible agents,
OpenAI Codex, GitHub Copilot, Claude, Cursor, Gemini CLI, Cline, Windsurf,
Antigravity CLI, OpenCode, and MCP-capable clients without overwriting existing
human-authored files. It also installs `/engram` slash-command adapters for
slash-capable hosts.

For targeted setup:

```bash
engram install-skillset codex
engram install-skillset slash
engram install-skillset antigravity-cli
engram install-skillset opencode
```

After that, a human can ask an agent to run Engram with slash-style requests:

```text
/engram load "deployment workflow"
/engram save knowledge
/engram verify
```

The slash adapter routes to the same CLI or MCP flow. It does not bypass the
normal human approval gate for writes.

Core commands include:

```bash
engram init
engram entry
engram completion bash
engram save rule "Never commit secrets."
engram save knowledge
engram load "deployment workflow"
engram set-rule-variant strict
engram verify
engram health
engram export --format agents-md
engram install-skillset all
engram-mcp
```

Every memory write is reviewed before it touches disk. Sensitive content is
blocked, prompt-injection patterns are skipped, and hashes are checked so changes
outside Engram are visible.

Global saves automatically pull the configured origin, resolve Engram-owned
memory conflicts when deterministic rules apply, commit the approved change, and
push back to the same branch. `engram sync` performs the same global Git sync and
then refreshes live-sync targets.

## Author recommendations

- You guys can use [the-long-ride/markdown-explorer | MIT](https://github.com/the-long-ride/markdown-explorer) to reading Markdown files. Available as VSCode extension and desktop app (Windows, Mac, Linux).

## License

[GPL-3.0 License](LICENSE)
