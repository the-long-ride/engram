# AI Agent Quickstart

Engram はまず agent 経由で使うのが最適です。CLI もありますが、よい流れは agent に memory を load させ、作業し、最後に残す価値のある知識を提案させることです。

## 新しい Session の最初

```text
Use Engram for this task. Load memory for: <what we are doing>.
```

slash adapter がある場合:

```text
/engram load "<current task>"
```

agent は関連 memory ID/rule だけを要約し、全ファイルを貼り付けないでください。

## 推奨 Setup

```text
Initialize Engram for this workspace, install the right skillset for this agent,
and tell me what command I should use next.
```

```bash
engram init
engram help install-skillset
engram install-skillset <agent-name>
```

chat で直接使うなら:

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

本当に全候補を承認する時だけ:

```text
/engram ss -a
```

`-a` は人間がすべての agent-recommended candidates を明示承認した意味です。agent が勝手に追加してはいけません。

## 既存 Knowledge の取り込み

```text
/engram take-control --plan
/engram take-control --all
```

`--plan` は選択ファイル、skip 理由、token estimates、想定 memory type を表示します。

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

次: [Protocol](protocol.md)。

