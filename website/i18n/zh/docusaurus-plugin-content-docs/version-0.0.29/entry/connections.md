---
title: Connections 标签页
sidebar_position: 3
description: 从 Entry Web UI 检测并关联受支持的 AI agent。
---

import RiskCallout from '@site/src/components/RiskCallout';

# Connections 标签页

Connections 标签页会扫描你的机器上受支持的 AI agent 界面，并允许你在工作区或全局层级将 Engram 关联到每一个 agent。

## Agent 扫描

该标签页为每个受支持的 agent 显示一张卡片。每张卡片都会报告已检测到或缺失的状态。

- **Detected（已检测到）** — Engram 发现了受支持的本地 agent 界面（配置路径或应用存在）。
- **Missing（缺失）** — Engram 没有发现该 agent 界面。缺失并不总是意味着不受支持；也可能是应用或配置路径尚不存在。

<RiskCallout level="caution">
缺失并不总是意味着不受支持。也可能是这台机器上尚不存在该应用或配置路径。
</RiskCallout>

## 工作区关联开关 {#workspace-link-toggle}

为该 agent 将 Engram 关联到当前的仓库/工作区。当记忆应当跟随仓库时使用：按项目的规则、仓库专属记忆、团队共享的指令。

## 全局关联开关 {#global-link-toggle}

为该 agent 在全局范围内关联 Engram。用于个人记忆、跨项目的工作流，以及可复用的风格/规则。

<RiskCallout level="risky">
在共享机器上请谨慎使用全局关联。Engram 会把受管块写入共享的指令文件。在进行全局关联之前，请先查看 Engram 为每个 agent 写入了哪些文件。
</RiskCallout>

## Engram 为每个 agent 写入哪些文件

| 目标 | 文件 |
| --- | --- |
| `codex` | `AGENTS.md`, `.agents/skills/engram/SKILL.md` |
| `agents-md` | `AGENTS.md` |
| `copilot` | `.github/copilot-instructions.md`; global: `~/.copilot/copilot-instructions.md` |
| `claude` | `AGENTS.md`, `.claude/engram.md`, `.agents/engram.md`，另外仅当 `CLAUDE.md` 已存在时才写入其中的一个块 |
| `cursor` | `.cursor/rules/engram.mdc`; global: `~/.cursor/plugins/local/engram/` |
| `gemini` | `GEMINI.md`; global: `~/.gemini/GEMINI.md`, `~/.gemini/skills/engram/SKILL.md` |
| `cline` | `.clinerules` |
| `windsurf` | `.windsurf/rules/engram.md`; global: `~/.codeium/windsurf/memories/global_rules.md` |
| `opencode` | `AGENTS.md`, `.opencode/engram.md`, `.opencode/skills/engram/SKILL.md`, `opencode.json` |
| `mcp` | `.mcp.json`; global: host MCP config files |
| `slash` | `.claude/commands/engram.md`, `.claude/skills/engram/SKILL.md`, `.cursor/commands/engram.md`, `.gemini/commands/engram.toml`, `.opencode/commands/engram.md` |

## 何时取消关联

- 归档仓库或测试工作区
- 让某个 agent 不再使用 Engram
- 在重新执行 `engram upgrade --latest` 之前清理过时的受管块

`engram unlink` 只会移除由 Engram 管理的 hook 条目和适配器文件。人工编写的文件会被保留，除非显式指定 `--force`。

## 等效的 CLI 命令

```bash
engram link codex
engram link claude
engram link --global opencode
engram unlink
```

## 后续步骤

- [Construct 标签页](construct.md)
- [Agent 集成概览](../integrations/overview.md)
