# Engram Skillset Contract

Engram is a portable memory skillset for AI agents. Hosts can integrate it by
calling the CLI, registering the MCP server, or loading generated instruction
files such as Codex-compatible `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, Copilot
instructions, Antigravity `SKILL.md` files, and OpenCode custom instruction
files. Hosts that support custom slash commands can also load generated
`/engram` adapters.

## Required Behaviors

- Load memory with workspace-first, global-fallback resolution.
- Never load all memory blindly; route by task intent.
- Never write memory silently.
- Treat `engram_save` and `engram save` as proposal flows with human approval.
- Run sensitive-data and prompt-injection guards before writing or loading.
- Verify hashes before trusting memory files.
- Stage only `.engram/` files during `engram resolve-conflicts`.
- Ask before adding a global Git `origin`; once configured, global saves and
  syncs may pull, auto-resolve Engram-owned memory conflicts, commit, and push.
- Treat `/engram <args>` as a human-visible router to `engram <args>` or the
  matching MCP read/proposal tool.

## Tool Contract

| Tool | Purpose | Writes files |
| --- | --- | --- |
| `engram_load` | Route and return relevant memory for a task | No |
| `engram_search` | Search memory by query | No |
| `engram_verify` | Check memory hashes | No |
| `engram_status` | Return health and counts | No |
| `engram_save` | Return a memory proposal for human review | No |

The MCP save tool intentionally does not write. A host must display the proposal
and collect explicit human approval before invoking a CLI write flow.

## CLI Contract

| Command | Purpose |
| --- | --- |
| `engram init [--global-remote <git-url>]` | Create workspace memory and initialize global memory Git |
| `engram entry` | Print resolved flags, paths, and detected global Git state |
| `engram load "<task>"` | Load relevant memory |
| `engram save rule "<text>"` | Propose and write after A/B/C approval |
| `engram verify` | Check hash integrity |
| `engram resolve-conflicts` | Resolve and stage only `.engram/` conflicts |
| `engram install-skillset all` | Install agent-host instruction files |
| `engram install-skillset slash` | Install slash-command adapters |
| `engram sync` | Sync global memory Git and refresh live-sync targets |

## Slash Contract

`/engram` adapters must expose the whole Engram command surface by passing the
arguments after `/engram` to the Engram CLI. For read and proposal commands,
hosts may prefer MCP tools:

| Slash request | Preferred route |
| --- | --- |
| `/engram load <query>` | `engram_load` or `engram load <query>` |
| `/engram search <query>` | `engram_search` or `engram search <query>` |
| `/engram verify [scope]` | `engram_verify` or `engram verify [scope]` |
| `/engram health` | `engram_status` or `engram health` |
| `/engram save ...` | `engram_save` proposal or CLI approval flow |
| `/engram <other command>` | `engram <other command>` CLI flow |

The slash adapter must not write memory by itself. It only asks the agent to run
the same CLI/MCP flow the human could inspect directly.

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
