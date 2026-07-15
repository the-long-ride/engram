---
title: Construct 标签页 (构建)
sidebar_position: 4
description: 从 Construct 标签页配置每个 Engram 运行时字段。每个字段都有使用场景、安全默认值、验证和风险警告。
---

import RiskCallout from '@site/src/components/RiskCallout';

# Construct 标签页

Construct 标签页展示了每个 Engram 运行时配置字段，其分组与 UI 完全一致。每个字段都有描述、使用场景、安全默认值、验证和风险警告。

<RiskCallout level="caution">
标记为 **risky (风险)** 的字段可能会禁用 Engram、更改保存目标、更改 Git 行为或影响内存安全性。在更改它们之前请先阅读警告。
</RiskCallout>

## Core 组 (核心)

### Enabled (启用)

**配置键:** `enabled`  
**控制:** 开关  
**默认值:** `true`  
**风险:** risky

主开关。禁用它会完全停止 Engram 行为。仅用于临时关闭或测试。

### Save Target (保存目标)

**配置键:** `scope`  
**控制:** 选择 — `workspace`, `global`, `both`  
**默认值:** `both`  
**风险:** risky

控制新批准的内存保存在何处。使用 `workspace` 保存特定仓库的内存，`global` 保存个人/团队内存，`both` 用于希望同时使用两者的全新安装。

### Read Mode (读取模式)

**配置键:** `read`  
**控制:** 选择 — `auto`, `startup`, `always`, `manual`, `off`  
**默认值:** `auto`  
**风险:** normal

控制智能体 hook 何时注入内存上下文。`auto` 在会话开始时加载，并且仅在路由上下文发生变化时重新注入。`manual` 和 `off` 减少了自动化，但能避免上下文膨胀。

### Proof Mode (凭证模式)

**配置键:** `proof`  
**控制:** 选择 — `off`, `compact`  
**默认值:** `off`  
**风险:** normal

是否在每个符合条件的轮次中让 hook 附加一条紧凑的 `Engram proof:` 行。这对于调试和审计可见性非常有用。

### Global Memory Path (全局内存路径)

**配置键:** `global_path`  
**控制:** 文本/路径  
**默认值:** 配置前为空  
**风险:** risky

全局内存的文件系统路径。使用稳定且用户拥有的文件夹，例如 `~/Documents/engram`。避免使用临时文件夹、已同步的公共文件夹以及您无法写入的目录。

<RiskCallout level="risky">
将云同步的公共文件夹用于私有内存可能会泄漏机密。请使用私有路径或私有 Git 仓库。
</RiskCallout>

**CLI 等效命令:**

```bash
engram update-global-folder ~/Documents/engram
engram ugf ~/Documents/engram
```

### Default Profile (默认配置文件)

**配置键:** `default_profile`  
**控制:** 选择  
**默认值:** 空  
**风险:** risky

未明确设置时使用的配置文件。请参阅 [配置文件和范围解析](../concepts/profiles.md)。

### Active Roles (活动角色)

**配置键:** `roles`  
**控制:** 角色/逗号输入  
**默认值:** 空列表  
**风险:** normal

按角色限制内存并重新排序。使用符合 `^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$` 的安全名称。

## Load Routing 组 (加载路由)

### Load Limit (加载限制)

**配置键:** `load.limit`  
**控制:** 数字 1–32  
**默认值:** `8`  
**风险:** normal

普通加载返回的最大内存数。较低的值减少了低上下文模型的上下文膨胀；较高的值有助于深度架构任务。

## Memory Limits 组 (内存限制)

### Rule Line Target (规则行数目标)

**配置键:** `memory.rule_line_target`  
**控制:** 数字 50–200，步长 10  
**默认值:** `70`  
**风险:** normal

规则内存的推荐大小。紧凑的规则比过长的政策路由效果更好。

### Rule Line Hard Limit (规则行数硬限制)

**配置键:** `memory.rule_line_hard_limit`  
**控制:** 数字 50–200，步长 10  
**默认值:** `100`  
**风险:** risky

规则内存的严格最大值。

<RiskCallout level="risky">
提高此限制可能会增加上下文膨胀并降低路由质量。请保持规则紧凑。
</RiskCallout>

## Graph 组 (图)

### graph.enabled

**控制:** 开关  
**默认值:** `true`  
**风险:** normal

启用通过 `depends_on`、相关内存以及图视图进行依赖项/关系路由。

### graph.max_related

**控制:** 数字 1–20  
**默认值:** `4`  
**风险:** normal

限制通过图信号拉取的相关内存数。

### graph.min_related_score

**控制:** 数字 0–1，步长 0.01  
**默认值:** `0.22`  
**风险:** normal

相关边（edges）的最小相似度分数。调高以获得精确度，调低以获得召回率。

## Vector Search 组 (向量搜索)

### vector.enabled

**控制:** 开关  
**默认值:** `true`  
**风险:** normal

启用可选的本地向量路由。无云端依赖。

### vector.auto_threshold

**控制:** 数字 10–1000  
**默认值:** `100`  
**风险:** normal

激活向量搜索的内存数量阈值。小型内存库可能不需要向量搜索。

### vector.candidate_pool

**控制:** 数字 8–100  
**默认值:** `24`  
**风险:** normal

向量搜索在重新排序前考虑的候选者数量。较高的值可以提高召回率，但会带来延迟开销。

### vector.dimensions

**控制:** 数字 16–512  
**默认值:** `64`  
**风险:** normal

本地向量 sidecar 的嵌入（embedding）维度。更改此设置需要重建。

## Rule Variants 组 (规则变体)

### rule_variants.enabled

**控制:** 开关  
**默认值:** `false`  
**风险:** normal

启用角色/严格度变体。在团队需要轻度/平衡/严格路由时使用。

### rule_variants.active

**控制:** 选择 — `light`, `balanced`, `strict`  
**默认值:** `balanced`  
**风险:** normal

控制加载规则的严格程度。`strict` 模式有助于低端模型；`light`/`balanced` 通常适用于更强大的模型。

## Live Sync 组 (实时同步)

### live_sync.enabled

**控制:** 开关  
**默认值:** `false`  
**风险:** normal

在保存时同步生成的智能体上下文文件。

## Global Git 组 (全局 Git)

<RiskCallout level="risky">
所有全局 Git 字段均存在风险。它们控制全局内存的审计历史和团队同步行为。启用前请审查每一项。
</RiskCallout>

| 字段 | 控制 | 默认值 | 备注 |
| --- | --- | --- | --- |
| `global_git.enabled` | 开关 | `true` | 启用全局内存的 Git 行为 |
| `global_git.remote` | 文本 | `origin` | Git 远程仓库名称；不能包含空格 |
| `global_git.remote_url` | 文本 | 空 | 共享全局内存的远程仓库 URL；接受 HTTPS/SSH |
| `global_git.branch` | 文本 | `main` | 同步的目标分支 |
| `global_git.auto_sync` | 开关 | `true` | 自动拉取/推送行为 |
| `global_git.auto_resolve` | 开关 | `true` | 自动冲突处理 — 审查内存 diff |

## Pattern Mining 组 (模式挖掘)

| 字段 | 控制 | 默认值 | 备注 |
| --- | --- | --- | --- |
| `pattern_mining.enabled` | 开关 | `false` | 实验性的重复模式提取功能 |
| `pattern_mining.threshold` | 数字 1–20 | `3` | 模式候选对象生效所需的重复次数 |
| `pattern_mining.lookback_sessions` | 数字 1–100 | `20` | 要检查的最近会话数 |

## PR Workflow 组 (PR 工作流)

| 字段 | 控制 | 默认值 | 备注 |
| --- | --- | --- | --- |
| `pr_workflow.enabled` | 开关 | `false` | 实验性的内存更改团队 PR 工作流 |
| `pr_workflow.target_branch` | 文本 | `main` | 接收内存 PR 的分支 |

## Encryption 组 (加密)

<RiskCallout level="risky">
加密配置存在，但加密存储尚未实现。向用户清晰地记录当前的限制。
</RiskCallout>

| 字段 | 控制 | 默认值 | 备注 |
| --- | --- | --- | --- |
| `encryption.enabled` | 开关 | `false` | 未来/高级加密模式 |
| `encryption.scope` | 选择 — `workspace`, `global` | `global` | 加密适用的范围 |
| `encryption.key_source` | 选择 — `portable-file` | `portable-file` | 密钥来源策略；有备份丢失风险 |

## 后续步骤

- [完整字段参考](field-reference.md)
- [Profiles 标签页](profiles.md)
- [Runtime 标签页](runtime.md)
