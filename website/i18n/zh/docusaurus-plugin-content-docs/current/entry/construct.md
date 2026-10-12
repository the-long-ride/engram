---
title: Construct 标签页
sidebar_position: 4
description: 在 Construct 中配置 Engram 的运行时字段；全局 Git 配置在 Git → Global 中管理。
---

import RiskCallout from '@site/src/components/RiskCallout';

# Construct 标签页

Construct 标签页按 UI 的分组方式展示 Engram 的运行时配置字段，唯独 **Global Git configuration**（全局 Git 配置）除外，它被有意放在 **Git → Global** 中管理。每个 Construct 字段都带有说明、使用场景、安全的默认值、校验和风险警告。

<RiskCallout level="caution">
标记为 **risky** 的字段可能会禁用 Engram、更改保存目标、更改 Git 行为，或影响记忆的安全性。更改之前请先阅读警告。
</RiskCallout>

## Core 分组

### Enabled

**配置键：** `enabled`  
**控件：** 开关  
**默认值：** `true`  
**风险：** risky

总开关。禁用它会让 Engram 的所有行为完全停止。仅用于临时关闭或测试。

### Save Target

**配置键：** `scope`  
**控件：** 选择 — `workspace`、`global`、`both`  
**默认值：** `both`  
**风险：** risky

控制新批准的记忆保存到哪里。`workspace` 用于仓库专属记忆，`global` 用于个人/团队记忆，`both` 适用于希望两者兼顾的全新安装。

### Update Mode

**配置键：** `update`  
**控件：** 选择 — `auto`、`manual`、`off`  
**默认值：** `auto`  
**风险：** normal

控制普通命令所运行的静默、一次性的软件包升级检查。仅当升级由 Engram 之外管理时，才使用 `manual` 或 `off`。

### Read Mode

**配置键：** `read`  
**控件：** 选择 — `auto`、`startup`、`always`、`manual`、`off`  
**默认值：** `auto`  
**风险：** normal

控制 agent hook 何时注入记忆上下文。`auto` 在会话启动时加载，并且仅当路由出的上下文发生变化时才重新注入。`manual` 和 `off` 会减少自动化，代价是上下文膨胀。

### Proof Mode

**配置键：** `proof`  
**控件：** 选择 — `off`、`compact`  
**默认值：** `off`  
**风险：** normal

hook 是否在每个符合条件的轮次上附加一行精简的 `Engram proof:`。对调试和审计可见性很有用。

### Global Memory Path

**配置键：** `global_path`  
**控件：** 文本/路径  
**默认值：** 配置之前为空  
**风险：** risky

全局记忆的文件系统路径。请使用稳定的、归用户所有的文件夹，例如 `~/Documents/engram`。避免使用临时文件夹、同步的公共文件夹以及你无法写入的目录。

<RiskCallout level="risky">
将私有记忆放在云同步的公共文件夹中可能泄露 secret。请使用私有路径或私有 Git 仓库。
</RiskCallout>

**等效的 CLI 命令：**

```bash
engram update-global-folder ~/Documents/engram
engram ugf ~/Documents/engram
```

### Default Profile

**配置键：** `default_profile`  
**控件：** 选择  
**默认值：** 空  
**风险：** risky

未显式设置时使用的资料（profile）。参见[资料与作用域解析](../concepts/profiles.md)。

### Active Roles

**配置键：** `roles`  
**控件：** 角色/逗号分隔输入  
**默认值：** 空列表  
**风险：** normal

按角色限制并重新排序记忆。请使用匹配 `^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$` 的安全名称。

## Ignore Rules 分组

| 字段 | 控件 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `ignore.source` | select | `engramignore` | 选择 `engramignore`、`gitignore`、`both` 或 `off` 作为扫描规则来源。 |
| `ignore.gitignore_path` | text | `.gitignore` | 启用时使用的 Git ignore 文件。 |
| `ignore.engramignore_path` | text | `.engramignore` | 启用时使用的 Engram ignore 文件。 |
| `ignore.global_engramignore` | toggle | `true` | 配置了全局记忆时应用全局忽略规则。 |
| `ignore.also_ignore` | list | `*.secret`, `private/**` | 额外的、以逗号分隔的 glob 模式。 |

### Global Ignore Patterns

**配置键：** `ignore.global_patterns`  
**控件：** 文本域，每行一个 glob 模式  
**默认值：** 空列表  
**风险：** normal

这些模式应用于全局记忆的读取。每次执行 `engram inject` 都会把它们同步到工作区 `.engramignore` 中的一个受管块里；该块之外由人工编写的行会被保留。

### Auto-save policy

**Auto-save policy** 编辑器会写入 `.agents/engram.policy.json`。它控制符合策略的候选是否可以在没有交互式提示的情况下保存；普通保存仍然基于审批。

关于每个控件、默认值、允许的取值、审阅关卡、配额和回滚设置，请参阅 [Auto-save Policy 参考](policy.md)。

## Load Routing 分组

### Load Limit

**配置键：** `load.limit`  
**控件：** 数字 1–32  
**默认值：** `8`  
**风险：** normal

正常加载返回的最大记忆数。较低的值可减少低上下文模型的上下文膨胀；较高的值有助于深度架构类任务。

### Working Memory TTL (days)

**配置键：** `load.working_ttl_days`  
**控件：** 数字 1–365  
**默认值：** `14`  
**风险：** normal

已批准的 `OBJECTIVE: task` 记忆在被 gitignore 的工作层中保留多少天后过期。更改仅适用于之后保存的记忆。使用 `engram promote <id>` 保留某条工作记忆；使用 `engram working prune` 清理已过期的记忆。

## Memory Limits 分组

### Rule Line Target

**配置键：** `memory.rule_line_target`  
**控件：** 数字 50–200，步长 10  
**默认值：** `70`  
**风险：** normal

规则记忆的推荐大小。简洁的规则比冗长的策略路由效果更好。

### Rule Line Hard Limit

**配置键：** `memory.rule_line_hard_limit`  
**控件：** 数字 50–200，步长 10  
**默认值：** `100`  
**风险：** risky

规则记忆的硬性上限。

<RiskCallout level="risky">
提高该值可能增加上下文膨胀并降低路由质量。请保持规则简洁。
</RiskCallout>

### Write Author Email

**配置键：** `memory.include_author_email`  
**控件：** 开关  
**默认值：** `false`  
**风险：** risky

开启后，新增和更新的记忆会在 `author_name` 旁边同时写入 `author_email`。默认关闭，因此已提交的记忆文件中不带邮箱地址；你的邮箱保留在作者资料以及 Engram 创建的 Git 提交中。

<RiskCallout level="risky">
开启后会把邮箱地址写入已提交的记忆文件。再次关闭它，并运行 `engram author migrate-memories --strip-email --confirm` 即可将其移除。
</RiskCallout>

## Hooks 分组

### hooks.path_rules

**配置键：** `hooks.path_rules`  
**控件：** 选择 - `native`、`hook`  
**默认值：** `native`  
**风险：** normal

`native` 会为带有 `applies_to` 的记忆写入生成的规则文件（Claude 为 `.claude/rules/engram/`，Cursor 为 `.cursor/rules/engram/`），并注册 Claude 的 `InstructionsLoaded`。`hook` 则为 Claude 保留 Engram 的 `PreToolUse` hook，并移除 Claude 的规则文件。Codex 始终使用 `PreToolUse`。

## Graph 分组

### graph.enabled

**控件：** 开关  
**默认值：** `true`  
**风险：** normal

通过 `depends_on`、相关记忆和图视图启用依赖/关系路由。

### graph.max_related

**控件：** 数字 1–20  
**默认值：** `4`  
**风险：** normal

限制通过图信号拉取的相关记忆数量。

### graph.min_related_score

**控件：** 数字 0–1，步长 0.01  
**默认值：** `0.22`  
**风险：** normal

相关边所需的最小相似度分数。调高以提升精确度，调低以提升召回率。

## Vector Search 分组

### vector.provider

**控件：** 选择 — `sqlite-vec`  
**默认值：** `sqlite-vec`  
**风险：** normal

选择本地向量提供者。`sqlite-vec` 是唯一受支持的提供者。

### vector.enabled

**控件：** 开关  
**默认值：** `false`  
**风险：** normal

实验性功能。启用基于 64 维哈希向量的可选本地向量路由，这些向量不是语义嵌入。默认关闭；已存储 `true` 的工作区配置保持开启。不依赖云服务。

### vector.auto_threshold

**控件：** 数字 10–1000  
**默认值：** `100`  
**风险：** normal

向量搜索启用时的记忆数量。小型记忆库可能不需要向量搜索。

### vector.candidate_pool

**控件：** 数字 8–100  
**默认值：** `24`  
**风险：** normal

向量搜索在重新排序之前考虑多少个候选。调高会提升召回率，但会增加延迟。

### vector.dimensions

**控件：** 数字 16–512  
**默认值：** `64`  
**风险：** normal

本地向量 sidecar 的嵌入维度。更改它需要重建。

## Rule Variants 分组

### rule_variants.enabled

**控件：** 开关  
**默认值：** `false`  
**风险：** normal

在加载时根据每条规则的 Content 渲染 light 和 strict 的措辞（关闭时渲染 balanced 的 Content）。规则文件仅在存在自定义措辞时才存储 `## Rule Variants` 部分。

### rule_variants.active

**控件：** 选择 — `light`、`balanced`、`strict`  
**默认值：** `balanced`  
**风险：** normal

控制已加载规则的严格程度。`strict` 有助于较低档位的模型；`light`/`balanced` 通常适合更强的模型。

## Live Sync 分组

### live_sync.enabled

**控件：** 开关  
**默认值：** `false`  
**风险：** normal

保存时同步生成的 agent 上下文文件。

### live_sync.targets

**控件：** 列表  
**默认值：** `agents-md`, `claude-md`, `cursor-rules`

以逗号分隔的生成上下文目标，在运行 live sync 时刷新。

## 全局 Git 配置已移至 Git

全局 Git 配置不再出现在 Construct 中。请打开 **Git → Global**，使用相同的校验和风险审阅后端来编辑现有的 `global_git.*` 设置。Git 下的 Workspace 标签页绝不会暴露这些全局控件。

如需逐键的详细信息，请参阅[字段参考](field-reference.md#global-git)或 [Git 设置指南](../operations/git-author-settings.md#global-git-configuration)。

## Pattern Mining 分组

| 字段 | 控件 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `pattern_mining.enabled` | toggle | `false` | 实验性的重复模式提取 |
| `pattern_mining.threshold` | number 1–20 | `3` | 模式候选变得重要所需的重复次数 |
| `pattern_mining.lookback_sessions` | number 1–100 | `20` | 要检查的近期会话数 |

## PR Workflow 分组

| 字段 | 控件 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `pr_workflow.enabled` | toggle | `false` | 针对记忆变更的实验性团队 PR 工作流 |
| `pr_workflow.provider` | text | 空 | 已配置团队工作流的提供者标识符 |
| `pr_workflow.repo` | text | 空 | 已配置团队工作流的仓库标识符 |
| `pr_workflow.target_branch` | text | `main` | 接收记忆 PR 的分支 |

## Encryption 分组

<RiskCallout level="risky">
加密配置已存在，但加密存储尚未实现。请向用户清楚地说明当前的限制。
</RiskCallout>

| 字段 | 控件 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `encryption.enabled` | toggle | `false` | 未来/高级加密模式 |
| `encryption.scope` | select — `workspace`, `global` | `global` | 加密应用于哪个作用域 |
| `encryption.key_source` | select — `portable-file` | `portable-file` | 密钥来源策略；存在备份丢失风险 |

## 后续步骤

- [完整字段参考](field-reference.md)
- [Memories 标签页](memories.md)
- [Core 标签页](core.md)
