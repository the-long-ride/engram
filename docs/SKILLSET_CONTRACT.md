# Engram Skillset Contract

Engram is a portable memory skillset for AI agents. Hosts can integrate it by
calling the CLI, registering the MCP-style JSON-lines wrapper, or loading generated instruction
files such as Codex-compatible `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, Copilot
instructions, Gemini-compatible Antigravity context files, and OpenCode custom
instruction files. For runtime-capable hosts, Engram now installs small
bootstrap instructions instead of the full protocol. Hooks provide routed task
context and MCP tools provide load/search/proposal behavior. Each install has
one canonical guide (`.agents/engram.md` or the host's guide file, such as
`.claude/engram.md`) that states the protocol, including the approval flow,
exactly once. Generated `SKILL.md` files and slash adapters are thin pointers of
at most 40 lines: a command map plus `Full protocol: <guide path>`. When Engram
hooks are installed for the host, the guide says context is auto-injected and
does not ask the agent to run `engram load` at session start; without hooks it
still does. Natural-language aliases (`take control`, `force`, `last 50
sessions`, `restructure workspace memory`) are normalized by the CLI, so adapters
pass wording through instead of teaching each alias.
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
- When `vector.enabled: true` (experimental, off by default), maintain an
  optional per-scope sqlite-vec sidecar (`memory.vec.sqlite`) once the visible
  memory count reaches the configured threshold. Vector hits rerank or expand only memories that already overlap a
  meaningful query term; a missing, stale, noisy, or unavailable vector DB cannot
  hide saved memories or load unrelated ones by itself.
- Never write durable memory silently; working-tier notes are gitignored, expire, and are redacted.
- Direct terminal CLI approval uses A/B/C unless the human invoked a force flow.
- AI-agent chat approval uses exact-candidate review: the agent refines and displays `TYPE: ... | TEXT: ...` candidates (rules: Balanced text; Light/Strict only when custom), then waits for `yes`, `audit`, or `cancel`.
- `yes`, `approve`, `confirm`, or `save` after exact candidate display authorizes the agent to run `engram save-session --force` with those exact candidates.
- `audit`, `revise`, `correct`, or edited wording means the agent must revise candidates and ask again before writing.
- `cancel`, `stop`, or rejection means no memory write.
- Agents may propose memories at the end of a response only when the candidate passes the memory value gate: durable, reusable, objective, triggerable, and not duplicative.
- Treat `engram_save` and `engram save` as proposal flows with human approval.
  Engram may automatically choose update-vs-new before presenting the preview.
- When save previews report related existing memories, treat those rows as
  advisory restructure hints. They may suggest `depends_on` or duplicate cleanup,
  but agents must not auto-archive or silently rewrite memory to apply them.
  `save-session --force` writes candidates without unresolved related-memory
  hints and defers only conflicted candidates. Deferred output is ID-only: load
  the listed refs with `engram load --id ...`, then rerun only deferred
  candidates with `DEPENDS_ON: memory-id` for dependencies or `UPDATE:
  memory-id` for duplicates.
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
- Treat `engram save-session --force` as explicit human approval for every
  agent-recommended save-session candidate. Agents must not add this flag unless the
  human requested it. When the CLI reports deferred candidates, some unrelated
  candidates may already be saved. The listed IDs are inspection references, not
  proof that deferred candidates were written; load them, choose `DEPENDS_ON` or
  `UPDATE`, and rerun only those deferred candidates instead of reporting them as
  saved.
- Treat `engram metacognize --workspace|--global|--all` as an agent-assisted
  memory-folder restructuring flow. The CLI verifies active memories in the
  selected scope, gives the agent a compact source pack, and writes only
  generated `TYPE: ... | TEXT: ...` candidates through the same save-session
  approval and related-memory restructuring rules. Candidates may include
  optional `CONTEXT: ...` when the source pack explains why the memory exists.
  Natural wording such as
  `/engram restructure workspace memory force` maps to
  `engram metacognize --workspace --force`; agents must not add
  `--force` unless the human requested it.
- Treat `engram clone-memory --metacognize` as a proposal-first clone flow. It
  converts verified source memories into save-session candidates for the target
  scope and uses the same approval and force restructuring rules as
  save-session. `--force` is invalid with `--metacognize`, and agents must not
  add `--force` unless the human requested it.
- Treat `engram take-control --metacognize --force` as the take-control
  force flow with related-memory restructuring enabled. If the CLI reports
  related memories before writing, no file was saved yet; rerun with `UPDATE` or
  `DEPENDS_ON` candidates instead of reporting success.
- Treat `engram resolve-conflicts --metacognize` as scoped conflict handling
  followed by a workspace metacognize source pack. Agents should preserve the
  deterministic conflict behavior, then use the appended pack to generate
  concise `TYPE/TEXT` candidates when needed.
- Treat `engram observe` as raw inbox capture, not active memory. It may write a
  sanitized `inbox/` note, but converting that note into memory requires
  `observe --propose` or `save-session --file` and the normal approval flow unless
  the human explicitly passed `--force`.
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
- Run sensitive-data and prompt-injection guards before writing or loading. The same
  redaction and injection scan covers host-memory import, MCP resource reads, and
  elicitation payloads.
- Keep personal data out of committed memory files. New and updated memories write
  `author_name` only; `author_email` is written only when
  `memory.include_author_email` is `true` (default `false`), and legacy `author:` and
  `author_email` fields keep loading. `engram author migrate-memories --strip-email`
  removes existing emails (plan-first, `--confirm` to write).
- Write migration backups (`*.pre-v3.bak`, `*.pre-author-v3.bak`,
  `*.engram-upgrade-<version>.bak`) to the gitignored `backups/<kind>-<label>/` folder
  of the scope, never beside the memory. `engram doctor` warns about stray `*.bak`
  files in memory folders (`memory.stray_backups`) and `engram repair --move-backups`
  moves them (plan-first, `--confirm` to move).
- Verify hashes before trusting memory files.
- Stage only `.agents/.engram/` files during `engram resolve-conflicts`.
- Ask before adding a global Git `origin`; once configured, global saves and
  syncs may pull, auto-resolve Engram-owned memory conflicts, commit, and push.
- Ask before creating a workspace `.agents/.engram` submodule or adding its origin.
- Derive light, balanced, and strict rule wording at render time from the rule's
  `## Content` (balanced is the Content verbatim). New and rewritten rule files
  store a `## Rule Variants` section only when a candidate supplies custom
  `LIGHT:`/`BALANCED:`/`STRICT:` text; custom text already in a file is kept, and
  old files with stored defaults keep parsing and lose the section the next time
  they are updated.
- Render rule memories with the configured light, balanced, or strict variant;
  when variant mode is off, use balanced wording. The setting affects
  agent-facing load/export/sync/hook/MCP output, not what gets stored in memory files.
- Treat `/engram <args>` as a human-visible router to `engram <args>` or the
  matching MCP read/proposal tool.
- For global skillset installs, append exactly one Engram managed block at the
  end of each host's shared instruction file. Preserve human-authored content;
  when an older Engram block exists, refresh it and move it to the end instead
  of replacing the whole file.
- Write generated `SKILL.md` files to each host's skill directory. For Claude
  Code global installs, use `~/.claude/skills/engram/SKILL.md` alongside the
  appended `~/.claude/CLAUDE.md` instruction block.
- Generated `SKILL.md` frontmatter follows the Agent Skills spec
  (agentskills.io/specification): `name` equals the skill directory (lowercase,
  hyphens, 1-64 chars) and `description` is 1-1024 characters. Non-Claude skill
  files carry only spec fields. The Claude pointer skill also carries
  `when_to_use` and `user-invocable: true` (description plus `when_to_use` stays
  under Claude's 1,536-character listing limit) and never
  `disable-model-invocation`. Claude and OpenCode command files
  (`.claude/commands/engram.md`, `.opencode/commands/engram.md`) carry a
  `description` frontmatter; the Cursor command file has none. `engram doctor`
  validates every Engram-generated `SKILL.md` (`host.skill_frontmatter`) and
  ignores skills it did not write.
- Bundle MCP registration with target-specific `link` installs whenever Engram
  knows a stable MCP config path for that target. Workspace Claude links merge
  `mcpServers.engram` into `.mcp.json`; workspace Gemini links merge it into
  `.gemini/settings.json`; global Gemini links merge it into
  `~/.gemini/settings.json`; global Codex links write a managed
  `[mcp_servers.engram]` block (BEGIN/END ENGRAM MANAGED MCP markers) in
  `~/.codex/config.toml`. Claude Code does not read `~/.claude/mcp.json`, so
  global Claude links print `claude mcp add --scope user engram -- engram-mcp`
  instead of writing a file. The server command is `engram-mcp` when it resolves
  on PATH, otherwise `npx -y --package @the-long-ride/engram@<version> engram-mcp`,
  pinned to the installed release; `engram upgrade` and `engram link <host>`
  re-pin existing managed entries. Unlink
  removes only the Engram entry or managed block. Global
  OpenCode links write the `mcp` field into `~/.config/opencode/opencode.jsonc`
  by default, or an existing `~/.config/opencode/opencode.json`.
- Implement standard MCP JSON-RPC methods (`initialize`,
  `notifications/initialized`, `tools/list`, and `tools/call`) for hosts such
  as OpenCode that discover tools through the MCP handshake, and serve MCP
  2026-07-28 requests (`server/discover`, `tools/list`, `tools/call`) that carry
  `io.modelcontextprotocol/protocolVersion` in `params._meta`.
- For OpenCode MCP config, emit a local entry with `command: ["engram-mcp"]`,
  `args: []`, and `enabled: true`; do not use an npm-style plugin entry for the
  local JavaScript plugin file.
- Claude and Codex hook installs also register a path trigger: Codex `PreToolUse`
  (`apply_patch` edits); Claude `InstructionsLoaded` (matcher `path_glob_match`) under
  `hooks.path_rules native` (default), or `PreToolUse` (matcher `Read|Edit|Write|MultiEdit`)
  under `hooks.path_rules hook`. Both also register `PreCompact` and `SubagentStart` (matcher `*`;
  the subagent's delivered set is keyed `<session_id>#agent:<agent_id>`). `PreToolUse` injects
  up to 3 undelivered memories whose `applies_to` globs match the touched file path
  (relative to the cwd) and never emits a permission decision. The per-session delivered set
  is reset by `SessionStart` and `PreCompact`; prompt turns inject only undelivered bodies and
  end with `already loaded: <ids>`. Claude and Codex read hook `timeout` in seconds, so
  managed entries write `10`. `engram upgrade --latest` (or `engram link <host>`) adds
  the new events to existing installs.
- Gemini hook installs register `SessionStart`, `BeforeAgent`, `AfterTool` (matcher
  `read_file|write_file|replace`, timeout in milliseconds), and `PreCompress`. `AfterTool`
  injects up to 3 undelivered memories whose `applies_to` globs match the touched file as
  `hookSpecificOutput.additionalContext` appended to the tool result, shares the delivered
  set with `BeforeAgent`, and never returns a decision.
- Native path rules: with `hooks.path_rules native` (default), `link claude` writes one
  `.claude/rules/engram/<id>.md` (frontmatter holds only `paths:`; the first body line is
  `<!-- engram:<scope>:<file> sha:<8> -->`) and `link cursor` one
  `.cursor/rules/engram/<id>.mdc` (`alwaysApply: false`) per workspace-scope memory with
  `applies_to`; `link --global claude` writes global ones to `~/.claude/rules/engram/`.
  Working-tier memories are never emitted, files without the marker are never rewritten
  or removed, stale marked files are removed, and `sync`, `rebuild-index`, `link`, and
  `upgrade --latest` keep them current. The Claude `InstructionsLoaded` handler (matcher
  `path_glob_match`) records the loaded rule's key in the delivered set and `usage.json`
  and injects nothing.
- Hook payloads stay under host caps: `additionalContext` is at most 2,400 tokens on Codex
  (UTF-8 bytes / 4), 9,500 characters on Claude, and `load.max_tokens` elsewhere, proof
  line included. Over the cap the hook re-plans so bodies demote to cards; a body is never
  cut mid-text and only the bodies sent are recorded as delivered. The `already loaded:`
  ids are sorted and the proof `sig` hashes the sorted routed keys.
- Treat AI agent hooks as opt-in and narrower than skillset links. v1 may
  install hooks for `codex`, `claude`, `gemini`, and `opencode` as managed JSON
  command-hook entries because those hosts expose both session-start and later
  prompt-turn context injection. `opencode` uses a managed local JavaScript
  plugin because its hook system is plugin-based. `cursor` installs a
  `sessionStart` command hook that returns `additional_context` for startup
  injection; `beforeSubmitPrompt` is allow/block-only and is not used for context
  injection. `windsurf`/`cascade` installs a `pre_user_prompt` hook that can
  audit/preload/block but cannot inject model context; rules and MCP provide
  the reliable AI context channels. Hook installers must preserve human-authored
  JSON config by merging/removing only Engram-managed entries named
  `engram-auto-load`.
- Treat `antigravity` and `antigravity-cli` hook targets as hidden compatibility
  aliases that normalize to Gemini hook behavior and paths until stable primary
  Antigravity hook/config docs are verified.
- For `cursor`, hook installers write a `sessionStart` command hook that
  injects Engram startup context through `additional_context`. Do not use
  `beforeSubmitPrompt` for context injection; it is allow/block-only. Cursor
  workspace MCP is written to `.cursor/mcp.json` with `type: "stdio"`. Cursor
  global install creates a local plugin at `~/.cursor/plugins/local/engram/`
  with plugin manifest, rules, skills, commands, MCP config, and hooks.
- For `windsurf`/`cascade`, hook installers write a `pre_user_prompt` hook
  entry that can audit/preload/block but cannot inject model context directly.
  Rules and MCP provide the reliable AI context channels. Workspace MCP is not
  generated because the official contract documents only user-level MCP config;
  `engram link windsurf` reports this and suggests `engram link --global windsurf`
  for MCP. Global install writes a managed block into
  `~/.codeium/windsurf/memories/global_rules.md` (preserving user text and
  staying below the character budget), merges MCP into
  `~/.codeium/windsurf/mcp_config.json`, and merges hooks into
  `~/.codeium/windsurf/hooks.json`. `cascade` is an alias for `windsurf`.
- For `copilot` and `cline`, hook installers must return deterministic
  `SKIPPED` records with host-specific reasons and keep those hosts
  instruction/skillset/manual-load driven in v1.
  For `opencode`, hooks are supported via a managed local JavaScript plugin
  at `~/.config/opencode/plugins/engram.js`; the plugin uses `chat.message` to route the current user prompt
  and `experimental.chat.system.transform` (an OpenCode experimental API) to
  inject routed memory before each LLM request. OpenCode must be restarted or
  reloaded after `link`/`unlink` because local plugin files are loaded at
  startup. The plugin fails open and keeps raw routed memory only in the
  running OpenCode process; Engram's disk hook cache remains hashes, session
  IDs, host, cwd, and delivered memory keys only. `engram unlink --global opencode`
  removes only the Engram-generated plugin; a human-authored `engram.js` is
  preserved unless `--force` is explicit.
- For runtime-first targets (`codex`, `claude`, `cursor`, `gemini`),
  shared instruction files use the `bootstrap` profile — short instructions
  that rely on MCP tools and hooks. For fallback targets (`agents-md`,
  `copilot`, `cline`, `opencode`), shared instructions use the
  `compact` profile — the full manual protocol. `windsurf`/`cascade`
  uses compact manual instructions at the workspace level because Cascade
  hooks cannot inject model context; global rules get a managed block.
- Claude's workspace bootstrap is AGENTS.md-first (E10). `link claude` always
  writes the AGENTS.md managed block, rendered by one function so it is
  byte-identical to the block `agents-md`, `codex`, and `opencode` write (the
  upgrade inventory compares them and rejects disagreeing registrations). It
  also writes `.agents/engram.md` (the AGENTS.md pointer target) and
  `.claude/engram.md` (its detection file and the slash skill's guide). It
  writes a block to `CLAUDE.md` or `.claude/CLAUDE.md` only when one exists and
  does not import `@AGENTS.md`; it never creates either file and never writes
  `CLAUDE.local.md`. An existing CLAUDE.md block is refreshed and never removed
  by `link` or `upgrade`; the CLAUDE.md upgrade row carries the reason
  `CLAUDE.md block kept (...)`. `unlink claude` removes the AGENTS.md block and
  shared guide only when no other linked target still uses them. The global
  Claude bootstrap is unchanged: `~/.claude/CLAUDE.md` is created, because
  Claude reads no user-level AGENTS.md.
- `engram doctor` check `host.agents_md_chain` sums the Codex AGENTS.md chain
  (global `AGENTS.override.md` or `AGENTS.md`, then one file per directory from
  the git root to the working directory) in bytes and warns at 80% of
  `project_doc_max_bytes` (default 32 KiB, read from `<codex home>/config.toml`).
- Hook runtimes must fail open. On malformed input, load failure, or unsupported
  host/event, emit an empty JSON object and do not block the agent session.
- Engram's SQLite config DB is an optimization for workspace/profile management.
  If the DB cannot be opened or initialized, normal read/write commands fall back
  to JSON config snapshots. DB-specific commands report SQLite as unavailable
  instead of blocking normal memory use.
- Hook caches must not store raw prompt text. Store only prompt hashes, session
  ids, host, cwd, and the delivered memory keys per session.
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
- Code, config, and manifest sources record digest-text hashes
  (`source_hash_mode: digest`); docs record raw-file hashes.
  `engram verify --sources` re-hashes them and records changed or missing
  sources in the gitignored `.agents/.engram/stale.json`; `load` ranks stale
  memories lower and marks their cards ` (stale)`.
  `engram take-control --refresh` proposes one `UPDATE: <id>` candidate per
  stale memory through the normal approval gate.
- `engram take-control --from claude-auto-memory|codex-memories` imports a
  host-local memory store for review. It never writes into the host store, skips
  `type: user` files, records `source: host-memory` with preset-relative
  `source_files` and a `source_origin` hash of the store path, and is checked by
  `engram verify --sources` only on the machine that holds the store.
- Treat `/engram take control force` as natural wording for
  `engram take-control --force`. Keep take-control force prompts
  token-light, generate only concise `TYPE: ... | TEXT: ...` candidates, and do
  not paste source excerpts or reasoning into chat.
- Treat `/engram take control force metacognize` as
  `engram take-control --force --metacognize`, and treat
  `/engram resolve conflicts and metacognize` as
  `engram resolve-conflicts --metacognize`.
- Treat `/engram ss -f` as `/engram save-session --force`; `-f` is explicit
  human force approval for this shortcut. Treat `/engram ss -f last 50
  sessions` as `engram save-session --query-level 50 --force`.
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
| `engram_load` | Route and return relevant memory for a task (`query`, `id`, `budget_tokens`, `disclosure`, `full`, `explain`) | No |
| `engram_route` | Classify a task and list the memories it routes to | No |
| `engram_search` | Search memory by query | No |
| `engram_verify` | Check memory hashes | No |
| `engram_status` | Return health and counts | No |
| `engram_save` | Return a memory proposal for human review | No |
| `engram_save_session` | Return multiple numbered memory proposals for human review | No |
| `engram_commit` | Write the candidates of an approved proposal via its single-use, 30-minute `approval_token` | Yes, after human approval |
| `engram_set_role` | Update active developer roles and return immediate reload guidance | Yes |
| `engram_set_rule_variant` | Update active rule-variant mode and return immediate reload guidance | Yes |
| `engram_note` | Save one redacted working-tier task note (`text`, `objective?`, `type?`, `scope?`) after a single yes/cancel approval; returns `{id, file, valid_until}` | Yes, after human approval (gitignored `working/` only) |

The MCP save/autosave proposal tools intentionally do not write. A host must display the
proposal and collect explicit human approval. After exact-candidate chat approval, the host may
call `engram_commit` with the proposal's `approval_token` (`approve: "all"` or 1-based candidate
numbers), or invoke the CLI `save-session --force` path with the exact approved candidate text.
Tokens are bound to the workspace, single use, expire after 30 minutes, and are stored only as
hashes in the gitignored `pending-approvals.json`; edited pending candidates fail a hash check.
Issue and redeem run under a cross-process file lock, so one token is consumed at most once.

Every proposal preview carries one `Verdict:` line per candidate (`ADD`, `UPDATE <id>`,
`SUPERSEDE <id>`, `NOOP duplicate of <id>`), and the structured data adds
`verdicts: [{ candidate, scope, kind, target? }]`. The token pins those verdicts (they are covered
by its hash). `engram_commit` applies a `SUPERSEDE` (marks the old memory superseded) only when the
recomputed verdict still equals the pinned one; otherwise it writes nothing for that candidate and
says `Verdict changed since the proposal`. A token that pinned no verdicts never approves a
`SUPERSEDE`.

The `approval_token` is returned to the agent: it proves that a proposal exists, not that a human
approved it. The human gate is the host's per-tool permission prompt for `engram_commit`. Users
must NOT allowlist or auto-approve `mcp__engram__engram_commit` (or the host's equivalent);
otherwise an agent can commit its own proposals without review.

MCP protocol notes:

- Tool results keep the human text in `content[0].text`; `structuredContent` is the
  `{contract_version, ok, data, diagnostics}` envelope. `engram_load` reports
  `selected_keys`, `body_keys`, `card_ids`, `omitted_ids`, and `tokens`;
  `engram_search` and `engram_route` report `entries` (`id`, `type`, `scope`, `score`).
  `data.text` is no longer duplicated there for load, search, and route.
- Read tools carry `annotations.readOnlyHint: true`; `engram_commit` carries
  `readOnlyHint: false` and `destructiveHint: true`, because an approved candidate can
  UPDATE (overwrite) an existing memory. `ping` is answered and a malformed JSON line
  yields a `-32700` error while the server keeps running.
- Both eras advertise `resources` and `prompts` (no `listChanged`, no `subscribe`).
  `resources/list` returns `engram://index` plus the top `mcp.resource_limit` (default 20,
  0-200, JSON config only) durable memories ranked by injected + fetched usage, ties by id;
  working-tier, ignored, superseded, and archived memories are never listed.
  `resources/templates/list` returns `engram://memory/{id}`. `resources/read` of
  `engram://index` returns one-line cards; of `engram://memory/<id>` it returns the same
  guarded agent body as `engram load --id` and counts as a `fetched` usage hit. A missing
  resource is an error (`-32602` with `data.uri` on 2026-07-28, `-32002` for legacy),
  never an empty `contents`. Card text and descriptions are redacted and injection-scanned.
  `prompts/list` returns one prompt, `propose`; `prompts/get` returns the shared agent
  memory proposal protocol text. An unknown prompt name is `-32602`.
- `engram_commit` carries `_meta["anthropic/requiresUserInteraction"]: true` in `tools/list`,
  which makes Claude Code prompt on every call. The managed Codex MCP block adds
  `[mcp_servers.engram.tools.engram_commit]` with `approval_mode = "approve"`, and
  `engram doctor` warns (`host.gemini_trust`) when a Gemini `mcpServers.engram` entry sets
  `trust: true`. The tool description keeps saying the token is not approval.
- Both eras return `instructions` (at most 512 characters) from `initialize` and
  `server/discover`. `engram-mcp --always-load` adds `_meta["anthropic/alwaysLoad"]: true`
  to `engram_load` (merged with any existing `_meta`); `engram link` passes it only to
  Claude-read MCP configs of installs without an Engram Claude hook.
- Elicitation: when the client declares form elicitation (`capabilities.elicitation` at
  `initialize`, or the 2026-07-28 per-request `clientCapabilities`), `engram_save` and
  `engram_save_session` ask the human to pick candidates (numbers, verdict, and id titles
  only, never memory text) and a save scope. `accept` writes exactly the selected candidates
  through the `engram_commit` path; `decline` and an invalid answer revoke the proposal;
  `cancel`, a 60 s timeout, or a client error return the `approval_token` text prefixed with
  a note that nothing was saved. Legacy clients get an `elicitation/create` request; 2026-07-28
  clients get an `input_required` result whose `requestState` is an HMAC-sealed, expiring
  envelope bound to the tool, workspace, and arguments (a forged, expired, or mismatched
  state is `-32602` and writes nothing). The raw token never reaches the client in this
  flow. `engram-mcp --no-elicitation` keeps the token flow byte for byte.
- `engram_note` (`readOnlyHint: false`, no `destructiveHint`, no `_meta`) takes `{text, objective?, type?, scope?}` and returns `{id, file, valid_until}`. The text is redacted and checked for instruction-like lines before the preview, and the human answers one yes/cancel prompt through the same elicitation, `input_required`, or `approval_token` flow as the save tools; `decline`, `cancel`, and a timeout write nothing. The note is a gitignored file under `working/` with `source: note`, `tier: working`, `valid_until`, and the objective. It never updates a durable memory with the same id, and `engram promote` stays the only bridge to durable memory. SessionStart omits a note unless `ENGRAM_SESSION_OBJECTIVE` matches the note's objective; otherwise it shows as a card.
- Requests without an `id` are notifications and get no response. A bare method call that
  is not a `tools/call` returns plain text.
- Two protocol eras share one stdio process. Legacy: `initialize` returns the client's
  `protocolVersion` when it is `2024-11-05`, `2025-03-26`, `2025-06-18`, or `2025-11-25`,
  otherwise `2025-11-25`; it never echoes an unknown string. Modern (2026-07-28): any
  request with `params._meta["io.modelcontextprotocol/protocolVersion"]` is served
  statelessly and must also carry `io.modelcontextprotocol/clientCapabilities`
  (`-32602` when missing). `server/discover` returns `supportedVersions`, `capabilities`,
  and serverInfo in `_meta`; every modern result has `resultType: "complete"`, and the
  cacheable list methods add `ttlMs` and `cacheScope` (`public` or `private`). An
  unsupported modern version returns `-32022` with `data: { supported, requested }`.
  Modern requests answer `ping`, `initialize`, and bare tool methods with `-32601` and an
  unknown tool with `-32602`. The tool list order is fixed; stdout carries only JSON-RPC.
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
| `engram load [--profile name] [--all] [--budget-tokens n] [--disclosure auto|full] [--exclude-keys keys] [--id ids] [--dry-run] "<task>"` | Load a refined compact context pack from meaningful direct query matches plus explicit prerequisites; `--profile` selects a global profile for one command, `--budget-tokens` caps the complete rendered output from 200 to 16000 tokens, `--disclosure auto` (default, or `load.disclosure`) expands the top `load.expand_top` hits as bodies and lists the rest as one-line cards with a `fetch: engram load --id <ids>` hint while `full` prints every packed body, `--exclude-keys <scope:file,...>` drops memories the caller already holds (reported as `already_loaded` in JSON), `--id <id,...>` fetches full bodies and counts as a usage fetch, `--all` bypasses compact limits, and `--dry-run` previews routed files, related counts, narrowing tags, and match reasons without printing contents |
| `engram search "<query>"` | Search visible memory by query |
| `engram graph [--rebuild] ["<query>"]` | Inspect the derived layered JSON graph, dependency layers, and contradiction candidates |
| `engram save [rule|skill|workflow|knowledge] [--profile name] [--scope workspace|global|both] [--role role] "<text>"` | Propose one memory and write after A/B/C approval; `--profile` can save to another profile global root without changing the workspace default |
| `engram save-session [--file transcript.md] [--role role] [--query-level n] [--force] [session-summary]` / `engram ss` | Propose multiple memories from one or more recent sessions and write only after numbered A/B/C approval, or save every candidate when the human passed `--force` |
| `engram observe [--file session.md] [--propose] [--queue [--dry-run] [--limit n]] [note]` | Write sanitized raw notes into inbox; `--propose` mines them through save-session; `--queue` drains the opt-in SessionEnd transcript queue into sanitized inbox traces and writes no memory |
| `engram take-control [--plan] [--file path] [--dir path] [--from claude-auto-memory|codex-memories] [--include glob] [--exclude glob] [--max-sources n] [--max-chars n] [--budget-tokens n] [--kind docs|code|config|all] [--objective text] [--refresh] [--json] [--all] [--force] [--metacognize]` | Explore existing workspace guidance, notes, docs, code, and config with agent help, preview source plans (`--plan`, `--json`), and consume approved candidates as Engram memory; `--kind` (default `docs`) selects digest extractors (code: per-directory repo map of symbol names and imports; config: keys plus allowlisted values; default `--max-sources 40` and `--budget-tokens 6000` for code and config), `--objective` asks for both `OBJECTIVE: task` and durable candidates, `--refresh` proposes `UPDATE: <id>` only for memories marked stale by `verify --sources`, `--from` imports a host-local Claude auto memory or Codex memories store read-only through the same approval gate, and `--metacognize` enables related-memory restructuring pauses on force writes |
| `engram promote [workspace:|global:]<memory-id>` | Move a working-tier memory (an approved `OBJECTIVE: task` candidate, stored gitignored under `working/<type-dir>/` with `tier: working` and `valid_until` = today + `load.working_ttl_days`, default 14) to durable memory after A/B/C approval; drops `tier` and `valid_until`, keeps `objective`, bumps `revision` |
| `engram working note "<text>" [--objective text] [--type knowledge|rule] [--scope workspace|global]` | Save one working-tier task note (`source: note`, default type `knowledge`, redacted, injection lines refused, never matches a durable memory) after a single Y/C approval; writes nothing on cancel |
| `engram working prune [--dry-run]` | Delete expired working-tier memories (`valid_until` before today) and list them; never touches durable memory or follows symlinks |
| `engram metacognize --workspace|--global|--all [--force] [--dry-run]` / `engram mc ...` | Let an agent review an existing memory folder and return restructuring candidates with `UPDATE` or `DEPENDS_ON`; writes use save-session-style approval and force no-write related-memory pauses |
| `engram archive [--reason text] <memory-id|file>` | Move wrong or superseded memory out of active routing after approval |
| `engram benchmark <cases.json>` | Run a read-only hit@<load-limit> routing benchmark over query/expected-memory cases |
| `engram set-role <role...>` | Configure active developer roles for routing role-scoped memory and return an `Agent action:` reload cue for Engram-aware hosts |
| `engram set-rule-variant light|balanced|strict|off` | Configure compact rule output for agents and return an `Agent action:` reload cue for Engram-aware hosts |
| `engram set-read startup|auto|always|manual|off|status` | Configure hook and manual read behavior |
| `engram verify [--sources]` | Check hash integrity; `--sources` re-hashes take-control source files and records stale memories in the local `stale.json` |
| `engram repair [workspace|global] [--move-backups [--confirm]] [--json]` | Report invalid memory files that index rebuild would skip; `--move-backups` plans moving stray `*.bak` migration backups from `rules`, `skills`, and `knowledge` into the gitignored `backups/` folder and moves them only with `--confirm` |
| `engram author show|set|unset|sync-git-global|migrate-memories [--strip-email] [--plan] [--confirm]` | Manage the author profile; `migrate-memories` backfills `author_name`, and `--strip-email` removes `author_email` from memory files (plan-first, backed up under `backups/`) |
| `engram export [--format agents-md|claude-md|cursor-rules] [--out <file>]` | Export visible durable memory to an instruction format or a JSON bundle; `cursorrules` is a deprecated alias of `cursor-rules` for one release; without `--out`, the JSON bundle goes to the gitignored `.agents/.engram/exports/` |
| `engram rebuild-index [workspace|global]` | Explicitly rebuild memory indexes, graph files, and eligible vector sidecars |
| `engram resolve-conflicts [--dry-run] [--metacognize] [--force]` | Resolve and stage only `.agents/.engram/` conflicts, optionally appending a workspace metacognize source pack |
| `engram stats [--usage]` | Show visible memory counts, scope mix, and author ownership; `--usage` adds fetch and inject counts from the local `usage.json` |
| `engram link [all|list|target] [--global] [--force] [--session-end] [--all-supported]` | Link skillset, MCP, slash adapters, and agent hooks to an AI agent; reports skipped reasons for partial hosts; `--session-end` also registers the opt-in Claude/Codex SessionEnd transcript-queue hook |
| `engram unlink [all|target] [--global] [--force]` | Remove skillset, MCP, managed blocks, and agent hooks |
| `engram agent-hook --host codex|claude|gemini|opencode|cursor|windsurf` | Internal hook runtime; reads hook payload from stdin and emits host-compatible JSON to stdout; the OpenCode host emits retain/replace/clear directives, the Cursor host emits `additional_context` on `sessionStart`, and the Windsurf host processes `pre_user_prompt` input |
| `engram clone-memory workspace global [--force] [--dry-run] [--metacognize]` / `engram clone-memory global workspace [--force] [--dry-run] [--metacognize]` | Clone active `rules/`, `skills/`, and `knowledge/` Markdown memories between workspace and global scopes while rewriting destination scope frontmatter and hashes; `--metacognize` routes verified source memories through save-session-style approval and cannot be combined with `--force` |
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
| `/engram save-session ...` / `/engram ss ...` | `engram_save_session` proposal or CLI approval flow; use `--query-level <n>` only as a human-requested recent-session mining scope, and use CLI write flow when `--force` is present |
| `/engram auto save ...` / legacy `/engram autosave ...` | Same as `/engram save-session ...`; LLM defines candidates from current chat when no file or inline candidates are provided |
| `/engram observe ...` | `engram observe ...` CLI flow; `--propose` may mine candidates through save-session |
| `/engram graph ...` | `engram graph ...` CLI flow |
| `/engram archive ...` | `engram archive ...` CLI approval flow |
| `/engram take-control ...` | `engram take-control ...` CLI flow with agent-generated candidates and approval |
| `/engram metacognize --workspace|--global|--all ...` / `/engram restructure workspace memory ...` | `engram metacognize ...` CLI flow; when no inline candidates are present, the adapter uses the source pack to generate concise `TYPE/TEXT` candidates and reruns the same scope |
| `/engram clone-memory ... --metacognize` | `engram clone-memory ... --metacognize` CLI flow with save-session-style candidate approval |
| `/engram take control force` | `engram take-control --force` CLI write flow with token-light source defaults |
| `/engram take control force metacognize` | `engram take-control --force --metacognize` CLI flow with related-memory restructuring pauses |
| `/engram resolve conflicts and metacognize` | `engram resolve-conflicts --metacognize` CLI flow, preserving scoped conflict handling and appending the workspace metacognize pack |
| `/engram ss -f` | `engram save-session --force` CLI write flow |
| `/engram ss -f last 50 sessions` | `engram save-session --query-level 50 --force` CLI write flow |
| `/engram <other command>` | `engram <other command>` CLI flow |

The slash adapter must not write memory by itself. It only asks the agent to run
the same CLI/MCP flow the human could inspect directly. When the human includes
`--force` on save-session, the adapter may generate candidates and invoke the
CLI force path because the flag is the approval. Legacy `autosave` and `as` remain aliases.
The same applies to human-requested take-control, take-control metacognize, and
metacognize force flows. Adapters should preserve or tighten token limits, keep
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
