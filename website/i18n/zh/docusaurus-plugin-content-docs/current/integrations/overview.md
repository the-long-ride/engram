---
title: Agent 集成概览
sidebar_position: 1
description: Engram 在众多 AI 宿主上支持 skill 文件、斜杠适配器、MCP 工具和 agent hook。
---

# Agent 集成概览

Engram 支持两个集成层：

- **Skill 文件** — 为读取项目上下文的 agent 生成的指令。
- **斜杠适配器** — 为支持项目斜杠命令或 Agent Skills 的 agent 生成的 `/engram` 命令提示。
- **MCP 风格工具** — 面向能够注册外部工具进程的 agent 的 JSON-lines 封装。
- **Agent hook** — 可选启用的宿主 hook，会在会话启动时以及之后的任务切换轮次中注入经过路由的 Engram 上下文。

## 快速开始

```bash
engram inject
engram link all
```

`engram link all` 会安装公开的目标集合，并在一次统一安装中，针对 skillset 指令文件、MCP 配置、斜杠适配器和 agent hook 方面的部分支持宿主，报告确定性的 `SKIPPED` 原因。

## 目标类别

| 类别 | 目标 | 行为 |
| --- | --- | --- |
| 运行时优先 | `codex`, `claude`, `cursor`, `gemini` | 简短的引导指令、包含完整工作流程的配套指南、简短的 Agent Skill 指引，以及 MCP 配置 |
| 支持 hook | `codex`, `claude`, `gemini`, `opencode`, `cursor`, `windsurf`/`cascade` | 带有各宿主专属事件 schema 的 agent hook |
| 精简/手动回退 | `agents-md`, `copilot`, `cline` | 完整的精简协议；v1 中没有可靠的运行时上下文注入 |

## 支持的目标

| 目标 | 文件 | 主要用途 |
| --- | --- | --- |
| `codex` | `AGENTS.md`, `.agents/skills/engram/SKILL.md` | OpenAI Codex 项目指令和 Agent Skill |
| `agents-md` | `AGENTS.md` | 针对未列出的兼容 AGENTS.md 的 agent 的通用回退 |
| `copilot` | `.github/copilot-instructions.md`; global: `~/.copilot/copilot-instructions.md` | GitHub Copilot 仓库和用户指令 |
| `claude` | `AGENTS.md`, `.claude/engram.md`, `.agents/engram.md`，另外仅当 `CLAUDE.md` 已存在时才写入其中的一个块，以及 `.claude/rules/engram/<id>.md` 路径规则 | Claude Code 项目指导和原生路径规则 |
| `cursor` | `.cursor/rules/engram.mdc`, `.cursor/rules/engram/<id>.mdc` 路径规则; global: `~/.cursor/plugins/local/engram/` | Cursor 项目规则、原生路径规则和本地插件 |
| `gemini` | `GEMINI.md`; global: `~/.gemini/GEMINI.md`, `~/.gemini/skills/engram/SKILL.md` | Gemini CLI 上下文，包括 Antigravity 中兼容 Gemini 的界面 |
| `cline` | `.clinerules` | Cline 风格的工作区规则 |
| `windsurf` | `.windsurf/rules/engram.md`; global: `~/.codeium/windsurf/memories/global_rules.md` | Windsurf 工作区规则以及全局规则/MCP |
| `opencode` | `AGENTS.md`, `.opencode/engram.md`, `.opencode/skills/engram/SKILL.md`, `opencode.json` | OpenCode 规则、Agent Skill、MCP 工具、自定义命令、插件 hook |
| `mcp` | `.mcp.json`; global: `~/.gemini/settings.json`, `~/.codex/config.toml`，以及一条 `claude mcp add` 提示 | MCP 风格 JSON-lines 封装的注册 |
| `slash` | `.claude/commands/engram.md`, `.cursor/commands/engram.md`, `.gemini/commands/engram.toml`, `.opencode/commands/engram.md` | 原生的 `/engram` 斜杠适配器 |

别名：`codex` 会安装 `agents-md` 适配器以及通用的 Agent Skill 文件，`open-code` 映射到 `opencode`，`cascade` 映射到 `windsurf`。旧的 `antigravity` 和 `antigravity-cli` 目标目前是隐藏的兼容别名。

## Hook 能力矩阵

| 宿主 | v1 中的 hook 安装 | 事件 |
| --- | --- | --- |
| `codex` | 是 | `SessionStart`, `UserPromptSubmit`, `PreToolUse`, `PreCompact`, `SubagentStart`（可选的 `SessionEnd`） |
| `claude` | 是 | `SessionStart`, `UserPromptSubmit`, `InstructionsLoaded`（`hooks.path_rules hook` 时为 `PreToolUse`）, `PreCompact`, `SubagentStart`（可选的 `SessionEnd`） |
| `gemini` | 是 | `SessionStart`, `BeforeAgent`, `AfterTool`, `PreCompress` |
| `cursor` | 是 | `sessionStart` |
| `windsurf` / `cascade` | 是 | `pre_user_prompt` |
| `opencode` | 通过本地插件支持 | `chat.message`, `experimental.chat.system.transform` |
| `copilot` | 已跳过 | 不适用 |
| `cline` | 已跳过 | 不适用 |

## 后续步骤

- [Codex](codex.md)
- [Claude](claude.md)
- [Gemini](gemini.md)
- [Cursor](cursor.md)
- [Windsurf / Cascade](windsurf.md)
- [OpenCode](opencode.md)
- [Copilot](copilot.md)
- [Cline](cline.md)
- [斜杠适配器](slash.md)
- [MCP 工具](mcp.md)
- [Hooks 与证明行](hooks.md)
