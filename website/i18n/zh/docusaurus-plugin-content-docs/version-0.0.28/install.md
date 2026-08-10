---
title: 安装与配置
sidebar_position: 3
description: 安装 Engram CLI、初始化工作区、配置全局内存并链接 AI Agent。
---

# 安装与配置

## 要求

- Node.js `>=20`
- 受支持的 AI Agent（Codex、Claude、Gemini、Cursor、Windsurf、OpenCode、Copilot、Cline 或任何兼容 AGENTS.md 的主机）

## 安装 CLI

```bash
npm install -g @the-long-ride/engram
```

验证：

```bash
engram --version
```

安装了两个二进制文件：

- `engram` — 主 CLI
- `engram-mcp` — 适用于注册外部工具进程的主机的 MCP 服务端二进制文件

## 初始化工作区 (workspace)

从项目根目录运行：

```bash
engram inject
```

这将创建 `.agents/.engram/` 并默认安装紧凑的 Codex 目标：`AGENTS.md` 加上 `.agents/skills/engram/SKILL.md`。

使用 `engram inject --no-skillset` 跳过 Agent 文件，或使用 `engram inject --skillset all` 在注入期间安装每个受支持的适配器。现有的由人类创作的文件将被跳过。

## 使用 Entry Web UI 进行配置

最友好的设置路径：

```bash
engram entry
```

这将启动一个仅限本地的控制面板。无需手动编辑 JSON 即可配置内存根、链接 Agent 并调整路由。有关每个选项卡和字段的信息，请参阅 [Entry Web UI](entry/index.md)。

## 配置全局内存

全局内存是可选的，并且活在你配置的任何地方。它保存了应该跨仓库跟随你的偏好和团队上下文。

```bash
engram inject --global-only --global-path ~/Documents/engram
```

或者稍后更新全局文件夹：

```bash
engram update-global-folder ~/Documents/engram
engram ugf ~/Documents/engram
```

聊天风格的表单（如 `engram set global memory path to <new-path>` 和 `engram move global folder from <old-path> to <new-path>`）会标准化为相同的命令。如果他们还希望 Engram 将整个旧全局根移动到新位置，请添加 `--move-from-path <old-path>`。

## 链接 AI Agent

为宿主安装 Agent 钩子（hooks）和 MCP 注册：

```bash
engram link codex
engram link claude
engram link gemini
engram link cursor
engram link windsurf
engram link --global opencode
engram set-proof compact
```

`engram link all` 在一个统一的安装中安装公共目标集，并报告针对说明文件、MCP 配置、斜杠适配器和 Agent 钩子的部分宿主的确定性 `SKIPPED` 原因。`engram unlink` 会将它们全部移除。

有关完整的目标矩阵，请参阅 [Agent 集成](integrations/overview.md)。

## 子模块工作流 (Submodule)

如果人类希望将 `.agents/.engram` 作为单独的仓库进行跟踪：

```bash
engram inject --submodule
```

仅在人类提供 URL 后添加 `--submodule-remote <git-url>`。Engram 会验证该 URL，在 `main` 分支上初始化子模块，并创建第一个子模块提交为 `Initialize engram`。

## 共享的全局 Git 源

如果 `engram entry` 显示未检测到 `global_git_detected.remote_url`，请询问人类是否应通过 Git 共享全局内存。当他们提供 URL 时：

```bash
engram inject --global-remote <git-url>
```

## 验证安装

```bash
engram verify
engram load --dry-run "setup"
engram llm
```

`engram llm` 打印打包的 AI Agent 使用指南，且不需要注入的工作区。

## 下一步

- [日常工作流](daily-workflow.md)
- [Entry Web UI](entry/index.md)
- [Agent 集成](integrations/overview.md)
