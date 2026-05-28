# Engram Skillset Contract

Engram is a portable memory skillset for AI agents. Hosts can integrate it by
calling the CLI, registering the MCP-style JSON-lines wrapper, or loading generated instruction
files such as Codex-compatible `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, Copilot
instructions, Antigravity `SKILL.md` files, and OpenCode custom instruction
files. Hosts that support custom slash commands can also load generated
`/engram` adapters.

## Required Behaviors

- Load memory with workspace-first, global-fallback resolution.
- Never load all memory blindly; route by task intent.
- Never write memory silently.
- Treat `engram_save` and `engram save` as proposal flows with human approval.
  Engram may automatically choose update-vs-new before presenting the preview.
- Treat `engram autosave` as the explicit long-session proposal flow. It may
  propose multiple rule, knowledge, and workflow/skill candidates, but it must
  still require human approval before writing. Numbered approvals such as
  `A 1,3` write only the selected candidates.
- Treat `engram autosave --accept-all` as explicit human approval for every
  agent-recommended autosave candidate. Agents must not add this flag unless the
  human requested it.
- Preserve role metadata passed through `--role`, `--roles`, or MCP `role`
  arguments so role-based routing can include or skip memories later.
- Validate memory Markdown before writing: headings need a following blank line,
  required sections stay in Context/Content/Example order, and URLs use
  `[label](url)` syntax.
- Rule memories have a 50 counted-line quality target and a 75 counted-line hard
  limit; empty lines and frontmatter property lines do not count.
- Run sensitive-data and prompt-injection guards before writing or loading.
- Verify hashes before trusting memory files.
- Stage only `.engram/` files during `engram resolve-conflicts`.
- Ask before adding a global Git `origin`; once configured, global saves and
  syncs may pull, auto-resolve Engram-owned memory conflicts, commit, and push.
- Ask before creating a workspace `.engram` submodule or adding its origin.
- Render rule memories with the configured light, balanced, or strict variant;
  when variant mode is off, use balanced wording.
- Treat `/engram <args>` as a human-visible router to `engram <args>` or the
  matching MCP read/proposal tool.
- Keep short aliases equivalent to their canonical commands. Aliases are
  convenience only; they must not change safety behavior.
- Generated skillsets must keep agent chatter compact: summarize read commands
  in one line, speak for confirmations/file changes/failures/final results, and
  avoid pasting raw command output unless needed.

## Tool Contract

| Tool | Purpose | Writes files |
| --- | --- | --- |
| `engram_load` | Route and return relevant memory for a task | No |
| `engram_search` | Search memory by query | No |
| `engram_verify` | Check memory hashes | No |
| `engram_status` | Return health and counts | No |
| `engram_save` | Return a memory proposal for human review | No |
| `engram_autosave` | Return multiple numbered memory proposals for human review | No |

The MCP save/autosave tools intentionally do not write. A host must display the
proposal and collect explicit human approval before invoking a CLI write flow.

## CLI Contract

| Command | Purpose |
| --- | --- |
| `engram init [--no-skillset] [--skillset target] [--submodule] [--global-path path] [--global-remote <git-url>]` | Create or reconcile memory roots, install compact Codex skillset by default, optionally create `.engram` as a submodule, and initialize global memory Git |
| `engram --version` / `engram -v` | Print the installed CLI version |
| `engram help [topic]` | Show compact help or detailed command-specific examples and use cases |
| `engram entry` | Print resolved flags, paths, and detected global Git state |
| `engram load [--all] "<task>"` | Load relevant memory; `--all` is the explicit broad-load mode |
| `engram search "<query>"` | Search visible memory by query |
| `engram save [rule|skill|workflow|knowledge] [--role role] "<text>"` | Propose one memory and write after A/B/C approval |
| `engram autosave [--file transcript.md] [--role role] [--accept-all] [session-summary]` | Propose multiple memories from a long session and write only after numbered A/B/C approval, or save every candidate when the human passed `--accept-all` |
| `engram set-role <role...>` | Configure active developer roles for routing role-scoped memory |
| `engram set-rule-variant light|balanced|strict|off` | Configure compact rule output for agents |
| `engram verify` | Check hash integrity |
| `engram rebuild-index [workspace|global]` | Explicitly rebuild memory indexes |
| `engram resolve-conflicts` | Resolve and stage only `.engram/` conflicts |
| `engram stats` | Show visible memory counts |
| `engram install-skillset all` | Install agent-host instruction files |
| `engram install-skillset slash` | Install slash-command adapters |
| `engram sync` | Sync global memory Git and refresh live-sync targets |

## Slash Contract

`/engram` adapters must expose the whole Engram command surface by passing the
arguments after `/engram` to the Engram CLI. For read and proposal commands,
hosts may prefer MCP-style tools:

| Slash request | Preferred route |
| --- | --- |
| `/engram load <query>` | `engram_load` or `engram load <query>` |
| `/engram search <query>` | `engram_search` or `engram search <query>` |
| `/engram verify [scope]` | `engram_verify` or `engram verify [scope]` |
| `/engram health` | `engram_status` or `engram health` |
| `/engram save ...` | `engram_save` proposal or CLI approval flow |
| `/engram autosave ...` | `engram_autosave` proposal or CLI approval flow; use CLI write flow when `--accept-all` is present |
| `/engram <other command>` | `engram <other command>` CLI flow |

The slash adapter must not write memory by itself. It only asks the agent to run
the same CLI/MCP flow the human could inspect directly. When the human includes
`--accept-all` on autosave, the adapter may generate candidates and invoke the
CLI accept-all path because the flag is the approval.

## Approval States

| State | Meaning |
| --- | --- |
| `proposed` | Candidate memory exists only in output |
| `accepted` | Human approved as-is |
| `edited` | Human approved with correction |
| `rejected` | Candidate discarded |
| `blocked` | Sensitive or injection content was detected |

## Integration Rule

Agent hosts should integrate Engram as a capability provider, not as hidden
memory. The human should be able to inspect every file in `.engram/`, every
proposal, and every write.
