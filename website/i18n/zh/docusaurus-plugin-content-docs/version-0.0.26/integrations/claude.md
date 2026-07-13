---
title: Claude
sidebar_position: 3
description: 通过 CLAUDE.md、斜杠命令、Agent Skills、MCP 和 hook 实现 Engram 与 Claude Code 的集成。
---

# Claude

Claude Code 读取 `CLAUDE.md` 以获取项目指导，并通过 `.mcp.json` 支持外部工具配置。

## 安装

```bash
engram link claude
```

## 写入的文件

| 文件 | 用途 |
| --- | --- |
| `CLAUDE.md` | 项目引导启动程序 |
| `.claude/commands/engram.md` | 经典 `/engram` 斜杠命令 |
| `.claude/skills/engram/SKILL.md` | 用于斜杠调用的 Agent Skill |
| `.claude/settings.json` | `SessionStart` 和 `UserPromptSubmit` hook |
| `.mcp.json` | MCP 注册 |

Claude 会同时接收 `.claude/commands/engram.md` 和 `.claude/skills/engram/SKILL.md`，因此 `/engram` 会出现在较旧的命令菜单和较新的支持 Skill 的 Claude Code 会话中。

## 全局安装

```bash
engram link --global claude
```

Engram 会向 `~/.claude/CLAUDE.md` 追加一个托管块（保留用户文本），并将 Claude skill 写入 `~/.claude/skills/engram/SKILL.md`。全局 MCP 会写入 `~/.claude/mcp.json`。

## 运行时优先目标

Claude 是一个运行时优先的目标。`CLAUDE.md` 包含简短的引导指令，这些指令依赖 MCP 工具和 hook 来执行详细协议；Agent Skill 文件承载了完整的写入/审批工作流。

## Hook 行为

Claude 支持启动时和提示词（prompt）时的附加上下文注入。`SessionStart` 在启动时加载路由内存；`UserPromptSubmit` 仅在路由的 Engram 上下文发生变化时重新注入。

## 后续步骤

- [Agent 集成概述](overview.md)
- [斜杠适配器](slash.md)
- [MCP 工具](mcp.md)
