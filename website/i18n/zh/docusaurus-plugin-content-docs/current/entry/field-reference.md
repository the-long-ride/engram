---
title: 完整字段参考
sidebar_position: 10
description: 可搜索的参考，涵盖 Entry Web UI 的每一个输入和控件。
---

# 完整字段参考

本页是面向最终用户的、涵盖 Entry Web UI 每一个输入和控件的权威字段参考。

## 如何阅读本参考

每个字段都列出：

- **配置键（Config key）** — 配置文件和 CLI 中使用的键
- **控件（Control）** — 输入类型
- **默认值（Default）** — 安全的默认值
- **风险（Risk）** — `normal`、`caution` 或 `risky`
- **说明（Notes）** — 该字段的作用以及何时更改它

## Core {#core}

| 配置键 | 控件 | 默认值 | 风险 | 说明 |
| --- | --- | --- | --- | --- |
| <span id="enabled"></span>`enabled` | toggle | `true` | risky | 总开关。禁用后 Engram 的行为将停止。 |
| <span id="scope"></span>`scope` | select | `both` | risky | 保存目标：`workspace`、`global`、`both`。 |
| <span id="update"></span>`update` | select | `auto` | normal | 静默的软件包升级检查：`auto`、`manual`、`off`。 |
| <span id="read"></span>`read` | select | `auto` | normal | hook 何时注入记忆：`auto`、`startup`、`always`、`manual`、`off`。 |
| <span id="proof"></span>`proof` | select | `off` | normal | hook 证明行：`off`、`compact`。 |
| <span id="global-path"></span>`global_path` | text | 空 | risky | 全局记忆的文件系统路径。 |
| <span id="default-profile"></span>`default_profile` | select | 空 | risky | 未显式设置时使用的资料（profile）。 |
| <span id="roles"></span>`roles` | roles | 空 | normal | 用于路由的、以逗号分隔的角色名称。 |

## Ignore Rules {#ignore-rules}

| 配置键 | 控件 | 默认值 | 风险 | 说明 |
| --- | --- | --- | --- | --- |
| <span id="ignore-source"></span>`ignore.source` | select | `engramignore` | normal | 扫描规则来源：`engramignore`、`gitignore`、`both`、`off`。 |
| <span id="ignore-gitignore-path"></span>`ignore.gitignore_path` | text | `.gitignore` | normal | Git ignore 文件路径。 |
| <span id="ignore-engramignore-path"></span>`ignore.engramignore_path` | text | `.engramignore` | normal | Engram ignore 文件路径。 |
| <span id="ignore-global-engramignore"></span>`ignore.global_engramignore` | toggle | `true` | normal | 配置后应用全局忽略规则。 |
| <span id="ignore-also-ignore"></span>`ignore.also_ignore` | list | `*.secret`, `private/**` | normal | 额外的、以逗号分隔的 glob 模式。 |
| <span id="ignore-global-patterns"></span>`ignore.global_patterns` | textarea | 空 | normal | 每行一个全局 glob；inject 会同步一个受管的工作区块。 |

## Load Routing {#load-routing}

| 配置键 | 控件 | 默认值 | 风险 | 说明 |
| --- | --- | --- | --- | --- |
| <span id="load-limit"></span>`load.limit` | number 1–32 | `8` | normal | 正常加载返回的最大记忆数。 |
| <span id="load-working-ttl-days"></span>`load.working_ttl_days` | number 1–365 | `14` | normal | 任务目标记忆在工作层中保留的天数。 |

## Memory Limits {#memory-limits}

| 配置键 | 控件 | 默认值 | 风险 | 说明 |
| --- | --- | --- | --- | --- |
| <span id="memory-rule-line-target"></span>`memory.rule_line_target` | number 50–200, step 10 | `70` | normal | 规则的推荐行数。 |
| <span id="memory-rule-line-hard-limit"></span>`memory.rule_line_hard_limit` | number 50–200, step 10 | `100` | risky | 规则的硬性最大行数。 |
| <span id="memory-include-author-email"></span>`memory.include_author_email` | toggle | `false` | risky | 将 `author_email` 写入新记忆的 frontmatter（`author_name` 始终会写入）。 |

## Hooks {#hooks}

| 配置键 | 控件 | 默认值 | 风险 | 说明 |
| --- | --- | --- | --- | --- |
| <span id="hooks-path-rules"></span>`hooks.path_rules` | select | `native` | normal | `native`：Claude 和 Cursor 从生成的规则文件中加载带有 `applies_to` 的记忆，且 Claude 注册 `InstructionsLoaded`。`hook`：保留 Claude 的 `PreToolUse` hook 并移除 Claude 的规则文件。 |

## Graph {#graph}

| 配置键 | 控件 | 默认值 | 风险 | 说明 |
| --- | --- | --- | --- | --- |
| <span id="graph-enabled"></span>`graph.enabled` | toggle | `true` | normal | 启用依赖/关系路由。 |
| <span id="graph-max-related"></span>`graph.max_related` | number 1–20 | `4` | normal | 限制来自图的边的相关记忆数量。 |
| <span id="graph-min-related-score"></span>`graph.min_related_score` | number 0–1, step 0.01 | `0.22` | normal | 相关边的最小相似度分数。 |

## Vector Search {#vector-search}

| 配置键 | 控件 | 默认值 | 风险 | 说明 |
| --- | --- | --- | --- | --- |
| <span id="vector-enabled"></span>`vector.enabled` | toggle | `false` | normal | 实验性：启用可选的本地哈希向量路由（不是语义嵌入）。默认关闭。 |
| <span id="vector-provider"></span>`vector.provider` | select | `sqlite-vec` | normal | 唯一受支持的本地向量提供者。 |
| <span id="vector-auto-threshold"></span>`vector.auto_threshold` | number 10–1000 | `100` | normal | 向量搜索启用时的记忆数量。 |
| <span id="vector-candidate-pool"></span>`vector.candidate_pool` | number 8–100 | `24` | normal | 重新排序之前考虑的候选数。 |
| <span id="vector-dimensions"></span>`vector.dimensions` | number 16–512 | `64` | normal | 嵌入维度；更改后需要重建。 |

## Rule Variants {#rule-variants}

| 配置键 | 控件 | 默认值 | 风险 | 说明 |
| --- | --- | --- | --- | --- |
| <span id="rule-variants-enabled"></span>`rule_variants.enabled` | toggle | `false` | normal | 根据每条规则的 Content 渲染 light 和 strict 的措辞（关闭时渲染 balanced）。 |
| <span id="rule-variants-active"></span>`rule_variants.active` | select | `balanced` | normal | 当前变体：`light`、`balanced`、`strict`。 |

## Live Sync {#live-sync}

| 配置键 | 控件 | 默认值 | 风险 | 说明 |
| --- | --- | --- | --- | --- |
| <span id="live-sync-enabled"></span>`live_sync.enabled` | toggle | `false` | normal | 保存时同步生成的 agent 上下文文件。 |
| <span id="live-sync-targets"></span>`live_sync.targets` | list | `agents-md`, `claude-md`, `cursor-rules` | normal | live sync 刷新的生成上下文目标。 |

## Global Git {#global-git}

| 配置键 | 控件 | 默认值 | 风险 | 说明 |
| --- | --- | --- | --- | --- |
| <span id="global-git-enabled"></span>`global_git.enabled` | toggle | `true` | risky | 为全局记忆启用 Git 行为。 |
| <span id="global-git-remote"></span>`global_git.remote` | text | `origin` | risky | Git 远程名称；不含空白字符。 |
| <span id="global-git-remote-url"></span>`global_git.remote_url` | text | 空 | risky | 共享的全局记忆远程 URL。 |
| <span id="global-git-branch"></span>`global_git.branch` | text | `main` | risky | 同步的目标分支。 |
| <span id="global-git-auto-sync"></span>`global_git.auto_sync` | toggle | `true` | risky | 自动 pull/push 行为。 |
| <span id="global-git-auto-resolve"></span>`global_git.auto_resolve` | toggle | `true` | risky | 自动处理冲突；请审阅 diff。 |

## Pattern Mining {#pattern-mining}

| 配置键 | 控件 | 默认值 | 风险 | 说明 |
| --- | --- | --- | --- | --- |
| <span id="pattern-mining-enabled"></span>`pattern_mining.enabled` | toggle | `false` | normal | 实验性的重复模式提取。 |
| <span id="pattern-mining-threshold"></span>`pattern_mining.threshold` | number 1–20 | `3` | normal | 模式变得重要所需的重复次数。 |
| <span id="pattern-mining-lookback-sessions"></span>`pattern_mining.lookback_sessions` | number 1–100 | `20` | normal | 要检查的近期会话数。 |

## PR Workflow {#pr-workflow}

| 配置键 | 控件 | 默认值 | 风险 | 说明 |
| --- | --- | --- | --- | --- |
| <span id="pr-workflow-enabled"></span>`pr_workflow.enabled` | toggle | `false` | risky | 实验性的团队 PR 工作流。 |
| <span id="pr-workflow-provider"></span>`pr_workflow.provider` | text | 空 | risky | 已配置团队工作流的提供者标识符。 |
| <span id="pr-workflow-repo"></span>`pr_workflow.repo` | text | 空 | risky | 已配置团队工作流的仓库标识符。 |
| <span id="pr-workflow-target-branch"></span>`pr_workflow.target_branch` | text | `main` | risky | 接收记忆 PR 的分支。 |

## Encryption {#encryption}

| 配置键 | 控件 | 默认值 | 风险 | 说明 |
| --- | --- | --- | --- | --- |
| <span id="encryption-enabled"></span>`encryption.enabled` | toggle | `false` | risky | 未来/高级加密模式。 |
| <span id="encryption-scope"></span>`encryption.scope` | select | `global` | risky | 作用域：`workspace`、`global`。 |
| <span id="encryption-key-source"></span>`encryption.key_source` | select | `portable-file` | risky | 密钥来源策略；存在备份丢失风险。 |

<!-- evidence-foundation:v3:start -->
## 证据支持的记忆

| 字段 | 含义 |
| --- | --- |
| `schema_version` | 新创建或更新的记忆为 `3`；旧版 v1/v2 仍可读取。 |
| `authority` | 规则/技能为 `instruction`，知识为 `reference`。Trace 记录使用 `authority: evidence`。 |
| `evidence_refs` | 支持该记忆的不可变 `tr_...` trace ID。 |
| `derived_from` | 该记忆所提炼自的会话或来源标识符。 |
| `revision` | 更新现有记忆时递增的正整数。 |
| `supersedes` / `superseded_by` | 显式的替换关系。 |
| `valid_from` / `valid_until` | 记忆有效的时间范围；`valid_until` 可以是开放式的。 |
| `last_confirmed` | 该记忆最近一次被确认的日期。 |
<!-- evidence-foundation:v3:end -->

## 非配置控件

有关非配置控件，请参阅各标签页的页面：

- [Construct 标签页](construct.md)
- [Memories 标签页](memories.md)
- [Review 标签页](review.md)
- [Core 标签页](core.md)
- [Connections 标签页](connections.md)

资料和工作区的管理可在 Construct 标签页中以及通过 `engram profile` 和 `engram workspace` 完成。参见[资料与作用域解析](../concepts/profiles.md)。

## 后续步骤

- [Construct 标签页](construct.md)
- [字段撰写指南](field-authoring-guidelines.md)


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


<!-- configuration-upgrade-inventory -->
## 配置升级清单

软件包更新之后，请先运行 `engram upgrade --latest --plan`，再运行 `engram upgrade --latest`。共享清单会扫描工作区和全局中由 Engram 管理的记忆、指令、skillset、配置、hook 和插件。用户编写的字节会被保留；含义不明的混合文件会被报告为冲突。参见[配置升级](../operations/configuration-upgrades.md)。
