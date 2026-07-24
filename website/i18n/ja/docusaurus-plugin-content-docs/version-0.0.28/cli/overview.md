---
title: "コマンド概要"
sidebar_position: 1
description: "すべてのEngram CLIコマンドとそれらの機能のマッピング。"
---

# 操作ガイド

## AIチャットでの承認

AIエージェントとのチャットでは、Engram の承認は会話型です。エージェントはまず洗練した `TYPE: ... | TEXT: ...` 候補を表示し、ルールでは Light/Balanced/Strict の各バリアントも示します。正確にその候補を保存するには `yes`、修正するには `audit`、中止するには `cancel` と返信します。`yes` の後、エージェントは承認された候補そのままで `engram save-session --force` を使います。直接の CLI 保存は、accept-all コマンドが明示的に呼ばれていない限り、引き続き A/B/C を使います。


このページには詳細な使用法が含まれているため、README は短く抑えることができます。

## コマンド体系

| 目的 | コマンド |
| --- | --- |
| タスクメモリの読み込み | `engram load "<タスク>"` |
| エージェント向けコンパクトメモリ | `engram load "<タスク>"` |
| AIエージェントガイドの印刷 | `engram llm` |
| ルーティング予定メモリのプレビュー | `engram load --dry-run "<タスク>"` |
| メモリの検索 | `engram search "<トピック>"` |
| 単一メモリの保存 | `engram save [rule\|workflow\|knowledge] "<テキスト>"` |
| 複数セッションメモリの保存 | `engram save-session` または `engram ss` |
| 最近のアクセス可能なチャットの抽出 | `engram save-session --query-level 3` |
| すべてのセッション候補の承認 | `engram ss -f` |
| 最近のチャットの抽出と承認 | `engram ss -f last 50 sessions` |
| 生のメモの保存 | `engram observe --file session.md` |
| 既存の文書/指示のインポート | `engram take-control --all` |
| ソースインポート計画のプレビュー | `engram take-control --plan` |
| 指示のインポートと再構築提案 | `engram take-control --all --metacognize --force` |
| 既存のメモリフォルダの再構築 | `engram metacognize --workspace\|--global\|--all` |
| 競合の解決と再構築提案 | `engram resolve-conflicts --metacognize` |
| グラフのルーティング監査 | `engram graph "<トピック>"` |
| ハッシュの検証 | `engram verify` |
| 破損したメモリファイルの確認 | `engram repair` |
| 誤ったメモリのアーカイブ | `engram archive --reason "<理由>" <id またはファイル>` |
| ルール強度のチューニング | `engram set-rule-variant strict\|balanced\|light\|off` |
| デフォルトの保存先設定 | `engram set-save-target workspace\|global\|both\|status` |
| 読み込み上限設定 | `engram set-load-limit 1..32\|status\|reset` |
| 自動フック読み込み設定 | `engram set-read startup\|auto\|always\|manual\|off\|status` |
| フック証明表示設定 | `engram set-proof off\|compact\|status` |
| エージェントフックのインストール | `engram link codex\|claude\|gemini\|opencode\|cursor\|windsurf` |
| グローバルプロファイルの管理 | `engram profile status\|create\|use\|merge` |
| メモリの複製 (ワークスペース/グローバル) | `engram clone-memory workspace global [--metacognize]` |

長時間のやり取りから得られたメモリ提案には `save-session` を使用してください。短縮形：`ss`。
現在のセッションだけでなく、最近のアクセス可能な人間とエージェントの対話 n 件までマイニングしたい場合は、`--query-level <n>` を使用します。`engram ss -f last 50 sessions` のような自然な表現は、自动的に `engram save-session --query-level 50 --force` に変換されます。

内容を出力せずにどのメモリファイルがルーティングされるか確認するには、`load --dry-run` を使用します。
AI エージェント向けコンテキストには `load` を使用します。これは frontmatter に `id`、`type`、`tags`、`confidence` のみを残し、選択されたルール変換を 1 つレンダリングし、`## Rule variants (1/3 based on current: <active>)` とラベル付けします。
`load` はエージェント向けホスト向けにも既定で同じコンパクトルートを使います。MCP の `engram_load` メソッドは既定で `--full` を使うため、エージェントホストはフラグを繰り返さずにコンパクト形式を受け取れます。SessionStart フックは起動時に同じルーティング済みロード経路を呼び出し、ルーティング署名が変わらない場合は再利用またはスキップします。
`load` は、まず意味のあるクエリ語に基づいてルーティングを行い、`rule` や `knowledge` などの一般的なメモリ用語、および一般的なストップワード（stopwords）を無視します。その後、より広い候補群を精製し、コンパクトなコンテキストパックとして読み込みます。通常の読み込みは、選択された数と関連する総数を `loaded 8 memory files / 14 total related memories` の形式で報告します。`load --dry-run` は候補数、絞り込み用タグ、および一致理由を表示し、`load --all` はコンパクト制限を無視して読み込み可能なすべての一致結果を返します。
`workflow` や `workflows` は依然としてスキルメモリにルーティングされますが、一般的なタイプ単語だけでは広範な一致を生成しません。

## 依存関係レイヤー (Dependency Layers)

メモリが別のメモリを繰り返すことなく、その上にビルドされるべき場合は frontmatter `depends_on` を使用します。

```yaml
depends_on: [release-foundation]
level: advanced
```

手動でメモリを編集した後は、`engram graph --rebuild` を実行してください。グラフファイルに依存関係レイヤーが報告され、`engram load` はより深いメモリに先立って、関連する前提条件を同じコンパクトコンテキストパックにロードします。グラフの関連エッジとベクトル一致だけでは関連のないメモリを単独でロードしません。それらは、意味のあるクエリ語がすでに重なっているメモリの再ランク付けや拡張を支援するだけです。明示的に指定された `depends_on` 前提条件は、独自のキーワードが重なっていなくてもロードされることがあります。

## アップグレードと整合性調整 (Upgrade Reconciliation)

新しいバージョンの Engram パッケージをインストールした後は、`engram upgrade` を使用します。このコマンドは、v0.0.8 バージョン以降に初期化されたメモリルートを現在のリリーススキーマと比較し、自動生成された HELP.md、メモリインデックス、グラフファイル、有効なベクトルサイドカー、生成されたワークスペーススキルセット、グローバルメモリのスキャフォールディング、および登録されたグローバルエージェントスキルセットを更新しながら、ユーザーが作成したメモリファイルはそのまま保存します。通常のコマンドも、`--no-auto-upgrade` 或いは `ENGRAM_NO_AUTO_UPGRADE=1` が設定されていない限り、パッケージバージョンごとに初回1回自動的にこの調整処理をバックグラウンドで行います。
新しいパッケージの出力で、現在Engramが管理するリンクされたエージェントアーティファクトを上書きする必要がある場合は、`engram upgrade --latest`を使用します。このパスは、リンクされたワークスペースの指示ファイル、ルール、MCP/プラグイン設定、および管理されたフック（hooks）を再適用し、登録済みのグローバルエージェントのインストールも最新の生成ファイルで更新します。

### スキルセットレンダリングプロファイル (Skillset Render Profiles)

ランタイム実行が可能なホスト向けに、Engramは完全なプロトコルの代わりに、小さなブートストラップ指示をインストールするようになりました。フックはルーティングされたタスクコンテキストを提供し、MCPツールはロード/検索/提案の動作を提供し、スラッシュアダプターまたはエージェントスキル（Agent Skills）は詳細なコマンドワークフローを実行します。信頼性の高いランタイムコンテキスト挿入がないフォールバックターゲットは、引き続きコンパクトな手動指示を受け取ります。

### SQLite構成DBフォールバック (SQLite Config DB Fallback)

EngramのSQLite構成DBは、ワークスペース/プロファイル管理のための最適化です。DBを開けない、または初期化できない場合、通常の読み取り/書き込みコマンドはJSON構成スナップショットにフォールバックします。DB固有のコマンドは、通常のメモリ使用をブロックするのではなく、SQLiteが利用不可であることを報告します。
`engram save` 実行中に関連する既存のメモリが検出されると、承認プレビュー画面に推奨される依存関係（`depends_on`）や重複リスクの警告が表示されます。承認するとプレビューの通りに保存されるため、依存関係を再構築したい場合や重複メモリをアーカイブしたい場合は、まず却下（reject）してください。
`save-session --force` 実行時に関連メモリのヒントが検出された場合、書き込む前に一時停止します。エージェントは、この応答をもとに構造化された再実行を準備する必要があります。依存関係には `DEPENDS_ON: memory-id`、前提条件より深いメモリには `LEVEL: advanced`、既存の重複候補にマージする場合は `UPDATE: memory-id` を指定して再提案します。

## プロファイル、保存先、および複製

通常の保存先を設定するには、`set-save-target` を使用します。

```bash
engram set-save-target status
engram set-save-target workspace
engram set-save-target global
engram set-save-target both
```

個人用、会社用、またはプロジェクトチーム用グローバルメモリを論理的に分離する必要がある場合は `profile` を使用します。

```bash
engram profile create personal --global-path ~/Documents/engram-personal --use
engram profile use company --workspace
engram profile merge personal company --dry-run
```

プロファイルの解決順序は、明示的な `--profile` または
`ENGRAM_PROFILE`、次にワークスペースの `default_profile`、最後にユーザーの
アクティブプロファイルです。ワークスペース `W` がプロファイル `B` に固定され、
ユーザー既定がプロファイル `A` のままでも、`W` に対する通常ロード、MCP
ロード、エージェントフック注入はすべてプロファイル `B` のグローバルメモリを読み、
プロファイル `A` は読みません。ワークスペース既定と異なる明示的なプロファイルは、
そのプロファイルのグローバルメモリを使い、そのコマンドではワークスペースメモリを無効化します。

ワークスペースとグローバル範囲の間で、アクティブな `rules/`、`skills/`、`knowledge/` Markdown ファイルをコピーするには `clone-memory` を実行します。

```bash
engram clone-memory workspace global
engram clone-memory global workspace --force
```

単純コピーの代わりに、複製されたメモリを `save-session` 監査フローを介して登録したい場合は、`--metacognize` フラグを追加します。

## メモリのメタ認知再構築 (Metacognize Memory)

AIエージェントに既存の Engram メモリフォルダを監査させ、`save-session` 承認フローと同様に、より安全な精製構造の提案を生成させるには `metacognize` を使用します。

```bash
engram metacognize --workspace
engram metacognize --global --dry-run
engram metacognize --all --force
```

選択された範囲内の `rules/`、`skills/`、`knowledge/` メモリを検証し、候補リストが与えられていない場合はコンパクトなソースパックを出力し、承認後に生成された `TYPE: ... | TEXT: ...` 指示行のみを記録します。エージェントは、重複整理や文言補完に `UPDATE: memory-id`、レイヤー構造形成には `DEPENDS_ON: memory-id` を指定する必要があります。`engram restructure workspace memory accept all` のような自然な文は、内部的に `engram metacognize --workspace --force` に標準化されます。

## セッションの保存 (Save Session)

対話セッションが長くなり、複数のメモリ候補が生成された場合は `save-session` を使用します。

```text
TYPE: rule | TEXT: Always run tests before release. | CONTEXT: Created from release planning so future agents preserve the test gate.
TYPE: knowledge | TEXT: Release notes live in CHANGELOG.md.
TYPE: workflow | TEXT: When releasing, run tests, update changelog, then tag.
```

`CONTEXT: ...` はオプションです。メモリが存在する詳細な理由、生成された当時の状況、意図された活用境界などを補足したい場合のみ追加してください。単純な事実メモリは省略し、Engram デフォルトの承認コンテキストを使用しても構いません。

`--force` フラグがない場合、Engram は保存する候補をユーザーに個別に確認します。`ss -f` を指定すると、ユーザーがこのショートカットを明示的に承認したとみなされ、すべての候補が即座に自動保存されます。
自動保存の実行時に、関連するメモリが報告されて書き込みが保留された場合、まだファイルは記録されていません。エージェントは、以下のように構造化された指示候補を構築して再実行を要求する必要があります。

```text
TYPE: rule | TEXT: OAuth rotation follows release foundations. | DEPENDS_ON: release-foundation | LEVEL: advanced
TYPE: knowledge | TEXT: Invoice retries use exponential backoff. | UPDATE: invoice-retry-baseline
```

`--query-level` パラメータは常に正の整数である必要があります。エージェントは、実際にアクセスが許可されている対話履歴のみを反映する必要があり、存在しない履歴を捏造してはなりません。`engram ss -f last 50 sessions` は、クエリレベル `50` と自动保存フラグ `-f` を使用します。

## コントロールの引き継ぎ (Take Control)

既存のリポジトリに Engram メモリを迅速に導入できるように `take-control` が支援します。エージェント指示ファイル、ノート、ドキュメント、および選択されたファイルをスキャンして、コンパクトな候補提案を出力します。

代表的なセレクター：

```bash
engram take-control --plan
engram take-control --all
engram take-control --file AGENTS.md
engram take-control --dir docs
engram take-control --include "docs/**/*.md" --exclude "docs/private/**"
engram take-control --max-sources 5 --max-chars 900
engram take-control --all --metacognize --force
```

保存された take-control メモリは `source_files` と `source_hashes` を記録するため、変更されていないソースファイルは次回以降自動的にスキャンから除外されます。
関連する既存メモリの検出時に書き込みを中断し、エージェントに `UPDATE` または `DEPENDS_ON` の形式で再提案させたい場合は、`--metacognize` とユーザー承認自動保存を組み合わせます。

## メタ認知による競合解決 (Resolve Conflicts With Metacognition)

Engram が管理するワークスペースメモリ間の競合状況を解決するには、`resolve-conflicts` を実行します。競合解決の直後にメモリフォルダを再監査させたい場合は、`--metacognize` を追加します。

```bash
engram resolve-conflicts --dry-run --metacognize
engram resolve-conflicts --metacognize
engram resolve conflicts and metacognize
```

このコマンドは、`.agents/.engram/` 内の競合解消処理を実行し、ワークスペースの再監査ソースパックを連結して、簡潔な `TYPE/TEXT` 候補を提供します。

## 観測と一時保存 (Observe)

`observe` コマンドは、個人情報や重要シークレットが消去された一時的なメモを `inbox/` ディレクトリに保存します。この受信トレイメモはアクティブなメモリではありません。

```bash
engram observe --file session.md
engram save-session --file .agents/.engram/inbox/<メモファイル名>.md
```

完全な永続メモリとして登録する前に、一時的な草案を安全に保存しておきたい場合に使用します。

## 設定 (Configuration)

ランタイム設定を表示および管理するには、`config`コマンドを使用します。

- **アクティブな設定の表示**:
  ```bash
  engram config view
  ```
- **設定値の指定**:
  ```bash
  engram config set <key> <value>
  ```

### 主要設定リファレンス (Key Settings Reference)

| キー | 説明 | デフォルト | 範囲 / オプション |
| --- | --- | --- | --- |
| `memory.rule_line_target` | ルールメモリの推奨行数ターゲット | `70` | `50` から `200` |
| `memory.rule_line_hard_limit` | ルールメモリの許容最大行数 | `100` | `50` から `200` |
| `load.limit` | 通常のロードで返される最大メモリ数 | `8` | `1` から `32` |
| `rule_variants.enabled` | ルールバリアントの生成の有効化または無効化 | `true` | `true`, `false` |
| `rule_variants.active` | アクティブなルールバリアントモード | `balanced` | `light`, `balanced`, `strict` |
| `graph.enabled` | グラフ対応ルーティングの有効化または無効化 | `true` | `true`, `false` |
| `graph.max_related` | グラフのエッジから取得する最大関連メモリ数 | `8` | `1` から `20` |
| `graph.min_related_score` | グラフのエッジを追加する最小類似度スコア | `0.3` | `0.0` から `1.0` |
| `vector.enabled` | ベクトル検索フォールバックの有効化または無効化 | `true` | `true`, `false` |
| `live_sync.enabled` | 保存時に生成されたエージェントコンテキストファイルを同期 | `true` | `true`, `false` |
| `global_git.enabled` | グローバルGitリポジトリ同期自動化の有効化 | `false` | `true`, `false` |
| `global_git.remote` | グローバル同期用のGitリモート名 | `origin` | 文字列 |
| `global_git.branch` | グローバル同期用のGitブランチ名 | `main` | 文字列 |

これらの設定は、`engram entry`の **Construct** タブで視覚的に管理することもできます。

## 修復とレビュー

手動で Markdown を修正したり、ファイルを強制的に配置した場合は `repair` を実行してください。

```bash
engram repair
engram rebuild-index
engram verify
```

アーカイブ処理を行う前に、グラフ構造と品質を確認してください。

```bash
engram graph "package manager"
engram quality-check
engram archive --reason "Repo migrated to npm." rules/use-pnpm.md
```

次へ：[比較とロードマップ](../comparison/overview.md)。


