---
title: inject / link / upgrade
sidebar_position: 4
description: セットアップおよびアダプターコマンド — ワークスペースの初期化、エージェントのリンク、およびパッケージ更新後の調整。
---

# inject / link / upgrade

セットアップおよびアダプターコマンドは、ワークスペースを初期化し、エージェントをリンクし、パッケージ更新後に調整を行います。

## inject

```bash
engram inject
engram inject --global-only --global-path <path>
engram inject --submodule
engram inject --submodule-remote <git-url>
engram inject --global-remote <git-url>
engram inject --no-skillset
engram inject --skillset all
```

`engram inject` は `.agents/.engram/` を作成し、デフォルトでコンパクトな Codex ターゲットをインストールします。人間が作成した既存のファイルはスキップされます。

対話型のインジェクトは、次の順序で質問します：`./.agents/.engram` をサブモジュールとして追加するかどうか、グローバルな Engram パスを使用するかどうか、共有グローバル Git オリジンを追加するかどうか。

構成されたグローバルパスのみを更新するには、`engram update-global-folder <new-path>` または `engram ugf <new-path>` を使用します。`engram set global memory path to <new-path>` や `engram move global folder from <old-path> to <new-path>` などのチャット形式は、同じコマンドに正規化されます。古いグローバルルート全体を移動させたい場合は、`--move-from-path <old-path>` を追加します。

## link

```bash
engram link codex
engram link claude
engram link gemini
engram link cursor
engram link windsurf
engram link --global opencode
engram link all
engram unlink
```

`engram link all` は、パブリックターゲットセットをインストールし、スキルセット指示ファイル、MCP 構成、スラッシュアダプター、およびエージェント hook において、部分的なホストに対する決定論的な `SKIPPED` 理由を 1 つの統合インストールで報告します。`engram unlink` はこれらをすべてまとめて削除します。`engram unlink --global <target>` は Engram が生成したグローバルプラグインのみを削除します。人間が作成したファイルは、`--force` が明示されない限り保持されます。

## upgrade

```bash
engram upgrade
engram upgrade --plan
engram upgrade --latest
```

新しい Engram パッケージをインストールした後に `engram upgrade` を使用します。このコマンドは、v0.0.8 以降に初期化されたメモリルートを現在のリリーススキーマと比較し、生成された `HELP.md`、メモリインデックス、グラフファイル、適格なベクトルサイドカ、生成されたワークスペーススキルセット、グローバルメモリのスキャフォールディング、および登録されたグローバルエージェントスキルセットを更新する一方で、人間が作成したファイルは保存します。

通常のコマンドも、`--no-auto-upgrade` または `ENGRAM_NO_AUTO_UPGRADE=1` が設定されていない限り、パッケージバージョンごとに 1 回、同じルート調整をサイレントに実行します。

新しいパッケージの出力が、現在 Engram が管理しているリンクされたエージェントアーティファクトを上書きする必要がある場合は、`engram upgrade --latest` を使用します。そのパスは、リンクされたワークスペース指示ファイル、ルール、MCP/プラグイン構成、および管理対象 hook を再適用し、登録されたグローバルエージェントのインストールを最新の生成ファイルで更新します。

`--force` は、生成された Engram アダプターファイルを意図的に置き換える場合にのみ使用してください。

## take-control

```bash
engram take-control --plan
engram take-control --all
engram take-control --file AGENTS.md
engram take-control --dir docs
engram take-control --include "docs/**/*.md" --exclude "docs/private/**"
engram take-control --max-sources 5 --max-chars 900
engram take-control --all --metacognize --accept-all
```

`take-control` は、既存のワークスペース指示のためのエージェント支援によるテイクオーバーフローです。`AGENTS.md`、`CLAUDE.md`、`GEMINI.md`、Cursor ルール、メモリバンクメモ、および最上位の `rules/`、`skills/`、`workflows/`、`knowledge/`、または `notes/` フォルダ（.txt メモを含む）などのファイルからコンパクトなソースパックを構築します。

保存された take-control メモリは `source_files` と `source_hashes` を記録するため、変更されていないソースは後でスキップされます。

## metacognize

```bash
engram metacognize --workspace
engram metacognize --global --dry-run
engram metacognize --all --accept-all
```

AI エージェントに既存の Engram メモリフォルダをレビューさせ、同じ save-session 承認フローを通じてより安全な構造を提案させたい場合は、`metacognize` を使用します。エージェントは、統合や文言の整理には `UPDATE: memory-id` を使用し、階層化されたメモリには `DEPENDS_ON: memory-id` を使用する必要があります。

## 次のステップ

- [profiles / workspaces / config](profiles-workspaces-config.md)
- [エージェント統合の概要](../integrations/overview.md)
