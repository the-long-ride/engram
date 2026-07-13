---
title: profiles / workspaces / config
sidebar_position: 5
description: 管理配置文件、保存目标、加载限制、读取/核对模式、角色和运行时配置。
---

# profiles / workspaces / config

管理配置文件、保存目标、加载限制、读取/核对模式、角色和运行时配置。

## profile

```bash
engram profile status
engram profile create personal --global-path ~/Documents/engram-personal --use
engram profile use company --workspace
engram profile merge personal company --dry-run
```

配置文件解析顺序是显式的 `--profile` 或 `ENGRAM_PROFILE`，然后是工作区 `default_profile`，最后是活动的活动用户配置文件。如果工作区 `W` 固定到配置文件 `B`，而用户默认仍为配置文件 `A`，则针对 `W` 的每次普通加载、MCP 加载和 Agent 钩子注入都将读取配置文件 `B` 的全局内存，而绝不会读取配置文件 `A`。与工作区默认不同的显式配置文件使用该配置文件的全局内存，并禁用该命令的工作区内存。

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

当 `engram set-role ...` 或 `engram set-rule-variant ...` 成功时，CLI 返回一行 `Agent action:`。支持 Engram 的斜杠适配器和 MCP 主机应立即重新运行 `engram load "<current task/request>"`。

## set-rule-variant

```bash
engram set-rule-variant strict|balanced|light|off
```

## config

```bash
engram config view
engram config set <key> <value>
```

### 关键设置参考

| 键 | 描述 | 默认值 | 范围 / 选项 |
| --- | --- | --- | --- |
| `memory.rule_line_target` | 规则内存的推荐行数目标 | `70` | `50` 到 `200` |
| `memory.rule_line_hard_limit` | 规则内存的最大允许行数 | `100` | `50` 到 `200` |
| `load.limit` | 普通加载返回的最大内存数 | `8` | `1` 到 `32` |
| `rule_variants.enabled` | 启用或禁用规则变体生成 | `true` | `true`, `false` |
| `rule_variants.active` | 活动规则变体模式 | `balanced` | `light`, `balanced`, `strict` |
| `graph.enabled` | 启用或禁用图感知路由 | `true` | `true`, `false` |
| `graph.max_related` | 从图的边中提取的最大相关内存数 | `8` | `1` 到 `20` |
| `graph.min_related_score` | 添加图边的最小相似度分数 | `0.3` | `0.0` 到 `1.0` |
| `vector.enabled` | 启用或禁用向量搜索退路 | `true` | `true`, `false` |
| `live_sync.enabled` | 保存时同步生成的 Agent 上下文文件 | `true` | `true`, `false` |
| `global_git.enabled` | 启用全局 Git 仓库同步自动化 | `false` | `true`, `false` |
| `global_git.remote` | 全局同步的 Git 远程名称 | `origin` | 字符串 |
| `global_git.branch` | 全局同步的 Git 分支名称 | `main` | 字符串 |

这些设置也可以在 `engram entry` 的 **Construct** 选项卡下以可视化方式管理。

## 下一步

- [verify / repair / quality-check](verify-repair-quality.md)
- [Entry Web UI: Construct 选项卡](../entry/construct.md)
