---
title: sync / clone-memory / archive
sidebar_position: 7
description: スコープ間でメモリを移動するための同期、クローン、およびアーカイブコマンド。
---

# sync / clone-memory / archive

スコープ間でメモリを移動し、誤ったメモリを安全に退避します。

## clone-memory

```bash
engram clone-memory workspace global
engram clone-memory global workspace --force
engram clone-memory workspace global --metacognize
```

ワークスペースとグローバルスコープの間で、アクティブな `rules/`、`skills/`、および `knowledge/` Markdown をコピーします。クローンされたメモリをそのままコピーするのではなく、save-session 承認フローを通じて提案したい場合は、`--metacognize` を追加します。

エージェントは、自然なクローン要求を `engram clone-memory` に正規化できます（例：「clone workspace memory to global」-> `engram clone-memory workspace global`）。スコープを逆にしてグローバルメモリをワークスペースにコピーします。人間がコピー先の上書きを明示的に要求した場合にのみ、`--force` を使用します。

## archive

```bash
engram archive --reason "<why>" <id-or-file>
```

誤ったメモリや代替されたメモリをアーカイブします。ファイルは承認後にのみアクティブなルーティングから外れ、`archive/` の下に保存されます。監査性の観点から、削除ではなくアーカイブを使用します。

## observe (inbox)

```bash
engram observe --file session.md
engram save-session --file .agents/.engram/inbox/<note>.md
```

`observe` は、サニタイズされた生のメモを `inbox/` に保存します。受信トレイのメモはアクティブなメモリではありません。

## グローバル Git 同期

グローバル Git 同期は、`global_git.*` 構成フィールドによって制御されます。各フィールドについては、[Entry Web UI: Construct タブ](../entry/construct.md)を参照してください。`engram entry` の Runtime タブを使用して、解決された Git 検出を検査します。

## 次のステップ

- [profiles / workspaces / config](profiles-workspaces-config.md)
- [運用：チームの Git ワークフロー](../operations/team-git-workflow.md)
