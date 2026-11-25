---
title: sync / clone-memory / archive
sidebar_position: 7
description: 用于在不同作用域之间移动记忆的 sync、clone 和 archive 命令。
---

# sync / clone-memory / archive

在不同作用域之间迁移记忆，并安全剔除错误记忆。

## clone-memory

```bash
engram clone-memory workspace global
engram clone-memory global workspace --force
engram clone-memory workspace global --metacognize
```

在工作区与全局作用域之间复制 `rules/`、`skills/` 和 `knowledge/` 下处于活动状态的 Markdown。当你希望复制的记忆通过 save-session 的审批流程提出提议而非逐字直接复制时，请添加 `--metacognize`。

Agent 可以将自然语言的克隆请求规范化为 `engram clone-memory`，例如 "clone workspace memory to global" -> `engram clone-memory workspace global`。反转作用域可将全局记忆克隆到工作区；仅当用户明确要求覆盖目标副本时才使用 `--force`。

## archive

```bash
engram archive --reason "<why>" <id-or-file>
```

归档错误或已被取代的记忆。文件仅在审批后退出活动路由，并完整保留在 `archive/` 目录下。请使用 archive 而非 delete，以保留审计历史。

## observe (inbox)

```bash
engram observe --file session.md
engram save-session --file .agents/.engram/inbox/<note>.md
```

`observe` 将经过脱敏的原始笔记存入 `inbox/`。收件箱中的笔记不是活动记忆。

## 全局 Git 同步 {#global-git-sync}

全局 Git 同步由 `global_git.*` 配置字段控制。每个字段的详细信息请参阅 [Entry Web UI: Construct 标签页](../entry/construct.md)。使用 `engram entry` 与 Construct 标签页，或者 `engram config view`，来查看解析出的 Git 检测状态。

## 后续步骤 {#next-steps}

- [配置与工作区](profiles-workspaces-config.md)
- [运维：团队 Git 工作流](../operations/team-git-workflow.md)
