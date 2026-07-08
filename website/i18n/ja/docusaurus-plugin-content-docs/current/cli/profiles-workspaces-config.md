---
title: profiles / workspaces / config
sidebar_position: 5
description: プロファイル、保存先、ロード制限、読み取り/検証モード、ロール、およびランタイム構成の管理。
---

# profiles / workspaces / config

プロファイル、保存先、ロード制限、読み取り/検証モード、ロール、およびランタイム構成を管理します。

## profile

```bash
engram profile status
engram profile create personal --global-path ~/Documents/engram-personal --use
engram profile use company --workspace
engram profile merge personal company --dry-run
```

プロファイルの解決順序は、明示的な `--profile` または `ENGRAM_PROFILE`、ワークスペースの `default_profile`、アクティブなユーザープロファイルです。ユーザーのデフォルトがプロファイル `A` のままで、ワークスペース `W` がプロファイル `B` に固定されている場合、`W` に対する通常のロード、MCP ロード、およびエージェント hook のインジェクションは、プロファイル `B` のグローバルメモリを読み取り、プロファイル `A` は読み取りません。ワークスペースのデフォルトと異なる明示的なプロファイルは、そのプロファイルのグローバルメモリを使用し、そのコマンドのワークスペースメモリを無効にします。

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

`engram set-role ...` または `engram set-rule-variant ...` が成功すると、CLI は `Agent action:` 行を返します。Engram を認識するスラッシュアダプターと MCP ホストは、すぐに `engram load "<current task/request>"` を再実行する必要があります。

## set-rule-variant

```bash
engram set-rule-variant strict|balanced|light|off
```

## config

```bash
engram config view
engram config set <key> <value>
```

### 主要な設定リファレンス

| キー | 説明 | デフォルト | 範囲 / オプション |
| --- | --- | --- | --- |
| `memory.rule_line_target` | ルールメモリの推奨行数ターゲット | `70` | `50` から `200` |
| `memory.rule_line_hard_limit` | ルールメモリの最大許容行数 | `100` | `50` から `200` |
| `load.limit` | 通常のロードで返される最大メモリ数 | `8` | `1` から `32` |
| `rule_variants.enabled` | ルールバリアントの生成を有効または無効にする | `true` | `true`, `false` |
| `rule_variants.active` | アクティブなルールバリアントモード | `balanced` | `light`, `balanced`, `strict` |
| `graph.enabled` | グラフ対応ルーティングを有効または無効にする | `true` | `true`, `false` |
| `graph.max_related` | グラフのエッジから取得する最大関連メモリ数 | `8` | `1` から `20` |
| `graph.min_related_score` | グラフエッジを追加するための最小類似度スコア | `0.3` | `0.0` から `1.0` |
| `vector.enabled` | ベクトル検索フォールバックを有効または無効にする | `true` | `true`, `false` |
| `live_sync.enabled` | 保存時に生成されたエージェントコンテキストファイルを同期する | `true` | `true`, `false` |
| `global_git.enabled` | グローバル Git リポジトリの同期自動化を有効にする | `false` | `true`, `false` |
| `global_git.remote` | グローバル同期の Git リモート名 | `origin` | 文字列 |
| `global_git.branch` | グローバル同期の Git ブランチ名 | `main` | 文字列 |

これらの設定は、`engram entry` の **Construct** タブで視覚的に管理することもできます。

## 次のステップ

- [verify / repair / quality-check](verify-repair-quality.md)
- [Entry Web UI: Construct タブ](../entry/construct.md)
