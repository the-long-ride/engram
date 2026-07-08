---
title: 斜杠适配器
sidebar_position: 10
description: Engram 斜杠适配器在 Claude、Cursor、Gemini 和 OpenCode 之间提供 /engram 命令。
---

# 斜杠适配器

`slash` 目标向支持项目斜杠命令或 Agent Skills 的主机写入原生 `/engram` 斜杠适配器。

## 写入的文件

| 文件 | 主机 |
| --- | --- |
| `.claude/commands/engram.md` | Claude Code |
| `.claude/skills/engram/SKILL.md` | Claude Code (skill 形式) |
| `.cursor/commands/engram.md` | Cursor |
| `.gemini/commands/engram.toml` | Gemini CLI |
| `.opencode/commands/engram.md` | OpenCode |

## 常见命令

```text
/engram
/engram propose
/engram load deployment workflow
/engram entry
/engram save knowledge
/engram save-session
/engram save-session --query-level 3
/engram ss
/engram ss -a
/engram ss -a last 50 sessions
/engram take-control
/engram take control accept all
/engram restructure workspace memory accept all
/engram resolve conflicts and metacognize
/engram graph release workflow
/engram archive --reason "Superseded" knowledge/old-fact.md
/engram set-rule-variant strict
/engram verify
```

## 行为

如果主机仅公开一个可见的 `/engram` 命令，那么单独的 `/engram` 应返回 `load`、`search`、`save`、`propose`、`entry` 和 `help` 的紧凑菜单，而不是运行 CLI。`/engram propose` 是斜杠级别的别名：将其规范化为当前聊天/会话中的 `engram save-session`。

`/engram ss -a` 是接受全部快捷方式。除非人类明确要求，否则 Agent 不得添加 `--accept-all`。

## 自然语言规范化

| 自然语言 | 规范化为 |
| --- | --- |
| `/engram auto save` | `engram save-session` |
| `/engram take control accept all` | `engram take-control --accept-all` |
| `/engram restructure workspace memory accept all` | `engram metacognize --workspace --accept-all` |
| `/engram take control accept all metacognize` | `engram take-control --accept-all --metacognize` |
| `/engram resolve conflicts and metacognize` | `engram resolve-conflicts --metacognize` |
| `/engram ss -a last 50 sessions` | `engram save-session --query-level 50 --accept-all` |

## 后续步骤

- [MCP 工具](mcp.md)
- [Hook 和验证行](hooks.md)
