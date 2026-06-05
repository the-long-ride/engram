# Agent Integrations

Engram supports two integration layers:

- **Skill files:** generated instructions for agents that read project context.
- **Slash adapters:** generated `/engram` command prompts for agents that
  support project slash commands or Agent Skills.
- **MCP-style tools:** a JSON-lines wrapper for agents that can register
  external tool processes.

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
When any global memory path is configured, approved workspace save flows also
include a global copy in the approval preview, even if the current workspace has
not run `engram init`.

To add or refresh adapters later:

```bash
engram install-skillset all
```

Use `--force` only when replacing generated Engram adapter files intentionally.
Claude receives both `.claude/commands/engram.md` and
`.claude/skills/engram/SKILL.md` so `/engram` appears in older command menus and
newer skill-aware Claude Code sessions.

## Supported Targets

| Target | File | Main use |
| --- | --- | --- |
| `codex` | `AGENTS.md`, `.agents/skills/engram/SKILL.md` | OpenAI Codex project instructions and Agent Skill |
| `agents-md` | `AGENTS.md` | Generic fallback for unlisted AGENTS.md-compatible agents |
| `copilot` | `.github/copilot-instructions.md` | GitHub Copilot repository instructions |
| `claude` | `CLAUDE.md` | Claude Code project guidance |
| `cursor` | `.cursor/rules/engram.mdc` | Cursor project rules |
| `gemini` | `GEMINI.md` | Gemini CLI context |
| `cline` | `.clinerules` | Cline-style workspace rules |
| `windsurf` | `.windsurfrules` | Windsurf workspace rules |
| `antigravity` | `.antigravity/skills/engram/SKILL.md`, `.antigravity-cli/skills/engram/SKILL.md`, `.antigravity-ide/skills/engram/SKILL.md`, `.antigravityrules` | Antigravity 2.0, CLI, IDE, and workspace rules |
| `opencode` | `opencode.json`, `.opencode/engram.md` | OpenCode custom instructions |
| `mcp` | `.mcp.json` | MCP-style JSON-lines wrapper registration |
| `slash` | `.claude/commands/engram.md`, `.claude/skills/engram/SKILL.md`, `.cursor/commands/engram.md`, `.gemini/commands/engram.toml` | Native `/engram` slash adapters |

Aliases: `codex` installs the `agents-md` adapter plus the generic Agent Skill
file, `open-code` maps to `opencode`, and the old `antigravity-cli` spelling is
accepted as a compatibility alias for `antigravity`.

## Recommended Flow

1. Initialize memory:

   ```bash
   engram init
   ```

   Rerun `engram init` after Engram upgrades. Existing workspaces are
   reconciled in place: missing standard files/folders are restored, generated
   help/readme/skillset files are refreshed, config defaults are merged, and
   safe legacy folder migrations are applied without overwriting human-authored
   agent files or memory audit data.
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
   project knowledge, then summarize only the relevant IDs/rules to keep token
   usage low. When a query has more than 8 matching candidates, Engram refines
   the wider candidate pool into a compact top-8 context pack. Agents can use
   `engram load --dry-run "<query>"` to inspect candidate counts and suggested
   narrowing tags before loading broad context.

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
  human-agent chats the agent can actually access. For
  `/engram take-control --accept-all` or natural
  `/engram take control accept all`, the slash adapter should normalize the
  wording, keep the source pack token-light, generate only concise
  `TYPE: ... | TEXT: ...` candidates, pass them to the CLI, and let Engram save
  them without a second approval prompt. The adapter should not paste source
  excerpts or reasoning back into chat.
  For `/engram save-session`, `/engram ss`, legacy `/engram autosave`, or natural `/engram auto save` without a file or inline
  candidates, the slash adapter should use the LLM to define concise candidates
  from the current AI agent chat/session, then pass `TYPE: ... | TEXT: ...`
  lines to Engram for the normal approval flow. If the human includes
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
   Saved take-control memories record `source_files` and `source_hashes`
   frontmatter. Later scans skip unchanged imported sources, while an explicit
   `--file` import still lets the human force a specific source back through the
   approval flow.

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

Shell completion scripts are available for bash, zsh, and PowerShell:

```bash
engram completion bash
engram completion zsh
engram completion powershell
```

## Notes By Host

GitHub Copilot reads repository custom instructions from
`.github/copilot-instructions.md`.

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
`/engram autosave --accept-all` and `/engram at -a` remain compatible. `/engram take-control` should use the CLI flow because it needs
workspace source discovery plus human-visible approval. Slash adapters normalize
`/engram auto save` to `engram save-session` and `/engram take control accept all`
to `engram take-control --accept-all`.
`/engram observe`, `/engram archive`, and `/engram benchmark` should use the CLI
flow. `engram load` is graph-aware automatically because it reads the derived
`memory.graph.json` when graph routing is enabled, refines broad candidate
pools to the top 8, and reports narrowing tags in `--dry-run`.

Gemini CLI searches for `GEMINI.md` files as context. The `slash` target writes
`.gemini/commands/engram.toml` so `/engram <args>` becomes a project custom
command in Gemini CLI.

Antigravity now has three workspace surfaces. `engram install-skillset
antigravity` writes the Engram skill to `.antigravity/skills/engram/SKILL.md`
for Antigravity 2.0, `.antigravity-cli/skills/engram/SKILL.md` for the CLI,
and `.antigravity-ide/skills/engram/SKILL.md` for the IDE. It also writes a
root `.antigravityrules` file so local workspace rules can point Antigravity at
the Engram protocol. The deprecated `antigravity-cli` target name still works as
a compatibility alias, but generated docs and completions advertise
`antigravity`.

OpenCode reads `AGENTS.md` rules, and it can also load reusable instruction
files through the `instructions` field in `opencode.json`. Engram uses
`opencode.json` so it can add its guidance without replacing a human-authored
`AGENTS.md`.

## References

- [GitHub Copilot repository custom instructions](https://docs.github.com/en/copilot/how-tos/custom-instructions/adding-repository-custom-instructions-for-github-copilot)
- [Claude Code MCP](https://code.claude.com/docs/en/mcp)
- [Claude Code skills and custom slash commands](https://code.claude.com/docs/en/slash-commands)
- [Cursor MCP](https://docs.cursor.com/context/model-context-protocol)
- [Cursor custom commands](https://docs.cursor.com/en/agent/chat/commands)
- [Gemini CLI context files](https://google-gemini.github.io/gemini-cli/docs/cli/gemini-md.html)
- [Gemini CLI custom commands](https://github.com/google-gemini/gemini-cli/blob/main/docs/cli/custom-commands.md)
- [AGENTS.md](https://github.com/openai/agents.md)
- [Codex Agent Skills](https://developers.openai.com/codex/skills)
- [Antigravity Agent Skills](https://antigravity.google/docs/skills)
- [Antigravity CLI features](https://antigravity.google/docs/cli-features)
- [OpenCode rules and custom instructions](https://opencode.ai/docs/rules/)
