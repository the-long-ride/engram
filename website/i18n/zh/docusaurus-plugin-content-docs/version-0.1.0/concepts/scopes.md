---
title: 工作空间内存与全局内存
sidebar_position: 3
description: 工作空间内存优先。全局内存是跨项目可复用偏好和团队上下文的备用方案。
---

# 工作空间内存与全局内存

Engram 在两个范围中解析内存。

## 工作空间内存

工作空间内存保存在：

```text
<project>/.agents/.engram/
```

它保存特定于项目的规则、决策和工作流。工作空间内存优先于全局重复项。

## 全局内存

全局内存是可选的，保存在用户配置的任何位置。它保存应当随你跨仓库迁移的偏好和团队上下文。

```bash
engram inject --global-only --global-path ~/Documents/engram
```

全局内存是可复用偏好、个人习惯或团队通用默认设置的备用方案。

## 范围优先级

1. 工作空间内存：`<project>/.agents/.engram/`
2. 全局内存：`$ENGRAM_GLOBAL_DIR` 或 `engram inject --global-path <path>`

工作空间内存优先。全局内存是跨项目可复用偏好和团队上下文的备用方案。

## 选择保存目标

使用 `set-save-target` 来选择普通保存的去向：

```bash
engram set-save-target status
engram set-save-target workspace
engram set-save-target global
engram set-save-target both
```

在配置了全局内存的情况下，全新的工作空间安装默认将普通保存同时写入工作空间和全局。智能体可以使用 `--scope workspace|global|both` 覆盖某次写入。

如果当前活跃的配置范围被设置为 `global` (`scope: "global"`)，则工作空间级别的技能集链接会被禁用并跳过，以防止向当前运行目录写入文件。要在全局范围设置中链接智能体，请使用 `engram link --global`。

## 下一步

- [配置文件与范围解析](profiles.md)
- [读取路径与路由](read-path.md)
