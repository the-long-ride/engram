---
title: Git 作成者設定
sidebar_position: 2
description: 今後の Engram メモリと Engram が作成する Git コミットに記録されるアイデンティティを設定します。
---

# Git 作成者設定

Engram は作成者プロファイルを管理し、メモリの作成者を明確かつ持ち高めやすいものにします。解決された名前は今後のメモリのフロントマターに記録されます（メールアドレスは `memory.include_author_email` が `true` の場合に限ります）。完全な ID はプロセスローカルの環境変数を介して Engram が作成する Git コミットに渡されます。リポジトリの Git 設定は変更されません。

<!-- future-memories-only -->
作成者設定の影響を受けるのは**今後のメモリのみ**です。既存のメモリは、明示的な移行コマンドを実行した場合に限って変更されます。

<a id="global-author"></a>
## グローバル作成者

すべてのワークスペースの既定の Engram アイデンティティを設定します。

```bash
engram author set --name "Jane Doe" --email "jane@example.com"
engram author show
engram author --help
engram author set --help
```

新しいメモリファイルには `author_name` だけが書かれます。メールアドレスは作成者プロファイルと Git コミットにだけ残り、コミットされるメモリファイルには含まれません。メールアドレスも書き込むには、オプトインのキー `memory.include_author_email`（既定は `false`）を有効にします。

```bash
engram config set memory.include_author_email true
```

```yaml
author_name: Jane Doe
author_email: jane@example.com   # opt-in: only with memory.include_author_email: true
```

既存のメモリを更新すると作成者フィールドが書き直されるため、オプトインがオンでない限り、従来の `author_email` は次の更新時に削除されます。

従来の `author: jane@example.com` は引き続き読み取り可能ですが、新しいメモリでは書き込まれません。

<a id="workspace-override"></a>
## ワークスペースのオーバーライド

ワークスペースは、他のワークスペースを変更することなくグローバルの Engram プロファイルをオーバーライドできます。

```bash
engram author set --scope workspace --name "Workspace Jane" --email "jane@work.com"
engram author show --scope workspace
```

<!-- workspace-never-syncs-global-git -->
ワークスペースのオーバーライドがグローバルの Git 設定を変更することはありません。ワークスペース内に保存され、そのワークスペースで作成されるメモリと Engram 作成のコミットにだけ使用されます。

<a id="resolution-order"></a>
## 解決順序

Engram は次の順序で ID を解決します。

1. ワークスペースの Engram 作成者。
2. グローバルの Engram 作成者。
3. 読み取り専用で参照する有効な Git の `user.name` と `user.email` のフォールバック。
4. 未解決。

```bash
engram author show
engram author show --json
engram author show --help
```

メモリを書き込む前に、完全で有効な名前とメールアドレスが必要です。Engram が作成するコミットには `GIT_AUTHOR_NAME`、`GIT_AUTHOR_EMAIL`、`GIT_COMMITTER_NAME`、`GIT_COMMITTER_EMAIL` が渡され、ローカルとグローバルの Git 設定は変更されません。

Entry では、解決された名前の後ろにコンパクトなソースバッジが表示されます。`WORKSPACE` はワークスペースのオーバーライド、`GLOBAL` は Engram のグローバルプロファイル、`GIT` は Git のフォールバック、`UNRESOLVED` は完全な ID が存在しないことを示します。

<a id="remove-an-author-profile"></a>
## 作成者プロファイルの削除

```bash
engram author unset --scope workspace
engram author unset --scope global
engram author unset --help
```

Web UI では確認が必要です。CLI では明示的な `unset` コマンドの実行後すぐにプロファイルが削除されます。削除後は、解決順序の次のソースが有効になります。

<a id="global-git-configuration"></a>
## グローバル Git 設定 {#global-git-configuration}

Entry は、既存のグローバルメモリの Git 設定を **Settings → Git** の **Global タブだけ**に表示します。これらは共有の設定バックエンドを引き続き使用し、コントロールを移動しても 2 つ目の Git 設定ストアは作成されません。

Global タブでは `global_git.enabled`、`global_git.remote`、`global_git.remote_url`、`global_git.branch`、`global_git.auto_sync`、`global_git.auto_resolve` を編集できます。これらのフィールドはリスクがあるため、Entry はパッチを検証し、変更されるキーを正確に表示して、保存前にレビューを求めます。Workspace タブにはこれらのグローバル用コントロールは表示されません。

<a id="sync-to-global-git"></a>
## グローバル Git への同期

グローバル Git 設定にコピーできるのは、Engram のグローバルプロファイルだけです。まずプレビューし、その後で明示的に確定します。

```bash
engram author sync-git-global --plan
engram author sync-git-global --confirm
engram author sync-git-global --help
```

確定した操作では `git config --global user.name` と `git config --global user.email` を書き込み、両方の値を検証し、いずれかの書き込みや検証が失敗した場合は以前の値をそのまま復元します。ワークスペースのプロファイルはこの操作の対象になりません。

<a id="migrate-existing-memories"></a>
## 既存のメモリの移行

完全で決定的な ID を利用できる場合に、`author_name`（`author_email` は `memory.include_author_email` が `true` の場合に限ります）を補完します。

```bash
engram author migrate-memories --plan
engram author migrate-memories --scope workspace --confirm
engram author migrate-memories --scope both --confirm
engram author migrate-memories --help
```

移行では Markdown の本文を保持し、`backups/author-v3/` に `.pre-author-v3.bak` のバックアップを作成し、アーカイブと無効なファイルはスキップし、冕等です。欠けている名前を推測することはありません。プレビューの出力は、書き込みの前に対象、最新、スキップ、無効のファイルを一覧表示します。

以前のリリースですでにメモリファイルに書かれてしまったメールアドレスを削除するには、ストリップします。`--strip-email` は既定でプランのみを作成し、`--confirm` を指定した場合に限って書き込みます。`author_name` は保持し、`author_email` と従来の `author:` のメールを削除し、ハッシュとインデックスを更新し、元のファイルを `backups/author-strip-email-<date>/` にバックアップします。

```bash
engram author migrate-memories --strip-email --scope both
engram author migrate-memories --strip-email --scope both --confirm
```

このリリースで書かれたメモリはメールアドレスなしで名前だけを保持するため、古いバージョンの Engram ではそれらをインデックスできません。名前だけのメモリに依存する前に、チームメンバー全員をアップグレードしてください。

## Entry Web UI

`engram entry` を開き、**Settings → Git** を選択します。Global と Workspace のタブには、保存済みのプロファイル、解決されたソースバッジ、保存前のレビューダイアログ、メモリ移行のプレビューが表示されます。Global タブではさらに **Global Git configuration** と明示的な Git 同期のプレビューを扱い、これらのコントロールは Workspace では非表示です。すべての情報ボタンはこのローカライズされたページを新しいタブで開き、対応する CLI の `--help` コマンドを表示します。

## プライバシーとトラブルシューティング

名前は Markdown と Git 履歴に永続的なメタデータとして残りますが、`memory.include_author_email` を有効にしない限り、メールアドレスはメモリファイルに含まれません。Engram が作成するコミットには引き続き作成者のメールアドレスが含まれるため、リポジトリの公開範囲に適したアドレスを使用してください。保存時に作成者が未解決と報告された場合は、`engram author show` を実行し、グローバルまたはワークスペースのプロファイルを設定するか、Git のフォールバック値を設定してください。グローバル Git の同期が自動で行われることはありません。
