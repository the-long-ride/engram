---
title: 日常のワークフロー
sidebar_position: 4
description: Engram の日常ループ — ロード、作業、検索、保存、メモリの健全性維持。
---

# 日常のワークフロー

Engram の日常ループは意図的にシンプルです。開始時にメモリをロードし、必要に応じて検索し、永続的なものが現れたら保存し、最後に監査します。

## セッションの開始

```text
/engram load "現在のタスク"
```

またはターミナルから：

```bash
engram load "<タスク>"
```

エージェントは、人間が ID、ルール、または生出力を要求しない限り、`Engram loaded: 8 memories / 24 total related memories.` のようなコンパクトなカウント行で応答する必要があります。

## 作業中

タスクが変更された場合や、プロジェクトの知識が不足していると思われる場合は検索します：

```text
/engram search "不足している可能性のあるトピック"
```

コンテンツを出力せずに、どのメモリファイルがルーティングされるかをプレビューします：

```bash
engram load --dry-run "<クエリ>"
```

コンパクトな制限の代わりに、表示されているすべてのルーティング一致を返します：

```bash
engram load --all "<クエリ>"
```

## 永続的な事実を 1 つ保存する

```text
/engram save knowledge
```

`engram save` は、最適な単一のメモリ候補をキャプチャし、一致するメモリを自動的に更新するか新しいメモリを作成し、書き込み前に常に A/B/C 承認ゲートを表示します。

## セッションから複数のメモリを保存する

```text
/engram save-session
/engram ss
```

次の形式で候補を提供します：

```text
TYPE: rule | TEXT: Always run tests before release. | CONTEXT: Created from release planning so future agents preserve the test gate.
TYPE: knowledge | TEXT: Release notes live in CHANGELOG.md.
TYPE: workflow | TEXT: When releasing, run tests, update changelog, then tag.
```

`CONTEXT: ...` はオプションです。メモリが存在する理由を説明する場合にのみ追加します。

## 最近のチャットの分析

```text
/engram save-session --query-level 3
/engram ss -f last 50 sessions
```

`--query-level` は正の整数である必要があります。エージェントは、現在のセッションを含め、アクセス可能な最近の人間とエージェントのチャットセッションを最大その数まで使用できます。利用できない履歴を捏造してはなりません。

## すべて受け入れるショートカット

```text
/engram ss -f
```

`-f` は、エージェントが推奨するすべての候補を人間が明示的に承認することを意味します。エージェントは、人間が要求しない限り、`--force` を追加してはなりません。

すべて受け入れる実行が書き込み前に関連メモリを報告する場合、まだファイルは保存されていません。エージェントは構造化された候補を使用して再実行する必要があります：

```text
TYPE: rule | TEXT: OAuth rotation follows release foundations. | DEPENDS_ON: release-foundation | LEVEL: advanced
TYPE: knowledge | TEXT: Invoice retries use exponential backoff. | UPDATE: invoice-retry-baseline
```

## ロールルーティング (Role routing)

ロール固有のメモリを保存する：

```bash
engram save --role frontend ...
engram save-session --role backend ...
```

ロールルーティングを調整する：

```bash
engram set-role frontend
engram set-role backend security
engram set-role
```

`engram set-role ...` または `engram set-rule-variant ...` が成功すると、CLI は `Agent action:` 行を返します。Engram を認識するスラッシュアダプターと MCP ホストは、すぐに `engram load "<現在のタスク/要求>"` を再実行し、その結果を以前にロードされた Engram コンテキストを置き換えるものとして扱う必要があります。

## 有意義な作業の終了

```text
Check Engram health, report invalid memories, and propose anything worth saving from this session.
```

便利なコマンド：

```bash
engram upgrade
engram verify
engram repair
engram graph "<トピック>"
engram quality-check
engram archive --reason "<理由>" <idまたはファイル>
```

## 次のステップ

- [CLI リファレンス](cli/overview.md)
- [運用のトラブルシューティング](operations/troubleshooting.md)
- [Entry Web UI](entry/index.md)

