---
title: "AIエージェント クイックスタート"
sidebar_position: 2
description: "AIエージェントを介してEngramを使い始めましょう。メモリをロードし、作業を行い、有用な情報が現れたときに永続メモリを提案します。"
---

# AI エージェントクイックスタート

## AIチャットでの承認

AIエージェントとのチャットでは、Engram の承認は会話型です。エージェントはまず洗練した `TYPE: ... | TEXT: ...` 候補を表示し、ルールでは Light/Balanced/Strict の各バリアントも示します。正確にその候補を保存するには `yes`、修正するには `audit`、中止するには `cancel` と返信します。`yes` の後、エージェントは承認された候補そのままで `engram save-session --accept-all` を使います。直接の CLI 保存は、accept-all コマンドが明示的に呼ばれていない限り、引き続き A/B/C を使います。


まずはエージェントを通じて Engram を使用してください。CLI も存在しますが、最も良い体験は、エージェントにメモリを読み込ませ、作業を行い、何か有用なものが得られたらエージェントに永続メモリを提案させることです。

## 新しいセッションでの最初のメッセージ

以下のように尋ねます：

```text
このタスクには Engram を使用してください。次のメモリをロードしてください: <行っていること>
```

スラッシュアダプターがインストールされている場合：

```text
/engram load "<現在のタスク>"
```

エージェントは各ファイルの内容をすべて貼り付けるのではなく、関連するメモリ識別子（ID）とルールのみを要約する必要があります。

エージェントが自己完結型の Engram 使用ガイドを必要とするときは、以下を実行します。

```bash
engram llm
```

これにより、パッケージ化された `llm.txt` ガイドが印刷され、`engram inject` は不要です。

## 推奨されるセットアップ時の会話

エージェントに以下のように依頼します：

```text
このワークスペース用に Engram を初期化し、このエージェントに適したスキルセット（skillset）をインストールして、次にどのコマンドを使用すべきか教えてください。
```

エージェントは以下を実行できます。

```bash
engram inject
engram help link
engram link <エージェント名>
```

同じエージェントにグローバルで教え込み、新しいワークスペースが最初に `engram inject` を実行しなくても Engram グローバルメモリをロードできるようにするには、以下を実行します。

```bash
engram link --global <エージェント名>
```

チャットで直接使う場合は、以下のように尋ねます：

```text
このエージェントから直接 /engram を使用できるように、スラッシュコマンドのサポートをインストールしてください。
```

## 日常のルーティン

開始時：

```text
/engram load "現在のタスク"
```

作業中：

```text
/engram search "見落としているかもしれないトピック"
```

エージェントが永続的な事実を学んだとき：

```text
/engram save knowledge
```

セッションから役立つルール、事実、またはワークフローがいくつか生まれたとき：

```text
/engram save-session
```

短縮形：

```text
/engram ss
```

エージェントが実際にアクセスできる直近のチャット履歴を含めたい場合：

```text
/engram save-session --query-level 3
```

`--query-level` は正の整数でなければなりません。エージェントは現在のセッションを含め、その数までの直近の人間-エージェントチャットのみを使用でき、アクセスできない履歴を作り出してはいけません。

本当にすべての候補を保存したい場合のみ、一括承認（accept-all）のショートカットを使用します：

```text
/engram ss -a
```

`-a` は、人間がエージェントの推奨するすべての候補を明示的に承認することを意味します。エージェントが自らこれを追加してはなりません。

アクセス可能な直近チャットを抽出し、生成されたすべての候補を 1 つの依頼で承認する場合：

```text
/engram ss -a last 50 sessions
```

これは `engram save-session --query-level 50 --accept-all` に正規化されます。

## 既存の知識のインポート

すでに `AGENTS.md`、`CLAUDE.md`、Cursor のルール、メモ、またはドキュメントが存在するリポジトリの場合：

```text
/engram take-control --plan
/engram take-control --all
```

選択されたファイル、スキップされたファイル、トークン見積もり、および想定されるメモリタイプを確認したい場合は、最初に `--plan` を使用します。

## グローバルメモリ

リポジトリをまたいで適用したい設定には、グローバルメモリを使用します：

```text
グローバルな Engram メモリを <path> にセットアップし、この設定をグローバルに保存してください:
Use pnpm for package management.
```

エージェントは以下を使用できます。

```bash
engram inject --global-only --global-path <パス>
engram save --scope global "パッケージ管理に pnpm を使用します。"
engram link --global <エージェント名>
```

inject が設定済みのグローバルメモリを検出すると、将来のワークスペースが再利用できるように、そのグローバルルートのユーザーデフォルトプロファイルを作成または選択します。

## メモリの健康維持

意味のある作業の最後に、エージェントに以下のように尋ねます：

```text
Engram のヘルスチェックを行い、無効なメモリを報告し、このセッションから保存する価値のあるものを提案してください。
```

便利なコマンド：

```bash
engram upgrade
engram upgrade --plan
engram verify
engram repair
engram graph "<トピック>"
engram quality-check
engram archive --reason "<理由>" <id またはファイル>
```

次へ：[人間が所有するプロトコル](concepts/write-path.md)。
