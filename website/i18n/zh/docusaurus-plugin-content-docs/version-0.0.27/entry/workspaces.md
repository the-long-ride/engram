---
title: Workspaces 标签页 (工作区)
sidebar_position: 6
description: 从 Entry Web UI 注册并链接项目仓库。
---

import RiskCallout from '@site/src/components/RiskCallout';

# Workspaces 标签页

Workspaces 标签页用于注册项目仓库并管理它们的链接状态。

## 工作区名称 (Workspace name)

仓库/项目路径的友好显示名称。保持简短易懂。

## 工作区路径 (Workspace path)

指向仓库/项目的文件系统路径。验证文件夹是否存在或是否可以初始化；避免使用系统文件夹。

## 链接 / 取消链接 (Link / Unlink)

Engram 是否将生成的指令和 hook 主动连接到该工作区。链接活动仓库；取消链接已归档或测试仓库。

<RiskCallout level="caution">
取消链接会阻止智能体接收 Engram 指令。在取消链接活动工作区之前请先确认。
</RiskCallout>

## 删除 (Delete)

删除工作区注册。明确它是仅删除注册还是删除内存文件；文档必须与实现一致。为了可审计性，优先选择取消链接而不是删除。

## CLI 等效命令

```bash
engram inject
engram link codex
engram unlink
```

## 后续步骤

- [Profiles 标签页](profiles.md)
- [Connections 标签页](connections.md)
