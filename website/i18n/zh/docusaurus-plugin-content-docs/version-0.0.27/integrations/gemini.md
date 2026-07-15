---
title: Gemini
sidebar_position: 4
description: 通过 Gemini CLI 和 Antigravity 兼容 Gemini 的界面实现 Engram 集成。
---

# Gemini

Gemini CLI 搜索 `GEMINI.md` 文件作为上下文。`slash` 目标写入 `.gemini/commands/engram.toml`，使 `/engram <args>` 成为 Gemini CLI 中的项目自定义命令。

Engram 还将 `gemini` 视为 Antigravity 2.0、Antigravity CLI 和 Antigravity IDE 的公开目标，因为当前的 Google 文档仍将 Antigravity 的上下文和 skill 绑定到兼容 Gemini 的位置。隐藏的目标名称 `antigravity` 和 `antigravity-cli` 仍然是显式的兼容性路径，但它们不会显示在 `engram link list`、帮助、自动补全或 `all` 中。

## 安装

```bash
engram link gemini
```

## 写入的文件

| 文件 | 用途 |
| --- | --- |
| `GEMINI.md` | 项目上下文引导启动程序 |
| `.gemini/commands/engram.toml` | `/engram` 斜杠适配器 |
| `.gemini/settings.json` | `SessionStart` 和 `BeforeAgent` hook |
| Gemini MCP config | MCP 注册 |

## 全局安装

```bash
engram link --global gemini
```

写入 `~/.gemini/GEMINI.md`、`~/.gemini/skills/engram/SKILL.md` 以及 Gemini MCP 配置文件。

## 运行时优先目标

Gemini 是一个运行时优先的目标。`GEMINI.md` 包含简短的引导指令，这些指令依赖 MCP 工具和 hook 来执行详细协议；Agent Skill 文件承载了完整的写入/审批工作流。

## Hook 行为

Gemini 支持通过 `SessionStart` 和 `BeforeAgent` 事件注入启动和提示词时 `hookSpecificOutput.additionalContext`。

## Antigravity 兼容性

对于 hook，`gemini` 也是公开的 Antigravity 备用方案。在 Google 发布稳定的主要 Antigravity hook/配置文档之前，隐藏的 `antigravity` 和 `antigravity-cli` hook 目标将规范化为 Gemini 的 hook 行为和路径。

## 后续步骤

- [Agent 集成概述](overview.md)
- [Hook 和验证行](hooks.md)
