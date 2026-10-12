---
title: load / search / graph
sidebar_position: 2
description: 読み取りコマンド — ルーティングされたメモリの読み込み、ボールトの検索、グラフ ルーティングの検査。
---

# load / search / graph

読み取りコマンドは、ルーティングされたメモリを読み込み、ボールトを検索し、グラフ ルーティングを検査します。

## load

```bash
engram load "<task>"
engram load --full "<task>"
engram load --dry-run "<task>"
engram load --all "<task>"
engram load --budget-tokens 800 "<task>"
engram load --disclosure full "<task>"
engram load --id <id>,<id>
engram load --exclude-keys workspace:rules/use-pnpm.md "<task>"
```

`load` は、まず `rule` や `knowledge` などの一般的なメモリ単語や一般的なストップワードを無視し、意味のあるクエリ用語にルーティングを固定します。次に、より広い候補プールをコンパクトなコンテキスト パックに絞り込みます。通常の読み込みでは、選択された件数と関連する総件数が `loaded 8 memory files / 14 total related memories` のように報告されます。

- デフォルトの `load` — 階層化されたエージェント向けルート: `load.expand_top`（デフォルト 3）による上位ヒットが本文として展開され、その他の選択されたヒットは 1 行のカード（card）として表示され、末尾に `fetch: engram load --id <ids>` ヒントが付きます。各本文ヘッダーにはメモリの `authority` が表示され、`evidence_refs`、`## Context`、`## Example`、`## Origin` などのフロントマターはレンダリングされず（`--full` で確認可能）、ルールは選択されたバリアントが 1 つだけ表示されます。
- `--id <id,...>` — カードの完全な本文を取得します。ID はカンマ区切りで指定でき、明示的な取得は `stats --usage` にカウントされます。
- `--budget-tokens <200-16000>` — 階層化出力全体に対するハードキャップです。本文が優先してカード化され、その後ランキングの最も低いカードが除外されます。
- `--disclosure auto|full` — `full` は階層型パックではなく、パックされたすべての本文を出力します（設定の `load.disclosure: full` でも指定可能）。
- `--exclude-keys <scope:file,...>` — 呼び出し元がすでに保持しているメモリをスキップします。本文やカードは出力されず、`--json` では `already_loaded` に一覧表示されます。
- `--full` — 完全なフロントマターとすべてのルール バリアントを含む、従来のより広い出力です。
- `--dry-run` — コンテンツを出力せずに候補数、絞り込みタグ、一致理由を表示します。
- `--all` — コンパクトな制限値ではなく、表示されるルーティングの一致すべてを返します。

`workflow` と `workflows` は引き続きスキル メモリにルーティングされますが、一般的なタイプ単語自体が広範な一致を引き起こすことはありません。

`auto` 開示モードでは、JSON の `selected` および `entries` リストは展開された本文のみを記述し、カードは個別に報告されます。`engram.config.json` の `load` ブロックで `load.expand_top` と `load.disclosure` を設定してください（[プロファイル / ワークスペース / 設定](profiles-workspaces-config.md#load-configuration) を参照）。

## search

```bash
engram search "<topic>"
engram search --semantic "<topic>"
```

デフォルトの検索は決定論的な字句検索です。`search --semantic` は、埋め込みベースのセマンティック検索ではなく、決定論的なローカル類似性を追加します。`search --json` の結果には `score` フィールドが含まれます。

## graph

```bash
engram graph "<topic>"
engram graph --rebuild
```

グラフ ルーティングを検査します。手動編集後は `engram graph --rebuild` を実行してください。グラフは依存関係レイヤーを報告し、`engram load` は、より深いメモリの前にルーティングされた前提条件を同じコンパクト パックに引き込みます。

グラフ内の関連エッジやベクトル一致によって無関係なメモリが自動的に読み込まれることはありません。意味のあるクエリ用語にすでに一致しているメモリを再ランク付けまたは拡張するのに役立つだけです。明示的な `depends_on` 前提条件は、独自の用語の一致がなくても読み込まれます。

## 依存関係レイヤー {#dependency-layers}

```yaml
depends_on: [release-foundation]
level: advanced
```

あるメモリが別のメモリを繰り返すのではなく、その上に基づいている場合は、フロントマター `depends_on` を使用してください。

## 次のステップ {#next-steps}

- [save / save-session / observe](save-session.md)
- [概念: 読み取りパスとルーティング](../concepts/read-path.md)
