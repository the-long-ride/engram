---
title: 读取路径与路由
sidebar_position: 5
description: Engram 加载工作空间和全局索引，应用忽略规则和角色过滤器，然后路由紧凑的上下文包。
---

# 读取路径与路由

读取流程决定了智能体在执行给定任务时能看到哪些内存。

## 读取流程

1. Engram 加载工作空间索引和可选的全局索引。
2. 工作空间条目优先于全局重复条目。
3. 忽略规则和角色过滤器隐藏无关条目。
4. 图感知路由选择紧凑的上下文包。
5. 在打印内容之前运行哈希和安全性检查。

## 锚定与精简

`load` 首先将路由锚定在有意义的查询词上，忽略诸如 `rule`、`knowledge` 之类的通用内存词汇以及常见的停用词。然后，它将更广泛的候选池精简为紧凑的上下文包。

普通加载会报告已选和相关总数，例如 `loaded 8 memory files / 14 total related memories`。

- `load --dry-run` 显示候选数量、收窄标签和匹配原因。
- `load --all` 返回每个可见的路由匹配，而不是应用紧凑限制。
- `load` 是面向智能体的紧凑路由。

`workflow` 和 `workflows` 仍然路由到技能内存，但通用类型词本身不会产生宽泛的匹配。

## 依赖层

当一个内存需要建立在另一个内存之上而不是重复它时，请使用 `depends_on` frontmatter：

```yaml
depends_on: [release-foundation]
level: advanced
```

手动编辑后运行 `engram graph --rebuild`。图会报告依赖层，而 `engram load` 会在更深层的内存之前，将路由好的先决条件拉入同一个紧凑的上下文包中。图中的关联边和向量命中本身无法加载不相关的内存；它们仅有助于对已经与有意义的查询词重叠的内存进行重新排序或扩展。显式的 `depends_on` 先决条件即使没有自己的关键词重叠，也可能被加载。

## 路由图

```mermaid
flowchart LR
  A[智能体请求] --> B[加载工作空间 + 全局索引]
  B --> C[工作空间优先于全局重复]
  C --> D[忽略规则 + 角色过滤器]
  D --> E[图感知路由]
  E --> F[哈希 + 安全检查]
  F --> G[紧凑上下文包]
```

## 下一步

- [写入路径与审批](write-path.md)
- [CLI: load / search / graph](../cli/load-search-graph.md)

