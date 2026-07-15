---
title: 完整字段参考
sidebar_position: 10
description: Entry Web UI 每个输入和控制的可搜索参考。
---

# 完整字段参考

此页面是 Entry Web UI 每个输入和控制的规范最终用户字段参考。

## 如何阅读此参考

每个字段列出：

- **配置键** — 在配置文件和 CLI 中使用的键
- **控制** — 输入类型
- **默认值** — 安全的默认值
- **风险** — `normal` (正常), `caution` (小心), 或 `risky` (有风险)
- **备注** — 该字段的作用以及何时进行更改

## Core (核心)

| 配置键 | 控制 | 默认值 | 风险 | 备注 |
| --- | --- | --- | --- | --- |
| `enabled` | 开关 | `true` | risky | 主开关。禁用会停止 Engram 行为。 |
| `scope` | 选择 | `both` | risky | 保存目标: `workspace`, `global`, `both`。 |
| `read` | 选择 | `auto` | normal | 注入内存的时机: `auto`, `startup`, `always`, `manual`, `off`。 |
| `proof` | 选择 | `off` | normal | Hook 凭证行: `off`, `compact`。 |
| `global_path` | 文本 | 空 | risky | 全局内存的文件系统路径。 |
| `default_profile` | 选择 | 空 | risky | 未明确设置时使用的配置文件。 |
| `roles` | 角色 | 空 | normal | 用于路由的以逗号分隔的角色名称。 |
| `theme` | 选择 | `dark` | hidden | 内部/隐藏设置。不面向用户。 |

## Load Routing (加载路由)

| 配置键 | 控制 | 默认值 | 风险 | 备注 |
| --- | --- | --- | --- | --- |
| `load.limit` | 数字 1–32 | `8` | normal | 普通加载返回的最大内存数。 |

## Memory Limits (内存限制)

| 配置键 | 控制 | 默认值 | 风险 | 备注 |
| --- | --- | --- | --- | --- |
| `memory.rule_line_target` | 数字 50–200，步长 10 | `70` | normal | 推荐的规则行数。 |
| `memory.rule_line_hard_limit` | 数字 50–200，步长 10 | `100` | risky | 规则的最大硬限制行数。 |

## Graph (图)

| 配置键 | 控制 | 默认值 | 风险 | 备注 |
| --- | --- | --- | --- | --- |
| `graph.enabled` | 开关 | `true` | normal | 启用依赖项/关系路由。 |
| `graph.max_related` | 数字 1–20 | `4` | normal | 限制来自图边缘的相关内存。 |
| `graph.min_related_score` | 数字 0–1，步长 0.01 | `0.22` | normal | 相关边的最小相似度分数。 |

## Vector Search (向量搜索)

| 配置键 | 控制 | 默认值 | 风险 | 备注 |
| --- | --- | --- | --- | --- |
| `vector.enabled` | 开关 | `true` | normal | 启用可选的本地向量路由。 |
| `vector.auto_threshold` | 数字 10–1000 | `100` | normal | 激活向量搜索的内存数量。 |
| `vector.candidate_pool` | 数字 8–100 | `24` | normal | 在重新排序前考虑的候选者数。 |
| `vector.dimensions` | 数字 16–512 | `64` | normal | 嵌入维度；更改后需重建。 |

## Rule Variants (规则变体)

| 配置键 | 控制 | 默认值 | 风险 | 备注 |
| --- | --- | --- | --- | --- |
| `rule_variants.enabled` | 开关 | `false` | normal | 启用角色/严格度变体。 |
| `rule_variants.active` | 选择 | `balanced` | normal | 活动变体: `light`, `balanced`, `strict`。 |

## Live Sync (实时同步)

| 配置键 | 控制 | 默认值 | 风险 | 备注 |
| --- | --- | --- | --- | --- |
| `live_sync.enabled` | 开关 | `false` | normal | 保存时同步生成的智能体上下文文件。 |

## Global Git (全局 Git)

| 配置键 | 控制 | 默认值 | 风险 | 备注 |
| --- | --- | --- | --- | --- |
| `global_git.enabled` | 开关 | `true` | risky | 启用全局内存的 Git 行为。 |
| `global_git.remote` | 文本 | `origin` | risky | Git 远程名称；无空格。 |
| `global_git.remote_url` | 文本 | 空 | risky | 共享全局内存远程仓库 URL。 |
| `global_git.branch` | 文本 | `main` | risky | 同步目标分支。 |
| `global_git.auto_sync` | 开关 | `true` | risky | 自动拉取/推送行为。 |
| `global_git.auto_resolve` | 开关 | `true` | risky | 自动冲突处理；审查 diff。 |

## Pattern Mining (模式挖掘)

| 配置键 | 控制 | 默认值 | 风险 | 备注 |
| --- | --- | --- | --- | --- |
| `pattern_mining.enabled` | 开关 | `false` | normal | 实验性的重复模式提取。 |
| `pattern_mining.threshold` | 数字 1–20 | `3` | normal | 重复多少次后模式开始生效。 |
| `pattern_mining.lookback_sessions` | 数字 1–100 | `20` | normal | 要检查的最近会话数。 |

## PR Workflow (PR 工作流)

| 配置键 | 控制 | 默认值 | 风险 | 备注 |
| --- | --- | --- | --- | --- |
| `pr_workflow.enabled` | 开关 | `false` | risky | 实验性的团队 PR 工作流。 |
| `pr_workflow.target_branch` | 文本 | `main` | risky | 接收内存 PR 的分支。 |

## Encryption (加密)

| 配置键 | 控制 | 默认值 | 风险 | 备注 |
| --- | --- | --- | --- | --- |
| `encryption.enabled` | 开关 | `false` | risky | 未来/高级加密模式。 |
| `encryption.scope` | 选择 | `global` | risky | 范围: `workspace`, `global`。 |
| `encryption.key_source` | 选择 | `portable-file` | risky | 密钥来源策略；有备份丢失风险。 |

## 非配置控件

有关非配置控件，请参见各个标签页：

- [Connections 标签页](connections.md)
- [Profiles 标签页](profiles.md)
- [Workspaces 标签页](workspaces.md)
- [Core 标签页](core.md)
- [Memories 标签页](memories.md)
- [Runtime 标签页](runtime.md)

## 后续步骤

- [Construct 标签页](construct.md)
- [字段编写指南](field-authoring-guidelines.md)
