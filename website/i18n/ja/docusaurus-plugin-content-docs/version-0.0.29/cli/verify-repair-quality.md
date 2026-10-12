---
title: verify / repair / quality-check
sidebar_position: 6
description: メンテナンス系のコマンド。ハッシュの検証、無効なファイルの修復、品質チェック、コンフリクトの解決を行います。
---

# verify / repair / quality-check

メンテナンス系のコマンドは、メモリを健全な状態に保ちます。

## verify

```bash
engram verify
engram verify --sources
engram verify --sources --json
```

整合性のためにハッシュを確認します。手動で編集したりインポートしたりしたあとに実行してください。

`--sources` は、take-control メモリの `source_files` を `source_hashes` に対して再ハッシュし、変更または欠落しているものを、ローカルで Git 管理外の `.agents/.engram/stale.json` に記録します。古くなったソースが `verify` を失敗させることはありません。`load` は古いメモリの順位を下げてカードの末尾に ` (stale)` を付け、`engram take-control --refresh` はそれらの更新を提案します。ソースのパスはワークスペース内に収まっている必要があります。絶対パス、`..`、シンボリックリンクとハードリンク、シークレットファイル、`.git`、Engram のデータは未確認として報告され、読み取られることはありません。`--json` では、`skipped` に `{key, reason}` オブジェクトが並びます。グローバルの take-control メモリは、元になったワークスペースを記録し、そのワークスペースでだけ確認されます。

## stats

```bash
engram stats
engram stats --usage
```

`--usage` は、ローカルで Git 管理外の `.agents/.engram/usage.json` を読み取り、エージェントが `engram load --id` で実際に取得しているメモリと、注入されたものの 30 日間一度も取得されなかったメモリを表示します。

## repair

```bash
engram repair
engram rebuild-index
```

手動で編集したりインポートしたりしたあとに `repair` を使うと、インデックス再構築でスキップされた不正なメモリファイルを見つけられます。

```bash
engram repair --move-backups
engram repair workspace --move-backups --confirm
```

`--move-backups` は、`rules`、`skills`、`knowledge` に散らばっている `*.bak` の移行バックアップを、Git 管理外の `backups/<kind>-<label>/` フォルダーへ移す計画を立てます(例: `backups/schema-v3/rules/x.md.pre-v3.bak`)。`--confirm` を付けると実際に移動します。移動先にすでに別のファイルがある場合はコンフリクトとして報告され、そのまま残されます。`engram doctor` はこれらのファイルを `memory.stray_backups` として報告します。

## quality-check

```bash
engram quality-check
```

矛盾の候補をコンパクトに報告します。矛盾の検出はヒューリスティックで、参考情報です。

## graph

```bash
engram graph "package manager"
engram graph --rebuild
```

アーカイブする前にグラフのルーティングを確認します。手動で編集したあとは `engram graph --rebuild` を実行してください。

## archive

```bash
engram archive --reason "Repo migrated to npm." rules/use-pnpm.md
```

誤ったメモリや置き換えられたメモリをアーカイブします。監査可能性のために、削除ではなくアーカイブを使ってください。ファイルは承認後にだけアクティブなルーティングから外れ、`archive/` 配下に保存されたまま残ります。

## resolve-conflicts

```bash
engram resolve-conflicts --dry-run --metacognize
engram resolve-conflicts --metacognize
```

Engram が所有するワークスペースのメモリコンフリクトだけを、プレビューまたは解決します。コンフリクト処理のあとでエージェントにメモリフォルダーをレビューさせたい場合は、`--metacognize` を追加します。このコマンドは、決定的なコンフリクト処理を `.agents/.engram/` の範囲に限定し、そのあとにワークスペースの metacognize ソースパックを付けて、簡潔な `TYPE/TEXT` 候補を求めます。

## benchmark

```bash
engram benchmark
```

検索の回帰チェックです。

## 次のステップ

- [sync / archive](sync-archive.md)
- [運用のトラブルシューティング](../operations/troubleshooting.md)
