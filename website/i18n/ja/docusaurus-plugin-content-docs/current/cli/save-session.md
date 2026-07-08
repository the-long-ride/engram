---
title: save / save-session / observe
sidebar_position: 3
description: 書き込みコマンド — メモリの 1 つ保存、セッションから複数保存、および生のメモのキャプチャ。
---

# save / save-session / observe

書き込みコマンドは、承認ゲートを通じてメモリを提案します。

## save

```bash
engram save [rule|workflow|knowledge] "<text>"
engram save --role frontend "<text>"
engram save --scope global "<text>"
```

`engram save` は、最適な単一のメモリ候補をキャプチャし、一致するメモリを自動的に更新するか新しいメモリを作成し、書き込み前に常に A/B/C 承認ゲートを表示します。

`engram save` が関連するアクティブメモリを見つけると、承認プレビューで提案された `depends_on` または重複警告の可能性が報告されます。

## save-session

```bash
engram save-session
engram ss
engram save-session --query-level 3
engram ss -a
engram ss -a last 50 sessions
engram save-session --file transcript.md
engram save-session --accept-all
```

長い相互作用によって複数の候補が生成された場合は、`save-session` を使用します：

```text
TYPE: rule | TEXT: Always run tests before release. | CONTEXT: Created from release planning so future agents preserve the test gate.
TYPE: knowledge | TEXT: Release notes live in CHANGELOG.md.
TYPE: workflow | TEXT: When releasing, run tests, update changelog, then tag.
```

`CONTEXT: ...` はオプションです。メモリが存在する理由を説明する場合にのみ追加します。候補は、関連メモリを再構成するときに `DEPENDS_ON`、`LEVEL`、または `UPDATE` フィールドを追加することもできます。

- `--query-level <n>` — アクセス可能な最近の人間とエージェントのチャットを最大 n 件マイニングします。正の整数である必要があり、エージェントは利用できない履歴を捏造してはなりません。
- `--accept-all` / `-a` — 人間がそのショートカットを明示的に承認したため、生成されたすべての候補が保存されます
- `--file <path>` — すでにディスク上にあるトランスクリプトや長い要約の場合

`/engram take-control --accept-all` または自然な `/engram take control accept all` の場合、スラッシュアダプターは文言を正規化し、簡潔な `TYPE: ... | TEXT: ...` 候補のみを生成し、二度目の承認プロンプトなしで Engram がそれらを保存できるようにします。

## observe

```bash
engram observe --file session.md
engram save-session --file .agents/.engram/inbox/<note>.md
```

`observe` は、サニタイズされた生のメモを `inbox/` に保存します。受信トレイのメモはアクティブなメモリではありません。大雑把なメモを永続メモリにするかどうかを決定する前に保存しておきたい場合は、これを使用します。

## 関連メモリのヒント

すべて受け入れる実行が書き込み前に関連メモリを報告する場合、まだファイルは保存されていません。エージェントは構造化された候補を使用して再実行する必要があります：

```text
TYPE: rule | TEXT: OAuth rotation follows release foundations. | DEPENDS_ON: release-foundation | LEVEL: advanced
TYPE: knowledge | TEXT: Invoice retries use exponential backoff. | UPDATE: invoice-retry-baseline
```

## 次のステップ

- [inject / link / upgrade](inject-link-upgrade.md)
- [概念：書き込みパスと承認](../concepts/write-path.md)
