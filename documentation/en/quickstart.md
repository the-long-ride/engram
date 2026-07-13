# AI-Agent Quickstart

## AI-Agent Chat Approval

In AI-agent chat, Engram approval is conversational. The agent shows refined `TYPE: ... | TEXT: ...` candidates first, including Light/Balanced/Strict variants for rules. Reply `yes` to save the exact candidates, `audit` to revise them, or `cancel` to stop. After `yes`, the agent uses `engram save-session --force` with the exact approved candidates. Direct terminal CLI saves still use A/B/C unless a force command was explicitly invoked.


Use Engram through your agent first. The CLI exists, but the best experience is: ask the agent to load memory, do the work, then propose durable memory when something useful emerges.

## First Message In A New Session

Ask:

```text
Use Engram for this task. Load memory for: <what we are doing>.
```

If slash adapters are installed:

```text
/engram load "<current task>"
```

The agent should reply with a compact count line by default, such as `Engram loaded: 8 memories / 24 total related memories.` With slash adapters, plain `load` is now the compact agent-facing route. Use `/engram load --full "<current task>"` only when broader legacy output is needed.

When an agent needs a self-contained Engram usage guide, run:

```bash
engram llm
```

This prints the packaged `llm.txt` guide and does not require `engram inject`.

## Recommended Setup Conversation

Ask the agent:

```text
Inject Engram memory routing for this workspace, configure it, and connect this agent.
```

The agent will suggest running:

```bash
engram entry
```

To configure memory and link AI agents in a clean web UI. Under the hood, to initialize the workspace:

```bash
engram inject
```

To link the same agent globally, so new workspaces can load Engram global memory without running `engram inject` first:

```bash
engram link --global <agent-name>
```

For chat-native use, ask:

```text
Install slash support so I can use /engram directly from this agent.
```

## Daily Loop

Start:

```text
/engram load "current task"
```

During work:

```text
/engram search "topic I might be missing"
```

When the agent learns one durable fact:

```text
/engram save knowledge
```

When the session produced several useful rules, facts, or workflows:

```text
/engram save-session
```

Short form:

```text
/engram ss
```

To include recent chat history the agent can actually access:

```text
/engram save-session --query-level 3
```

`--query-level` must be a positive integer. The agent may use up to that many recent human-agent chat sessions, including the current one, and must not invent unavailable history.

Force shortcut only when you truly mean it:

```text
/engram ss -f
```

`-f` means the human explicitly approves every agent-recommended candidate. Agents must not add it by themselves.
Ready candidates are saved immediately. If Engram defers a candidate because related memory needs review, load the listed IDs with `engram load --id ...`, then rerun only that candidate with `DEPENDS_ON: memory-id` or `UPDATE: memory-id`. Listed IDs are inspection refs, not proof the deferred candidate was saved.

To mine recent accessible chats and force-save generated candidates in one request:

```text
/engram ss -f last 50 sessions
```

That normalizes to `engram save-session --query-level 50 --force`.

## Import Existing Knowledge

For a repo that already has `AGENTS.md`, `CLAUDE.md`, Cursor rules, notes, or docs:

```text
/engram take-control --plan
/engram take-control --all
```

Use `--plan` first when you want to see selected files, skipped files, token estimates, and likely memory types.

## Global Memory

Use global memory for preferences that should follow you across repos:

```text
Set up global Engram memory at <path>, then save this preference globally:
Use pnpm for package management.
```

The agent may use:

```bash
engram inject --global-only --global-path <path>
engram save --scope global "Use pnpm for package management."
engram link --global <agent-name>
```

When inject sees configured global memory, it creates or selects a user default
profile for that global root so future workspaces can reuse it.

## Keep It Healthy

Ask the agent at the end of meaningful work:

```text
Check Engram health, report invalid memories, and propose anything worth saving from this session.
```

Useful commands:

```bash
engram upgrade
engram upgrade --plan
engram verify
engram repair
engram graph "<topic>"
engram quality-check
engram archive --reason "<why>" <id-or-file>
```

Next: [Human-owned protocol](protocol.md).
