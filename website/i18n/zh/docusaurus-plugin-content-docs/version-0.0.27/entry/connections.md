---
title: Connections 标签页
sidebar_position: 3
description: 从 Entry Web UI 检测并链接受支持的 AI 智能体（Agent）。
---

import RiskCallout from '@site/src/components/RiskCallout';

# Connections 标签页

Connections 标签页会扫描您的机器以查找受支持的 AI 智能体界面，并允许您在工作区（workspace）或全局（global）级别将 Engram 链接到每个智能体。

## 智能体扫描 (Agent scan)

该标签页为每个受支持的智能体显示卡片。每个卡片报告已检测到（detected）或缺失（missing）状态。

- **Detected** — Engram 找到了受支持的本地智能体界面（配置文件路径或应用存在）。
- **Missing** — Engram 未找到该智能体界面。缺失并不总是意味着不受支持；它可能意味着应用程序或配置文件路径尚未存在。

<RiskCallout level="caution">
缺失并不总是意味着不受支持。它可能意味着该机器上尚未存在该应用程序或配置文件路径。
</RiskCallout>

## 工作区链接开关 (Workspace link toggle)

将 Engram 链接到该智能体的当前仓库/工作区。当内存应当跟随仓库时使用：每个项目的规则、特定仓库的内存、团队共享的指令。

## 全局链接开关 (Global link toggle)

为该智能体全局链接 Engram。用于个人内存、跨项目工作流以及可重用的样式/规则。

<RiskCallout level="risky">
在共享机器上请谨慎使用全局链接。Engram 会将托管块写入共享指令文件中。在全局链接之前，请检查 Engram 为每个智能体写入了哪些文件。
</RiskCallout>

## Engram 为每个智能体写入哪些文件

| 目标 | 文件 |
| --- | --- |
| `codex` | `AGENTS.md`, `.agents/skills/engram/SKILL.md` |
| `agents-md` | `AGENTS.md` |
| `copilot` | `.github/copilot-instructions.md`; 全局: `~/.copilot/copilot-instructions.md` |
| `claude` | `CLAUDE.md` |
| `cursor` | `.cursor/rules/engram.mdc`; 全局: `~/.cursor/plugins/local/engram/` |
| `gemini` | `GEMINI.md`; 全局: `~/.gemini/GEMINI.md`, `~/.gemini/skills/engram/SKILL.md` |
| `cline` | `.clinerules` |
| `windsurf` | `.windsurf/rules/engram.md`; 全局: `~/.codeium/windsurf/memories/global_rules.md` |
| `opencode` | `AGENTS.md`, `.opencode/engram.md`, `.opencode/skills/engram/SKILL.md`, `opencode.json` |
| `mcp` | `.mcp.json`; 全局: 主机 MCP 配置文件 |
| `slash` | `.claude/commands/engram.md`, `.cursor/commands/engram.md`, `.gemini/commands/engram.toml`, `.opencode/commands/engram.md` |

## 何时取消链接

- 归档仓库或测试工作区
- 将智能体切离 Engram
- 在全新运行 `engram upgrade --latest` 之前清理过期的托管块

`engram unlink` 仅删除 Engram 托管的 hook 条目和适配器文件。除非显式指定 `--force`，否则保留人类编写的文件。

## CLI 等效命令

```bash
engram link codex
engram link claude
engram link --global opencode
engram unlink
```

## 后续步骤

- [Construct 标签页](construct.md)
- [智能体集成概述](../integrations/overview.md)
