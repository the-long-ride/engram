---
title: Git 作者設定
sidebar_position: 2
description: 今後の Engram メモリおよび Git コミットに書き込まれる ID を設定します。
---

# Git 作者設定

Engram は作者プロファイルを保持し、メモリの作成者を明示的かつポータブルにします。

<!-- future-memories-only -->
作者設定は**今後のメモリのみ**に影響します。

<a id="global-author"></a>
## グローバル作者

すべてのワークスペースのデフォルト Engram ID を設定します：

```bash
engram author set --name "Jane Doe" --email "jane@example.com"
engram author show
engram author --help
engram author set --help
```

新しいファイルは個別の `author_name` および `author_email` フィールドを使用します。

<a id="workspace-override"></a>
## ワークスペースのオーバーライド

ワークスペースはグローバル Engram プロファイルをオーバーライドできます：

```bash
engram author set --scope workspace --name "Workspace Jane" --email "jane@work.com"
engram author show --scope workspace
```

<!-- workspace-never-syncs-global-git -->
ワークスペースのオーバーライドがグローバル Git 設定を同期することはありません。

<a id="resolution-order"></a>
## 解決順序

```bash
engram author show
engram author show --json
engram author show --help
```

Engram は次の順序で ID を解決します：
1. ワークスペース Engram 作者
2. グローバル Engram 作者
3. 読み取り専用 Git フォールバック
4. 未解決

Entry では `WORKSPACE`、`GLOBAL`、`GIT`、`UNRESOLVED` のバッジが表示されます。

<a id="remove-an-author-profile"></a>
## 作者プロファイルの削除

```bash
engram author unset --scope workspace
engram author unset --scope global
engram author unset --help
```

`engram author unset --scope workspace` または `--scope global` を使用します。

<a id="global-git-configuration"></a>
## グローバル Git 設定

Entry は **設定 → Git** のグローバルタブにのみ表示します。

<a id="sync-to-global-git"></a>
## グローバル Git への同期

```bash
engram author sync-git-global --plan
engram author sync-git-global --confirm
engram author sync-git-global --help
```

グローバルプロファイルのみ同期可能です。`--confirm` を指定して実行します。

<a id="migrate-existing-memories"></a>
## 既存のメモリの移行

```bash
engram author migrate-memories --plan
engram author migrate-memories --confirm
```

`engram author migrate-memories --plan` を使用し、`--confirm` で適用します。
