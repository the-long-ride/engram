---
title: 自动保存策略
sidebar_position: 5
description: 配置自主写入的默认拒绝、配额、回滚保留期限、审查门禁和必要元数据。
---

# 自动保存策略

Construct 标签页可用于编辑 `.agents/engram.policy.json`。常规的 `engram save` 和 `engram save-session` 流程依然需要人工审批；该策略仅适用于明确受策略管辖的自主候选记忆。

## 自主写入

### 允许自动保存 {#autonomous-writes-enabled}

对应 `autonomous_writes.enabled`。默认值：`false`。禁用时，任何候选记忆均不可自主写入。

### 写入模式 {#autonomous-writes-mode}

对应 `autonomous_writes.mode`。`review_only` 将候选记忆暂缓待审；`autonomous` 允许通过所有剩余门禁的候选记忆进行写入。

### 允许的类型 {#autonomous-writes-allowed-types}

对应 `autonomous_writes.allowed_types`。允许的值为 `rule`、`skill`、`workflow` 和 `knowledge`。至少需要指定一种类型。

### 允许的作用域 {#autonomous-writes-allowed-scopes}

对应 `autonomous_writes.allowed_scopes`。允许的值为 `workspace` 和 `global`。

### 允许的来源 {#autonomous-writes-allowed-sources}

对应 `autonomous_writes.allowed_sources`。Entry 提供 `autosave`、`agent-hook`、`cli` 和 `mcp`；策略 JSON 中非空的自定义来源字符串同样有效。

### 置信度阈值 {#autonomous-writes-confidence-threshold}

对应 `autonomous_writes.confidence_threshold`。允许的值为 `low`、`medium` 和 `high`。

### 每日写入上限 {#autonomous-writes-daily-limit}

对应 `autonomous_writes.daily_limit`。使用非负整数。`0` 禁止任何自主写入。

### 回滚保留天数 {#autonomous-writes-rollback-retention-days}

对应 `autonomous_writes.rollback_retention_days`。使用非负整数，匹配策略审计记录保持可回滚状态的保留周期。

## 审查门禁

### 审查规则行数上限 {#review-max-rule-lines}

对应 `review.max_rule_lines`。超过该正整数的规则候选记忆无法通过审查。

### 最小召回率基准 {#review-benchmark-min-recall-at-k}

对应 `review.benchmark_min_recall_at_k`。使用介于 `0` 到 `1` 之间的数值。

### 要求 context 元数据 {#review-mandatory-metadata-context}

对应 `review.mandatory_metadata.context`。启用时，缺少 `context` 元数据的候选记忆将无法通过审查。

### 要求 triggers 元数据 {#review-mandatory-metadata-triggers}

对应 `review.mandatory_metadata.triggers`。启用时，缺少 `triggers` 元数据的候选记忆将无法通过审查。

### 要求 role 元数据 {#review-mandatory-metadata-role}

对应 `review.mandatory_metadata.role`。启用时，缺少 `role` 元数据的候选记忆将无法通过审查。

## CLI 工作流

```bash
engram policy init
engram policy validate --json
engram autosave --policy --dry-run
engram policy audit --json
engram policy rollback <audit-id>
```

在启用自主模式前请使用 dry-run。审计收据包含标识符而非记忆正文，回滚操作会将受策略写入的记忆归档。

## 相关页面

- [Construct 标签页](construct.md)
- [写入路径与审批](../concepts/write-path.md)
- [隐私、忽略规则与安全](../concepts/safety.md)
