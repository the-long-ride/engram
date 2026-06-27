# Engram Skillset Contract

Engram is a portable memory skillset for AI agents. Hosts can integrate it by
calling the CLI, registering the MCP-style JSON-lines wrapper, or loading generated instruction
files such as Codex-compatible `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, Copilot
instructions, Gemini-compatible Antigravity context files, and OpenCode custom
instruction files. For runtime-capable hosts, Engram now installs small
bootstrap instructions instead of the full protocol. Hooks provide routed task
context, MCP tools provide load/search/proposal behavior, and slash adapters or
Agent Skills carry detailed command workflows. Fallback targets without
reliable runtime context injection still receive compact manual instructions.
Hosts that support custom slash commands can also load generated `/engram` adapters.

## Required Behaviors

- Treat Engram as the knowledge memory center for project, workspace, team, and
  personal context.
- Load memory with workspace-first, global-fallback resolution.
- Load memory at session start and when the task changes.
- For hook-capable hosts, honor `engram set-read`:
  `startup` injects only on session start, `auto` injects on session start and
  later only when routed context changes, `always` injects on every eligible
  prompt, `manual` disables automatic hooks while preserving manual
  `engram load`, and `off` keeps automatic read surfaces quiet.
- Honor `engram set-proof` separately from `set-read`: `off` suppresses proof
  lines, and `compact` lets supported hooks append a short `Engram proof:` line
  on each eligible turn so the assistant can show whether Engram loaded,
  reused, or skipped memory without changing full-context injection rules.
- Before planning, researching, or implementing, search or route-load specific
  memory when project knowledge, user preferences, or team rules could matter.
- If `engram set-role ...` or `engram set-rule-variant ...` returns an
  `Agent action:` line, rerun `engram load "<current task/request>"` or
  `engram_load` immediately after the command completes, replace earlier
  Engram-derived context in the current conversation, and keep non-Engram
  host/system instructions unchanged. This is not a mid-response prompt
  mutation.
- Never load all memory blindly; route by task intent and summarize relevant
  IDs/rules instead of pasting raw output to reduce token usage.
- When more memories match a load query than the configured load limit allows,
  first require direct overlap with meaningful query terms, then refine the
  candidate pool with lexical, tag, recency, graph, and vector signals. Normal
  load reports selected and total related counts. Use `load --dry-run` to report
  candidate counts, narrowing tags, and match reasons; use `--all` only when
  broad context is explicitly requested.
- Preserve `depends_on: [...]` memory frontmatter when present. Graph routing
  uses these prerequisite links to keep foundational memories before deeper
  dependent memories inside the compact load pack, reducing duplicated guidance
  across memory files.
- For large memory scopes, maintain an optional per-scope sqlite-vec sidecar
  (`memory.vec.sqlite`) once the visible memory count reaches the configured
  threshold. Vector hits rerank or expand only memories that already overlap a
  meaningful query term; a missing, stale, noisy, or unavailable vector DB cannot
  hide saved memories or load unrelated ones by itself.
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
  Candidates may add optional `CONTEXT: ...` when it helps explain why the
  memory exists, its source situation, intended use, or boundary. They may also
  add `DEPENDS_ON: memory-id`, `LEVEL: advanced`, or `UPDATE: memory-id` fields
  when restructuring related memories.
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
  approval and related-memory restructuring rules. Candidates may include
  optional `CONTEXT: ...` when the source pack explains why the memory exists.
  Natural wording such as
  `/engram restructure workspace memory accept all` maps to
  `engram metacognize --workspace --accept-all`; agents must not add
  `--accept-all` unless the human requested it.
- Treat `engram clone-memory --metacognize` as a proposal-first clone flow. It
  converts verified source memories into save-session candidates for the target
  scope and uses the same approval and accept-all restructuring rules as
  save-session. `--force` is invalid with `--metacognize`, and agents must not
  add `--accept-all` unless the human requested it.
- Treat `engram take-control --metacognize --accept-all` as the take-control
  accept-all flow with related-memory restructuring enabled. If the CLI reports
  related memories before writing, no file was saved yet; rerun with `UPDATE` or
  `DEPENDS_ON` candidates instead of reporting success.
- Treat `engram resolve-conflicts --metacognize` as scoped conflict handling
  followed by a workspace metacognize source pack. Agents should preserve the
  deterministic conflict behavior, then use the appended pack to generate
  concise `TYPE/TEXT` candidates when needed.
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
- Rule memories have a 70 counted-line quality target and a 100 counted-line hard
  limit by default; empty lines and frontmatter property lines do not count. These limits can be configured via `memory.rule_line_target` and `memory.rule_line_hard_limit` (min 50, max 200).
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
- Bundle MCP registration with target-specific `link` installs whenever Engram
  knows a stable MCP config path for that target. Workspace target links write
  `.mcp.json`; global Claude links write `~/.claude/mcp.json`; global Gemini
  and Antigravity-compatible links write the Gemini MCP config file; global
  OpenCode links write the `mcp` field into `~/.config/opencode/opencode.json`.
- Treat AI agent hooks as opt-in and narrower than skillset links. v1 may
  install hooks for `codex`, `claude`, and `gemini` as managed JSON
  command-hook entries because those hosts expose both session-start and later
  prompt-turn context injection. `opencode` uses a managed local JavaScript
  plugin because its hook system is plugin-based. Hook installers must
  preserve human-authored JSON config by merging/removing only
  Engram-managed entries named `engram-auto-load`.
- Treat `antigravity` and `antigravity-cli` hook targets as hidden compatibility
  aliases that normalize to Gemini hook behavior and paths until stable primary
  Antigravity hook/config docs are verified.
- For `cursor`, `copilot`, `cline`, and `windsurf`/`cascade`, hook
  installers must return deterministic `SKIPPED` records with host-specific
  reasons and keep those hosts instruction/skillset/manual-load driven in v1.
  For `opencode`, hooks are supported via a managed local JavaScript plugin
  at `~/.config/opencode/plugins/engram.js` (or the platform/config override
  equivalent); the plugin uses `chat.message` to route the current user prompt
  and `experimental.chat.system.transform` (an OpenCode experimental API) to
  inject routed memory before each LLM request. OpenCode must be restarted or
  reloaded after `link`/`unlink` because local plugin files are loaded at
  startup. The plugin fails open and keeps raw routed memory only in the
  running OpenCode process; Engram's disk hook cache remains hashes, session
  IDs, host, cwd, and routed signatures only. `engram unlink --global opencode`
  removes only the Engram-generated plugin; a human-authored `engram.js` is
  preserved unless `--force` is explicit.
- For runtime-first targets (`codex`, `claude`, `cursor`, `gemini`),
  shared instruction files use the `bootstrap` profile — short instructions
  that rely on MCP tools and hooks. For fallback targets (`agents-md`,
  `copilot`, `cline`, `windsurf`, `opencode`), shared instructions use the
  `compact` profile — the full manual protocol.
- Hook runtimes must fail open. On malformed input, load failure, or unsupported
  host/event, emit an empty JSON object and do not block the agent session.
- Engram's SQLite config DB is an optimization for workspace/profile management.
  If the DB cannot be opened or initialized, normal read/write commands fall back
  to JSON config snapshots. DB-specific commands report SQLite as unavailable
  instead of blocking normal memory use.
- Hook caches must not store raw prompt text. Store only prompt hashes, session
  ids, host, cwd, and routed memory signatures.
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
- Treat `/engram take control accept all metacognize` as
  `engram take-control --accept-all --metacognize`, and treat
  `/engram resolve conflicts and metacognize` as
  `engram resolve-conflicts --metacognize`.
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
| `engram_set_role` | Update active developer roles and return immediate reload guidance | Yes |
| `engram_set_rule_variant` | Update active rule-variant mode and return immediate reload guidance | Yes |

The MCP save/autosave proposal tools intentionally do not write. A host must display the
proposal and collect explicit human approval before invoking a CLI write flow.

## CLI Contract

| Command | Purpose |
| --- | --- |
| `engram inject [--global-only] [--scope workspace|global|both] [--no-skillset] [--skillset target] [--submodule] [--no-global] [--global-path path] [--global-remote <git-url>]` | Create or reconcile memory roots, install compact Codex skillset by default, optionally create `.agents/.engram` as a submodule, initialize global memory Git when configured, choose the default save target, or create only global memory with `--global-only` |
| `engram --version` / `engram -v` | Print the installed CLI version |
| `engram help [topic]` | Show compact help or detailed command-specific examples and use cases |
| `engram llm` | Print the packaged `llm.txt` AI-agent usage guide; read-only and safe before `engram inject` |
| `engram entry` | Print resolved flags, active profile, paths, and detected global Git state |
| `engram profile status|list|create|use|remove|merge` / `engram pf ...` | Manage isolated global memory profiles, including user defaults for uninitialized folders, workspace defaults for initialized repositories, one-off `--profile <name>` command routing, and profile-to-profile merge previews with duplicate reporting |
| `engram set-save-target workspace|global|both|status` | Configure where normal saves write by default; per-command `--scope workspace|global|both` still overrides this setting |
| `engram set-load-limit 1..32|status|reset` / `engram ll ...` | Configure how many related memories normal load returns; default is 8 and `--all` still bypasses the cap |
| `engram set-proof off|compact|status` | Configure whether supported hooks append compact per-response Engram proof lines |
| `engram update-global-folder <new-path> [--move-from-path path]` / `engram ugf <new-path>` / `engram set global memory path to <new-path>` | Update the configured global memory folder; with `--move-from-path` or `move global folder from <old> to <new>`, move the whole old global root first while refusing to overwrite destinations that already contain real memory or user files |
| `engram upgrade [--plan]` | Refresh package guidance, workspace HELP.md, memory indexes, graph files, eligible vector sidecars, existing generated workspace skillset files, global memory scaffolding, and registered global skillsets while preserving human-authored files |
| Startup auto-upgrade | After npm package updates, normal commands quietly reconcile already-initialized roots once per Engram version, including release-to-release memory schema/index refreshes from v0.0.8 onward; skip with `--no-auto-upgrade` or `ENGRAM_NO_AUTO_UPGRADE=1`. The package must not rely on npm `postinstall` for migrations |
| `engram load [--profile name] [--all] [--dry-run] "<task>"` | Load a refined compact context pack from meaningful direct query matches plus explicit prerequisites; `--profile` selects a global profile for one command, `--all` bypasses the load limit for routed matches, and `--dry-run` previews routed files, related counts, narrowing tags, and match reasons without printing contents |
| `engram search "<query>"` | Search visible memory by query |
| `engram graph [--rebuild] ["<query>"]` | Inspect the derived layered JSON graph, dependency layers, and contradiction candidates |
| `engram save [rule|skill|workflow|knowledge] [--profile name] [--scope workspace|global|both] [--role role] "<text>"` | Propose one memory and write after A/B/C approval; `--profile` can save to another profile global root without changing the workspace default |
| `engram save-session [--file transcript.md] [--role role] [--query-level n] [--accept-all] [session-summary]` / `engram ss` | Propose multiple memories from one or more recent sessions and write only after numbered A/B/C approval, or save every candidate when the human passed `--accept-all` |
| `engram observe [--file session.md] [--propose] [note]` | Write sanitized raw notes into inbox; `--propose` mines them through save-session |
| `engram take-control [--plan] [--file path] [--dir path] [--include glob] [--exclude glob] [--max-sources n] [--max-chars n] [--all] [--accept-all] [--metacognize]` | Explore existing workspace guidance, notes, and docs with agent help, preview source plans, and consume approved candidates as Engram memory; `--metacognize` enables related-memory restructuring pauses on accept-all writes |
| `engram metacognize --workspace|--global|--all [--accept-all] [--dry-run]` / `engram mc ...` | Let an agent review an existing memory folder and return restructuring candidates with `UPDATE` or `DEPENDS_ON`; writes use save-session-style approval and accept-all no-write related-memory pauses |
| `engram archive [--reason text] <memory-id|file>` | Move wrong or superseded memory out of active routing after approval |
| `engram benchmark <cases.json>` | Run a read-only hit@<load-limit> routing benchmark over query/expected-memory cases |
| `engram set-role <role...>` | Configure active developer roles for routing role-scoped memory and return an `Agent action:` reload cue for Engram-aware hosts |
| `engram set-rule-variant light|balanced|strict|off` | Configure compact rule output for agents and return an `Agent action:` reload cue for Engram-aware hosts |
| `engram set-read startup|auto|always|manual|off|status` | Configure hook and manual read behavior |
| `engram verify` | Check hash integrity |
| `engram repair [workspace|global]` | Report invalid memory files that index rebuild would skip |
| `engram rebuild-index [workspace|global]` | Explicitly rebuild memory indexes, graph files, and eligible vector sidecars |
| `engram resolve-conflicts [--dry-run] [--metacognize] [--accept-all]` | Resolve and stage only `.agents/.engram/` conflicts, optionally appending a workspace metacognize source pack |
| `engram stats` | Show visible memory counts, scope mix, and author ownership |
| `engram link [all|list|target] [--global] [--force] [--all-supported]` | Link skillset, MCP, slash adapters, and agent hooks to an AI agent; reports skipped reasons for partial hosts |
| `engram unlink [all|target] [--global] [--force]` | Remove skillset, MCP, managed blocks, and agent hooks |
| `engram agent-hook --host codex|claude|gemini|opencode` | Internal hook runtime; reads hook payload from stdin and emits host-compatible JSON to stdout; the OpenCode host emits retain/replace/clear directives |
| `engram clone-memory workspace global [--force] [--dry-run] [--metacognize] [--accept-all]` / `engram clone-memory global workspace [--force] [--dry-run] [--metacognize] [--accept-all]` | Clone active `rules/`, `skills/`, and `knowledge/` Markdown memories between workspace and global scopes while rewriting destination scope frontmatter and hashes; `--metacognize` routes verified source memories through save-session-style approval and cannot be combined with `--force` |
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
| `/engram clone-memory ... --metacognize` | `engram clone-memory ... --metacognize` CLI flow with save-session-style candidate approval |
| `/engram take control accept all` | `engram take-control --accept-all` CLI write flow with token-light source defaults |
| `/engram take control accept all metacognize` | `engram take-control --accept-all --metacognize` CLI flow with related-memory restructuring pauses |
| `/engram resolve conflicts and metacognize` | `engram resolve-conflicts --metacognize` CLI flow, preserving scoped conflict handling and appending the workspace metacognize pack |
| `/engram ss -a` | `engram save-session --accept-all` CLI write flow |
| `/engram ss -a last 50 sessions` | `engram save-session --query-level 50 --accept-all` CLI write flow |
| `/engram <other command>` | `engram <other command>` CLI flow |

The slash adapter must not write memory by itself. It only asks the agent to run
the same CLI/MCP flow the human could inspect directly. When the human includes
`--accept-all` on save-session, the adapter may generate candidates and invoke the
CLI accept-all path because the flag is the approval. Legacy `autosave`, `as`, and `at` remain aliases.
The same applies to human-requested take-control, take-control metacognize, and
metacognize accept-all. Adapters should preserve or tighten token limits, keep
source excerpts out of chat output, and rerun metacognize-style flows with
`UPDATE` or `DEPENDS_ON` when related memories pause the write.

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
