---
title: トラブルシューティング
sidebar_position: 3
description: Engram の一般的な問題と回復方法。
---

# トラブルシューティング

最初のステップ：`engram entry` を開き、**Runtime** タブを確認します。解決されたプロファイル、メモリのルート、コア構成、ルーティング、グラフ、および Git 検出の状態が表示されます。

## メモリがロードされない

- `engram load --dry-run "<タスク>"` を実行して、候補数と絞り込みタグを検査します。
- `engram config view` で `enabled`、`read`、`load.limit` を確認します。
- `.agents/.engram/` の下にワークスペースメモリが存在することを確認します。
- `engram verify` を実行してハッシュをチェックします。

## フックが注入されない

- `engram set-read status` が `off` または `manual` になっていないことを確認します。
- ホストがリンクされていることを確認します：`engram link <ターゲット>`。
- `link`/`unlink` の後、ホストを再起動または再ロードします（特に OpenCode）。
- 整合性行（proof line）の表示状態について `engram set-proof status` を確認します。

## 保存に失敗した

- 関連メモリに関するヒントを得るため、承認プレビューを確認します。
- 一括受け入れ（accept-all）で関連メモリが報告された場合、ファイルは保存されませんでした。`DEPENDS_ON` または `UPDATE` の候補を指定して再実行してください。
- CLI 出力で、スキーマ、シークレット、およびインジェクションスキャンのエラーを確認します。

## プロファイルの混同

- `engram profile status` を実行します。
- ワークスペースの `default_profile` とアクティブなユーザープロファイルを確認します。
- 注意：ワークスペースのデフォルトと異なる明示的なプロファイルを指定すると、そのコマンドに対するワークスペースメモリは無効になります。

## 無効なメモリファイル

```bash
engram verify
engram repair
engram rebuild-index
engram graph --rebuild
```

## パッケージ更新後の古いアダプター

```bash
engram upgrade
engram upgrade --latest
engram link all
```

生成された Engram アダプターファイルを意図的に置き換える場合にのみ `--force` を使用してください。

## SQLite 設定 DB が利用不可

通常の読み取り/書き込みコマンドは JSON 設定のスナップショットにフォールバックします。DB 固有のコマンドは、通常のメモリ使用をブロックする代わりに SQLite が利用不可であることを報告します。

## グローバル Git の同期問題

- `global_git.enabled` が `true` であることを確認します。
- `global_git.remote_url` が有効な Git リモート URL であることを確認します。
- `global_git.auto_resolve` を確認してください。自動衝突解決はメモリの差分を隠蔽してしまう可能性があります。
- `engram entry` の Runtime タブを実行して `global_git_detected` を検査します。

## 次 củaステップ

- [よくある質問](faq.md)
- [CLI: verify / repair / quality-check](../cli/verify-repair-quality.md)
