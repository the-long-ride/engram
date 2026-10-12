---
title: 証拠トレースと来歴
sidebar_position: 7
description: Engram が不変の証拠をどのように保持し、承認済みメモリをその出典にひも付け、同じメタデータを CLI と Web UI に公開するかを説明します。
---

# 証拠トレースと来歴

Engram は証拠と承認済みメモリを分離します。トレースはサニタイズ済みの出典レコードを保持し、メモリはその証拠を引用する、人間が承認した指示または参照として残ります。

## 承認済みメモリの契約

新しい承認済みメモリはスキーマ v3 を使用します。従来の v1 および v2 ファイルは引き続き読み取り可能で、黙って書き換えられることはありません。

```yaml
schema_version: 3
authority: instruction | reference
evidence_refs: [tr_...]
derived_from: [session-id]
revision: 1
supersedes: [older-memory-id]
superseded_by: newer-memory-id
valid_from: YYYY-MM-DD
valid_until: YYYY-MM-DD | null
last_confirmed: YYYY-MM-DD
```

契約のフィールドは `schema_version`、`authority`、`evidence_refs`、`derived_from`、`revision`、`supersedes`、`superseded_by`、`valid_from`、`valid_until`、`last_confirmed` です。

## 不変トレースの契約

各 `traces/<trace-id>.jsonl` ファイルには正規のレコードがちょうど 1 件だけ含まれ、排他的に作成されるため、既存のトレース ID を上書きすることはできません。`trace_id`、`session_id`、`source_hash`、`trust_level`、`sensitivity`、`retention` の各フィールドは、識別、出所、完全性、信頼性、プライバシー、ライフサイクルを保持します。`authority: evidence` はデータにすぎず、指示として機能することはありません。

```json
{
  "trace_id": "tr_...",
  "authority": "evidence",
  "session_id": "session-id",
  "source_hash": "sha256:...",
  "trust_level": "human",
  "sensitivity": "private",
  "retention": "30d"
}
```

## CLI と Web UI の同期

`engram observe` とトランスクリプトフックは、永続化の前にサニタイズを行います。CLI は作成されたトレース ID を表示し、`save-session` は `evidence_refs` と `derived_from` を承認済みメモリに引き継ぎます。Entry Web UI は同じインデックスを読み取り、メモリ詳細パネルに権限、証拠 ID、セッションの出所、リビジョン、有効期間、置き換えリンクを表示します。

## 安全性と移行

既定の人間による取り込みでは、設定で変更しない限り `trust_level: human`、`sensitivity: private`、`retention: 30d` を使用します。証拠が期限切れまたは存在しない場合、新しい承認済みメモリの書き込みはブロックされます。既存の観察ラッパーはトレースを指し示すレビュー用の補助として残り、初期化時に対象となる従来のラッパーが 1 回だけ移行されます。

## 昇格の完全性とスコープ

インボックスのラッパーは編集可能なレビュー用の素材であり、証拠の出典ではありません。`save-session --file` の実行中、Engram は不変のトレースを開き直し、ラッパーのハッシュがある場合は検証したうえで、トレースのテキスト、セッション、出典メタデータを使用します。`## Raw Note` を編集しても、昇格される内容は変わりません。トレースに基づく保存は、そのトレースのワークスペースまたはグローバルのスコープに固定され、矛盾する明示的な `--scope` は拒否されます。従来のトレースとセッションの識別子は、来歴の衝突を避けるためスコープごとに名前空間が付けられます。
