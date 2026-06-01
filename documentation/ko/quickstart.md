# AI Agent Quickstart

Engram은 먼저 agent를 통해 쓰는 것이 좋습니다. CLI도 있지만, 가장 좋은 흐름은 agent에게 memory를 load시키고, 작업 후 오래 보존할 내용을 제안하게 하는 것입니다.

## 새 Session 첫 메시지

```text
Use Engram for this task. Load memory for: <what we are doing>.
```

slash adapter가 있으면:

```text
/engram load "<current task>"
```

agent는 관련 memory ID와 rules만 요약해야 하며 전체 파일을 붙여 넣으면 안 됩니다.

## 추천 Setup

```text
Initialize Engram for this workspace, install the right skillset for this agent,
and tell me what command I should use next.
```

```bash
engram init
engram help install-skillset
engram install-skillset <agent-name>
```

chat에서 바로 쓰고 싶다면:

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

정말 모두 승인할 때만:

```text
/engram ss -a
```

`-a`는 인간이 모든 agent-recommended candidates를 명시적으로 승인했다는 뜻입니다. agent가 스스로 추가하면 안 됩니다.

## Existing Knowledge 가져오기

```text
/engram take-control --plan
/engram take-control --all
```

`--plan`은 선택된 파일, skip 이유, token estimates, 예상 memory type을 보여줍니다.

## Global Memory

```text
Set up global Engram memory at <path>, then save this preference globally:
Use pnpm for package management.
```

```bash
engram init --global-only --global-path <path>
engram save --scope global "Use pnpm for package management."
```

## Health 유지

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

다음: [Protocol](protocol.md).

