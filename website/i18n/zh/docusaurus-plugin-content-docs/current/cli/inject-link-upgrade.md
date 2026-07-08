---
title: inject / link / upgrade
sidebar_position: 4
description: 设置和适配器命令 — 初始化工作区、链接 Agent 并在包更新后进行协调。
---

# inject / link / upgrade

设置和适配器命令用于初始化工作区、链接 Agent 并在包更新后进行协调。

## inject

```bash
engram inject
engram inject --global-only --global-path <path>
engram inject --submodule
engram inject --submodule-remote <git-url>
engram inject --global-remote <git-url>
engram inject --no-skillset
engram inject --skillset all
```

`engram inject` 创建 `.agents/.engram/` 并默认安装紧凑的 Codex 目标。现有的由人类创作的文件将被跳过。

交互式注入会按以下顺序询问：是否将 `./.agents/.engram` 添加为子模块，是否使用全局 Engram 路径，以及是否添加共享的全局 Git 源。

使用 `engram update-global-folder <new-path>` 或 `engram ugf <new-path>` 仅更新配置的全局路径。聊天风格的表单（如 `engram set global memory path to <new-path>` 和 `engram move global folder from <old-path> to <new-path>`）会标准化为相同的命令。如果他们还希望 Engram 移动整个旧全局根，请添加 `--move-from-path <old-path>`。

## link

```bash
engram link codex
engram link claude
engram link gemini
engram link cursor
engram link windsurf
engram link --global opencode
engram link all
engram unlink
```

`engram link all` 在一个统一的安装中安装公共目标集，并报告针对说明文件、MCP 配置、斜杠适配器和 Agent 钩子的部分宿主的确定性 `SKIPPED` 原因。`engram unlink` 会将它们全部移除。`engram unlink --global <target>` 仅移除 Engram 生成的全局插件；除非明确使用 `--force`，否则人类创作的文件将被保留。

## upgrade

```bash
engram upgrade
engram upgrade --plan
engram upgrade --latest
```

在安装较新的 Engram 包后使用 `engram upgrade`。该命令将从 v0.0.8 开始初始化的内存根与当前发布模式进行对比，刷新生成的 `HELP.md`、内存索引、图文件、合格的向量随从文件（sidecars）、生成的工作区技能集、全局内存脚手架和已注册的全局 Agent 技能集，同时保留由人类创作的文件。

普通命令也会在每个包版本中静默运行一次相同的根协调，除非设置了 `--no-auto-upgrade` 或 `ENGRAM_NO_AUTO_UPGRADE=1`。

当新包输出必须覆盖当前由 Engram 管理的链接 Agent 产物时，使用 `engram upgrade --latest`。该路径会重新应用链接的工作区说明文件、规则、MCP/插件配置以及托管的钩子，并使用最新生成的文件刷新已注册的全局 Agent 安装。

仅在有意替换生成的 Engram 适配器文件时使用 `--force`。

## take-control

```bash
engram take-control --plan
engram take-control --all
engram take-control --file AGENTS.md
engram take-control --dir docs
engram take-control --include "docs/**/*.md" --exclude "docs/private/**"
engram take-control --max-sources 5 --max-chars 900
engram take-control --all --metacognize --accept-all
```

`take-control` 是针对现有工作区指南的 Agent 辅助接管流程。它会从 `AGENTS.md`、`CLAUDE.md`、`GEMINI.md`、Cursor 规则、内存库笔记以及顶层的 `rules/`、`skills/`、`workflows/`、`knowledge/` 或 `notes/` 文件夹（包括 `.txt` 笔记）等文件中构建一个紧凑的源包。

保存的接管内存会记录 `source_files` 和 `source_hashes`，因此未更改的源将在以后被跳过。

## metacognize

```bash
engram metacognize --workspace
engram metacognize --global --dry-run
engram metacognize --all --accept-all
```

当你希望 AI Agent 审查现有的 Engram 内存文件夹，并通过相同的 save-session 审批流提出更安全的结构建议时，使用 `metacognize`。Agent 应该使用 `UPDATE: memory-id` 进行巩固或词句清理，并使用 `DEPENDS_ON: memory-id` 进行分层内存。

## 下一步

- [profiles / workspaces / config](profiles-workspaces-config.md)
- [Agent 集成概述](../integrations/overview.md)
