---
title: profiles / workspaces / config
sidebar_position: 5
description: プロファイル、保存先、ロード上限、読み取り/プルーフモード、ロール、ランタイム設定を管理します。
---

# profiles / workspaces / config

プロファイル、保存先、ロード上限、読み取り/プルーフモード、ロール、ランタイム設定を管理します。

## profile

```bash
engram profile status
engram profile create personal --global-path ~/Documents/engram-personal --use
engram profile use company --workspace
engram profile merge personal company --dry-run
```

プロファイルの解決順序は、明示的な `--profile` または `ENGRAM_PROFILE`、次にワークスペースの `default_profile`、最後にアクティブなユーザープロファイルです。ワークスペース `W` がプロファイル `B` に固定されていて、ユーザーの既定がプロファイル `A` のままの場合、`W` に対するすべての通常のロード、MCP のロード、エージェントフックによる注入は、プロファイル `B` のグローバルメモリを読み込み、プロファイル `A` を読み込むことはありません。ワークスペースの既定とは異なるプロファイルを明示した場合は、そのプロファイルのグローバルメモリを使い、そのコマンドではワークスペースメモリが無効になります。

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

<a id="load-configuration"></a>
## ロード設定 {#load-configuration-heading}

これらのキーは `.agents/.engram/engram.config.json` の `load` ブロックにあり、`engram config set` では指定できません。

| キー | 既定値 | 意味 |
| --- | --- | --- |
| `load.disclosure` | `auto` | `auto` は上位のヒットを展開し、残りをカードにします。`full` は階層化しない出力を維持します |
| `load.expand_top` | `3` | `auto` の開示で本文を展開する件数 |
| `load.working_ttl_days` | `14` | 承認された `OBJECTIVE: task` メモリが作業ティアに留まる日数(1〜365)。Entry の Construct タブでも編集できます |

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

`engram set-role ...` または `engram set-rule-variant ...` が成功すると、CLI は `Agent action:` の行を返します。Engram 対応のスラッシュアダプターと MCP ホストは、直ちに `engram load "<current task/request>"` を再実行する必要があります。

## set-rule-variant

```bash
engram set-rule-variant strict|balanced|light|off|status
```

## config

```bash
engram config view
engram config set <key> <value>
```

### 主要な設定のリファレンス

| キー | 説明 | 既定値 | 範囲 / オプション |
| --- | --- | --- | --- |
| `memory.rule_line_target` | ルールメモリの推奨行数の目標 | `70` | `50` から `200` |
| `memory.rule_line_hard_limit` | ルールメモリで許容される最大行数 | `100` | `50` から `200` |
| `memory.include_author_email` | 新しいメモリのフロントマターに `author_email` を書き込む(`author_name` は常に書き込まれます) | `false` | `true`, `false` |
| `mcp.resource_limit` | メモリ MCP の `resources/list` が `engram://index` のほかに返す件数。注入数と取得数による使用量でランク付けされます(JSON 設定のみ。`engram config set` では設定できません) | `20` | `0` から `200` |
| `load.limit` | 通常のロードで返すメモリの最大数 | `8` | `1` から `32` |
| `hooks.path_rules` | `native` は `applies_to` メモリ用の Claude と Cursor のルールファイルを書き込み、Claude の `InstructionsLoaded` を登録します。`hook` は Claude の `PreToolUse` フックを維持します | `native` | `native`, `hook` |
| `rule_variants.enabled` | ルールバリアントの生成を有効または無効にする | `false` | `true`, `false` |
| `rule_variants.active` | 有効なルールバリアントモード | `balanced` | `light`, `balanced`, `strict` |
| `graph.enabled` | グラフを使ったルーティングを有効または無効にする | `true` | `true`, `false` |
| `graph.max_related` | グラフのエッジから取得する関連メモリの最大数 | `4` | `1` から `20` |
| `graph.min_related_score` | グラフのエッジを追加する最小類似度スコア | `0.22` | `0.0` から `1.0` |
| `vector.enabled` | 実験的なハッシュベースのベクトル検索フォールバック(セマンティックな埋め込みではありません) | `false` | `true`, `false` |
| `live_sync.enabled` | 保存時に生成されたエージェントコンテキストファイルを同期する | `false` | `true`, `false` |
| `global_git.enabled` | グローバル Git リポジトリの同期自動化を有効にする | `true` | `true`, `false` |
| `global_git.remote` | グローバル同期に使う Git リモート名 | `origin` | 文字列 |
| `global_git.branch` | グローバル同期に使う Git ブランチ名 | `main` | 文字列 |

これらの設定は、`engram entry` の **Construct** タブからも視覚的に管理できます。

## 次のステップ

- [verify / repair / quality-check](verify-repair-quality.md)
- [Entry Web UI: Construct タブ](../entry/construct.md)


## Git 作成者(author)の ID

Engram は、グローバルの作成者と、任意のワークスペースオーバーライドを保存できます。解決順序は、ワークスペース、グローバル、読み取り専用の Git フォールバックの順です。設定が影響するのは今後のメモリだけで、ワークスペースのオーバーライドがグローバルの Git 設定を変更することはありません。グローバル Git の同期やレガシーメモリの移行では、明示的なプランと確認を使ってください。

```bash
engram author show
engram author set --name "Jane Doe" --email "jane@example.com"
engram author unset --scope workspace
engram author sync-git-global --plan
engram author sync-git-global --confirm
engram author migrate-memories --plan
engram author migrate-memories --confirm
```

詳しくは [Git 作成者設定ガイド](../operations/git-author-settings.md) を参照してください。
