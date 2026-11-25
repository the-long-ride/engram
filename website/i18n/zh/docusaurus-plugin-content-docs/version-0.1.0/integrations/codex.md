---
title: Codex
sidebar_position: 2
description: Engram 通过 AGENTS.md 和 Agent Skills 与 OpenAI Codex 集成。
---

# Codex

OpenAI Codex 以及其他兼容 AGENTS.md 的 agent 使用 `AGENTS.md` 作为项目指令文件。`codex` 别名还会写入 `.agents/skills/engram/SKILL.md`，这样能发现 Agent Skills 的 agent 就可以把 Engram 作为可调用的 skill 来路由。

## 安装

```bash
engram link codex
```

## 写入的文件

| 文件 | 用途 |
| --- | --- |
| `AGENTS.md` | 项目指令引导 |
| `.agents/skills/engram/SKILL.md` | 指向该指南的简短 Agent Skill 指引 |
| `.agents/engram.md` | 包含完整写入/审批工作流程的配套指南 |
| `.codex/hooks.json` | `SessionStart`、`UserPromptSubmit`、`PreToolUse`、`PreCompact` 和 `SubagentStart` hook |
| `.mcp.json` | MCP 注册 |

## 全局安装

```bash
engram link --global codex
```

会将 Codex skill 写入 `~/.codex/skills/engram/SKILL.md`，并向共享的 Codex 指令文件追加一个受管块。全局 MCP 是 `~/.codex/config.toml` 中受管的 `[mcp_servers.engram]` 块；它还会在 `[mcp_servers.engram.tools.engram_commit]` 上设置 `approval_mode = "approve"`，使 Codex 在每次提交前询问（`engram upgrade` 或 `engram link codex` 会刷新较旧的块）。`engram doctor` 会对照 Codex 的 32 KiB 上限，报告你的 AGENTS.md 链的大小（`host.agents_md_chain`）。

## Hook 行为

Codex 支持启动时和提示时的附加上下文注入。`SessionStart` 在启动时加载经过路由的记忆；`UserPromptSubmit` 只注入会话中尚未交付的记忆正文。`PreToolUse` 会注入其 `applies_to` glob 与通过 `apply_patch` 编辑的文件相匹配的记忆（它不会在读取时触发），而 `PreCompact` 会重置已交付集合。`SubagentStart`（matcher `*`）会向每个子 agent 注入路由出的上下文；子 agent 的已交付集合以 `<session_id>#agent:<agent_id>` 为键，因此绝不会触及父级的集合。Codex 将一条 hook 消息限制在约 2,500 个 token，所以 Engram 将 `additionalContext` 保持在 2,400 个 token 或以下，并将正文降级为卡片，而不是将其截断。

## 运行时优先的目标

Codex 是运行时优先（runtime-first）的目标。`AGENTS.md` 包含简短的引导指令，详细协议依赖 MCP 工具和 hook；配套指南承载完整的写入/审批工作流程，Agent Skill 文件则是指向它的简短指引。

## 后续步骤

- [Agent 集成概览](overview.md)
- [Hooks 与证明行](hooks.md)
