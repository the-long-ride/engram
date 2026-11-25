---
title: 自動保存ポリシー
sidebar_position: 5
description: デフォルト拒否の自律書き込み、クォータ、ロールバック保持期間、レビューゲート、および必須メタデータを構成します。
---

# 自動保存ポリシー

Construct タブでは `.agents/engram.policy.json` を編集します。通常の `engram save` および `engram save-session` フローは人間の承認が必要なままであり、このポリシーは明示的にポリシー制御された自律的な候補にのみ適用されます。

## 自律書き込み

### 自動保存を許可 {#autonomous-writes-enabled}

`autonomous_writes.enabled` に対応します。デフォルト: `false`。無効になっている場合、候補が自律的に書き込まれることはありません。

### 書き込みモード {#autonomous-writes-mode}

`autonomous_writes.mode` に対応します。`review_only` は候補をレビュー用に保留し、`autonomous` は残りのすべてのゲートを通過した候補の書き込みを許可します。

### 許可されるタイプ {#autonomous-writes-allowed-types}

`autonomous_writes.allowed_types` に対応します。許可される値は `rule`、`skill`、`workflow`、`knowledge` です。少なくとも 1 つのタイプが必要です。

### 許可されるスコープ {#autonomous-writes-allowed-scopes}

`autonomous_writes.allowed_scopes` に対応します。許可される値は `workspace` と `global` です。

### 許可されるソース {#autonomous-writes-allowed-sources}

`autonomous_writes.allowed_sources` に対応します。Entry は `autosave`、`agent-hook`、`cli`、`mcp` を提供します。空でないカスタムソース文字列もポリシー JSON で有効です。

### 信頼度しきい値 {#autonomous-writes-confidence-threshold}

`autonomous_writes.confidence_threshold` に対応します。許可される値は `low`、`medium`、`high` です。

### 1 日の書き込み制限 {#autonomous-writes-daily-limit}

`autonomous_writes.daily_limit` に対応します。非負の整数を使用します。`0` は自律書き込みを防止します。

### ロールバック保持日数 {#autonomous-writes-rollback-retention-days}

`autonomous_writes.rollback_retention_days` に対応します。ポリシー監査レコードがロールバック対象として適格であり続ける期間に一致する非負の整数を使用します。

## レビューゲート

### ルール行数の制限レビュー {#review-max-rule-lines}

`review.max_rule_lines` に対応します。この正の整数を超えるルールの候補はレビューに不合格となります。

### 最小再現率ベンチマーク {#review-benchmark-min-recall-at-k}

`review.benchmark_min_recall_at_k` に対応します。`0` から `1` までの数値を使用します。

### context メタデータを要求 {#review-mandatory-metadata-context}

`review.mandatory_metadata.context` に対応します。有効にすると、`context` メタデータのない候補はレビューに不合格となります。

### triggers メタデータを要求 {#review-mandatory-metadata-triggers}

`review.mandatory_metadata.triggers` に対応します。有効にすると、`triggers` メタデータのない候補はレビューに不合格となります。

### role メタデータを要求 {#review-mandatory-metadata-role}

`review.mandatory_metadata.role` に対応します。有効にすると、`role` メタデータのない候補はレビューに不合格となります。

## CLI ワークフロー

```bash
engram policy init
engram policy validate --json
engram autosave --policy --dry-run
engram policy audit --json
engram policy rollback <audit-id>
```

自律モードを有効にする前に dry-run を使用してください。監査レシートにはメモリ本文ではなく識別子が含まれ、ロールバックによってポリシーで書き込まれたメモリがアーカイブされます。

## 関連ページ

- [Construct タブ](construct.md)
- [書き込みパスと承認](../concepts/write-path.md)
- [プライバシー、除外ルール、および安全性](../concepts/safety.md)
