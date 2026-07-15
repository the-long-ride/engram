---
title: Git を使用したチームワークフロー
sidebar_position: 1
description: Git を使用してマシン間で Engram メモリを転送し、レビュー履歴を提供します。
---

# Git を使用したチームワークフロー

Git はマシン間でメモリを転送し、レビュー履歴を提供します。Engram は Git ネイティブです。メモリはプレーンな Markdown であるため、通常の Git ワークフローが適用されます。

## サブモジュールとしてのワークスペースメモリ

人間が `.agents/.engram` を別のリポジトリとして追跡することを希望する場合：

```bash
engram inject --submodule
engram inject --submodule-remote <git-url>
```

Engram は URL を検証し、`main` 上にサブモジュールを初期化し、最初のサブモジュールコミットを `Initialize engram` として作成します。

## 共有グローバル Git リモート

`engram entry` で `global_git_detected.remote_url` が表示されない場合は、グローバルメモリを Git 経由で共有すべきかどうか人間に確認してください。人間が URL を提供した場合：

```bash
engram inject --global-remote <git-url>
```

`global_git.*` フィールドを使用して同期動作を構成します：

- `global_git.enabled` — グローバルメモリに対する Git の動作を有効化
- `global_git.remote` — リモート名（デフォルトは `origin`）
- `global_git.remote_url` — 共有グローバルメモリのリモート URL
- `global_git.branch` — ターゲットブランチ（デフォルトは `main`）
- `global_git.auto_sync` — 自動 pull/push の動作
- `global_git.auto_resolve` — 自動衝突解決処理

:::warning
自動衝突解決はメモリの差分（diff）を隠蔽してしまう可能性があります。`global_git.auto_resolve` に頼る前に、メモリの差分を確認してください。
:::

## レビューワークフロー

1. エージェントがメモリ候補を提案します。
2. 人間が A/B/C ゲート（ターミナル）または `yes`/`audit`/`cancel`（チャット）で承認します。
3. Engram が承認された Markdown を書き込み、ハッシュ、インデックス、グラフ、および変更履歴を更新します。
4. Git を通じてメモリの変更をコミットし、プッシュ（push）します。
5. チームメンバーがプル（pull）し、`engram upgrade` を実行して同期します。

## 次のステップ

- [リリースおよびアップグレードプロセス](release-upgrade.md)
- [コンセプト：書き込みパスと承認](../concepts/write-path.md)
