# AI-Agent Quickstart

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

The agent should summarize only relevant memory IDs and rules, not paste every file.

## Recommended Setup Conversation

Ask the agent:

```text
Initialize Engram for this workspace, install the right skillset for this agent,
and tell me what command I should use next.
```

The agent can run:

```bash
engram init
engram help install-skillset
engram install-skillset <agent-name>
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

Accept-all shortcut only when you truly mean it:

```text
/engram ss -a
```

`-a` means the human explicitly approves every agent-recommended candidate. Agents must not add it by themselves.

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
engram init --global-only --global-path <path>
engram save --scope global "Use pnpm for package management."
```

## Keep It Healthy

Ask the agent at the end of meaningful work:

```text
Check Engram health, report invalid memories, and propose anything worth saving from this session.
```

Useful commands:

```bash
engram verify
engram repair
engram graph "<topic>"
engram quality-check
engram archive --reason "<why>" <id-or-file>
```

Next: [Human-owned protocol](protocol.md).

