---
title: Windsurf / Cascade
sidebar_position: 6
description: 通过规则、MCP、hook 和全局内存实现 Engram 与 Windsurf Cascade 的集成。
---

# Windsurf / Cascade

Windsurf 从 `.windsurf/rules/*.md` 读取工作区规则。Engram 写入 `.windsurf/rules/engram.md`，其中包含 `trigger: always_on` 前置元数据。`cascade` 是 `windsurf` 的别名。

## 安装

```bash
engram link windsurf
```

未生成工作区 MCP，因为官方文档仅说明了用户级 MCP 配置。`engram link windsurf` 会明确报告此情况，并建议运行 `engram link --global windsurf` 来获取 MCP。

## 写入的文件

| 文件 | 用途 |
| --- | --- |
| `.windsurf/rules/engram.md` | 项目规则与 `trigger: always_on` |
| `.windsurf/hooks.json` | `pre_user_prompt` hook |

## 全局安装

```bash
engram link --global windsurf
```

Engram 会在 `~/.codeium/windsurf/memories/global_rules.md` 中写入一个托管块（保留用户文本并保持在字符预算范围内），将 MCP 合并到 `~/.codeium/windsurf/mcp_config.json` 中，并将 hook 合并到 `~/.codeium/windsurf/hooks.json` 中。

## Hook 行为

`pre_user_prompt` hook 可以审计/预加载/拦截，但不能直接注入模型上下文。规则和 MCP 提供了可靠的 AI 上下文通道。

## 后续步骤

- [Agent 集成概述](overview.md)
- [Hook 和验证行](hooks.md)
