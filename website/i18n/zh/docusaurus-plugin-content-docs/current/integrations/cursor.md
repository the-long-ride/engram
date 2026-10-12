---
title: Cursor
sidebar_position: 5
description: Engram 通过规则、MCP、本地插件、斜杠命令和会话启动 hook 与 Cursor 集成。
---

# Cursor

Cursor 从 `.cursor/rules/*.mdc` 文件中读取项目规则。Engram 会写入 `.cursor/rules/engram.mdc`，其中包含有效的 frontmatter（`alwaysApply: true`）和一个引导指令块。

## 安装

```bash
engram link cursor
```

## 写入的文件

| 文件 | 用途 |
| --- | --- |
| `.cursor/rules/engram.mdc` | 带有 `alwaysApply: true` 的项目规则 |
| `.cursor/mcp.json` | MCP 注册（`type: "stdio"`） |
| `.cursor/rules/engram/<id>.mdc` | 为每条带有 `applies_to` 的工作区记忆生成一条规则（`alwaysApply: false`，以逗号连接的 glob）；工作层记忆绝不会被写入 |
| `.cursor/hooks.json` | `sessionStart` hook |
| `.cursor/commands/engram.md` | `/engram` 斜杠适配器 |

## 全局安装

```bash
engram link --global cursor
```

Engram 会在 `~/.cursor/plugins/local/engram/` 创建一个本地插件，其中包含插件清单、规则、skill、命令、MCP 配置和 hook。

## 运行时优先的目标

Cursor 是运行时优先（runtime-first）的目标。项目规则包含简短的引导指令，详细协议依赖 MCP 工具和 hook；配套指南承载完整的写入/审批工作流程，Agent Skill 文件则是指向它的简短指引。

## Hook 行为

`sessionStart` hook 通过 `additional_context` 输出字段注入 Engram 的启动上下文。`beforeSubmitPrompt` 只支持允许/阻止，不用于上下文注入。

## 导出格式

`engram export --format cursor-rules` 会写入 `.cursor/rules/engram.mdc`，其 frontmatter 含 `description` 和 `alwaysApply: false`。它取代了 `cursorrules`，后者在一个版本内仍作为可接受的别名，并会在 stderr 上打印弃用提示。`live_sync.targets` 使用新的名称。

## 后续步骤

- [Agent 集成概览](overview.md)
- [Hooks 与证明行](hooks.md)
