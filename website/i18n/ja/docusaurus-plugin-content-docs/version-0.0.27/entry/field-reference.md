---
title: 完全なフィールドリファレンス
sidebar_position: 10
description: すべての Entry Web UI の入力とコントロールの検索可能なリファレンス。
---

# 完全なフィールドリファレンス

このページは、すべての Entry Web UI 入力とコントロールに関する最終ユーザー向けの canonical（公式）フィールドリファレンスです。

## このリファレンスの読み方

各フィールドリストの項目:

- **構成キー** — 設定ファイルおよび CLI で使用されるキー
- **コントロール** — 入力タイプ
- **デフォルト** — 安全なデフォルト値
- **リスク** — `normal`, `caution`, または `risky`
- **備考** — フィールドが行う動作および設定を変更するタイミング

## Core

| 構成キー | コントロール | デフォルト | リスク | 備考 |
| --- | --- | --- | --- | --- |
| `enabled` | 切り替え | `true` | risky | マスターマスタースイッチ。無効にすると Engram の動作が停止します。 |
| `scope` | 選択 | `both` | risky | 保存先スコープ: `workspace`, `global`, `both`。 |
| `read` | 選択 | `auto` | normal | フックがメモリを挿入するタイミング: `auto`, `startup`, `always`, `manual`, `off`。 |
| `proof` | 選択 | `off` | normal | フックの証明行: `off`, `compact`。 |
| `global_path` | テキスト | 空 | risky | グローバルメモリ用のファイルシステムパス。 |
| `default_profile` | 選択 | 空 | risky | 明示的に設定されていない場合に使用されるプロファイル。 |
| `roles` | ロール | 空 | normal | ルーティング用のカンマ区切りロール名リスト。 |
| `theme` | 選択 | `dark` | hidden | 内部/非表示設定。ユーザーには表示されません。 |

## Load Routing (ロードルーティング)

| 構成キー | コントロール | デフォルト | リスク | 備考 |
| --- | --- | --- | --- | --- |
| `load.limit` | 数値 1–32 | `8` | normal | 通常のロードで返される最大メモリ数。 |

## Memory Limits (メモリ制限)

| 構成キー | コントロール | デフォルト | リスク | 備考 |
| --- | --- | --- | --- | --- |
| `memory.rule_line_target` | 数値 50–200, 10ステップ | `70` | normal | ルールメモリの推奨行数。 |
| `memory.rule_line_hard_limit` | 数値 50–200, 10ステップ | `100` | risky | ルールメモリの厳格な最大行数。 |

## Graph (グラフ)

| 構成キー | コントロール | デフォルト | リスク | 備考 |
| --- | --- | --- | --- | --- |
| `graph.enabled` | 切り替え | `true` | normal | 依存関係および関係性ルーティングを有効にします。 |
| `graph.max_related` | 数値 1–20 | `4` | normal | グラフエッジから取得される関連メモリの最大数。 |
| `graph.min_related_score` | 数値 0–1, 0.01ステップ | `0.22` | normal | 関連エッジの最小類似度しきい値スコア。 |

## Vector Search (ベクトル検索)

| 構成キー | コントロール | デフォルト | リスク | 備考 |
| --- | --- | --- | --- | --- |
| `vector.enabled` | 切り替え | `true` | normal | オプションのローカルベクトルルーティングを有効にします。 |
| `vector.auto_threshold` | 数値 10–1000 | `100` | normal | ベクトル検索を有効化する基準となるメモリ数。 |
| `vector.candidate_pool` | 数値 8–100 | `24` | normal | 再ランク付けを行う前に考慮する候補の数。 |
| `vector.dimensions` | 数値 16–512 | `64` | normal | 埋め込み次元数; 変更した場合は再構築が必要です。 |

## Rule Variants (ルールバリアント)

| 構成キー | コントロール | デフォルト | リスク | 備考 |
| --- | --- | --- | --- | --- |
| `rule_variants.enabled` | 切り替え | `false` | normal | ロール/厳格性に基づくルールバリアントを有効化します。 |
| `rule_variants.active` | 選択 | `balanced` | normal | 有効なバリアント: `light`, `balanced`, `strict`。 |

## Live Sync (ライブ同期)

| 構成キー | コントロール | デフォルト | リスク | 備考 |
| --- | --- | --- | --- | --- |
| `live_sync.enabled` | 切り替え | `false` | normal | メモリ保存時にエージェントのコンテキストファイルを同期します。 |

## Global Git (グローバル Git)

| 構成キー | コントロール | デフォルト | リスク | 備考 |
| --- | --- | --- | --- | --- |
| `global_git.enabled` | 切り替え | `true` | risky | グローバルメモリに対する Git 連携を有効にします。 |
| `global_git.remote` | テキスト | `origin` | risky | Git リモート名; 空白文字は使えません。 |
| `global_git.remote_url` | テキスト | 空 | risky | 共有グローバルメモリのリモートリポジトリ URL。 |
| `global_git.branch` | テキスト | `main` | risky | 同期のターゲットブランチ。 |
| `global_git.auto_sync` | 切り替え | `true` | risky | 自動的に pull および push を行うかどうか。 |
| `global_git.auto_resolve` | 切り替え | `true` | risky | 競合の自動処理; 差分を常に確認してください。 |

## Pattern Mining (パターンマイニング)

| 構成キー | コントロール | デフォルト | リスク | 備考 |
| --- | --- | --- | --- | --- |
| `pattern_mining.enabled` | 切り替え | `false` | normal | 実験的な繰り返しパターンの抽出機能。 |
| `pattern_mining.threshold` | 数値 1–20 | `3` | normal | パターンが処理対象として認められる最小繰り返し数。 |
| `pattern_mining.lookback_sessions` | 数値 1–100 | `20` | normal | 検査対象とする直近のセッション数。 |

## PR Workflow (PR ワークフロー)

| 構成キー | コントロール | デフォルト | リスク | 備考 |
| --- | --- | --- | --- | --- |
| `pr_workflow.enabled` | 切り替え | `false` | risky | チーム開発用の実験的な PR 型のメモリ管理フロー。 |
| `pr_workflow.target_branch` | テキスト | `main` | risky | メモリ PR を受け取るブランチ。 |

## Encryption (暗号化)

| 構成キー | コントロール | デフォルト | リスク | 備考 |
| --- | --- | --- | --- | --- |
| `encryption.enabled` | 切り替え | `false` | risky | 将来的に導入予定の高度な暗号化モード。 |
| `encryption.scope` | 選択 | `global` | risky | 暗号化スコープ: `workspace`, `global`。 |
| `encryption.key_source` | 選択 | `portable-file` | risky | キー管理戦略; バックアップ紛失時の復旧不可リスクあり。 |

## 非構成コントロール

設定フィールド以外の機能制御については、以下の各タブ案内ページを参照してください:

- [Connections タブ](connections.md)
- [Profiles タブ](profiles.md)
- [Workspaces タブ](workspaces.md)
- [Core タブ](core.md)
- [Memories タブ](memories.md)
- [Runtime タブ](runtime.md)

## 次のステップ

- [Construct タブ](construct.md)
- [フィールド作成ガイドライン](field-authoring-guidelines.md)
