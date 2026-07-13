---
title: Construct タブ (構築)
sidebar_position: 4
description: Construct タブからすべての Engram 実行時フィールドを構成します。各フィールドには、ユースケース、安全なデフォルト値、検証、およびリスクの警告があります。
---

import RiskCallout from '@site/src/components/RiskCallout';

# Construct タブ

Construct タブは、すべての Engram 実行時構成フィールドを公開し、UI とまったく同じようにグループ化されています。各フィールドには、説明、ユースケース、安全なデフォルト値、検証、およびリスクの警告があります。

<RiskCallout level="caution">
**risky** とマークされたフィールドは、Engram を無効にしたり、保存先を変更したり、Git の動作を変更したり、メモリのセキュリティに影響を与えたりする可能性があります。変更する前に警告をお読みください。
</RiskCallout>

## Core グループ (コア)

### Enabled (有効化)

**構成キー:** `enabled`  
**コントロール:** 切り替え  
**デフォルト:** `true`  
**リスク:** risky

マスターマスタースイッチ。無効にすると、Engram の動作が完全に停止します。一時的なシャットダウンまたはテスト目的でのみ使用してください。

### Save Target (保存先スコープ)

**構成キー:** `scope`  
**コントロール:** 選択 — `workspace`, `global`, `both`  
**デフォルト:** `both`  
**リスク:** risky

新たに承認されたメモリが保存される場所を制御します。リポジトリ固有のメモリには `workspace`、個人/チームのメモリには `global`、両方を使用したい新規インストールの場合は `both` を使用します。

### Read Mode (読み込みモード)

**構成キー:** `read`  
**コントロール:** 選択 — `auto`, `startup`, `always`, `manual`, `off`  
**デフォルト:** `auto`  
**リスク:** normal

エージェントフックがメモリコンテキストを挿入するタイミングを制御します。`auto` はセッション開始時にロードし、ルーティングされたコンテキストが変更された場合にのみ再挿入します。`manual` および `off` は、コンテキストの肥大化を防ぐ代わりに自動化を減らします。

### Proof Mode (検証証明モード)

**構成キー:** `proof`  
**コントロール:** 選択 — `off`, `compact`  
**デフォルト:** `off`  
**リスク:** normal

適合する会話ターンごとに対象となるエージェントフックが簡潔な `Engram proof:` 行を追加するかどうかを指定します。デバッグと監査の可視性に役立ちます。

### Global Memory Path (グローバルメモリパス)

**構成キー:** `global_path`  
**コントロール:** テキスト/パス  
**デフォルト:** 構成するまで空  
**リスク:** risky

グローバルメモリのファイルシステムパス。`~/Documents/engram` などのユーザーが所有する安定したフォルダを使用してください。一時フォルダ、同期されたパブリックフォルダ、書き込み権限のないディレクトリは避けてください。

<RiskCallout level="risky">
プライベートメモリにクラウド同期されたパブリックフォルダを使用すると、機密情報が漏洩する危険があります。非公開のパスまたはプライベートの Git リポジトリを使用してください。
</RiskCallout>

**CLI 等価コマンド:**

```bash
engram update-global-folder ~/Documents/engram
engram ugf ~/Documents/engram
```

### Default Profile (デフォルトプロファイル)

**構成キー:** `default_profile`  
**コントロール:** 選択  
**デフォルト:** 空  
**リスク:** risky

明示的に設定されていない場合に使用されるプロファイル。[プロファイルとスコープの解決](../concepts/profiles.md)を参照してください。

### Active Roles (アクティブロール)

**構成キー:** `roles`  
**コントロール:** ロール名入力 (カンマ区切り)  
**デフォルト:** 空のリスト  
**リスク:** normal

ロールごとにメモリを制限し、再ランク付けします。`^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$` に一致する安全な名前を使用してください。

## Load Routing グループ (ロードルーティング)

### Load Limit (ロード制限)

**構成キー:** `load.limit`  
**コントロール:** 数値 1–32  
**デフォルト:** `8`  
**リスク:** normal

通常のロードで返される最大メモリ数。低い値を設定すると、コンテキスト制限の低いモデルのコンテキスト肥大化が抑えられます。高い値を設定すると、深いアーキテクチャタスクに役立ちます。

## Memory Limits グループ (メモリ制限)

### Rule Line Target (ルール行の目標値)

**構成キー:** `memory.rule_line_target`  
**コントロール:** 数値 50–200, 10ステップ  
**デフォルト:** `70`  
**リスク:** normal

ルールメモリの推奨行数。簡潔なルールの方が、長すぎるポリシーよりも適切にルーティングされます。

### Rule Line Hard Limit (ルール行のハード制限)

**構成キー:** `memory.rule_line_hard_limit`  
**コントロール:** 数値 50–200, 10ステップ  
**デフォルト:** `100`  
**リスク:** risky

ルールメモリに対する厳格な最大行数。

<RiskCallout level="risky">
この制限を引き上げると、コンテキストの肥大化が進み、ルーティング品質が低下する可能性があります。ルールは常に簡潔に保ってください。
</RiskCallout>

## Graph グループ (グラフ)

### graph.enabled

**コントロール:** 切り替え  
**デフォルト:** `true`  
**リスク:** normal

`depends_on`、関連メモリ、およびグラフビューを介した依存関係/関係性ルーティングを有効にします。

### graph.max_related

**コントロール:** 数値 1–20  
**デフォルト:** `4`  
**リスク:** normal

グラフシグナルを介して取得される関連メモリの数を制限します。

### graph.min_related_score

**コントロール:** 数値 0–1, 0.01ステップ  
**デフォルト:** `0.22`  
**リスク:** normal

関連エッジの最小類似度スコア。精度を高めるにはこの値を上げ、再現率を高めるには下げます。

## Vector Search グループ (ベクトル検索)

### vector.enabled

**コントロール:** 切り替え  
**デフォルト:** `true`  
**リスク:** normal

オプションのローカルベクトルルーティングを有効にします。クラウドへの依存はありません。

### vector.auto_threshold

**コントロール:** 数値 10–1000  
**デフォルト:** `100`  
**リスク:** normal

ベクトル検索がアクティブになるメモリ数のしきい値。規模の小さい保管庫ではベクトル検索が不要な場合があります。

### vector.candidate_pool

**コントロール:** 数値 8–100  
**デフォルト:** `24`  
**リスク:** normal

再ランク付けを行う前にベクトル検索が考慮する候補の数。値を高くすると再現率は向上しますが、レイテンシコストが発生します。

### vector.dimensions

**コントロール:** 数値 16–512  
**デフォルト:** `64`  
**リスク:** normal

ローカルベクトルサイドカーの埋め込み（embeddings）次元数。これを変更した場合は、再構築が必要です。

## Rule Variants グループ (ルールバリアント)

### rule_variants.enabled

**コントロール:** 切り替え  
**デフォルト:** `false`  
**リスク:** normal

ロール/厳格性のバリアントを有効にします。チームで軽量、バランス、厳格などの異なるルーティングを使い分けたい場合に使用します。

### rule_variants.active

**コントロール:** 選択 — `light`, `balanced`, `strict`  
**デフォルト:** `balanced`  
**リスク:** normal

ロードされるルールの厳格度を制御します。`strict` は能力の低いモデルに役立ちます。`light`/`balanced` は通常、より強力なモデルに適しています。

## Live Sync グループ (ライブ同期)

### live_sync.enabled

**コントロール:** 切り替え  
**デフォルト:** `false`  
**リスク:** normal

保存時に生成されたエージェントコンテキストファイルを同期します。

## Global Git グループ (グローバル Git)

<RiskCallout level="risky">
グローバル Git のすべてのフィールドはリスクを伴います。グローバルメモリに対する変更履歴の監査とチーム同期の動作を制御します。有効にする前にそれぞれ確認してください。
</RiskCallout>

| フィールド | コントロール | デフォルト | 備考 |
| --- | --- | --- | --- |
| `global_git.enabled` | 切り替え | `true` | グローバルメモリに対する Git 連携の動作を有効にします |
| `global_git.remote` | テキスト | `origin` | Git リモート名; 空白文字を含めることはできません |
| `global_git.remote_url` | テキスト | 空 | 共有グローバルメモリのリモート URL; HTTPS/SSH をサポート |
| `global_git.branch` | テキスト | `main` | 同期のターゲットブランチ |
| `global_git.auto_sync` | 切り替え | `true` | 自動 pull/push の動作 |
| `global_git.auto_resolve` | 切り替え | `true` | 競合の自動処理 — メモリの差分を事前に確認してください |

## Pattern Mining グループ (パターンマイニング)

| フィールド | コントロール | デフォルト | 備考 |
| --- | --- | --- | --- |
| `pattern_mining.enabled` | 切り替え | `false` | 繰り返しパターンの自動抽出を行う実験的機能 |
| `pattern_mining.threshold` | 数値 1–20 | `3` | パターン候補として処理されるために必要な繰り返しの回数 |
| `pattern_mining.lookback_sessions` | 数値 1–100 | `20` | スキャン対象とする直近のセッション数 |

## PR Workflow グループ (PR ワークフロー)

| フィールド | コントロール | デフォルト | 備考 |
| --- | --- | --- | --- |
| `pr_workflow.enabled` | 切り替え | `false` | メモリの変更に対するチーム内 PR 型の実験的ワークフロー |
| `pr_workflow.target_branch` | テキスト | `main` | メモリの PR を受け取るブランチ |

## Encryption グループ (暗号化)

<RiskCallout level="risky">
暗号化構成は存在しますが、暗号化ストレージはまだ実装されていません。現在の制限事項をユーザーに明確にドキュメントで通知してください。
</RiskCallout>

| フィールド | コントロール | デフォルト | 備考 |
| --- | --- | --- | --- |
| `encryption.enabled` | 切り替え | `false` | 将来的な高度な暗号化モード |
| `encryption.scope` | 選択 — `workspace`, `global` | `global` | 暗号化が適用されるスコープ |
| `encryption.key_source` | 選択 — `portable-file` | `portable-file` | キーのソース戦略; バックアップ紛失時の復旧不可のリスクを伴います |

## 次のステップ

- [完全なフィールドリファレンス](field-reference.md)
- [Profiles タブ](profiles.md)
- [Runtime タブ](runtime.md)
