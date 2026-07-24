---
title: MCP 工具
sidebar_position: 11
description: Engram MCP 服务器向支持 MCP 的主机提供加载、搜索和仅提案工具。
---

# MCP 工具

Engram 附带了一个 MCP 服务器二进制文件 `engram-mcp`，它向支持 MCP 的主机提供工具。

## 注册

默认情况下，`engram link <target>` 还会为该目标安装已知的 MCP 注册。

| 范围 | 路径 |
| --- | --- |
| 工作区（大多数主机） | `.mcp.json` |
| Cursor 工作区 | `.cursor/mcp.json` |
| OpenCode 工作区 | `opencode.json` / `opencode.jsonc` 中的 `mcp` 字段 |
| 全局 Claude | `~/.claude/mcp.json` |
| 全局 Gemini / Antigravity | Gemini MCP 配置文件 |
| 全局 OpenCode | `~/.config/opencode/opencode.jsonc` / `opencode.json` 中的 `mcp` 字段 |
| 全局 Cursor | 捆绑在本地插件中 |
| 全局 Windsurf | `~/.codeium/windsurf/mcp_config.json` |

跳过了 Windsurf 工作区的 MCP，因为官方文档仅说明了用户级别的 MCP 配置。

## 工具

MCP 主机应将 `engram_save` 和 `engram_autosave` 视为**仅提案**工具；它们仍必须通过人眼可见的 CLI 审批流路由最终写入。`engram_load` 默认使用 `--full`（可通过 `full: true` 选择关闭）。

## 接受全部规则

显式的 `/engram save-session --force` 请求（包括快捷方式 `/engram ss -f`）应使用 CLI 写入路径，因为 MCP 自动保存仍然是仅提案的。计数的快捷方式 `/engram ss -f last 50 sessions` 应使用 `engram save-session --query-level 50 --force`。

## OpenCode MCP 条目

```json
"engram": {
  "type": "local",
  "command": ["engram-mcp"],
  "args": [],
  "enabled": true
}
```

MCP 服务器实现了标准的 JSON-RPC 握手（`initialize`、`notifications/initialized`、`tools/list` 和 `tools/call`）。

## 后续步骤

- [Agent 集成概述](overview.md)
- [Hook 和验证行](hooks.md)

