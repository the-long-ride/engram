# Engram Skillset Contract

Engram is a portable memory skillset for AI agents. Hosts can integrate it by
calling the CLI, registering the MCP-style JSON-lines wrapper, or loading generated instruction
files such as Codex-compatible `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, Copilot
instructions, Gemini-compatible Antigravity context files, and OpenCode custom
instruction files. Hosts that support custom slash commands can also load
generated `/engram` adapters.

## Required Behaviors

- Treat Engram as the knowledge memory center for project, workspace, team, and
  personal context.
- Load memory with workspace-first, global-fallback resolution.
- Load memory at session start and when the task changes.
- Before planning, researching, or implementing, search or route-load specific
  memory when project knowledge, user preferences, or team rules could matter.
- Never load all memory blindly; route by task intent and summarize relevant
  IDs/rules instead of pasting raw output to reduce token usage.
- When more memories match a load query than the configured load limit allows,
  refine the candidate pool with lexical, tag, type, recency, graph, and vector
  signals, then load the compact pack. Normal load reports selected and total
  related counts. Use `load --dry-run` to report candidate counts and narrowing
  tags; use `--all` only when broad context is explicitly requested.
- Preserve `depends_on: [...]` memory frontmatter when present. Graph routing
  uses these prerequisite links to keep foundational memories before deeper
  dependent memories inside the compact load pack, reducing duplicated guidance
  across memory files.
- For large memory scopes, maintain an optional per-scope sqlite-vec sidecar
  (`memory.vec.sqlite`) once the visible memory count reaches the configured
  threshold. Vector hits are candidate expansion only: lexical and graph routing
  remain active so a missing, stale, or unavailable vector DB cannot hide saved
  memories.
- Never write memory silently.
- Treat `engram_save` and `engram save` as proposal flows with human approval.
  Engram may automatically choose update-vs-new before presenting the preview.
- When save previews report related existing memories, treat those rows as
  advisory restructure hints. They may suggest `depends_on` or duplicate cleanup,
  but agents must not auto-archive or silently rewrite memory to apply them.
  `save-session --accept-all` is the exception for agent restructuring: if the
  CLI reports related memories before writing, no file was saved yet, and the
  agent should brainstorm a better candidate set and rerun with `DEPENDS_ON:
  memory-id` for dependencies or `UPDATE: memory-id` for duplicates.
- Treat `engram save-session` (`engram ss`) as the explicit long-session proposal flow. It may
  propose multiple rule, knowledge, and workflow/skill candidates, but it must
  still require human approval before writing. Numbered approvals such as
  `A 1,3` write only the selected candidates.
- Treat `engram save-session --query-level <n>` as a positive-integer request
  for agents to mine up to n recent accessible human-agent chat sessions,
  including the current one. The CLI rejects non-integers, zero, and negative
  values. Natural save-session count wording such as `last 50 sessions`
  normalizes to `--query-level 50`. Agents must not invent inaccessible history.
- Treat `/engram auto save` and legacy `/engram autosave` as natural wording for `/engram save-session`. In AI
  agent chat, the host should let the LLM define concise candidates from the
  current conversation and pass `TYPE: ... | TEXT: ...` lines to Engram.
  Candidates may add `DEPENDS_ON: memory-id`, `LEVEL: advanced`, or `UPDATE:
  memory-id` fields when restructuring related memories.
- Treat `engram save-session --accept-all` as explicit human approval for every
  agent-recommended save-session candidate. Agents must not add this flag unless the
  human requested it. When the CLI returns the related-memory no-write response,
  the agent should use that response as routing context, generate a restructured
  candidate set, and rerun the same accept-all command instead of reporting a
  saved result.
- Treat `engram metacognize --workspace|--global|--all` as an agent-assisted
  memory-folder restructuring flow. The CLI verifies active memories in the
  selected scope, gives the agent a compact source pack, and writes only
  generated `TYPE: ... | TEXT: ...` candidates through the same save-session
  approval and related-memory restructuring rules. Natural wording such as
  `/engram restructure workspace memory accept all` maps to
  `engram metacognize --workspace --accept-all`; agents must not add
  `--accept-all` unless the human requested it.
- Treat `engram clone-memory --restructure` as a proposal-first clone flow. It
  converts verified source memories into save-session candidates for the target
  scope and uses the same approval and accept-all restructuring rules as
  save-session. `--force` is invalid with `--restructure`, and agents must not
  add `--accept-all` unless the human requested it.
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
- For global skillset installs, append exactly one Engram managed block at the
  end of each host's shared instruction file. Preserve human-authored content;
  when an older Engram block exists, refresh it and move it to the end instead
  of replacing the whole file.
- Write generated `SKILL.md` files to each host's skill directory. For Claude
  Code global installs, use `~/.claude/skills/engram/SKILL.md` alongside the
  appended `~/.claude/CLAUDE.md` instruction block.
- Install Claude slash support in both `.claude/commands/engram.md` and
  `.claude/skills/engram/SKILL.md` so older command menus and newer skills both
  surface `/engram`.
- Do not advertise a public Antigravity target while Google's paths are in
  flux. Hide `antigravity` and `antigravity-cli` from target lists, help,
  completion, and `all`; keep them as explicit compatibility aliases only.
  Advertise `gemini` as the current Gemini-compatible target for Antigravity
  2.0, Antigravity CLI, and Antigravity IDE, and print a short note after
  `gemini` installs so humans understand that coverage.
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
  human accept-all approval for this shortcut. Treat `/engram ss -a last 50
  sessions` as `engram save-session --query-level 50 --accept-all`. Legacy
  `/engram at -a` remains compatible.
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
| `engram init [--global-only] [--scope workspace|global|both] [--no-skillset] [--skillset target] [--submodule] [--no-global] [--global-path path] [--global-remote <git-url>]` | Create or reconcile memory roots, install compact Codex skillset by default, optionally create `.agents/.engram` as a submodule, initialize global memory Git when configured, choose the default save target, or create only global memory with `--global-only` |
| `engram --version` / `engram -v` | Print the installed CLI version |
| `engram help [topic]` | Show compact help or detailed command-specific examples and use cases |
| `engram entry` | Print resolved flags, active profile, paths, and detected global Git state |
| `engram profile status|list|create|use|remove|merge` / `engram pf ...` | Manage isolated global memory profiles, including user defaults for uninitialized folders, workspace defaults for initialized repositories, one-off `--profile <name>` command routing, and profile-to-profile merge previews with duplicate reporting |
| `engram set-save-target workspace|global|both|status` | Configure where normal saves write by default; per-command `--scope workspace|global|both` still overrides this setting |
| `engram set-load-limit 1..32|status|reset` / `engram ll ...` | Configure how many related memories normal load returns; default is 8 and `--all` still bypasses the cap |
| `engram update-global-folder <new-path> [--move-from-path path]` / `engram ugf <new-path>` / `engram set global memory path to <new-path>` | Update the configured global memory folder; with `--move-from-path` or `move global folder from <old> to <new>`, move the whole old global root first while refusing to overwrite destinations that already contain real memory or user files |
| `engram upgrade [--plan]` | Refresh package guidance, workspace HELP.md, existing generated workspace skillset files, global memory scaffolding, and registered global skillsets while preserving human-authored files |
| Startup auto-upgrade | After npm package updates, normal commands quietly reconcile already-initialized roots once per Engram version; skip with `--no-auto-upgrade` or `ENGRAM_NO_AUTO_UPGRADE=1`. The package must not rely on npm `postinstall` for migrations |
| `engram load [--profile name] [--all] [--dry-run] "<task>"` | Load a refined compact context pack; `--profile` selects a global profile for one command, `--all` is the explicit broad-load mode, and `--dry-run` previews routed files, related counts, and narrowing tags without printing contents |
| `engram search "<query>"` | Search visible memory by query |
| `engram graph [--rebuild] ["<query>"]` | Inspect the derived layered JSON graph, dependency layers, and contradiction candidates |
| `engram save [rule|skill|workflow|knowledge] [--profile name] [--scope workspace|global|both] [--role role] "<text>"` | Propose one memory and write after A/B/C approval; `--profile` can save to another profile global root without changing the workspace default |
| `engram save-session [--file transcript.md] [--role role] [--query-level n] [--accept-all] [session-summary]` / `engram ss` | Propose multiple memories from one or more recent sessions and write only after numbered A/B/C approval, or save every candidate when the human passed `--accept-all` |
| `engram observe [--file session.md] [--propose] [note]` | Write sanitized raw notes into inbox; `--propose` mines them through save-session |
| `engram take-control [--plan] [--file path] [--dir path] [--include glob] [--exclude glob] [--max-sources n] [--max-chars n] [--all] [--accept-all]` | Explore existing workspace guidance, notes, and docs with agent help, preview source plans, and consume approved candidates as Engram memory |
| `engram metacognize --workspace|--global|--all [--accept-all] [--dry-run]` / `engram mc ...` | Let an agent review an existing memory folder and return restructuring candidates with `UPDATE` or `DEPENDS_ON`; writes use save-session-style approval and accept-all no-write related-memory pauses |
| `engram archive [--reason text] <memory-id|file>` | Move wrong or superseded memory out of active routing after approval |
| `engram benchmark <cases.json>` | Run a read-only hit@<load-limit> routing benchmark over query/expected-memory cases |
| `engram set-role <role...>` | Configure active developer roles for routing role-scoped memory |
| `engram set-rule-variant light|balanced|strict|off` | Configure compact rule output for agents |
| `engram verify` | Check hash integrity |
| `engram repair [workspace|global]` | Report invalid memory files that index rebuild would skip |
| `engram rebuild-index [workspace|global]` | Explicitly rebuild memory indexes, graph files, and eligible vector sidecars |
| `engram resolve-conflicts` | Resolve and stage only `.agents/.engram/` conflicts |
| `engram stats` | Show visible memory counts, scope mix, and author ownership |
| `engram install-skillset all` | Install agent-host instruction files |
| `engram install-skillset slash` | Install slash-command adapters, including both Claude command and skill paths |
| `engram clone-memory workspace global [--force] [--dry-run] [--restructure] [--accept-all]` / `engram clone-memory global workspace [--force] [--dry-run] [--restructure] [--accept-all]` | Clone active `rules/`, `skills/`, and `knowledge/` Markdown memories between workspace and global scopes while rewriting destination scope frontmatter and hashes; `--restructure` routes verified source memories through save-session-style approval and cannot be combined with `--force` |
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
| `/engram save-session ...` / `/engram ss ...` | `engram_autosave` proposal or CLI approval flow; use `--query-level <n>` only as a human-requested recent-session mining scope, and use CLI write flow when `--accept-all` is present |
| `/engram auto save ...` / legacy `/engram autosave ...` | Same as `/engram save-session ...`; LLM defines candidates from current chat when no file or inline candidates are provided |
| `/engram observe ...` | `engram observe ...` CLI flow; `--propose` may mine candidates through save-session |
| `/engram graph ...` | `engram graph ...` CLI flow |
| `/engram archive ...` | `engram archive ...` CLI approval flow |
| `/engram take-control ...` | `engram take-control ...` CLI flow with agent-generated candidates and approval |
| `/engram metacognize --workspace|--global|--all ...` / `/engram restructure workspace memory ...` | `engram metacognize ...` CLI flow; when no inline candidates are present, the adapter uses the source pack to generate concise `TYPE/TEXT` candidates and reruns the same scope |
| `/engram clone-memory ... --restructure` | `engram clone-memory ... --restructure` CLI flow with save-session-style candidate approval |
| `/engram take control accept all` | `engram take-control --accept-all` CLI write flow with token-light source defaults |
| `/engram ss -a` | `engram save-session --accept-all` CLI write flow |
| `/engram ss -a last 50 sessions` | `engram save-session --query-level 50 --accept-all` CLI write flow |
| `/engram <other command>` | `engram <other command>` CLI flow |

The slash adapter must not write memory by itself. It only asks the agent to run
the same CLI/MCP flow the human could inspect directly. When the human includes
`--accept-all` on save-session, the adapter may generate candidates and invoke the
CLI accept-all path because the flag is the approval. Legacy `autosave`, `as`, and `at` remain aliases.
The same applies to human-requested take-control and metacognize accept-all.
Adapters should preserve or tighten token limits, keep source excerpts out of
chat output, and rerun metacognize with `UPDATE` or `DEPENDS_ON` when related
memories pause the write.

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
