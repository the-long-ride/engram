---
title: load / search / graph
sidebar_position: 2
description: 读取命令——加载路由记忆、搜索记忆库并检查图路由。
---

# load / search / graph

读取命令用于加载路由记忆、搜索记忆库以及检查图路由。

## load

```bash
engram load "<task>"
engram load --full "<task>"
engram load --dry-run "<task>"
engram load --all "<task>"
engram load --budget-tokens 800 "<task>"
engram load --disclosure full "<task>"
engram load --id <id>,<id>
engram load --exclude-keys workspace:rules/use-pnpm.md "<task>"
```

`load` 首先将路由锚定在有意义的查询词上，忽略如 `rule`、`knowledge` 等通用记忆词汇和常见停用词。然后将更广泛的候选池精炼为紧凑的上下文包。正常加载会报告选定数和关联总数，例如 `loaded 8 memory files / 14 total related memories`。

- 默认 `load` — 面向 agent 的分层路由：排名靠前的命中项（由 `load.expand_top` 决定，默认 3 条）作为完整正文展开，其余选定项均作为单行卡片（card）展示，末尾附带 `fetch: engram load --id <ids>` 提示；每个正文标头带有该记忆的 `authority`，诸如 `evidence_refs`、`## Context`、`## Example` 和 `## Origin` 等 frontmatter 不会渲染（使用 `--full` 可查看完整内容），规则只显示选定的一种变体。
- `--id <id,...>` — 为卡片获取完整正文；ID 可用逗号分隔，显式获取会计入 `stats --usage`。
- `--budget-tokens <200-16000>` — 对完整分层输出的硬性上限；正文优先降级为卡片，之后排名最低的卡片才会被排除。
- `--disclosure auto|full` — `full` 打印每个打包的正文而非分层包（也可在配置中设置 `load.disclosure: full`）。
- `--exclude-keys <scope:file,...>` — 跳过调用方已持有的记忆；不打印正文或卡片，且 `--json` 会将其列在 `already_loaded` 下。
- `--full` — 更宽泛的旧版输出，带有完整 frontmatter 和全部规则变体。
- `--dry-run` — 显示候选数量、收窄标签和匹配原因，而不打印内容。
- `--all` — 返回所有可见路由匹配项，而非紧凑上限。

`workflow` 和 `workflows` 仍会路由到技能记忆，但通用的类型词本身不会造成宽泛匹配。

在 `auto` 披露模式下，JSON 的 `selected` 和 `entries` 列表仅描述展开的正文；卡片单独报告。可在 `engram.config.json` 的 `load` 块中配置 `load.expand_top` 和 `load.disclosure`（参见[配置与工作区](profiles-workspaces-config.md#load-configuration)）。

## search

```bash
engram search "<topic>"
engram search --semantic "<topic>"
```

默认搜索是确定性的词法搜索。`search --semantic` 增加确定性的局部相似度，而非基于 embedding 的语义搜索。`search --json` 的结果包含 `score` 字段。

## graph

```bash
engram graph "<topic>"
engram graph --rebuild
```

检查图路由。手动编辑后请运行 `engram graph --rebuild`。图会报告依赖层级，`engram load` 会在加载更深层记忆之前，将路由前置条件引入同一个紧凑上下文包中。

图中的关联边和向量匹配不会自动加载无关记忆；它们仅用于重排序或扩展已与有意义查询词匹配的记忆。显式的 `depends_on` 前置条件仍可在没有自身词语匹配的情况下加载。

## 依赖层级 {#dependency-layers}

```yaml
depends_on: [release-foundation]
level: advanced
```

当一条记忆应当构建在另一条记忆之上而非重复它时，请使用 `depends_on` frontmatter。

## 后续步骤 {#next-steps}

- [save / save-session / observe](save-session.md)
- [概念：读取路径与路由](../concepts/read-path.md)
