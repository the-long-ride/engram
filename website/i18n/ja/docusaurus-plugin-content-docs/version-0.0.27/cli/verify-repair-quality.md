---
title: verify / repair / quality-check
sidebar_position: 6
description: メンテナンスコマンド — ハッシュの検証、無効なファイルの修復、品質チェック、および競合の解決。
---

# verify / repair / quality-check

メンテナンスコマンドはメモリを健全に保ちます。

## verify

```bash
engram verify
```

整合性のハッシュをチェックします。手動での編集やインポートの後に実行します。

## repair

```bash
engram repair
engram rebuild-index
```

手動での編集やインポートの後に `repair` を使用して、インデックス再構築でスキップされた不正なメモリファイルを見つけます。

## quality-check

```bash
engram quality-check
```

競合する候補をコンパクトに報告します。競合検出はヒューリスティックであり、アドバイザリです。

## graph

```bash
engram graph "package manager"
engram graph --rebuild
```

アーカイブする前にグラフのルーティングを検査します。手動編集後に `engram graph --rebuild` を実行します。

## archive

```bash
engram archive --reason "Repo migrated to npm." rules/use-pnpm.md
```

誤ったメモリや代替されたメモリをアーカイブします。監査性の観点から、削除ではなくアーカイブを使用します。ファイルは承認後にのみアクティブなルーティングから外れ、`archive/` の下に保存されます。

## resolve-conflicts

```bash
engram resolve-conflicts --dry-run --metacognize
engram resolve-conflicts --metacognize
```

Engram が所有するワークスペースメモリの競合のみをプレビューまたは解決します。競合処理の後にエージェントがメモリフォルダをレビューする必要がある場合は、`--metacognize` を追加します。このコマンドは、決定論的な競合処理を `.agents/.engram/` に限定し、簡潔な `TYPE/TEXT` 候補のためにワークスペースのメタ認知ソースパックを追加します。

## benchmark

```bash
engram benchmark
```

検索の回帰チェック。

## 次のステップ

- [sync / archive](sync-archive.md)
- [運用のトラブルシューティング](../operations/troubleshooting.md)
