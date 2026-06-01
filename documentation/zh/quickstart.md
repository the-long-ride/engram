# AI Agent 快速开始

优先通过 agent 使用 Engram。CLI 存在，但最佳体验是让 agent 加载记忆、完成任务，然后把有价值的内容提议为持久记忆。

## 新会话第一句话

```text
Use Engram for this task. Load memory for: <what we are doing>.
```

如果已安装 slash adapter：

```text
/engram load "<current task>"
```

agent 应只总结相关 memory ID 和规则，不应粘贴所有文件。

## 推荐设置

```text
Initialize Engram for this workspace, install the right skillset for this agent,
and tell me what command I should use next.
```

agent 可运行：

```bash
engram init
engram help install-skillset
engram install-skillset <agent-name>
```

如果想在聊天里直接使用：

```text
Install slash support so I can use /engram directly from this agent.
```

## 日常循环

```text
/engram load "current task"
/engram search "topic I might be missing"
/engram save knowledge
/engram save-session
/engram ss
```

只有明确想接受全部候选时才用：

```text
/engram ss -a
```

`-a` 表示人类明确批准保存所有 agent 推荐候选。agent 不能自行添加。

## 导入已有知识

```text
/engram take-control --plan
/engram take-control --all
```

`--plan` 会显示选中文件、跳过原因、token 估算和可能的记忆类型。

## Global Memory

```text
Set up global Engram memory at <path>, then save this preference globally:
Use pnpm for package management.
```

```bash
engram init --global-only --global-path <path>
engram save --scope global "Use pnpm for package management."
```

## 维护

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

下一页：[协议](protocol.md)。

