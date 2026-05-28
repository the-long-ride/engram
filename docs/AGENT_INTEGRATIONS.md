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

This creates `.engram/` and installs the compact Codex target by default:
`AGENTS.md` plus `.agents/skills/engram/SKILL.md`. The generated instructions
tell agents to load memory, keep Engram replies short, ask only for required
confirmation, and report what changed.

Use `engram init --no-skillset` to skip agent files, or
`engram init --skillset all` to install every supported adapter during init.
Existing human-authored files are skipped.

To add or refresh adapters later:

```bash
engram install-skillset all
```

Use `--force` only when replacing generated Engram adapter files intentionally.

## Supported Targets

| Target | File | Main use |
| --- | --- | --- |
| `codex` | `AGENTS.md`, `.agents/skills/engram/SKILL.md` | OpenAI Codex project instructions and Agent Skill |
| `agents-md` | `AGENTS.md` | AGENTS.md-compatible agents |
| `copilot` | `.github/copilot-instructions.md` | GitHub Copilot repository instructions |
| `claude` | `CLAUDE.md` | Claude Code project guidance |
| `cursor` | `.cursor/rules/engram.mdc` | Cursor project rules |
| `gemini` | `GEMINI.md` | Gemini CLI context |
| `cline` | `.clinerules` | Cline-style workspace rules |
| `windsurf` | `.windsurfrules` | Windsurf workspace rules |
| `antigravity-cli` | `.agents/skills/engram/SKILL.md` | Antigravity CLI workspace skill |
| `opencode` | `opencode.json`, `.opencode/engram.md` | OpenCode custom instructions |
| `mcp` | `.mcp.json` | MCP-style JSON-lines wrapper registration |
| `slash` | `.claude/skills/engram/SKILL.md`, `.cursor/commands/engram.md`, `.gemini/commands/engram.toml` | Native `/engram` slash adapters |

Aliases: `codex` installs the `agents-md` adapter plus the Agent Skill file,
`antigravity` maps to `antigravity-cli`, and `open-code` maps to `opencode`.

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

   If the human wants `.engram` tracked as a separate repository, ask whether to
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

3. If the host supports external tool processes, register `.mcp.json` or equivalent host config.

4. If the host supports custom slash commands, type:

   ```text
   /engram load deployment workflow
   /engram entry
   /engram save knowledge
   /engram autosave
   /engram help set-role
   /engram set-rule-variant strict
   /engram verify
   ```

   `engram save` captures the best single memory candidate, automatically
   updates a matching memory or creates a new one, and always shows the A/B/C
   approval gate before writing. For long sessions with several possible rules,
   knowledge facts, or workflows, agents should suggest `engram autosave`; if
   the human declines, continue with the best single `engram save` candidate.
   For transcripts or long summaries already on disk, use
   `engram autosave --file transcript.md`. The autosave approval prompt supports
   selected candidate replies such as `A 1,3`.

   Generated knowledge should be objective and durable. Corrections and
   preferences become rules. Repeatable procedures become workflows/skills.
   Save role-specific memory with `engram save --role frontend ...` or
   `engram autosave --role backend ...`. Role routing can be tuned with
   `engram set-role frontend`, `engram set-role backend security`, or
   `engram set-role` to clear active roles.

   Rule variant mode is useful when a model needs lighter or stricter
   instruction wording. Strict helps lower-tier models stay controlled; stronger
   models usually benefit from light or balanced wording so rules do not limit
   their reasoning. When variants are off, Engram renders balanced rule wording
   by default.

## Command Discovery

Run `engram -h` for the compact command surface. Run `engram help <topic>` or
`engram -h <topic>` for command-specific examples and use cases:

```bash
engram help autosave
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
MCP hosts should treat `engram_save` and `engram_autosave` as proposal-only
tools; they must still route final writes through the human-visible CLI approval
flow.

Gemini CLI searches for `GEMINI.md` files as context. The `slash` target writes
`.gemini/commands/engram.toml` so `/engram <args>` becomes a project custom
command in Gemini CLI.

Antigravity CLI discovers workspace skills from `.agents/skills/<skill>/`, so
Engram installs a native `SKILL.md` adapter there.

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
