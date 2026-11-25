---
title: Entry Web UI 概述
sidebar_position: 1
description: Entry Web UI 是本地控制面板，用于配置 Engram 内存、配置文件、工作区和智能体连接。
---

import RiskCallout from '@site/src/components/RiskCallout';

# Entry Web UI 概述

Entry Web UI 是 Engram 的本地控制面板。使用它来配置内存根、链接 AI 智能体、微调路由、审查重复、检查内存图谱以及调试运行时配置，而无需手动编辑 JSON。

## 何时使用

- 首次设置工作区或全局内存根
- 链接或取消链接 AI 智能体，而无需记住 CLI 标志
- 微调路由、图、向量和规则变体设置
- 审查重复或冲突的内存
- 检查内存图谱
- 调试解析后的配置、路径和 Git 检测

## 本地专用访问模型 (Local-only)

该面板在您的机器上运行。它不是云服务。为了安全起见，请在完成后关闭服务器。

<RiskCallout level="risky">
Entry 面板仅限本地访问。在配置内存时将其视为开启状态，完成后从侧边栏底部关闭服务器。
</RiskCallout>

## 与 CLI 命令的关系

每个可见的控件都映射到一个 CLI 命令或配置键。在存在 CLI 等效项的地方，字段参考会列出它。对于脚本编写和自动化，CLI 仍然是事实来源。

## 导航与 URL 路由

Entry Web UI 使用 URL `#hash` 路由，因此每个标签页都可以加入书签、刷新或通过浏览器历史记录导航：

- `#config` — Construct
- `#author` — Git
- `#upgrade` — Updates
- `#recall` — Memories
- `#review` — Review
- `#maintain` — Core
- `#connect` — Connections

侧边栏包含用于工作区级控件的 **Workspace** 分区，并在有待分拣的发现、暂缓候选或收据时在 **Review** 上显示待审数量徽章。在窄视口上，侧边栏会折叠为移动端抽屉，可通过关闭按钮或按 `Escape` 关闭。

## 标签页一览

| 标签页 | Hash | 任务 |
| --- | --- | --- |
| [Construct](construct.md) | `#config` | 配置 Engram 运行时字段、资料、工作区与运行时状态 |
| [Git](../operations/git-author-settings.md) | `#author` | 管理作者身份与全局 Git 配置 |
| [Updates](../operations/configuration-upgrades.md) | `#upgrade` | 检查软件包更新并应用配置升级 |
| [Memories](memories.md) | `#recall` | 搜索、模拟路由、检查、提升与归档活动记忆 |
| [Review](review.md) | `#review` | 分拣会话学习收据、审查发现与暂缓的记忆写入 |
| [Core](core.md) | `#maintain` | 审查重复和冲突的内存 |
| [Connections](connections.md) | `#connect` | 检查 Doctor 健康状态、检测智能体并关联受支持的 AI 智能体 |

## 后续步骤

- [启动控制面板](launch.md)
- [Construct 标签页](construct.md)
- [Core 标签页](core.md)
- [完整字段参考](field-reference.md)


## Git 作者身份

Engram 可以存储一个全局作者以及可选的工作区覆盖。解析顺序依次为工作区、全局，然后是只读的 Git 回退。设置仅影响未来的记忆；工作区覆盖绝不会更改全局 Git 配置。全局 Git 同步或旧版记忆迁移需要显式的计划与确认。

```bash
engram author show
engram author set --name "Jane Doe" --email "jane@example.com"
engram author unset --scope workspace
engram author sync-git-global --plan
engram author sync-git-global --confirm
engram author migrate-memories --plan
engram author migrate-memories --confirm
```

请阅读完整的 [Git 作者设置指南](../operations/git-author-settings.md)。
