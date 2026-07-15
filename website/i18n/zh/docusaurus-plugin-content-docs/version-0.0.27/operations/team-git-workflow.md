---
title: 使用 Git 进行团队协作流
sidebar_position: 1
description: 使用 Git 在不同机器之间传递 Engram 内存并提供审查历史。
---

# 使用 Git 进行团队协作流

Git 在机器之间传递内存并提供审查历史。Engram 是 Git 原生的：内存就是纯 Markdown 格式，因此适用普通的 Git 工作流。

## 工作空间内存作为子模块

如果人类希望将 `.agents/.engram` 作为一个单独的仓库进行追踪：

```bash
engram inject --submodule
engram inject --submodule-remote <git-url>
```

Engram 会验证 URL，在 `main` 分支上初始化子模块，并创建子模块的第一个 commit，信息为 `Initialize engram`。

## 共享的全局 Git 源

如果 `engram entry` 显示没有 `global_git_detected.remote_url`，请询问人类是否应当通过 Git 共享全局内存。当他们提供 URL 后：

```bash
engram inject --global-remote <git-url>
```

通过以下 `global_git.*` 字段配置同步行为：

- `global_git.enabled` — 开启全局内存的 Git 行为
- `global_git.remote` — 远程分支名称（默认 `origin`）
- `global_git.remote_url` — 共享的全局内存远程 URL
- `global_git.branch` — 目标分支（默认 `main`）
- `global_git.auto_sync` — 自动 pull/push 行为
- `global_git.auto_resolve` — 自动冲突处理

:::warning
自动冲突处理会掩盖内存的差异（diffs）。在依赖 `global_git.auto_resolve` 之前，请先仔细审查内存差异。
:::

## 审查工作流

1. 智能体提出内存候选方案。
2. 人类通过 A/B/C 交互门槛（终端）或 `yes`/`audit`/`cancel`（聊天）进行审批。
3. Engram 写入审批通过的 Markdown 文件，并刷新哈希、索引、图和更新日志。
4. 通过 Git 提交并推送（push）内存变更。
5. 队友执行 pull 抓取，并运行 `engram upgrade` 进行对账。

## 下一步

- [发布与升级流程](release-upgrade.md)
- [概念: 写入路径与审批](../concepts/write-path.md)
