---
title: Profiles 标签页 (配置文件)
sidebar_position: 5
description: 从 Entry Web UI 管理隔离的全局内存配置文件。
---

import RiskCallout from '@site/src/components/RiskCallout';

# Profiles 标签页

Profiles 标签页用于管理隔离的全局内存配置文件。配置文件可防止客户、公司和个人内存跨越边界泄漏。

## 配置文件名称 (Profile name)

命名的内存上下文，例如 `personal`、`client-a`、`team-platform`。使用字母、数字、`.`、`_`、`-`；避免空格和敏感名称。名称必须符合 `^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$`。

## 全局路径 (Global path)

支持该配置文件的文件系统文件夹。首选易失性临时文件夹之外的绝对路径；确保有写入权限。

## 激活 (Activate)

激活配置文件以进行用户级默认解析。从个人内存切换到工作/客户内存会影响未来的加载和保存。

<RiskCallout level="caution">
激活配置文件会更改未来加载和保存所使用的全局内存。在激活前确认配置文件名称。
</RiskCallout>

## 删除 (Delete)

删除配置文件注册。配置文件元数据将被删除；除非代码行为发生改变，否则内存文件可能仍存在于磁盘上。在依赖删除操作前请审查文件夹。

## CLI 等效命令

```bash
engram profile create personal --global-path ~/Documents/engram-personal --use
engram profile use company --workspace
engram profile merge personal company --dry-run
```

## 后续步骤

- [配置文件与范围解析](../concepts/profiles.md)
- [Workspaces 标签页](workspaces.md)
