---
title: verify / repair / quality-check
sidebar_position: 6
description: 维护命令——验证哈希、修复无效文件、检查质量并解决冲突。
---

# verify / repair / quality-check

维护命令用于保持记忆健康。

## verify

```bash
engram verify
engram verify --sources
engram verify --sources --json
```

检查哈希以确保完整性。在手动编辑或导入之后运行。

`--sources` 还会将 take-control 记忆的 `source_files` 与其 `source_hashes` 重新进行哈希比对，并将已更改或缺失的来源记录到本地、被 gitignore 的 `.agents/.engram/stale.json` 中。过时的来源绝不会导致 `verify` 失败：`load` 会降低过时记忆的排名，并在其卡片末尾加上 ` (stale)`，而 `engram take-control --refresh` 会为它们提出更新。来源路径必须位于工作区之内；绝对路径、`..`、符号链接和硬链接、secret 文件、`.git` 以及 Engram 数据会被报告为未检查，且绝不会被读取。在 `--json` 中，`skipped` 列出 `{key, reason}` 对象。全局 take-control 记忆会记录其来源的工作区，并且仅在该工作区中被检查。

## stats

```bash
engram stats
engram stats --usage
```

`--usage` 会读取本地、被 gitignore 的 `.agents/.engram/usage.json`，并显示 agent 实际通过 `engram load --id` 获取了哪些记忆，以及哪些记忆被注入但在 30 天内从未被获取。

## repair

```bash
engram repair
engram rebuild-index
```

在手动编辑或导入之后，使用 `repair` 查找被索引重建跳过的格式错误的记忆文件。

```bash
engram repair --move-backups
engram repair workspace --move-backups --confirm
```

`--move-backups` 会计划将散落在 `rules`、`skills` 和 `knowledge` 中的 `*.bak` 迁移备份文件，移动到被 gitignore 的 `backups/<kind>-<label>/` 文件夹中（例如 `backups/schema-v3/rules/x.md.pre-v3.bak`）。添加 `--confirm` 才会实际移动；目标位置已存在不同文件时，会被报告为冲突并保持原样。`engram doctor` 会将这些文件报告为 `memory.stray_backups`。

## quality-check

```bash
engram quality-check
```

以精简方式报告矛盾候选。矛盾检测是启发式的，仅供参考。

## graph

```bash
engram graph "package manager"
engram graph --rebuild
```

在归档之前检查图路由。手动编辑之后运行 `engram graph --rebuild`。

## archive

```bash
engram archive --reason "Repo migrated to npm." rules/use-pnpm.md
```

归档错误或已被取代的记忆。为便于审计，请使用归档而不是删除。该文件只有在获得批准后才会离开活动路由，并保留在 `archive/` 之下。

## resolve-conflicts

```bash
engram resolve-conflicts --dry-run --metacognize
engram resolve-conflicts --metacognize
```

预览或仅解决由 Engram 拥有的工作区记忆冲突。当希望 agent 在冲突处理之后审阅记忆文件夹时，请添加 `--metacognize`。该命令会将确定性的冲突处理范围限定在 `.agents/.engram/` 内，然后附加工作区 metacognize 来源包，以生成简明的 `TYPE/TEXT` 候选。

## benchmark

```bash
engram benchmark
```

检索回归检查。

## 后续步骤

- [sync / archive](sync-archive.md)
- [运维故障排查](../operations/troubleshooting.md)
