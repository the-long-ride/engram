---
title: sync / clone-memory / archive
sidebar_position: 7
description: スコープ間でメモリを移動するための sync、clone、archive コマンド。
---

# sync / clone-memory / archive

スコープ間でメモリを移動し、誤ったメモリを安全に退役させます。

## clone-memory

```bash
engram clone-memory workspace global
engram clone-memory global workspace --force
engram clone-memory workspace global --metacognize
```

ワークスペースとグローバル スコープ間で、`rules/`、`skills/`、`knowledge/` のアクティブな Markdown をコピーします。クローンされたメモリをそのままコピーするのではなく、save-session の承認フローを通じて提案させたい場合は `--metacognize` を追加します。

エージェントは自然なクローン要求を `engram clone-memory` に正規化できます（例: "clone workspace memory to global" -> `engram clone-memory workspace global`）。グローバル メモリをワークスペースにクローンするにはスコープを逆にします。宛先の重複を上書きするよう明示的に要求された場合にのみ `--force` を使用してください。

## archive

```bash
engram archive --reason "<why>" <id-or-file>
```

誤ったメモリや置き換えられたメモリをアーカイブします。ファイルは承認後にのみアクティブなルーティングから外れ、`archive/` 配下に保持されます。監査のために削除（delete）ではなくアーカイブ（archive）を使用してください。

## observe (inbox)

```bash
engram observe --file session.md
engram save-session --file .agents/.engram/inbox/<note>.md
```

`observe` はサニタイズされた生のメモを `inbox/` に保存します。受信トレイのメモはアクティブなメモリではありません。

## グローバル Git 同期 {#global-git-sync}

グローバル Git 同期は `global_git.*` 設定フィールドによって制御されます。各フィールドについては [Entry Web UI: Construct タブ](../entry/construct.md) を参照してください。解決された Git 検出結果を確認するには、`engram entry` と Construct タブ、または `engram config view` を使用します。

## 次のステップ {#next-steps}

- [プロファイル / ワークスペース / 設定](profiles-workspaces-config.md)
- [運用: チーム Git ワークフロー](../operations/team-git-workflow.md)
