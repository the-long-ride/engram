# AI-Agent Quickstart

Лучше начинать с использования Engram через agent. CLI есть, но хороший поток такой: попросить agent загрузить memory, выполнить работу, затем предложить долговечную memory.

## Первое Сообщение В Session

```text
Use Engram for this task. Load memory for: <what we are doing>.
```

Если установлены slash adapters:

```text
/engram load "<current task>"
```

Agent должен кратко перечислить релевантные memory IDs/rules, а не вставлять все файлы.

## Recommended Setup

```text
Initialize Engram for this workspace, install the right skillset for this agent,
and tell me what command I should use next.
```

```bash
engram init
engram help install-skillset
engram install-skillset <agent-name>
```

Для chat-native использования:

```text
Install slash support so I can use /engram directly from this agent.
```

## Daily Loop

```text
/engram load "current task"
/engram search "topic I might be missing"
/engram save knowledge
/engram save-session
/engram ss
```

Accept-all только когда вы действительно этого хотите:

```text
/engram ss -a
```

`-a` означает явное human approval для всех agent-recommended candidates. Agent не должен добавлять его сам.

## Import Existing Knowledge

```text
/engram take-control --plan
/engram take-control --all
```

`--plan` показывает selected sources, skipped reasons, token estimates и вероятные memory types.

## Global Memory

```text
Set up global Engram memory at <path>, then save this preference globally:
Use pnpm for package management.
```

```bash
engram init --global-only --global-path <path>
engram save --scope global "Use pnpm for package management."
```

## Health

```text
Check Engram health, report invalid memories, and propose anything worth saving from this session.
```

```bash
engram verify
engram repair
engram graph "<topic>"
engram quality-check
engram archive --reason "<why>" <id-or-file>
```

Далее: [Protocol](protocol.md).

