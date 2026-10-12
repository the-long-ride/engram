---
title: AI エージェント クイックスタート
sidebar_position: 2
description: AI エージェントを通じて Engram を使い始めましょう。メモリを読み込み、作業を行い、有用なことが出てきたら永続メモリを提案します。
---

# AI エージェント クイックスタート

まずはエージェントを通じて Engram を使いましょう。CLI もありますが、最も良い使い方は、エージェントにメモリを読み込ませ、作業を行い、有用なことが出てきたら永続メモリを提案させることです。

## AI エージェントチャットでの承認

AI エージェントのチャットでは、Engram の承認は会話形式です。エージェントはまず、整えた `TYPE: ... | TEXT: ...` の候補を、それぞれの `Verdict:` の行付きで示し、ルールについては balanced の文言を示します(候補が独自のバリアントを指定しない限り、Light と Strict はルールの表示時に導出されます)。`yes` と返すとその候補をそのまま保存し、`audit` で修正し、`cancel` で中止します。`yes` のあと、エージェントは承認された候補そのものを使って `engram save-session --force` を実行します。ターミナルから直接 CLI で保存する場合は、強制コマンドを明示的に実行しない限り、引き続き A/B/C を使います。

## 新しいセッションの最初のメッセージ

次のように依頼します。

```text
Use Engram for this task. Load memory for: <what we are doing>.
```

スラッシュアダプターがインストールされている場合は次のとおりです。

```text
/engram load "<current task>"
```

エージェントは既定で、`Engram loaded: 8 memories / 24 total related memories.` のようなコンパクトな件数の行を返すはずです。スラッシュアダプターでは、`load` がエージェント向けのルートです。

エージェントが単体で完結する Engram の使い方ガイドを必要とするときは、次を実行します。

```bash
engram llm
```

これはパッケージ同梱の `llm.txt` ガイドを表示し、`engram inject` は不要です。

## おすすめのセットアップの会話

エージェントに次のように依頼します。

```text
Inject Engram memory routing for this workspace, configure it, and connect this agent.
```

エージェントは次のコマンドの実行を提案します。

```bash
engram entry
```

これは、すっきりした Web UI でメモリを設定し、AI エージェントをリンクするためのものです。内部的には、ワークスペースを初期化するために次を実行します。

```bash
engram inject
```

同じエージェントをグローバルにリンクして、新しいワークスペースが先に `engram inject` を実行しなくても Engram のグローバルメモリを読み込めるようにするには、次のようにします。

```bash
engram link --global <agent-name>
```

チャットネイティブに使うには、次のように依頼します。

```text
Install slash support so I can use /engram directly from this agent.
```

## 日々の流れ

開始時:

```text
/engram load "current task"
```

作業中:

```text
/engram search "topic I might be missing"
```

エージェントが 1 つの永続的な事実を学んだとき:

```text
/engram save knowledge
```

セッションから、役に立つルール、事実、ワークフローが複数生まれたとき:

```text
/engram save-session
```

短縮形:

```text
/engram ss
```

エージェントが実際にアクセスできる最近のチャット履歴を含めるには:

```text
/engram save-session --query-level 3
```

`--query-level` は正の整数でなければなりません。エージェントは、現在のものを含め、最大その数の最近の人間とエージェントのチャットセッションを使うことができ、アクセスできない履歴を捏造してはいけません。

本当にそうしたいときだけ使う強制ショートカット:

```text
/engram ss -f
```

`-f` は、エージェントが推奨したすべての候補を人間が明示的に承認することを意味します。エージェントが自分で追加してはいけません。

最近アクセスできるチャットを抽出し、生成された候補を 1 回の依頼で強制保存するには:

```text
/engram ss -f last 50 sessions
```

これは `engram save-session --query-level 50 --force` に正規化されます。

<!-- evidence-foundation:v3:start -->
## 証拠に基づくメモリ

何を永続メモリにするかを決める前に、ソースを取り込みます。

```bash
engram observe --file session.md
engram save-session --file .agents/.engram/inbox/<observation>.md
```

昇格する前にラッパーを確認してください。ラッパーは編集できますが、承認された内容は変更不可のトレースから復元されます。最終的なメモリは `evidence_refs` を持つため、今後の CLI や Web UI のレビューでその来歴をたどれます。
<!-- evidence-foundation:v3:end -->

## 既存の知識をインポートする

すでに `AGENTS.md`、`CLAUDE.md`、Cursor のルール、ノート、ドキュメントがあるリポジトリの場合:

```text
/engram take-control --plan
/engram take-control --all
```

選択されたファイル、スキップされたファイル、トークンの見積もり、想定されるメモリタイプを確認したいときは、先に `--plan` を使ってください。

## グローバルメモリ

リポジトリをまたいで持ち歩きたい好みには、グローバルメモリを使います。

```text
Set up global Engram memory at <path>, then save this preference globally:
Use pnpm for package management.
```

エージェントは次を使う場合があります。

```bash
engram inject --global-only --global-path <path>
engram save --scope global "Use pnpm for package management."
engram link --global <agent-name>
```

inject が設定済みのグローバルメモリを検出すると、そのグローバルルートに対してユーザーの既定プロファイルを作成または選択し、今後のワークスペースで再利用できるようにします。

## 健全に保つ

意味のある作業の終わりに、エージェントに依頼します。

```text
Check Engram health, report invalid memories, and propose anything worth saving from this session.
```

便利なコマンド:

```bash
engram upgrade
engram upgrade --plan
engram verify
engram repair
engram graph "<topic>"
engram quality-check
engram archive --reason "<why>" <id-or-file>
```

## 次のステップ

- [日々のワークフロー](daily-workflow.md)
- [インストールと設定](install.md)
- [人間が所有するプロトコル](concepts/protocol.md)


<!-- configuration-upgrade-inventory -->
## 設定アップグレードのインベントリ

パッケージ更新後は、`engram upgrade --latest` の前に `engram upgrade --latest --plan` を実行してください。共有インベントリは、ワークスペースとグローバルの Engram 管理下にあるメモリ、指示、スキルセット、設定、フック、プラグインをスキャンします。ユーザーが書いたバイト列は保持され、判別できない混在ファイルはコンフリクトとして報告されます。[設定アップグレード](operations/configuration-upgrades.md) を参照してください。
