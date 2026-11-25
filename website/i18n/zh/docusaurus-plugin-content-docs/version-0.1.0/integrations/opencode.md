---
title: OpenCode
sidebar_position: 7
description: 通过 AGENTS.md、Agent Skills、MCP、自定义命令和本地插件实现 Engram 与 OpenCode 的集成。
---

# OpenCode

OpenCode 读取项目 `AGENTS.md` 和全局 `~/.config/opencode/AGENTS.md` 以获取规则。Engram 在其中写入一个托管块，将完整指南写入 `.opencode/engram.md` 或 `~/.config/opencode/engram.md`，将完整 skill 写入 `.opencode/skills/engram/SKILL.md` 或 `~/.config/opencode/skills/engram/SKILL.md`，并保留项目 `opencode.json`（或现有的 `opencode.jsonc`）和全局 `~/.config/opencode/opencode.jsonc` 用于 MCP 注册。

## 安装

```bash
engram link opencode
```

## 写入的文件

| 文件 | 用途 |
| --- | --- |
| `AGENTS.md` | 具有托管块的项目规则 |
| `.opencode/engram.md` | 完整指南 |
| `.opencode/skills/engram/SKILL.md` | Agent Skill |
| `.opencode/commands/engram.md` | `/engram` 斜杠适配器 |
| `opencode.json` / `opencode.jsonc` | MCP 注册 (`mcp.engram`) |

## 全局安装

```bash
engram link --global opencode
```

还在 `~/.config/opencode/plugins/engram.js` 安装一个托管的本地 JavaScript 插件。该插件使用 `chat.message` 路由当前用户提示词，并使用 `experimental.chat.system.transform` 在每个 LLM 请求之前注入路由内存。

:::warning
安装或卸载后必须重新启动或重新加载 OpenCode，因为本地插件文件是在启动时加载的。
:::

## MCP 注册

```json
"engram": {
  "type": "local",
  "command": ["engram-mcp"],
  "args": [],
  "enabled": true
}
```

MCP 服务器实现了标准的 JSON-RPC 握手（`initialize`、`notifications/initialized`、`tools/list` 和 `tools/call`），以便 OpenCode 可以发现并调用 Engram 工具。

## 插件行为

插件会容错开启（fails open），且仅在运行的 OpenCode 进程中保留原始路由内存。Engram 的磁盘 hook 缓存仍仅为哈希值、会话 ID、主机、当前工作目录（cwd）和路由签名。`engram unlink --global opencode` 仅删除 Engram 生成的插件；除非显式指定 `--force`，否则保留人类编写的 `engram.js`。

## 后续步骤

- [Agent 集成概述](overview.md)
- [MCP 工具](mcp.md)
- [Hook 和验证行](hooks.md)
