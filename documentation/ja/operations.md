# 操作ガイド

このページでは詳細な使用方法を説明し、README を短く保ちます。

## コマンド一覧

| 用途 | コマンド |
| --- | --- |
| タスクメモリのロード | `engram load "<task>"` |
| メモリの検索 | `engram search "<topic>"` |
| 1つのメモリを保存 | `engram save [rule\|workflow\|knowledge] "<text>"` |
| セッションから複数のメモリを保存 | `engram save-session` または `engram ss` |
| アクセス可能な直近チャットから抽出 | `engram save-session --query-level 3` |
| セッションの全候補を一括承認 | `engram ss -a` |
| 直近チャットを抽出して一括承認 | `engram ss -a last 50 sessions` |
| 生のメモをキャプチャ | `engram observe --file session.md` |
| 既存のドキュメントやガイドラインを変換 | `engram take-control --all` |
| 取り込み計画をプレビュー | `engram take-control --plan` |
| グラフのルーティングを検査 | `engram graph "<topic>"` |
| ハッシュ値をチェック | `engram verify` |
| 不正なメモリファイルを検出 | `engram repair` |
| 誤ったメモリをアーカイブ | `engram archive --reason "<why>" <id-or-file>` |
| ルールの適用強度を調整 | `engram set-rule-variant strict\|balanced\|light\|off` |

長時間のセッションにおけるメモリ提案には `save-session` を使用します。短縮形：`ss`。
現在のセッションだけでなく、アクセス可能な直近 n 件までの人間-エージェントチャットから候補を抽出してほしい場合は、`--query-level <n>` を使用します。自然な表現 `engram ss -a last 50 sessions` は `engram save-session --query-level 50 --accept-all` に正規化されます。

8 件を超えるメモリがクエリに一致した場合、`load` は広い候補プールを top 8 のコンテキストパックへ絞り込みます。`load --dry-run` は候補数と絞り込み用タグを表示し、`load --all` は意図的にすべての表示可能なルーティング済みメモリを返します。

## セッションの保存 (Save Session)

長時間の対話によって複数の候補が生成された場合は、`save-session` を使用します：

```text
TYPE: rule | TEXT: Always run tests before release.
TYPE: knowledge | TEXT: Release notes live in CHANGELOG.md.
TYPE: workflow | TEXT: When releasing, run tests, update changelog, then tag.
```

`--accept-all` を指定しない場合、Engram はどの候補を保存するかを尋ねます。`ss -a` を指定すると、人間が事前にこのショートカットを明示的に承認しているため、生成されたすべての候補が保存されます。
`--query-level` は正の整数でなければなりません。エージェントは実際にアクセスできるチャットだけを含め、利用できない履歴を作り出してはいけません。`engram ss -a last 50 sessions` は `50` を query level として使い、`-a` を人間の明示的な一括承認として扱います。

## テイクコントロール (Take Control)

`take-control` は、既存のリポジトリに Engram を導入するのを支援します。エージェント向けガイドライン、メモ、ドキュメント、および選択されたファイルをスキャンし、簡潔な候補の生成を提案します。

便利なセレクタ：

```bash
engram take-control --plan
engram take-control --all
engram take-control --file AGENTS.md
engram take-control --dir docs
engram take-control --include "docs/**/*.md" --exclude "docs/private/**"
engram take-control --max-sources 5 --max-chars 900
```

`take-control` で保存されたメモリには `source_files` と `source_hashes` が記録されるため、変更のないソースファイルは次回以降スキップされます。

## オブザーブ (Observe)

`observe` は、クレンジングされた生のメモを `inbox/` に保存します。インボックス内のメモはアクティブなメモリではありません。

```bash
engram observe --file session.md
engram save-session --file .agents/.engram/inbox/<note>.md
```

永続メモリにするかどうかを決める前に、一時的にメモを残しておきたい場合に使用します。

## 修復とレビュー (Repair & Review)

手動での編集やインポートの後は `repair` を実行します：

```bash
engram repair
engram rebuild-index
engram verify
```

アーカイブする前に、グラフおよび品質チェックを利用します：

```bash
engram graph "package manager"
engram quality-check
engram archive --reason "Repo migrated to npm." rules/use-pnpm.md
```

次へ：[比較とロードマップ](comparison.md)。
