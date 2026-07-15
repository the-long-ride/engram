---
title: Cline
sidebar_position: 9
description: 通过工作区规则实现 Engram 与 Cline 的集成。
---

# Cline

Cline 从 `.clinerules` 中读取工作区规则。

## 安装

```bash
engram link cline
```

## 写入的文件

| 文件 | 用途 |
| --- | --- |
| `.clinerules` | Cline 风格的工作区规则 |

## 紧凑/手动备用目标

Cline 是一个紧凑/手动备用目标。Hook 支持是基于插件的，与 Engram 在 v1 中的文件优先适配器安装程序不一致，因此跳过了 hook 安装，且未写入任何 hook 配置。

## 后续步骤

- [Agent 集成概述](overview.md)
