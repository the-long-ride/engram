---
title: 发布与升级流程
sidebar_position: 2
description: 安全地升级 Engram 包并对账内存根目录。
---

# 发布与升级流程

## 在 npm 包更新后

下一次执行普通的 Engram 命令时，它会为新版本静默地在后台对已初始化的工作空间/全局根进行一次对账。当检测到旧的元数据时，这会通过刷新生成的帮助信息、内存索引、图文件以及符合条件的向量 sidecars 来涵盖从 v0.0.8 版本起的各个版本间内存模式变更。

首次运行后，启动检查的开销被有意地优化得极低：当已经记录了当前版本时，它仅读取微小的配置标记。它不会从 npm postinstall 触发运行、不会创建新的内存根目录，也不会替换人类撰写的文件。可使用 `--no-auto-upgrade` 或 `ENGRAM_NO_AUTO_UPGRADE=1` 针对某条命令跳过此检查。

## 显式升级

```bash
engram upgrade
engram upgrade --plan
engram upgrade --latest
```

`engram upgrade` 会刷新生成的工作空间帮助信息、内存索引、图文件、符合条件的向量 sidecars、现有的 Engram 生成的工作空间技能集文件以及已注册的全局技能集，同时保留由人类编写的文件。

`engram upgrade --latest` 则更加强力：它会重写当前由 Engram 托管的已链接工作空间智能体以及已注册的全局安装的链接智能体生成物，包括指令文件、规则、MCP/插件配置以及托管的钩子（hooks），使已链接的宿主环境能够立即获得新版包的输出。

仅在有意替换生成的 Engram 适配器文件时使用 `--force`。

## 技能集渲染配置文件

对于具有运行时运行能力的宿主环境，Engram 会安装轻量级的引导指令（bootstrap instructions），而不是完整的协议。钩子提供路由后的任务上下文，MCP 工具提供加载/搜索/提案行为，而斜杠适配器或 Agent Skills 携带详细的命令工作流。在不具备可靠运行时上下文注入的备用目标中，仍将接受紧凑的手动指令。

## SQLite 配置数据库备用方案

Engram 的 SQLite 配置数据库是工作空间/配置文件管理的一项优化。如果无法打开或初始化该数据库，普通的读/写命令将回退到 JSON配置快照。特定于数据库的命令会报告 SQLite 不可用，而不是阻止普通的内存使用。

## 下一步

- [故障排除](troubleshooting.md)
- [CLI: inject / link / upgrade](../cli/inject-link-upgrade.md)
