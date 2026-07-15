---
title: 故障排除
sidebar_position: 3
description: 常见的 Engram 问题及恢复方法。
---

# 故障排除

第一步：打开 `engram entry` 并阅读 **Runtime** 选项卡。它会显示解析出的配置文件、内存根目录、核心配置、路由、图和 Git 检测状态。

## 内存未能加载

- 运行 `engram load --dry-run "<任务>"` 来检查候选数量和过滤收窄的标签。
- 检查 `engram config view` 中的 `enabled`、`read` 和 `load.limit` 选项。
- 确认 `.agents/.engram/` 目录下存在工作空间内存。
- 运行 `engram verify` 来检查哈希值。

## 钩子未注入

- 确认 `engram set-read status` 不是 `off` 或 `manual`。
- 确认宿主已链接：`engram link <目标>`。
- 在 `link`/`unlink` 后重启或重新加载宿主（特别是 OpenCode）。
- 检查 `engram set-proof status` 以确认证明行的可见性。

## 保存失败

- 阅读审批预览以获取有关关联内存的提示信息。
- 如果全部接受（accept-all）报告了关联内存，则没有任何文件被保存。请使用 `DEPENDS_ON` 或 `UPDATE` 候选方案重新运行。
- 在 CLI 输出中检查模式、秘密以及提示词注入扫描错误。

## 配置文件混淆

- 运行 `engram profile status`。
- 确认工作空间的 `default_profile` 和当前活跃的用户配置文件。
- 记住：指定与工作空间默认配置不同的显式配置文件会针对该命令禁用工作空间内存。

## 无效的内存文件

```bash
engram verify
engram repair
engram rebuild-index
engram graph --rebuild
```

## 包更新后适配器失效

```bash
engram upgrade
engram upgrade --latest
engram link all
```

仅在有意替换生成的 Engram 适配器文件时使用 `--force`。

## SQLite 配置数据库不可用

普通的读写命令会回退到 JSON 配置快照。针对数据库的特定命令会报告 SQLite 不可用，而不会阻止常规的内存使用。

## 全局 Git 同步问题

- 确认 `global_git.enabled` 为 `true`。
- 检查 `global_git.remote_url` 是一个有效的 Git 远程仓库 URL。
- 审查 `global_git.auto_resolve` — 自动冲突处理可能会掩盖内存的差异。
- 运行 `engram entry` 中的 Runtime 选项卡以检查 `global_git_detected`。

## 下一步

- [常见问题解答](faq.md)
- [CLI: verify / repair / quality-check](../cli/verify-repair-quality.md)
