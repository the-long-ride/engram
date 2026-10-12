---
title: コマンド概要
sidebar_position: 1
description: Engram CLI の全コマンドと、それぞれの役割の一覧です。
---

# コマンド概要

`engram -h` でコンパクトなコマンド一覧を表示します。`engram help <topic>` または `engram -h <topic>` で、コマンドごとの例とユースケースを表示します。

## コマンドマップ

| 目的 | コマンド |
| --- | --- |
| タスクのメモリを読み込む | `engram load "<task>"` |
| コンパクトなタスクメモリを読み込む | `engram load "<task>"` |
| AI エージェント向けの使い方ガイドを表示する | `engram llm` |
| ルーティングされるメモリファイルをプレビューする | `engram load --dry-run "<task>"` |
| トークン上限を付けて読み込む | `engram load --budget-tokens 800 "<task>"` |
| パックされたすべての本文を表示する | `engram load --disclosure full "<task>"` |
| ID でカードを取得する | `engram load --id <id>,<id>` |
| メモリを検索する | `engram search "<topic>"` |
| メモリを 1 件保存する | `engram save [rule\|workflow\|knowledge] "<text>"` |
| セッションのメモリをまとめて保存する | `engram save-session` または `engram ss` |
| 最近アクセス可能なチャットから抽出する | `engram save-session --query-level 3` |
| セッション候補を強制保存する | `engram ss -f` |
| 最近のチャットを抽出して強制保存する | `engram ss -f last 50 sessions` |
| 生のノートを取り込む | `engram observe --file session.md` |
| 既存のドキュメントやガイダンスを変換する | `engram take-control --all` |
| ソースの引き継ぎをプレビューする | `engram take-control --plan` |
| コードや設定をダイジェスト化する | `engram take-control --kind code --objective "<text>"` |
| 古くなったコード由来のメモリを更新する | `engram take-control --refresh` |
| ソースの鮮度を確認する | `engram verify --sources` |
| 作業メモリを残す | `engram promote <id>` |
| 期限切れの作業メモリを整理する | `engram working prune [--dry-run]` |
| 取得数と注入数を確認する | `engram stats --usage` |
| 既存のメモリフォルダーを再構成する | `engram metacognize --workspace\|--global\|--all` |
| コンフリクトを解決して metacognize する | `engram resolve-conflicts --metacognize` |
| グラフのルーティングを確認する | `engram graph "<topic>"` |
| ハッシュを確認する | `engram verify` |
| 壊れたメモリファイルを見つける | `engram repair` |
| 誤ったメモリをアーカイブする | `engram archive --reason "<why>" <id-or-file>` |
| ルールの強度を調整する | `engram set-rule-variant strict\|balanced\|light\|off` |
| 既定の保存先を設定する | `engram set-save-target workspace\|global\|both\|status` |
| コンパクトロードの上限を設定する | `engram set-load-limit 1..32\|status\|reset` |
| フックの自動読み込みを設定する | `engram set-read startup\|auto\|always\|manual\|off\|status` |
| フックのプルーフ表示を設定する | `engram set-proof off\|compact\|status` |
| エージェントフックをインストールする | `engram link codex\|claude\|gemini\|opencode\|cursor\|windsurf` |
| グローバルプロファイルを管理する | `engram profile status\|list\|create\|use\|merge` |
| ワークスペースとグローバルのメモリを複製する | `engram clone-memory workspace global [--metacognize]` |

## コマンドの探し方

```bash
engram help save-session
engram help set-role
engram -h set-rule-variant
```

ヘルプに載っているすべてのコマンドには短いエイリアスがあります。エイリアスは、正規のコマンドと同じ CLI の動作と承認ゲートにルーティングされます。

## シェル補完

```bash
engram completion bash
engram completion zsh
engram completion powershell
```

## 次のステップ

- [load / search / graph](load-search-graph.md)
- [save / save-session / observe](save-session.md)
- [inject / link / upgrade](inject-link-upgrade.md)


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
