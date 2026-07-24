---
title: Copilot
sidebar_position: 8
description: 通过代码仓库和用户自定义指令实现 Engram 与 GitHub Copilot 的集成。
---

# Copilot

GitHub Copilot 从 `.github/copilot-instructions.md` 中读取代码仓库的自定义指令。对于全局 Copilot 安装，Engram 会将托管块追加到 `~/.copilot/copilot-instructions.md`。

## 安装

```bash
engram link copilot
```

## 写入的文件

| 文件 | 用途 |
| --- | --- |
| `.github/copilot-instructions.md` | 代码仓库自定义指令 |

## 全局安装

```bash
engram link --global copilot
```

向 `~/.copilot/copilot-instructions.md` 追加一个托管块。

## 紧凑/手动备用目标

Copilot 是一个紧凑/手动备用目标。它会接收完整的紧凑协议，因为当前的 hook 在 v1 中会公开会话开始的上下文，但没有可靠的提示词（prompt）时上下文注入。跳过 hook 安装；未写入任何 hook 配置。

## 后续步骤

- [Agent 集成概述](overview.md)
- [Hook 和验证行](hooks.md)
