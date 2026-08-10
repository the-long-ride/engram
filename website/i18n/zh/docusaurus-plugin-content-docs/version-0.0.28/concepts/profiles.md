---
title: 配置文件与范围解析
sidebar_position: 4
description: 配置文件将公司、团队和个人上下文的全局内存根隔离开来。
---

# 配置文件与范围解析

配置文件（Profiles）将公司、团队和个人上下文的全局内存根（global memory roots）隔离开来。它们防止客户、公司和个人内存在不同边界之间泄漏。

## 创建和切换配置文件

```bash
engram profile create personal --global-path ~/Documents/engram-personal --use
engram profile use company --workspace
engram profile merge personal company --dry-run
```

## 解析顺序

配置文件的解析顺序为：

1. 显式的 `--profile` 或 `ENGRAM_PROFILE`
2. 工作空间的 `default_profile`
3. 活跃的用户配置文件

如果工作空间 `W` 固定到配置文件 `B`，而用户默认配置文件仍为 `A`，则针对 `W` 的每次普通加载、MCP 加载和智能体钩子注入都只会读取配置文件 `B` 的全局内存，而绝不会读取配置文件 `A`。指定与工作空间默认配置不同的显式配置文件会使用该配置文件的全局内存，并针对该命令禁用工作空间内存。

## 何时使用配置文件

- 绝不应进入客户仓库的个人内存
- 绝不应进入个人仓库的公司内存
- 针对跨多个项目工作的顾问的客户隔离内存
- 团队共享内存，不应渗透到个人实验中

## SQLite 配置数据库备用方案

Engram 的 SQLite 配置数据库是工作空间/配置文件管理的一项优化。如果无法打开或初始化该数据库，普通的读/写命令将回退到 JSON 配置快照。特定于数据库的命令会报告 SQLite 不可用，而不是阻止普通的内存使用。

## 下一步

- [工作空间内存 vs 全局内存](scopes.md)
- [写入路径与审批](write-path.md)
