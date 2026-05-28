# Agent Integrations

Engram supports two integration layers:

- **Skill files:** generated instructions for agents that read project context.
- **Slash adapters:** generated `/engram` command prompts for agents that
  support project slash commands or Agent Skills.
- **MCP tools:** a shared tool interface for agents that support MCP.

Run:

```bash
engram install-skillset all
```

This writes supported adapter files without overwriting human-authored files.
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
| `mcp` | `.mcp.json` | MCP server registration |
| `slash` | `.claude/skills/engram/SKILL.md`, `.cursor/commands/engram.md`, `.gemini/commands/engram.toml` | Native `/engram` slash adapters |

Aliases: `codex` installs the `agents-md` adapter plus the Agent Skill file,
`antigravity` maps to `antigravity-cli`, and `open-code` maps to `opencode`.

## Recommended Flow

1. Install skillset files:

   ```bash
   engram install-skillset all
   ```

2. Initialize memory:

   ```bash
   engram init
   ```

   If `engram entry` shows no `global_git_detected.remote_url`, ask the human
   whether global memory should be shared through Git. When they provide a URL,
   run:

   ```bash
   engram init --global-remote <git-url>
   ```

3. Ask the agent to use Engram memory:

   ```text
   Before working, load Engram memory for this task.
   ```

4. If the host supports MCP, register `.mcp.json` or equivalent host config.

5. If the host supports custom slash commands, type:

   ```text
   /engram load deployment workflow
   /engram entry
   /engram save knowledge
   /engram verify
   ```

## Notes By Host

GitHub Copilot reads repository custom instructions from
`.github/copilot-instructions.md`.

OpenAI Codex and other AGENTS.md-compatible agents can use `AGENTS.md` as a
project instruction file. Use `engram install-skillset codex` when you want the
command to name Codex directly. The Codex alias also writes
`.agents/skills/engram/SKILL.md`, so agents that discover Agent Skills can route
Engram as an invokable skill.

Claude Code and Cursor support MCP server configuration, so Engram should be
registered as an MCP server when available. The `slash` target also writes
Claude and Cursor project-level command files for `/engram`.

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
