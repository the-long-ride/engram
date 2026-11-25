---
title: メモリタイプ
sidebar_position: 2
description: Engram のメモリは Rule、Skill、Knowledge の型を持つため、ルーティングとレビューが的を絞ったものになります。
---

# メモリタイプ

アクティブな Engram のメモリにはすべて型があります。型は、ルーティング、レビュー、そしてエージェントへのメモリの表示方法を決めます。

| タイプ | 用途 |
| --- | --- |
| Rule | ユーザーの好み、訂正、制約、常に/決してしないという指針 |
| Skill | 繰り返し使えるワークフロー、チェックリスト、手順、ランブック |
| Knowledge | プロジェクトに関する客観的な事実、決定、実装の詳細 |

新しいファイルは `schema_version: 3` を使います。Rule と Skill のメモリは既定で `authority: instruction`、Knowledge は既定で `authority: reference` になります。`revision` は 1 から始まり、更新のたびに増えます。トレース ID は `evidence_refs` に、セッションやソースの識別情報は `derived_from` に入れます。

## 良いメモリ

良い Engram のメモリは次のようなものです。

- 来週になっても意味を持つほど安定している
- あとでルーティングできるほど具体的である
- エージェントのコンテキストに読み込めるほど短い
- 想定したスコープで共有できるほど安全である
- ルール、ワークフロー、ナレッジのいずれかとして書かれている

悪いメモリとは、一時的なチャットのノイズ、シークレット、認証情報、その場限りの推測、誰も承認していない事実です。

## ルールバリアント

Engram は、ルールの `## Content` から軽め(light)、標準(balanced)、厳しめ(strict)のルール文言を表示時に導出します(balanced は Content そのままです)。そのため、新規および書き換えられたルールファイルには Content だけが保存されます。`## Rule Variants` セクションは、候補が `LIGHT:`/`BALANCED:`/`STRICT:` で独自の文言を指定した場合にだけ保持されます。ルールバリアントモードは、エージェント向けメモリの表示レンズです。

- **Strict** は、下位のモデルを制御された状態に保つのに役立ちます。
- **Light** や **balanced** の文言は、通常、より強力なモデルがルールに推論を制限されないようにするのに役立ちます。

バリアントがオフのとき、Engram は既定で balanced のルール文言を表示します。次のコマンドで調整します。

```bash
engram set-rule-variant strict|balanced|light|off
```

## 既定ではコンパクトな出力

`engram load "<task>"` を実行すると、既定では AI エージェント向けに階層化され、スリム化された出力になります。

| 項目 | 既定(`engram load`) | フル(`engram load --full`) |
| --- | --- | --- |
| フロントマター | 表示されません。本文のヘッダーは `### <id> [<type>, <authority>]` と `requires: <ids>` です | 来歴、リビジョン、置き換え、有効期間を含む、完全な schema v3 とレガシーのフィールド |
| 開示 | 上位 `load.expand_top` 件は本文、その他は 1 行のカード(`- <id> [<type>] <directive-or-summary>`)、最後に `fetch:` のヒント | パックされたすべての本文 |
| ルール本文 | 選択された 1 つのバリアント | Content と、ファイルに独自のバリアントがある場合にのみ、保存された `## Rule Variants` セクション |
| その他のセクション | `## Context`、`## Example`、`## Origin` は表示されません | 同じ内容で、見出しも変わりません |

MCP の `engram_load` とフックは、既定で階層化された出力を使います。より広いレガシー出力が必要な場合は、MCP ツールに `full: true` を渡すか、`engram load --full "<task>"` を使います。

## 任意のルーティングフィールド

これらのフロントマターのフィールドは任意です。これらがないメモリはこれまでどおり動作し、`schema_version` は 3 のままです。

| フィールド | 意味 |
| --- | --- |
| `directive` | 最大 160 文字の 1 行。カードに表示され、ランキングで重み付けされます |
| `applies_to` | glob のリスト。一致するファイルが読み取りまたは編集されたときにそのメモリを注入し、強いアンカーとして数えられます |
| `tier` | `durable`(既定)または `working`(タスク単位、Git 管理外、期限あり) |
| `objective` | 最大 200 文字。作業メモリが書かれた目的 |
| `valid_until` | 有効期限の日付。作業メモリには今日 + `load.working_ttl_days` が設定されます |

<!-- evidence-foundation:v3:start -->
## 証拠に基づくメモリ

新しいファイルは `schema_version: 3` を使います。Rule と Skill のメモリは既定で `authority: instruction`、Knowledge は既定で `authority: reference` になります。`revision` は 1 から始まり、更新のたびに増えます。トレース ID は `evidence_refs` に、セッションやソースの識別情報は `derived_from` に入れます。レガシーの v1(`Context` + `Content` + `Example`)と v2(`Content`、任意の `Origin`)も引き続き読み取れます。
<!-- evidence-foundation:v3:end -->

## 次のステップ

- [ワークスペースメモリとグローバルメモリ](scopes.md)
- [読み取りパスとルーティング](read-path.md)


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


<!-- configuration-upgrade-inventory -->
## 設定アップグレードのインベントリ

パッケージ更新後は、`engram upgrade --latest` の前に `engram upgrade --latest --plan` を実行してください。共有インベントリは、ワークスペースとグローバルの Engram 管理下にあるメモリ、指示、スキルセット、設定、フック、プラグインをスキャンします。ユーザーが書いたバイト列は保持され、判別できない混在ファイルはコンフリクトとして報告されます。[設定アップグレード](../operations/configuration-upgrades.md) を参照してください。
