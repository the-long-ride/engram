---
title: Gemini
sidebar_position: 4
description: Engram 与 Gemini CLI 以及 Antigravity 中兼容 Gemini 的界面集成。
---

# Gemini

Gemini CLI 会搜索 `GEMINI.md` 文件作为上下文。`slash` 目标会写入 `.gemini/commands/engram.toml`，使 `/engram <args>` 成为 Gemini CLI 中的项目自定义命令。

Engram 还将 `gemini` 作为 Antigravity 2.0、Antigravity CLI 和 Antigravity IDE 的对外目标，因为 Google 当前的文档仍将 Antigravity 的上下文和 skill 绑定在兼容 Gemini 的位置。隐藏的 `antigravity` 和 `antigravity-cli` 目标名称仍作为显式的兼容路径保留，但它们不会显示在 `engram link list`、帮助、补全或 `all` 中。

## 安装

```bash
engram link gemini
```

## 写入的文件

| 文件 | 用途 |
| --- | --- |
| `GEMINI.md` | 项目上下文引导 |
| `.gemini/commands/engram.toml` | `/engram` 斜杠适配器 |
| `.gemini/settings.json` | `SessionStart`、`BeforeAgent`、`AfterTool` 和 `PreCompress` hook |
| `.gemini/settings.json` | MCP 注册（`mcpServers.engram`，与 hook 合并在一起） |

## 全局安装

```bash
engram link --global gemini
```

会写入 `~/.gemini/GEMINI.md`、`~/.gemini/skills/engram/SKILL.md`，并将 `mcpServers.engram` 合并到 `~/.gemini/settings.json` 中。

## 运行时优先的目标

Gemini 是运行时优先（runtime-first）的目标。`GEMINI.md` 包含简短的引导指令，详细协议依赖 MCP 工具和 hook；配套指南承载完整的写入/审批工作流程，Agent Skill 文件则是指向它的简短指引。

## Hook 行为

Gemini 通过 `SessionStart` 和 `BeforeAgent` 事件支持启动时和提示时的 `hookSpecificOutput.additionalContext` 注入；`PreCompress`（在 CLI 对历史记录进行摘要之前）会重置已交付集合。`AfterTool`（matcher `read_file|write_file|replace`，超时以毫秒为单位）会注入最多 3 条尚未交付的记忆，这些记忆的 `applies_to` glob 与该工具所触及的文件相匹配；上下文会追加到工具结果之后，因此它在读取之后的下一步才会到达。它与 `BeforeAgent` 共用已交付集合，并且绝不会返回决策。`engram link gemini` 或 `engram upgrade --latest` 会将该事件添加到现有安装中。

如果 `.gemini/settings.json` 中的 `mcpServers.engram` 设置了 `trust: true`，Gemini 会跳过对 `engram_commit` 的确认；`engram doctor` 会对此发出警告（`host.gemini_trust`）。

## Antigravity 兼容性

对于 hook，`gemini` 也是 Antigravity 的公开回退目标。隐藏的 `antigravity` 和 `antigravity-cli` hook 目标会规范化为 Gemini 的 hook 行为和路径，直到 Google 发布稳定的 Antigravity 主 hook/配置文档。

## 后续步骤

- [Agent 集成概览](overview.md)
- [Hooks 与证明行](hooks.md)
