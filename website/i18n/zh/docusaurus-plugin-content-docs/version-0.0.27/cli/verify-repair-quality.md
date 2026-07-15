---
title: verify / repair / quality-check
sidebar_position: 6
description: 维护命令 — 验证哈希、修复无效文件、检查质量并解决冲突。
---

# verify / repair / quality-check

维护命令可以保持内存健康。

## verify

```bash
engram verify
```

检查哈希的完整性。手动编辑或导入后运行。

## repair

```bash
engram repair
engram rebuild-index
```

在手动编辑或导入后使用 `repair`，以查找在索引重建中被跳过的畸形内存文件。

## quality-check

```bash
engram quality-check
```

以紧凑的形式报告矛盾候选。矛盾检测是启发式和咨询性的。

## graph

```bash
engram graph "package manager"
engram graph --rebuild
```

在归档之前检查图路由。手动编辑后运行 `engram graph --rebuild`。

## archive

```bash
engram archive --reason "Repo migrated to npm." rules/use-pnpm.md
```

归档错误或被取代的内存。出于可审计性原因，使用归档而不是删除。该文件仅在批准后才离开活动路由，并保留在 `archive/` 下。

## resolve-conflicts

```bash
engram resolve-conflicts --dry-run --metacognize
engram resolve-conflicts --metacognize
```

仅预览或解决由 Engram 拥有的工作区内存冲突。当 Agent 在冲突处理后需要审查内存文件夹时，添加 `--metacognize`。该命令将确定性冲突处理限制在 `.agents/.engram/`，然后附加工作区自我审视源包以获取简明的 `TYPE/TEXT` 候选。

## benchmark

```bash
engram benchmark
```

检索回归检查。

## 下一步

- [sync / archive](sync-archive.md)
- [运行故障排除](../operations/troubleshooting.md)
