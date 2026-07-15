---
title: load / search / graph
sidebar_position: 2
description: 読み取りコマンド — ルーティングされたメモリのロード、ボルトの検索、およびグラフのルーティング検査。
---

# load / search / graph

読み取りコマンドは、ルーティングされたメモリをロードし、ボルトを検索し、グラフのルーティングを検査します。

## load

```bash
engram load "<task>"
engram load "<task>"
engram load --dry-run "<task>"
engram load --all "<task>"
```

`load` はまず、`rule`、`knowledge`、一般的なストップワードなどの一般的なメモリワードを無視して、意味のあるクエリ語にルーティングを固定します。次に、より広い候補プールをコンパクトなコンテキストパックに精査します。通常のロードでは、`loaded 8 memory files / 14 total related memories` のように、選択されたカウントと関連する合計カウントが報告されます。

- `--full` — エージェント向けのコンパクトなルート（frontmatter の `id`、`type`、`tags`、`confidence`、`depends_on` のみ。選択されたルールバリアントが 1 つ）
- `--dry-run` — コンテンツを出力せずに候補数、絞り込みタグ、一致理由を表示
- `--all` — コンパクトな制限の代わりに、表示されているすべてのルーティング一致を返す

`workflow` と `workflows` は依然としてスキルメモリにルーティングされますが、汎用的なタイプワードだけでは広範な一致は作成されません。

## search

```bash
engram search "<topic>"
engram search --semantic "<topic>"
```

デフォルトの検索は決定論的な語彙検索です。`search --semantic` は決定論的なローカル類似性を追加しますが、埋め込み（embedding）を利用した意味検索ではありません。

## graph

```bash
engram graph "<topic>"
engram graph --rebuild
```

グラフのルーティングを検査します。手動編集後に `engram graph --rebuild` を実行します。グラフは依存関係レイヤーを報告し、`engram load` はより深いメモリの前に、ルーティングされた前提条件を同じコンパクトなコンテキストパックにプルします。

グラフの関連するエッジとベクトルヒットは、それ自体で無関係なメモリをロードすることはできません。意味のあるクエリ語とすでに重複しているメモリの再ランク付けまたは拡張のみを支援します。明示的な `depends_on` 前置条件は、独自のキーワード重複なしでロードされる可能性があります。

## 依存関係レイヤー (Dependency layers)

```yaml
depends_on: [release-foundation]
level: advanced
```

メモリが別のメモリを繰り返す代わりに、その上に構築する必要がある場合は、`depends_on` frontmatter を使用します。

## 次のステップ

- [save / save-session / observe](save-session.md)
- [概念：読み取りパスとルーティング](../concepts/read-path.md)

