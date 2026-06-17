# Agent Integrations

Engram supports two integration layers:

- **Skill files:** generated instructions for agents that read project context.
- **Slash adapters:** generated `/engram` command prompts for agents that
  support project slash commands or Agent Skills.
- **MCP-style tools:** a JSON-lines wrapper for agents that can register
  external tool processes.
- **Agent hooks:** opt-in host hooks that can inject routed Engram context at
  session start and later task-change turns when the host exposes a safe
  prompt-time context channel.

Run:

```bash
engram init
```

This creates `.agents/.engram/` and installs the compact Codex target by default:
`AGENTS.md` plus `.agents/skills/engram/SKILL.md`. The generated instructions
tell agents to load memory, keep Engram replies short, ask only for required
confirmation, and report what changed.

Use `engram init --no-skillset` to skip agent files, or
`engram init --skillset all` to install every supported adapter during init.
Existing human-authored files are skipped.

Use `engram init --global-only --global-path <path>` when the human wants only
portable global memory and no `.agents/.engram` or local skillset files in the
current workspace. In that mode, default saves go to the global folder.
Fresh workspace installs default normal saves to both workspace and global when
global memory is configured. Humans can change the default with
`engram set-save-target workspace|global|both`, and agents can override one write
with `--scope workspace|global|both`.

Profiles isolate global memory roots for company, team, and personal contexts.
Use `engram profile create <name> --global-path <path>` to register a profile,
`engram profile use <name>` for the user default in uninitialized folders, and
`engram profile use <name> --workspace` to pin the current workspace. Agents may
pass `--profile <name>` for a one-off command; when that profile differs from the
workspace default, workspace memory is disabled for the command so global memory
does not cross profile boundaries. `engram profile merge <source> <target>
--dry-run` previews cross-profile copies and duplicate candidates.

After an npm package update, the next normal Engram command quietly reconciles
already-initialized workspace/global roots once for the new version. This startup
check is intentionally cheap after the first run: it only reads small config
markers when the current version is already recorded. It does not run from npm
postinstall, create new memory roots, or replace human-authored files. Use
`--no-auto-upgrade` or `ENGRAM_NO_AUTO_UPGRADE=1` to skip it for a command.

To add or refresh adapters later:

```bash
engram upgrade
engram install-skillset all
```

`engram upgrade` refreshes existing Engram-generated workspace skillset files
and registered global skillsets while preserving human-authored files.
Use `--force` only when replacing generated Engram adapter files intentionally.
Claude receives both `.claude/commands/engram.md` and
`.claude/skills/engram/SKILL.md` so `/engram` appears in older command menus and
newer skill-aware Claude Code sessions.
With `--global`, Engram appends a single managed block at the end of each
agent's shared instruction file instead of replacing human-authored content. If
an older Engram block is already present, it is refreshed and moved to the end.
Host-specific `SKILL.md` files are written to each agent's skill directory, such
as `~/.claude/skills/engram/SKILL.md` for Claude Code.

To install automatic context injection hooks where v1 supports them:

```bash
engram install-agent-hooks codex --plan
engram install-agent-hooks codex
engram install-agent-hooks claude
engram install-agent-hooks gemini
engram set-proof compact
```

Use `--global` for user-level hook config and `uninstall-agent-hooks` to remove
only Engram-managed hook entries. `engram set-read startup|auto|always|manual|off`
controls runtime behavior. `auto` loads on session start and later injects again
only when routed Engram context changes; the hook cache stores hashes,
session ids, host, cwd, and routed signatures, never raw prompt text.
`engram set-proof off|compact` controls whether supported hooks also append a
compact `Engram proof:` line on each eligible turn. Proof visibility is
separate from `set-read`: `compact` can report loaded, reused, or skipped turns
without changing when full Engram memory is injected.

## Supported Targets

| Target | File | Main use |
| --- | --- | --- |
| `codex` | `AGENTS.md`, `.agents/skills/engram/SKILL.md` | OpenAI Codex project instructions and Agent Skill |
| `agents-md` | `AGENTS.md` | Generic fallback for unlisted AGENTS.md-compatible agents |
| `copilot` | `.github/copilot-instructions.md`; global: `~/.copilot/copilot-instructions.md` | GitHub Copilot repository and user instructions |
| `claude` | `CLAUDE.md` | Claude Code project guidance |
| `cursor` | `.cursor/rules/engram.mdc` | Cursor project rules |
| `gemini` | `GEMINI.md`; global: `~/.gemini/GEMINI.md`, `~/.gemini/skills/engram/SKILL.md`, Gemini MCP config | Gemini CLI context, including current Antigravity Gemini-compatible surfaces |
| `cline` | `.clinerules` | Cline-style workspace rules |
| `windsurf` | `.windsurfrules` | Windsurf workspace rules |
| `opencode` | `opencode.json`, `.opencode/engram.md` | OpenCode custom instructions |
| `mcp` | `.mcp.json`; global: Claude and Gemini MCP config files | MCP-style JSON-lines wrapper registration |
| `slash` | `.claude/commands/engram.md`, `.claude/skills/engram/SKILL.md`, `.cursor/commands/engram.md`, `.gemini/commands/engram.toml` | Native `/engram` slash adapters |

Aliases: `codex` installs the `agents-md` adapter plus the generic Agent Skill
file, and `open-code` maps to `opencode`. The old `antigravity` and
`antigravity-cli` targets are hidden compatibility aliases for now.

`engram link <target>` also installs the known MCP registration for that target
by default. Workspace target links write `.mcp.json`; global Claude links write
`~/.claude/mcp.json`; global Gemini and Antigravity-compatible links write the
Gemini MCP config file.

## Agent Hook Capability Matrix

| Host | Hook install in v1 | Config path | Events | Reason |
| --- | --- | --- | --- | --- |
| `codex` | Yes | `.codex/hooks.json`; global `~/.codex/hooks.json` | `SessionStart`, `UserPromptSubmit` | Supports startup and prompt-time additional context injection |
| `claude` | Yes | `.claude/settings.json`; global `~/.claude/settings.json` | `SessionStart`, `UserPromptSubmit` | Supports startup and prompt-time additional context injection |
| `gemini` | Yes | `.gemini/settings.json`; global `~/.gemini/settings.json` | `SessionStart`, `BeforeAgent` | Supports startup and prompt-time `hookSpecificOutput.additionalContext` |
| `antigravity`, `antigravity-cli` | Hidden alias | Gemini paths | Gemini events | Normalized to `gemini` until stable primary Antigravity hook/config docs are verified |
| `cursor` | Skipped | None written | N/A | Current hook support is partial/startup-only for context injection; prompt hooks are blocking-oriented |
| `copilot` | Skipped | None written | N/A | Current hooks expose session-start context but no reliable prompt-time context injection |
| `cline` | Skipped | None written | N/A | Hook support is plugin-based, not aligned with Engram's file-first adapter installer in v1 |
| `windsurf` / `cascade` | Skipped | None written | N/A | Cascade hooks are blocking/audit hooks, not reliable context injection hooks |

`engram install-agent-hooks all --plan` reports supported writes and deterministic
`SKIPPED` reasons for partial hosts. This is separate from `engram link`, which
continues to install instruction, slash, and MCP adapters for broader host
coverage.

## Recommended Flow

1. Initialize memory:

   ```bash
   engram init
   ```

   Normal commands run a quiet one-time safe reconcile after npm package
   upgrades. You can still rerun `engram init` when you want an explicit manual
   refresh. Existing workspaces are reconciled in place: missing standard
   files/folders are restored, generated help/readme/skillset files are
   refreshed, config defaults are merged, and safe legacy folder migrations are
   applied without overwriting human-authored agent files or memory audit data.
   This includes refreshing `.agents/skills/engram/SKILL.md` when an older
   Engram-generated skill is present.

   Interactive init asks in this order: whether to add `./.agents/.engram` as a
   submodule, whether to use a global Engram path, and whether to add a shared
   global Git origin. Use `engram init --global-path <path>` for scripted setup,
   or `engram init --global-only --global-path <path>` for a global memory folder
   without local workspace installation.
   Use `engram update-global-folder <new-path>` or `engram ugf <new-path>` when
   the human only wants to update the configured global path. Chat-style forms
   such as `engram set global memory path to <new-path>` and
   `engram move global folder from <old-path> to <new-path>` normalize to the
   same command. Add `--move-from-path <old-path>` when they also want Engram to
   move the whole old global root into the new location.

   If the human wants `.agents/.engram` tracked as a separate repository, ask whether to
   create a local submodule. When they approve, run:

   ```bash
   engram init --submodule
   ```

   Add `--submodule-remote <git-url>` only after the human provides a URL.
   Engram validates the URL, initializes the submodule on `main`, and creates the
   first submodule commit as `Initialize engram`.

   If `engram entry` shows no `global_git_detected.remote_url`, ask the human
   whether global memory should be shared through Git. When they provide a URL,
   run:

   ```bash
   engram init --global-remote <git-url>
   ```

2. Ask the agent to use Engram memory:

   ```text
   Before working, load Engram memory for this task.
   ```

   Agents should treat Engram as the knowledge memory center for project,
   workspace, team, and personal context. They should load at session start,
   search or route-load again when the task changes or research depends on
   project knowledge, then reply only with a count line such as
   `Engram loaded: 8 memories / 24 total related memories.` unless the human
   asks for IDs, rules, or raw output. When a query has more matching
   candidates than the configured load limit, Engram refines the wider
   candidate pool into a compact context pack and reports selected versus total
   related memories. Agents can use
   `engram load --dry-run "<query>"` to inspect candidate counts and suggested
   narrowing tags before loading broad context.
   If memory files declare `depends_on: [...]`, graph routing keeps those
   prerequisites before deeper dependent memories in the compact load pack.

3. If the host supports external tool processes, register `.mcp.json` or equivalent host config.

4. If the host supports custom slash commands, type:

   ```text
   /engram load deployment workflow
   /engram entry
   /engram save knowledge
   /engram save-session
   /engram save-session --query-level 3
   /engram ss
   /engram auto save
   /engram observe --file session.md
   /engram take-control
   /engram take control accept all
   /engram take control accept all metacognize
   /engram restructure workspace memory accept all
   /engram resolve conflicts and metacognize
   /engram ss -a
   /engram ss -a last 50 sessions
   /engram save-session --accept-all
   /engram graph release workflow
   /engram archive --reason "Superseded" knowledge/old-fact.md
   /engram help set-role
   /engram set-rule-variant strict
   /engram verify
   ```

   `engram save` captures the best single memory candidate, automatically
   updates a matching memory or creates a new one, and always shows the A/B/C
   approval gate before writing. For long sessions with several possible rules,
   knowledge facts, or workflows, agents should suggest `engram save-session`; if
   the human declines, continue with the best single `engram save` candidate.
  For transcripts or long summaries already on disk, use
  `engram save-session --file transcript.md`. The save-session approval prompt supports
  selected candidate replies such as `A 1,3`. When the human explicitly includes
  `--accept-all`, or uses the `/engram ss -a` shortcut, the slash adapter should
  generate/provide concise candidates, run the CLI with
  `engram save-session --accept-all`, and report the saved files without asking for
  another A/B/C reply. If the shortcut includes a count such as
  `/engram ss -a last 50 sessions`, normalize it to
  `engram save-session --query-level 50 --accept-all` and mine only recent
  human-agent chats the agent can actually access. If Engram returns a
  related-memory response before writing, no file was saved yet; the adapter
  should use those duplicate/dependency hints to generate a restructured
  candidate set and rerun the same accept-all command. Use `DEPENDS_ON:
  memory-id` when a candidate builds on existing memory, `LEVEL: advanced` for
  deeper memory when useful, and `UPDATE: memory-id` when a candidate should
  merge into a possible duplicate. For
  `/engram take-control --accept-all` or natural
  `/engram take control accept all`, the slash adapter should normalize the
  wording, keep the source pack token-light, generate only concise
  `TYPE: ... | TEXT: ...` candidates, pass them to the CLI, and let Engram save
  them without a second approval prompt. The adapter should not paste source
  excerpts or reasoning back into chat. If the human also says `metacognize` or
  passes `--metacognize`, rerun with `UPDATE` or `DEPENDS_ON` when Engram
  reports related memories before writing.
  For `/engram save-session`, `/engram ss`, legacy `/engram autosave`, or natural `/engram auto save` without a file or inline
  candidates, the slash adapter should use the LLM to define concise candidates
  from the current AI agent chat/session, then pass `TYPE: ... | TEXT: ...`
  lines to Engram for the normal approval flow. Candidates may add
  `DEPENDS_ON`, `LEVEL`, or `UPDATE` fields when the agent is restructuring
  related memory. If the human includes
  `--query-level <n>`, or natural count wording such as `last 50 sessions`, n
  must be a positive integer and the adapter should mine up to n recent
  accessible human-agent chat sessions, including the current session, without
  inventing unavailable history. The CLI rejects non-integer, zero, and
  negative query levels; adapters should surface that validation failure instead
  of falling back to the current session silently.
  For `/engram observe`, slash adapters should run the CLI and report the saved
  inbox file. If the human included `--propose`, the adapter may generate
  concise save-session candidates from the sanitized note, but writes still use the
  normal approval flow unless the human explicitly included `--accept-all`.
  For `/engram graph` and `/engram quality-check`, report contradiction
  candidates compactly. If a memory is wrong or superseded, use
  `/engram archive --reason <why> <id-or-file>` so the file leaves active
  routing only after approval and remains preserved under `archive/`.
  Agents must not add `--accept-all` unless the human requested it.

   Generated knowledge should be objective and durable. Corrections and
   preferences become rules. Repeatable procedures become workflows/skills.
   Save role-specific memory with `engram save --role frontend ...` or
   `engram save-session --role backend ...`. Role routing can be tuned with
   `engram set-role frontend`, `engram set-role backend security`, or
   `engram set-role` to clear active roles.
   When `engram set-role ...` or `engram set-rule-variant ...` succeeds, the
   CLI returns an `Agent action:` line. Engram-aware slash adapters and MCP
   hosts should immediately rerun `engram load "<current task/request>"` and
   treat that result as replacing prior Engram-loaded context in the current
   conversation while leaving non-Engram host/system instructions unchanged.
   This is an after-command reload, not a mid-response mutation of the model's
   hidden prompt.

   `engram take-control` is the agent-assisted takeover flow for existing
   workspace guidance. It builds a compact source pack from files such as
   `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, Cursor rules, memory-bank notes, and
   top-level `rules/`, `skills/`, `workflows/`, `knowledge/`, or `notes/`
   folders, including `.txt` notes. The agent should return concise
   `TYPE: ... | TEXT: ...` candidates from that source pack, then let Engram
   show the normal approval gate. Use `engram take-control --plan` to preview
   selected files, skipped files with reasons, conversion status, token
   estimates, and likely memory types before the LLM step. Use
   `engram take-control --dry-run` to inspect the source pack first, repeated
   `--file`, `--dir`, and `--include` selectors to combine sources, plus
   `--exclude`, `--max-sources`, and `--max-chars` to keep scans token-safe.
  `--accept-all` uses smaller token-light source defaults unless explicit
  `--max-sources` or `--max-chars` values are provided.
  Add `--metacognize` when the human wants take-control accept-all to pause on
  related-memory hints so the agent can rerun with `UPDATE` or `DEPENDS_ON`
  before any file is written.
  Saved take-control memories record `source_files` and `source_hashes`
  frontmatter. Later scans skip unchanged imported sources, while an explicit
  `--file` import still lets the human force a specific source back through the
  approval flow.

   `engram metacognize --workspace`, `--global`, or `--all` is the
   agent-assisted restructuring flow for existing Engram memory folders. When
   no inline candidates are provided, the CLI returns a compact source pack of
   verified active memories. The adapter should use that pack to generate
   concise `TYPE: ... | TEXT: ...` candidates, usually with `UPDATE:
   existing-memory-id` for consolidation or wording cleanup and `DEPENDS_ON:
   memory-id` for layered memories, then rerun the same scope. Natural wording
   such as `/engram restructure workspace memory accept all` maps to
   `engram metacognize --workspace --accept-all`. Agents must not add
   `--accept-all` unless the human requested it.

   Engram always saves rule memories with light, balanced, and strict versions.
   Rule variant mode is a render lens for agent-facing memory. Strict helps
   lower-tier models stay controlled; stronger models usually benefit from light
   or balanced wording so rules do not limit their reasoning. When variants are
   off, Engram renders balanced rule wording by default.

## Command Discovery

Run `engram -h` for the compact command surface. Run `engram help <topic>` or
`engram -h <topic>` for command-specific examples and use cases:

```bash
engram help save-session
engram help set-role
engram -h set-rule-variant
```

All commands listed in help include short aliases. Aliases must route to the same
CLI behavior and approval gates as their canonical commands.

Agents may normalize natural clone requests into `engram clone-memory`, for
example "clone workspace memory to global" -> `engram clone-memory workspace
global`. Reverse the scopes to copy global memory into a workspace; use
`--force` only when the human explicitly asks to overwrite destination copies.
For metacognition, normalize "clone workspace memory to global and metacognize"
to `engram clone-memory workspace global --metacognize`. Do not add
`--accept-all` unless the human said it. If accept-all reports related memories
before writing, rerun with `DEPENDS_ON` or `UPDATE` candidates.

Agents may normalize natural conflict requests into `engram resolve-conflicts`,
for example "resolve conflicts and metacognize" ->
`engram resolve-conflicts --metacognize`. Run the CLI so conflict handling stays
scoped to Engram-owned memory files, then use the appended metacognize pack for
concise `TYPE/TEXT` candidates.

Agents may normalize natural metacognition requests into `engram metacognize`,
for example "restructure workspace memory" -> `engram metacognize --workspace`
and "organize all memories accept all" -> `engram metacognize --all
--accept-all`. Run the CLI once to get the source pack when no inline
candidates are present, then rerun with generated `TYPE/TEXT` lines.

Shell completion scripts are available for bash, zsh, and PowerShell:

```bash
engram completion bash
engram completion zsh
engram completion powershell
```

## Notes By Host

GitHub Copilot reads repository custom instructions from
`.github/copilot-instructions.md`.
For global Copilot installs, Engram appends its managed block to
`~/.copilot/copilot-instructions.md`.

OpenAI Codex and other AGENTS.md-compatible agents can use `AGENTS.md` as a
project instruction file. Use `engram install-skillset codex` when you want the
command to name Codex directly. The Codex alias also writes
`.agents/skills/engram/SKILL.md`, so agents that discover Agent Skills can route
Engram as an invokable skill.

Claude Code and Cursor support external tool configuration, so Engram can be
registered through `.mcp.json` where that wrapper is accepted. The `slash`
target also writes Claude and Cursor project-level command files for `/engram`.
For Claude, Engram writes both the classic command file and the newer skill file
because Claude Code supports both forms for slash invocation.
For global Claude installs, Engram appends its managed block to
`~/.claude/CLAUDE.md` and writes the Claude skill to
`~/.claude/skills/engram/SKILL.md`.
The generated slash description is: "Your knowledge memory manager, synced
across every device with Git."
MCP hosts should treat `engram_save` and `engram_autosave` as proposal-only
tools; they must still route final writes through the human-visible CLI approval
flow. When `/engram save-session --query-level <n>` is present, or natural
wording such as `/engram ss -a last 50 sessions` is used, the host may include
up to n recent accessible human-agent chat sessions in the proposal context, but
must not invent inaccessible history. Explicit
`/engram save-session --accept-all` requests, including the shortcut
`/engram ss -a`, should use the CLI write path because MCP autosave remains
proposal-only. The counted shortcut `/engram ss -a last 50 sessions` should use
`engram save-session --query-level 50 --accept-all`. Legacy
`/engram autosave --accept-all` and `/engram at -a` remain compatible. `/engram take-control` and `/engram metacognize` should use the CLI flow because they need
workspace source discovery plus human-visible approval. Slash adapters normalize
`/engram auto save` to `engram save-session` and `/engram take control accept all`
to `engram take-control --accept-all`; normalize `/engram restructure workspace
memory accept all` to `engram metacognize --workspace --accept-all`,
`/engram take control accept all metacognize` to
`engram take-control --accept-all --metacognize`, and
`/engram resolve conflicts and metacognize` to
`engram resolve-conflicts --metacognize`.
`/engram observe`, `/engram archive`, and `/engram benchmark` should use the CLI
flow. `engram load` is graph-aware automatically because it reads the derived
`memory.graph.json` when graph routing is enabled, includes declared
`depends_on` prerequisites before dependent memories, refines broad candidate
pools to the configured load limit, and reports narrowing tags in `--dry-run`.

Gemini CLI searches for `GEMINI.md` files as context. The `slash` target writes
`.gemini/commands/engram.toml` so `/engram <args>` becomes a project custom
command in Gemini CLI. For now, Engram also treats `gemini` as the advertised
target for Antigravity 2.0, Antigravity CLI, and Antigravity IDE because current
Google docs still tie Antigravity context and skills to Gemini-compatible
locations. The hidden `antigravity` and `antigravity-cli` target names remain
explicit compatibility paths, but they are not shown in `engram is list`, help,
completion, or `all`.

For hooks, `gemini` is also the public Antigravity fallback. The hidden
`antigravity` and `antigravity-cli` hook targets normalize to Gemini hook
behavior and paths until Google publishes stable primary Antigravity hook/config
documentation.

OpenCode reads `AGENTS.md` rules, and it can also load reusable instruction
files through the `instructions` field in `opencode.json`. Engram uses
`opencode.json` so it can add its guidance without replacing a human-authored
`AGENTS.md`.

## References

- [GitHub Copilot repository custom instructions](https://docs.github.com/en/copilot/how-tos/custom-instructions/adding-repository-custom-instructions-for-github-copilot)
- [GitHub Copilot CLI hooks](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/use-hooks)
- [Claude Code MCP](https://code.claude.com/docs/en/mcp)
- [Claude Code skills and custom slash commands](https://code.claude.com/docs/en/slash-commands)
- [Cursor MCP](https://docs.cursor.com/context/model-context-protocol)
- [Cursor hooks](https://cursor.com/docs/hooks)
- [Cursor custom commands](https://docs.cursor.com/en/agent/chat/commands)
- [Gemini CLI context files](https://google-gemini.github.io/gemini-cli/docs/cli/gemini-md.html)
- [Gemini CLI hooks](https://geminicli.com/docs/hooks/)
- [Gemini CLI custom commands](https://github.com/google-gemini/gemini-cli/blob/main/docs/cli/custom-commands.md)
- [Cline hooks](https://docs.cline.bot/customization/hooks)
- [Windsurf Cascade hooks](https://docs.devin.ai/desktop/cascade/hooks)
- [AGENTS.md](https://github.com/openai/agents.md)
- [Codex Agent Skills](https://developers.openai.com/codex/skills)
- [Antigravity CLI migration from Gemini CLI](https://www.antigravity.google/docs/gcli-migration)
- [Antigravity Agent Skills](https://antigravity.google/docs/skills)
- [Antigravity CLI features](https://antigravity.google/docs/cli-features)
- [OpenCode rules and custom instructions](https://opencode.ai/docs/rules/)
