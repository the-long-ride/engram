---
title: Codex
sidebar_position: 2
description: 通过 AGENTS.md 和 Agent Skills 实现 Engram 与 OpenAI Codex 的集成。
---

# Codex

OpenAI Codex 和其他兼容 AGENTS.md 的 Agent 将 `AGENTS.md` 用作项目指令文件。`codex` 别名还会写入 `.agents/skills/engram/SKILL.md`，以便发现 Agent Skills 的 Agent 可以将 Engram 路由为可调用的 skill。

## 安装

```bash
engram link codex
```

## 写入的文件

| 文件 | 用途 |
| --- | --- |
| `AGENTS.md` | 项目指令引导启动程序 |
| `.agents/skills/engram/SKILL.md` | 具有完整写入/审批工作流的 Agent Skill |
| `.codex/hooks.json` | `SessionStart` 和 `UserPromptSubmit` hook |
| `.mcp.json` | MCP 注册 |

## 全局安装

```bash
engram link --global codex
```

将 Codex skill 写入 `~/.codex/skills/engram/SKILL.md` 并向共享的 Codex 指令文件追加一个托管块。

## Hook 行为

Codex 支持启动时和提示词（prompt）时的附加上下文注入。`SessionStart` 在启动时加载路由内存；`UserPromptSubmit` 仅在路由的 Engram 上下文发生变化时重新注入。

## 运行时优先目标

Codex 是一个运行时优先的目标。`AGENTS.md` 包含简短的引导指令，这些指令依赖 MCP 工具和 hook 来执行详细协议；Agent Skill 文件承载了完整的写入/审批工作流。

## 后续步骤

- [Agent 集成概述](overview.md)
- [Hook 和验证行](hooks.md)
