---
title: sync / clone-memory / archive
sidebar_position: 7
description: 用于在不同作用域之间移动内存的同步、克隆和归档命令。
---

# sync / clone-memory / archive

在不同作用域之间移动内存并安全地退休错误的内存。

## clone-memory

```bash
engram clone-memory workspace global
engram clone-memory global workspace --force
engram clone-memory workspace global --metacognize
```

在工作区和全局作用域之间复制活动的 `rules/`、`skills/` 和 `knowledge/` Markdown。当你希望克隆的内存通过 save-session 审批流提出建议，而不是逐字复制时，添加 `--metacognize`。

Agent 可以将自然的克隆请求标准化为 `engram clone-memory`，例如 "clone workspace memory to global" -> `engram clone-memory workspace global`。反转作用域以将全局内存复制到工作区中；仅当人类明确要求覆盖目标副本时才使用 `--force`。

## archive

```bash
engram archive --reason "<why>" <id-or-file>
```

归档错误或被取代的内存。该文件仅在批准后才会离开活动路由，并保留在 `archive/` 下。为了可审计性，使用归档而非删除。

## observe (inbox)

```bash
engram observe --file session.md
engram save-session --file .agents/.engram/inbox/<note>.md
```

`observe` 将脱敏的原始笔记存储在 `inbox/` 中。收件箱笔记不是活动内存。

## 全局 Git 同步

全局 Git 同步由 `global_git.*` 配置字段控制。有关每个字段的信息，请参阅 [Entry Web UI: Construct 选项卡](../entry/construct.md)。使用 `engram entry` 运行时（Runtime）选项卡检查已解析的 Git 检测。

## 下一步

- [profiles / workspaces / config](profiles-workspaces-config.md)
- [运行：团队 Git 工作流](../operations/team-git-workflow.md)
