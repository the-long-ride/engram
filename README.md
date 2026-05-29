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
| Workspace | `<project_root>/.agents/.engram/` | Everyone sharing the repository |
| Global | `$ENGRAM_GLOBAL_DIR` or `engram init --global-path <path>` | You, across agents, projects, and devices |

Resolution is simple: workspace memory is checked first, global memory is the
fallback. If both scopes contain the same topic, the workspace version wins. No
merging, no ambiguity, no hidden platform state.

Global memory is optional. When you set `ENGRAM_GLOBAL_DIR` or pass
`--global-path`, Engram creates or reuses that folder, runs `git init` there,
and defaults to the `main` branch. During interactive init, Engram asks whether
to make `./.agents/.engram` a submodule, whether to use a global memory path,
and whether to add a shared global Git origin. To set the global path
non-interactively:

```bash
engram init --global-path ~/Documents/engram
```

To share global memory with a team or across devices, add an origin during init:

```bash
engram init --global-remote https://github.com/example/team-engram.git
```

If you run `engram init` in an interactive terminal, Engram offers to collect
that origin URL for you. Agents should ask before adding the remote. Engram uses
the currently checked-out global branch when it saves or syncs, so a user can
switch the single supported branch outside Engram and `engram entry` will show
the detected branch.

Workspace memory can also be made into a local `.agents/.engram` Git submodule. In an
interactive terminal, `engram init` asks before doing this. Non-interactive
flows can opt in explicitly:

```bash
engram init --submodule --submodule-remote https://github.com/example/project-engram.git
```

Engram initializes `.agents/.engram` on `main`, creates the first submodule commit as
`Initialize engram`, validates any provided remote URL, and stages only
`.gitmodules` plus the `.agents/.engram` gitlink in the parent repository.

You can rerun `engram init` after upgrades. On existing workspaces it reconciles
Engram-owned output with the current version: missing standard folders/files are
restored, generated help/readme/skillset files are refreshed, config defaults are
merged without dropping user settings, and legacy memory folders such as
`workflows/` are migrated into the current layout when safe. Human-authored
agent files, changelog entries, memory files, and existing hashes are preserved.
The Engram Agent Skill at `.agents/skills/engram/SKILL.md` is refreshed too,
including older Engram-generated skill files.

## Why Files, Not Agent Brain?

| Property | Engram files | Agent memory |
| --- | --- | --- |
| Portability | Any device, any app | Tied to one platform |
| Team sharing | Commit `.agents/.engram/` to Git | Not shareable |
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
npx @the-long-ride/engram save rule --role frontend "Use design tokens for spacing."
npx @the-long-ride/engram save workflow "When releasing, run tests, update the changelog, then tag the version."
npx @the-long-ride/engram save knowledge
npx @the-long-ride/engram autosave
npx @the-long-ride/engram autosave --file transcript.md
npx @the-long-ride/engram autosave --file transcript.md --accept-all
npx @the-long-ride/engram load "package setup"
```

`engram save` can be run without text by an AI agent. Engram asks the agent to
brainstorm one durable candidate, classify it as a rule, workflow/skill, or
knowledge, then chooses whether to update a matching memory or create a new one.
Knowledge should be objective facts and decisions. Rules usually come from human
corrections or preferences. Workflows are saved as skill memories when a longer
interaction reveals a repeatable process. The normal A/B/C approval preview
still appears before anything is written.

For long sessions with several possible memories, use `engram autosave` instead.
It asks the agent to brainstorm multiple `TYPE: ... | TEXT: ...` candidates and
then previews all proposed adds/updates behind the same A/B/C approval gate. If
you stay with normal `engram save`, it captures the best single memory. Autosave
also accepts `--file transcript.md`, and the approval prompt can accept selected
candidate numbers with replies such as `A 1,3`. Use
`engram autosave --accept-all` only when the human explicitly wants every
agent-recommended candidate saved without a second A/B/C reply.

Use `--role` or `--roles` when saving role-specific memory:

```bash
engram save knowledge --role backend "The API validates sessions in middleware."
engram autosave --role frontend --file ui-session.md
```

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

For PowerShell:

```powershell
engram completion powershell | Invoke-Expression
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

`engram init` installs the compact Codex target by default (`AGENTS.md` plus
`.agents/skills/engram/SKILL.md`) so agents load memory and report Engram work
with short confirmations instead of long explanations. Use
`engram init --no-skillset` to skip this, or `engram init --skillset all` to
install every adapter during initialization.

Generated instructions tell agents to treat Engram as the knowledge memory
center for project, workspace, team, and personal context. Agents route-load at
session start, search/load again when the task changes or research depends on
stored knowledge, and summarize only relevant IDs/rules to keep token usage low.

`engram install-skillset all` creates host-specific instruction files for
AGENTS.md-compatible agents, OpenAI Codex, GitHub Copilot, Claude, Cursor,
Gemini CLI, Cline, Windsurf, Antigravity CLI, OpenCode, and MCP-capable clients
without overwriting existing human-authored files. It also installs `/engram`
slash-command adapters for slash-capable hosts.

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
/engram autosave --accept-all
/engram verify
```

The slash adapter routes to the same CLI or MCP flow. It does not bypass the
normal human approval gate for writes, except that
`/engram autosave --accept-all` treats the flag as explicit approval for every
agent-recommended autosave candidate.

Core commands include:

```bash
engram --version
engram -v
engram init
engram init --no-skillset
engram init --skillset all
engram entry
engram completion bash
engram completion powershell
engram save rule "Never commit secrets."
engram save rule --role frontend "Use design tokens."
engram save workflow "When deploying, run tests, build, then verify health."
engram save knowledge
engram autosave
engram autosave --file transcript.md
engram autosave --file transcript.md --accept-all
engram load "deployment workflow"
engram set-rule-variant strict
engram verify
engram health
engram export --format agents-md
engram install-skillset all
engram-mcp
```

Run `engram -h` to see every command and its short alias, such as `engram s`
for `engram save` and `engram vf` for `engram verify`.

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
