# Engram Skillset Contract

Engram is a portable memory skillset for AI agents. Hosts can integrate it by
calling the CLI, registering the MCP-style JSON-lines wrapper, or loading generated instruction
files such as Codex-compatible `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, Copilot
instructions, Antigravity `SKILL.md` files, and OpenCode custom instruction
files. Hosts that support custom slash commands can also load generated
`/engram` adapters.

## Required Behaviors

- Treat Engram as the knowledge memory center for project, workspace, team, and
  personal context.
- Load memory with workspace-first, global-fallback resolution.
- Load memory at session start and when the task changes.
- Before planning, researching, or implementing, search or route-load specific
  memory when project knowledge, user preferences, or team rules could matter.
- Never load all memory blindly; route by task intent and summarize relevant
  IDs/rules instead of pasting raw output to reduce token usage.
- Never write memory silently.
- Treat `engram_save` and `engram save` as proposal flows with human approval.
  Engram may automatically choose update-vs-new before presenting the preview.
- Treat `engram save-session` (`engram ss`) as the explicit long-session proposal flow. It may
  propose multiple rule, knowledge, and workflow/skill candidates, but it must
  still require human approval before writing. Numbered approvals such as
  `A 1,3` write only the selected candidates.
- Treat `/engram auto save` and legacy `/engram autosave` as natural wording for `/engram save-session`. In AI
  agent chat, the host should let the LLM define concise candidates from the
  current conversation and pass `TYPE: ... | TEXT: ...` lines to Engram.
- Treat `engram save-session --accept-all` as explicit human approval for every
  agent-recommended save-session candidate. Agents must not add this flag unless the
  human requested it.
- Treat `engram observe` as raw inbox capture, not active memory. It may write a
  sanitized `inbox/` note, but converting that note into memory requires
  `observe --propose` or `save-session --file` and the normal approval flow unless
  the human explicitly passed `--accept-all`.
- Treat `engram graph` and `engram quality-check` contradiction rows as advisory
  wrong-memory signals. Wrong or superseded memory should leave active routing
  only through `engram archive --reason <why> <id-or-file>` after approval.
- Preserve role metadata passed through `--role`, `--roles`, or MCP `role`
  arguments so role-based routing can include or skip memories later.
- Validate memory Markdown before writing: headings need a following blank line,
  required sections stay in Context/Content/Example order, and URLs use
  `[label](url)` syntax.
- Rule memories have a 50 counted-line quality target and a 75 counted-line hard
  limit; empty lines and frontmatter property lines do not count.
- Run sensitive-data and prompt-injection guards before writing or loading.
- Verify hashes before trusting memory files.
- Stage only `.agents/.engram/` files during `engram resolve-conflicts`.
- Ask before adding a global Git `origin`; once configured, global saves and
  syncs may pull, auto-resolve Engram-owned memory conflicts, commit, and push.
- Ask before creating a workspace `.agents/.engram` submodule or adding its origin.
- Save rule memories with light, balanced, and strict variants regardless of the
  active render setting.
- Render rule memories with the configured light, balanced, or strict variant;
  when variant mode is off, use balanced wording. The setting affects
  agent-facing load/export/sync output, not what gets stored in memory files.
- Treat `/engram <args>` as a human-visible router to `engram <args>` or the
  matching MCP read/proposal tool.
- Install Claude slash support in both `.claude/commands/engram.md` and
  `.claude/skills/engram/SKILL.md` so older command menus and newer skills both
  surface `/engram`.
- Treat `engram take-control` and `/engram take-control` as an agent-assisted
  source-discovery flow that converts existing workspace guidance into Engram
  candidates through the same approval gate as save-session.
- Preserve take-control source attribution by writing `source_files` and
  `source_hashes` frontmatter on saved memories. Re-runs should skip unchanged
  imported source hashes unless the human explicitly targets a file.
- Treat `/engram take control accept all` as natural wording for
  `engram take-control --accept-all`. Keep take-control accept-all prompts
  token-light, generate only concise `TYPE: ... | TEXT: ...` candidates, and do
  not paste source excerpts or reasoning into chat.
- Treat `/engram ss -a` as `/engram save-session --accept-all`; `-a` is explicit
  human accept-all approval for this shortcut. Legacy `/engram at -a` remains compatible.
- Describe slash adapters as: "Your knowledge memory manager, synced across
  every device with Git."
- Keep short aliases equivalent to their canonical commands. Aliases are
  convenience only; they must not change safety behavior.
- Generated skillsets must keep agent chatter compact: summarize read commands
  in one line, speak for confirmations/file changes/failures/final results, and
  avoid pasting raw command output unless needed.
- At session end, agents should suggest `engram save` or `engram save-session` when
  durable rules, knowledge, or workflows emerged.

## Tool Contract

| Tool | Purpose | Writes files |
| --- | --- | --- |
| `engram_load` | Route and return relevant memory for a task | No |
| `engram_search` | Search memory by query | No |
| `engram_verify` | Check memory hashes | No |
| `engram_status` | Return health and counts | No |
| `engram_save` | Return a memory proposal for human review | No |
| `engram_autosave` | Return multiple numbered memory proposals for human review | No |

The MCP save/autosave proposal tools intentionally do not write. A host must display the
proposal and collect explicit human approval before invoking a CLI write flow.

## CLI Contract

| Command | Purpose |
| --- | --- |
| `engram init [--global-only] [--no-skillset] [--skillset target] [--submodule] [--no-global] [--global-path path] [--global-remote <git-url>]` | Create or reconcile memory roots, install compact Codex skillset by default, optionally create `.agents/.engram` as a submodule, initialize global memory Git when configured, or create only global memory with `--global-only` |
| `engram --version` / `engram -v` | Print the installed CLI version |
| `engram help [topic]` | Show compact help or detailed command-specific examples and use cases |
| `engram entry` | Print resolved flags, paths, and detected global Git state |
| `engram load [--all] "<task>"` | Load relevant memory; `--all` is the explicit broad-load mode |
| `engram search "<query>"` | Search visible memory by query |
| `engram graph [--rebuild] ["<query>"]` | Inspect the derived layered JSON graph and contradiction candidates |
| `engram save [rule|skill|workflow|knowledge] [--role role] "<text>"` | Propose one memory and write after A/B/C approval |
| `engram save-session [--file transcript.md] [--role role] [--accept-all] [session-summary]` / `engram ss` | Propose multiple memories from a long session and write only after numbered A/B/C approval, or save every candidate when the human passed `--accept-all` |
| `engram observe [--file session.md] [--propose] [note]` | Write sanitized raw notes into inbox; `--propose` mines them through save-session |
| `engram take-control [--plan] [--file path] [--dir path] [--include glob] [--exclude glob] [--max-sources n] [--max-chars n] [--all] [--accept-all]` | Explore existing workspace guidance, notes, and docs with agent help, preview source plans, and consume approved candidates as Engram memory |
| `engram archive [--reason text] <memory-id|file>` | Move wrong or superseded memory out of active routing after approval |
| `engram benchmark <cases.json>` | Run a read-only hit@8 routing benchmark over query/expected-memory cases |
| `engram set-role <role...>` | Configure active developer roles for routing role-scoped memory |
| `engram set-rule-variant light|balanced|strict|off` | Configure compact rule output for agents |
| `engram verify` | Check hash integrity |
| `engram repair [workspace|global]` | Report invalid memory files that index rebuild would skip |
| `engram rebuild-index [workspace|global]` | Explicitly rebuild memory indexes |
| `engram resolve-conflicts` | Resolve and stage only `.agents/.engram/` conflicts |
| `engram stats` | Show visible memory counts |
| `engram install-skillset all` | Install agent-host instruction files |
| `engram install-skillset slash` | Install slash-command adapters, including both Claude command and skill paths |
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
| `/engram save-session ...` / `/engram ss ...` | `engram_autosave` proposal or CLI approval flow; use CLI write flow when `--accept-all` is present |
| `/engram auto save ...` / legacy `/engram autosave ...` | Same as `/engram save-session ...`; LLM defines candidates from current chat when no file or inline candidates are provided |
| `/engram observe ...` | `engram observe ...` CLI flow; `--propose` may mine candidates through save-session |
| `/engram graph ...` | `engram graph ...` CLI flow |
| `/engram archive ...` | `engram archive ...` CLI approval flow |
| `/engram take-control ...` | `engram take-control ...` CLI flow with agent-generated candidates and approval |
| `/engram take control accept all` | `engram take-control --accept-all` CLI write flow with token-light source defaults |
| `/engram ss -a` | `engram save-session --accept-all` CLI write flow |
| `/engram <other command>` | `engram <other command>` CLI flow |

The slash adapter must not write memory by itself. It only asks the agent to run
the same CLI/MCP flow the human could inspect directly. When the human includes
`--accept-all` on save-session, the adapter may generate candidates and invoke the
CLI accept-all path because the flag is the approval. Legacy `autosave`, `as`, and `at` remain aliases.
The same applies to human-requested take-control accept-all, but adapters should
preserve or tighten token limits and keep source excerpts out of chat output.

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
memory. The human should be able to inspect every file in `.agents/.engram/`, every
proposal, and every write.
