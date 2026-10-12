---
title: profiles / workspaces / config
sidebar_position: 5
description: 管理资料、保存目标、加载上限、读取/证明模式、角色和运行时配置。
---

# profiles / workspaces / config

管理资料、保存目标、加载上限、读取/证明模式、角色和运行时配置。

## profile

```bash
engram profile status
engram profile create personal --global-path ~/Documents/engram-personal --use
engram profile use company --workspace
engram profile merge personal company --dry-run
```

资料（profile）的解析顺序为：显式的 `--profile` 或 `ENGRAM_PROFILE`，然后是工作区的 `default_profile`，最后是当前的用户资料。如果工作区 `W` 被固定到资料 `B`，而用户默认仍是资料 `A`，则 `W` 的每一次正常加载、MCP 加载和 agent hook 注入都会读取资料 `B` 的全局记忆，绝不会读取资料 `A`。与工作区默认值不同的显式资料会使用该资料的全局记忆，并在该命令中禁用工作区记忆。

## set-save-target

```bash
engram set-save-target status
engram set-save-target workspace
engram set-save-target global
engram set-save-target both
```

## set-load-limit

```bash
engram set-load-limit 1..32
engram set-load-limit status
engram set-load-limit reset
```

<a id="load-configuration"></a>
## 加载配置

这些键位于 `.agents/.engram/engram.config.json` 的 `load` 块中；`engram config set` 不接受它们。

| 键 | 默认值 | 含义 |
| --- | --- | --- |
| `load.disclosure` | `auto` | `auto` 展开排名靠前的命中并将其余显示为卡片；`full` 保持未分层的输出 |
| `load.expand_top` | `3` | 在 `auto` 披露模式下展开的正文数量 |
| `load.working_ttl_days` | `14` | 已批准的 `OBJECTIVE: task` 记忆停留在工作层的天数（1 到 365）。也可在 Entry 的 Construct 标签页中编辑 |

## set-read

```bash
engram set-read startup|auto|always|manual|off
engram set-read status
```

## set-proof

```bash
engram set-proof off|compact
engram set-proof status
```

## set-role

```bash
engram set-role frontend
engram set-role backend security
engram set-role
```

当 `engram set-role ...` 或 `engram set-rule-variant ...` 成功时，CLI 会返回一行 `Agent action:`。支持 Engram 的斜杠适配器和 MCP 宿主应立即重新运行 `engram load "<current task/request>"`。

## set-rule-variant

```bash
engram set-rule-variant strict|balanced|light|off|status
```

## config

```bash
engram config view
engram config set <key> <value>
```

### 关键设置参考

| 键 | 说明 | 默认值 | 范围 / 选项 |
| --- | --- | --- | --- |
| `memory.rule_line_target` | 规则记忆的推荐行数目标 | `70` | `50` 到 `200` |
| `memory.rule_line_hard_limit` | 规则记忆允许的最大行数 | `100` | `50` 到 `200` |
| `memory.include_author_email` | 将 `author_email` 写入新记忆的 frontmatter（`author_name` 始终会写入） | `false` | `true`, `false` |
| `mcp.resource_limit` | 除 `engram://index` 之外，记忆 MCP `resources/list` 按注入与获取使用量排序所返回的条数（仅限 JSON 配置；不能通过 `engram config set` 设置） | `20` | `0` 到 `200` |
| `load.limit` | 正常加载返回的最大记忆数 | `8` | `1` 到 `32` |
| `hooks.path_rules` | `native` 会为带有 `applies_to` 的记忆写入 Claude 和 Cursor 规则文件，并注册 Claude 的 `InstructionsLoaded`；`hook` 则保留 Claude 的 `PreToolUse` hook | `native` | `native`, `hook` |
| `rule_variants.enabled` | 启用或禁用规则变体生成 | `false` | `true`, `false` |
| `rule_variants.active` | 当前的规则变体模式 | `balanced` | `light`, `balanced`, `strict` |
| `graph.enabled` | 启用或禁用图感知路由 | `true` | `true`, `false` |
| `graph.max_related` | 从图的边获取的相关记忆最大数量 | `4` | `1` 到 `20` |
| `graph.min_related_score` | 添加图的边所需的最小相似度分数 | `0.22` | `0.0` 到 `1.0` |
| `vector.enabled` | 实验性的哈希向量搜索回退（不是语义嵌入） | `false` | `true`, `false` |
| `live_sync.enabled` | 保存时同步生成的 agent 上下文文件 | `false` | `true`, `false` |
| `global_git.enabled` | 启用全局 Git 仓库同步自动化 | `true` | `true`, `false` |
| `global_git.remote` | 用于全局同步的 Git 远程名称 | `origin` | 字符串 |
| `global_git.branch` | 用于全局同步的 Git 分支名称 | `main` | 字符串 |

这些设置也可以在 `engram entry` 的 **Construct** 标签页中以可视化方式管理。

## 后续步骤

- [verify / repair / quality-check](verify-repair-quality.md)
- [Entry Web UI：Construct 标签页](../entry/construct.md)


## Git 作者身份

Engram 可以存储一个全局作者以及可选的工作区覆盖。解析顺序依次为工作区、全局，然后是只读的 Git 回退。设置仅影响未来的记忆；工作区覆盖绝不会更改全局 Git 配置。全局 Git 同步或旧版记忆迁移需要显式的计划与确认。

```bash
engram author show
engram author set --name "Jane Doe" --email "jane@example.com"
engram author unset --scope workspace
engram author sync-git-global --plan
engram author sync-git-global --confirm
engram author migrate-memories --plan
engram author migrate-memories --confirm
```

请阅读完整的 [Git 作者设置指南](../operations/git-author-settings.md)。
