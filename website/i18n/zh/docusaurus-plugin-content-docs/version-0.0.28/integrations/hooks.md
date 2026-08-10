---
title: Hook 和验证行
sidebar_position: 12
description: Engram agent hook 在会话启动和提示词轮次注入路由内存。验证行使注入可见。
---

# Hook 和验证行

Agent hook 是选择性加入的主机 hook，当主机公开安全的提示词上下文通道时，在会话启动和随后的任务更改轮次注入路由的 Engram 上下文。

## 安装 hook

```bash
engram link codex
engram link claude
engram link gemini
engram link cursor
engram link windsurf
engram link --global opencode
engram set-proof compact
```

使用 `--global` 进行用户级配置，使用 `engram unlink` 仅删除由 Engram 托管的 hook 条目。

## 读取模式

`engram set-read startup|auto|always|manual|off` 控制运行时行为：

- `auto` 在会话启动时加载，并仅在路由的 Engram 上下文更改时重新注入。
- `startup` 仅在会话启动时加载。
- `always` 在每个符合条件的轮次重新注入。
- `manual` 和 `off` 减少自动化。

Hook 缓存存储哈希值、会话 ID、主机、当前工作目录（cwd）和路由签名，从不存储原始提示词文本。

## 验证模式

`engram set-proof off|compact` 控制受支持的 hook 是否也在每个符合条件的轮次中追加一条紧凑的 `Engram proof:` 行。验证可见性与 `set-read` 分开：`compact` 可以报告已加载、已重用或已跳过的轮次，而不会改变完整 Engram 内存的注入时机。

## Hook 功能矩阵

| 主机 | 配置路径 | 事件 |
| --- | --- | --- |
| `codex` | `.codex/hooks.json`; global `~/.codex/hooks.json` | `SessionStart`, `UserPromptSubmit` |
| `claude` | `.claude/settings.json`; global `~/.claude/settings.json` | `SessionStart`, `UserPromptSubmit` |
| `gemini` | `.gemini/settings.json`; global `~/.gemini/settings.json` | `SessionStart`, `BeforeAgent` |
| `cursor` | `.cursor/hooks.json`; 插件全局 `hooks/hooks.json` | `sessionStart` |
| `windsurf` / `cascade` | `.windsurf/hooks.json`; global `~/.codeium/windsurf/hooks.json` | `pre_user_prompt` |
| `opencode` | `~/.config/opencode/plugins/engram.js` | `chat.message`, `experimental.chat.system.transform` |
| `copilot` | 未写入 | N/A |
| `cline` | 未写入 | N/A |

## 后续步骤

- [Agent 集成概述](overview.md)
- [CLI: 注入 / 链接 / 升级](../cli/inject-link-upgrade.md)
