---
title: Claude
sidebar_position: 3
description: Engram 通过 CLAUDE.md、斜杠命令、Agent Skills、MCP 和 hook 与 Claude Code 集成。
---

# Claude

Claude Code 读取 `CLAUDE.md` 作为项目指导（仅当不存在 `CLAUDE.md` 时才读取项目的 `AGENTS.md`），并通过 `.mcp.json` 支持外部工具配置。Engram 的引导以 AGENTS.md 优先。

## 安装

```bash
engram link claude
```

## 写入的文件

| 文件 | 用途 |
| --- | --- |
| `AGENTS.md` | 项目指导引导（受管块，与 Codex 和 OpenCode 共用） |
| `CLAUDE.md` 或 `.claude/CLAUDE.md` | 一个引导块，仅当该文件已存在且未导入 `@AGENTS.md` 时写入；绝不会被创建 |
| `.claude/engram.md`, `.agents/engram.md` | 包含完整写入/审批工作流程的配套指南 |
| `.claude/rules/engram/<id>.md` | 为每条带有 `applies_to` 的工作区记忆生成一条路径规则（`hooks.path_rules native`） |
| `.claude/commands/engram.md` | 经典的 `/engram` 斜杠命令 |
| `.claude/skills/engram/SKILL.md` | 用于斜杠调用的 Agent Skill |
| `.claude/settings.json` | `SessionStart`、`UserPromptSubmit`、`InstructionsLoaded`、`PreCompact` 和 `SubagentStart` hook |
| `.mcp.json` | MCP 注册 |

Claude 会同时获得 `.claude/commands/engram.md` 和 `.claude/skills/engram/SKILL.md`，因此 `/engram` 既会出现在较旧的命令菜单中，也会出现在支持 skill 的较新 Claude Code 会话中。

## 全局安装

```bash
engram link --global claude
```

Engram 会向 `~/.claude/CLAUDE.md` 追加一个受管块（保留用户文本），并将 Claude skill 写入 `~/.claude/skills/engram/SKILL.md`。Claude Code 不会读取 `~/.claude/mcp.json`，因此全局 MCP 只是一个提示：Engram 会打印 `claude mcp add --scope user engram -- engram-mcp`，供你自行运行。

## 运行时优先的目标

Claude 是运行时优先（runtime-first）的目标。`AGENTS.md` 块（以及该文件存在时的 `CLAUDE.md` 块）包含简短的引导指令，详细协议依赖 MCP 工具和 hook；配套指南承载完整的写入/审批工作流程，Agent Skill 文件则是指向它的简短指引。已有的 `CLAUDE.md` 块会被刷新而绝不会被移除，并且当 `CLAUDE.local.md` 或上级目录中的 `CLAUDE.md` 使 Claude 看不到 `AGENTS.md` 时，`engram link` 会予以报告。生成的 skill 遵循 Agent Skills 规范，并添加 `when_to_use` 和 `user-invocable: true`；`engram doctor` 会对其进行校验（`host.skill_frontmatter`）。全局安装仍会写入 `~/.claude/CLAUDE.md`，因为 Claude 不读取用户级的 `AGENTS.md`。

## Hook 行为

Claude 支持启动时和提示时的附加上下文注入。`SessionStart` 在启动时加载经过路由的记忆；`UserPromptSubmit` 只注入会话中尚未交付的记忆正文。`PreCompact` 会重置已交付集合。`SubagentStart`（matcher `*`）会在每个子 agent 各自的已交付集合下，向其注入路由出的上下文，且 hook 输出保持在 9,500 个字符以内。带有 `applies_to` glob 的记忆会以原生路径规则的形式到达 Claude：`engram link claude` 会写入 `.claude/rules/engram/<id>.md`（仅含 paths 的 frontmatter，外加一个 `<!-- engram:<scope>:<file> sha:<8> -->` 标记），而 `InstructionsLoaded` hook（matcher `path_glob_match`）会把每次加载记录到已交付集合和 `usage.json` 中。工作层记忆绝不会被写入，全局记忆在执行 `engram link --global claude` 时会写到 `~/.claude/rules/engram/`，没有该标记的文件则不会被触碰。花括号 glob 需要 Claude Code v2.1.217 或更高版本。若要改为保留较早的 `PreToolUse` 注入，请运行 `engram config set hooks.path_rules hook` 和 `engram link claude`；这同时会移除生成的规则文件。

## MCP 审批

`engram_commit` 带有 `_meta["anthropic/requiresUserInteraction"]: true`，因此即使在 bypass 模式下，Claude Code 也会在每次调用前询问你。请保持这样：`approval_token` 仅仅证明存在一份提案。参见 [MCP 工具](mcp.md)。

## 后续步骤

- [Agent 集成概览](overview.md)
- [斜杠适配器](slash.md)
- [MCP 工具](mcp.md)
