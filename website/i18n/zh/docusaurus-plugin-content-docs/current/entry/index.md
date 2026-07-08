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
Entry 面板仅限本地访问。在配置内存时将其视为开启状态，完成后从 Runtime 标签页关闭服务器。
</RiskCallout>

## 与 CLI 命令的关系

每个可见的控件都映射到一个 CLI 命令或配置键。在存在 CLI 等效项的地方，字段参考会列出它。对于脚本编写和自动化，CLI 仍然是事实来源。

## 标签页一览

| 标签页 | 任务 |
| --- | --- |
| [Connections](connections.md) | 检测并链接受支持的 AI 智能体 |
| [Construct](construct.md) | 配置每个 Engram 运行时字段 |
| [Profiles](profiles.md) | 管理隔离的全局内存配置文件 |
| [Workspaces](workspaces.md) | 注册并链接项目仓库 |
| [Core](core.md) | 审查重复和冲突的内存 |
| [Memories](memories.md) | 检查内存图谱并归档内存 |
| [Runtime](runtime.md) | 只读的解析后配置和路径 |

## 后续步骤

- [启动控制面板](launch.md)
- [Construct 标签页](construct.md)
- [完整字段参考](field-reference.md)
