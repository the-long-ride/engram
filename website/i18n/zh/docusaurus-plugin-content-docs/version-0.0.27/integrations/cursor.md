---
title: Cursor
sidebar_position: 5
description: 通过规则、MCP、本地插件、斜杠命令和会话启动 hook 实现 Engram 与 Cursor 的集成。
---

# Cursor

Cursor 从 `.cursor/rules/*.mdc` 文件中读取项目规则。Engram 写入 `.cursor/rules/engram.mdc`，其中包含有效的 frontmatter (`alwaysApply: true`) 和引导指令块。

## 安装

```bash
engram link cursor
```

## 写入的文件

| 文件 | 用途 |
| --- | --- |
| `.cursor/rules/engram.mdc` | 具有 `alwaysApply: true` 的项目规则 |
| `.cursor/mcp.json` | MCP 注册 (`type: "stdio"`) |
| `.cursor/hooks.json` | `sessionStart` hook |
| `.cursor/commands/engram.md` | `/engram` 斜杠适配器 |

## 全局安装

```bash
engram link --global cursor
```

Engram 在 `~/.cursor/plugins/local/engram/` 中创建一个本地插件，其中包含插件清单、规则、skill、命令、MCP 配置和 hook。

## 运行时优先目标

Cursor 是一个运行时优先的目标。项目规则包含简短的引导指令，这些指令依赖 MCP 工具和 hook 来执行详细协议；Agent Skill 文件承载了完整的写入/审批工作流。

## Hook 行为

`sessionStart` hook 通过 `additional_context` 输出字段注入 Engram 启动上下文。`beforeSubmitPrompt` 仅用于允许/阻止，不用于上下文注入。

## 后续步骤

- [Agent 集成概述](overview.md)
- [Hook 和验证行](hooks.md)
