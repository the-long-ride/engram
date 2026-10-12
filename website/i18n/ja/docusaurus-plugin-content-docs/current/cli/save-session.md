---
title: save / save-session / observe
sidebar_position: 3
description: 書き込み系のコマンド。メモリを 1 件保存し、セッションから複数件を保存し、生のノートを取り込みます。
---

# save / save-session / observe

書き込み系のコマンドは、承認ゲートを通じてメモリを提案します。

## save

```bash
engram save [rule|workflow|knowledge] "<text>"
engram save --role frontend "<text>"
engram save --scope global "<text>"
```

`engram save` は最適なメモリ候補を 1 件取り出し、一致する既存メモリがあれば自動的に更新し、なければ新規作成します。書き込む前には必ず A/B/C の承認ゲートを表示します。

`engram save` が関連するアクティブなメモリを見つけた場合、承認プレビューでそれらを報告し、`depends_on` の提案か重複の可能性についての警告を添えます。

## save-session

```bash
engram save-session
engram ss
engram save-session --query-level 3
engram ss -f
engram ss -f last 50 sessions
engram save-session --file transcript.md
engram save-session --force
```

長いやり取りから複数の候補が出たときは `save-session` を使います。

```text
TYPE: rule | TEXT: Always run tests before release. | CONTEXT: Created from release planning so future agents preserve the test gate.
TYPE: knowledge | TEXT: Release notes live in CHANGELOG.md.
TYPE: workflow | TEXT: When releasing, run tests, update changelog, then tag.
```

`CONTEXT: ...` は省略できます。そのメモリが存在する理由を説明する場合にだけ追加してください。関連するメモリを再構成するときは、候補に `DEPENDS_ON`、`LEVEL`、`UPDATE` フィールドを加えることもできます。

- `--query-level <n>` — アクセス可能な最近の人間とエージェントのチャットを最大 n 件まで抽出します。正の整数で指定する必要があり、エージェントは取得できない履歴を捏造してはいけません
- `--force` / `-f` — 人間がそのショートカットを明示的に承認したものとして、生成されたすべての候補を保存します
- `--file <path>` — すでにディスク上にあるトランスクリプトや長い要約を渡すときに使います

### 保存の判定 {#save-verdicts}

すべての候補プレビュー(CLI、MCP、Entry)は、`File:` の直後に `Verdict:` の行を 1 行表示します。値は `ADD`、`UPDATE <id>`、`SUPERSEDE <id>`、`NOOP duplicate of <id>` のいずれかです。この判定は決定的です(既存の重複判定と関連メモリのスコアを使い、モデルは呼び出しません)。`A` と `B` は `NOOP` の候補をスキップし、スキップしたものとして一覧に示します。`A 1,3` は番号を付けたものだけを書き込みます。`SUPERSEDE` を承認すると、新しいメモリに `supersedes: [old]` が、古いメモリに `lifecycle: superseded` が書き込まれ、`engram load` はその古いメモリを除外します。`--force` と自動保存は `SUPERSEDE` を決して適用しません。`--force` なしで再実行してレビューするまで、保留されます。

<a id="candidate-fields"></a>
### 候補のフィールド {#candidate-fields-heading}

`CONTEXT`、`DEPENDS_ON`、`LEVEL`、`UPDATE` のほかに、候補は次のフィールドを持てます。

| フィールド | 意味 |
| --- | --- |
| `OBJECTIVE: task` または `durable` | `task` は [作業ティア](#working-memory-promote-and-prune) に保存されます。既定は `durable` です |
| `SCOPE: workspace` または `global` | この候補についてコマンドのスコープを上書きします。承認プレビューでは `Scope:` の行に対象が示されます。`--force` のもとでは、コマンドのスコープ外にある候補は書き込まれず、保留されます |
| `APPLIES_TO: <globs>` | 相対 glob を最大 8 件。一致するファイルが読み取りまたは編集されたときに、そのメモリが注入されます |
| `DIRECTIVE: <line>` | 最大 160 文字の 1 行。メモリのカードに表示されます |

```text
TYPE: rule | TEXT: Route commands through MediatR. | DIRECTIVE: Route commands through MediatR | APPLIES_TO: src/Api/**
```

フィールド名は `|` 形式では大文字小文字を区別しません。複数行形式では大文字だけが認識されるため、`Scope: the billing module` のような通常の文章の行は本文のままになります。

`/engram take-control --force` や自然な言い方の `/engram take control force` では、スラッシュアダプターが表現を正規化し、簡潔な `TYPE: ... | TEXT: ...` の候補だけを生成し、2 回目の承認プロンプトなしで Engram に保存させます。

<a id="working-memory-promote-and-prune"></a>
## 作業メモリ: 昇格と整理 {#working-memory-heading}

```bash
engram promote <id>
engram promote workspace:<id>
engram working note "<text>" [--objective "<text>"] [--type knowledge|rule] [--scope workspace|global]
engram working prune --dry-run
engram working prune
```

承認された `OBJECTIVE: task` の候補は、Git 管理外の `.agents/.engram/working/`(または `<global>/working/`)に、`tier: working`、`--objective` のテキスト、`valid_until` = 今日 + `load.working_ttl_days`(既定 14、範囲 1〜365)を付けて書き込まれます。承認プレビューには `Tier: working (expires <date>)` が表示されます。作業メモリは、期限が切れるまで永続メモリと同じようにロード、検索、ルーティングされます。期限が切れると、省略理由 `lifecycle` で `load` から外れます。エージェント向けのカードと本文には `working` のラベルが付きます。

- `engram promote <id>` は A/B/C のプレビューを表示し、承認されるとそのメモリを永続ストレージに移します。`tier` と `valid_until` を削除し、`objective` は保持し、`revision` を上げます。期限切れの作業メモリは昇格できません。両方のスコープに同じ id がある場合は、`workspace:<id>` または `global:<id>` を使います。
- `engram working prune` は `valid_until` を過ぎた作業メモリを削除し、インデックス、ハッシュ、グラフを再構築します。`--dry-run` を付けると、先に対象を一覧表示します。永続メモリには一切触れません。
- `engram working note "<text>"` はタスクノートを 1 件、作業ティアに保存します(`source: note`、既定の type は `knowledge`、`--type rule` も指定可能)。テキストはリダクション(秘匿化)され、指示のような行は拒否されます。書き込みは Y/C の 1 回のプロンプトで承認され、キャンセルすると何も書き込まれません。ノートが、同じ id を持つ永続メモリを更新することはありません。セッション開始時には、`ENGRAM_SESSION_OBJECTIVE` がノートの `--objective` と一致しない限り省略され、一致する場合はカードとして表示されます。`engram promote <id>` で昇格できます。

作業メモリが Git に届くことはなく、そのインデックス、グラフ、ハッシュのエントリは `working/` 配下のローカルのサイドカーに留まります。

## observe

```bash
engram observe --file session.md
engram save-session --file .agents/.engram/inbox/<note>.md
```

`observe` はサニタイズした生のノートを `inbox/` に保存します。inbox のノートはアクティブなメモリではありません。何を永続メモリにするか決める前に、大まかなノートを残しておきたいときに使います。

<!-- evidence-foundation:v3:start -->
## 証拠に基づくメモリ

```bash
engram observe --file session.md
# Output includes Trace: tr_... and the inbox wrapper path
engram save-session --file .agents/.engram/inbox/<observation>.md
```

変更不可のソースは `.agents/.engram/traces/<trace-id>.jsonl` に置かれ、inbox の Markdown はレビュー用のラッパーにすぎません。昇格するとトレースを開き直し、承認されたメモリを `evidence_refs` と `derived_from` 付きで書き込みます。`engram observe --propose --file session.md` はすぐに通常の承認フローに入ることもできますが、その場合もトレースをソースの証拠として使います。`engram observe --queue [--dry-run] [--limit n]` は、オプトインの `SessionEnd` トランスクリプトキューを、同じサニタイズ済みのトレースと inbox ラッパーとして処理し、メモリは書き込みません。
<!-- evidence-foundation:v3:end -->

## 関連メモリのヒント

全件承認の実行が書き込み前に関連メモリを報告した場合、まだファイルは保存されていません。エージェントは構造化された候補で再実行する必要があります。

```text
TYPE: rule | TEXT: OAuth rotation follows release foundations. | DEPENDS_ON: release-foundation | LEVEL: advanced
TYPE: knowledge | TEXT: Invoice retries use exponential backoff. | UPDATE: invoice-retry-baseline
```

## 次のステップ

- [inject / link / upgrade](inject-link-upgrade.md)
- [コンセプト: 書き込みパスと承認](../concepts/write-path.md)


## Git 作成者(author)の ID

Engram は、グローバルの作成者と、任意のワークスペースオーバーライドを保存できます。解決順序は、ワークスペース、グローバル、読み取り専用の Git フォールバックの順です。設定が影響するのは今後のメモリだけで、ワークスペースのオーバーライドがグローバルの Git 設定を変更することはありません。グローバル Git の同期やレガシーメモリの移行では、明示的なプランと確認を使ってください。

```bash
engram author show
engram author set --name "Jane Doe" --email "jane@example.com"
engram author unset --scope workspace
engram author sync-git-global --plan
engram author sync-git-global --confirm
engram author migrate-memories --plan
engram author migrate-memories --confirm
```

詳しくは [Git 作成者設定ガイド](../operations/git-author-settings.md) を参照してください。
