---
title: Copilot
sidebar_position: 8
description: 通过仓库与用户自定义指令实现 Engram 与 GitHub Copilot 的集成。
---

# Copilot

GitHub Copilot 从 `.github/copilot-instructions.md` 中读取仓库自定义指令。对于全局 Copilot 安装，Engram 会将其托管块追加到 `~/.copilot/copilot-instructions.md`。

## 安装 {#install}

```bash
engram link copilot
```

## 写入的文件 {#files-written}

| 文件 | 用途 |
| --- | --- |
| `.github/copilot-instructions.md` | 仓库自定义指令 |

## 全局安装 {#global-install}

```bash
engram link --global copilot
```

向 `~/.copilot/copilot-instructions.md` 追加托管块。

## 紧凑/手动后备目标 {#compact-manual-fallback-target}

Copilot 是一个紧凑/手动后备目标。它接收完整的紧凑协议。在 v1 中跳过 hook 安装；使用 Engram skillset 或手动运行 `engram load` 来获取上下文。

## 后续步骤 {#next-steps}

- [Agent 集成概览](overview.md)
- [Hooks 与证明行](hooks.md)
