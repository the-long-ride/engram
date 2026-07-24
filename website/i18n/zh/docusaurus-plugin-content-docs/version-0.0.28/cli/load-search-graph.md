---
title: load / search / graph
sidebar_position: 2
description: 读取命令 — 加载路由内存、搜索保险库并检查图路由。
---

# load / search / graph

读取命令用于加载路由内存、搜索保险库并检查图路由。

## load

```bash
engram load "<task>"
engram load "<task>"
engram load --dry-run "<task>"
engram load --all "<task>"
```

`load` 首先在有意义的查询词上锚定路由，忽略诸如 `rule`、`knowledge` 等通用内存词汇和常见停用词。然后它将更广泛的候选池精炼为紧凑的上下文包。普通加载会报告已选和相关总数，例如 `loaded 8 memory files / 14 total related memories`。

- `--full` — 面向 Agent 的紧凑路由（在 frontmatter 中仅保留 `id`、`type`、`tags`、`confidence`、`depends_on`；保留一个选定的规则变体）
- `--dry-run` — 显示候选数量、收窄标签和匹配原因，而不打印内容
- `--all` — 返回每个可见的路由匹配，而不是紧凑限制

`workflow` 和 `workflows` 仍会路由到技能内存，但通用类型词本身不会进行宽泛匹配。

## search

```bash
engram search "<topic>"
engram search --semantic "<topic>"
```

默认搜索是确定性词法搜索。`search --semantic` 添加确定性的本地相似度，而不是由嵌入（embedding）支持的语义搜索。

## graph

```bash
engram graph "<topic>"
engram graph --rebuild
```

检查图路由。手动编辑后运行 `engram graph --rebuild`。图会报告依赖关系层，并且 `engram load` 会在加载更深层内存之前，将路由的前置条件拉入同一个紧凑的上下文包中。

图的相关边 and 向量命中本身无法加载不相关的内存；它们仅有助于重新排序或扩展已经与有意义的查询词有交集的内存。显式的 `depends_on` 前置条件在没有自身关键字交集的情况下仍可加载。

## 依赖层 (Dependency layers)

```yaml
depends_on: [release-foundation]
level: advanced
```

当某个内存应该构建在另一个内存之上而不是重复它时，使用 `depends_on` frontmatter。

## 下一步

- [save / save-session / observe](save-session.md)
- [概念：读取路径和路由](../concepts/read-path.md)

