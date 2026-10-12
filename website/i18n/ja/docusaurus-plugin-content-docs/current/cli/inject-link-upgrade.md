---
title: inject / link / upgrade
sidebar_position: 4
description: セットアップとアダプターのコマンド。ワークスペースの初期化、エージェントのリンク、パッケージ更新後の整合を行います。
---

# inject / link / upgrade

セットアップとアダプターのコマンドは、ワークスペースを初期化し、エージェントをリンクし、パッケージ更新後に状態を整合させます。

## inject

```bash
engram inject
engram inject --scope workspace|global|both
engram inject --global-only --global-path <path>
engram inject --submodule
engram inject --submodule-remote <git-url>
engram inject --global-remote <git-url>
engram inject --global-branch <branch>
engram inject --no-skillset
engram inject --skillset all
engram inject --no-global
```

`engram inject` は `.agents/.engram/` を作成し、既定でコンパクトな Codex ターゲットをインストールします。人間が書いた既存のファイルはスキップされます。

対話形式の inject では、次の順に確認します。`./.agents/.engram` をサブモジュールとして追加するか、グローバルの Engram パスを使うか、共有のグローバル Git origin を追加するか。

設定済みのグローバルパスだけを更新するには、`engram update-global-folder <new-path>` または `engram ugf <new-path>` を使います。`engram set global memory path to <new-path>` や `engram move global folder from <old-path> to <new-path>` のようなチャット形式の表現も、同じコマンドに正規化されます。古いグローバルルート全体も移動したい場合は、`--move-from-path <old-path>` を追加します。

## link

```bash
engram link codex
engram link claude
engram link gemini
engram link cursor
engram link windsurf
engram link --global opencode
engram link all
engram link list
engram link --all-supported
engram unlink
```

`engram link all` は公開ターゲットセットをインストールし、スキルセットの指示ファイル、MCP 設定、スラッシュアダプター、エージェントフックを 1 回の統合インストールで扱い、一部のみ対応のホストについては決定的な `SKIPPED` の理由を報告します。`engram unlink` はこれらをまとめて削除します。`engram unlink --global <target>` は Engram が生成したグローバルプラグインだけを削除し、人間が書いたファイルは `--force` を明示しない限り保持されます。

`engram link claude --session-end`(または `codex`)を使うと、オプトインの `SessionEnd` コマンドフックが追加で登録されます。このフックはセッションのトランスクリプトのパスを、Git 管理外の `session-queue.json` にキューとして記録します。既定ではオフで、`engram upgrade` がこれを追加することはありません。キューは `engram observe --queue` で処理します。詳しくは [フック](../integrations/hooks.md) を参照してください。

## upgrade

```bash
engram upgrade
engram upgrade --plan
engram upgrade --latest
engram upgrade --self
engram upgrade --memory-only
engram upgrade --global-skillsets-only
engram upgrade --target codex
```

新しい Engram パッケージをインストールしたあとに `engram upgrade` を使います。このコマンドは、v0.0.8 以降に初期化されたメモリルートを現在のリリースのスキーマと比較し、生成された `HELP.md`、メモリインデックス、グラフファイル、対象となるベクトルサイドカー、生成されたワークスペーススキルセット、グローバルメモリの足場、登録済みのグローバルエージェントスキルセットを更新します。人間が書いたファイルは保持されます。

通常のコマンドも、`--no-auto-upgrade` または `ENGRAM_NO_AUTO_UPGRADE=1` が設定されていない限り、パッケージバージョンごとに 1 回、同じルート整合を静かに実行します。

新しいパッケージの出力で、Engram が管理する現在のリンク済みエージェント成果物を上書きする必要がある場合は、`engram upgrade --latest` を使います。この経路では、リンク済みのワークスペース指示ファイル、ルール、MCP/プラグイン設定、管理対象フックを再適用し、登録済みのグローバルエージェントのインストールも最新の生成ファイルで更新します。

`--force` は、生成された Engram アダプターファイルを意図的に置き換える場合にのみ使用してください。

## take-control

```bash
engram take-control --plan
engram take-control --all
engram take-control --file AGENTS.md
engram take-control --dir docs
engram take-control --include "docs/**/*.md" --exclude "docs/private/**"
engram take-control --max-sources 5 --max-chars 900
engram take-control --all --metacognize --force
engram take-control --plan --json --kind code
engram take-control --kind code --objective "add billing export"
engram take-control --refresh
engram take-control --from claude-auto-memory --plan
engram take-control --from codex-memories --plan
```

`take-control` は、既存のワークスペースガイダンスを引き継ぐための、エージェント支援のフローです。`AGENTS.md`、`CLAUDE.md`、`GEMINI.md`、Cursor ルール、memory-bank のノート、トップレベルの `rules/`、`skills/`、`workflows/`、`knowledge/`、`notes/` フォルダー(`.txt` のノートを含む)などのファイルから、コンパクトなソースパックを作成します。

保存された take-control メモリは `source_files` と `source_hashes` を記録するため、変更のないソースは次回以降スキップされます。

### コードと設定のダイジェスト

`--kind docs|code|config|all`(カンマ区切りで複数指定可。既定は `docs` で、上記の動作のままです)は、生のテキストの代わりにソースごとの短いダイジェストを出力する抽出器を追加します。

- **code**: エクスポートされたシグネチャ、ドキュメントコメントの先頭行、インポートのみで、本体は含みません。ガイダンスでは、これらをシンボル名のディレクトリ単位のリポジトリマップと、インポートの 1 行として表示します。コードのスキャンは既定で `--max-sources 40` です。
- **config** とビルドマニフェスト: キーと、許可リストにあるキー(`scripts`、依存関係の名前、`TargetFramework`、`engines`、`name`)の値、およびスタックの事実のみを含みます。

すべてのダイジェストはリダクション(秘匿化)されます。`.env*` と認証情報ファイルは常に `secret file` としてスキップされ、検出されたファイルのうち 256 KB を超えるものやバイナリに見えるものは理由付きでスキップされます。コードと設定のスキャンでは、ビルド出力ディレクトリ(`bin`、`obj`、`build`、`out`、`target`、`venv` など)を任意の深さでスキップします。パックの大きさは `--budget-tokens`(コードと設定のスキャンでは既定 6000、docs のスキャンでは指定しない限り制限なし)、`--max-sources`、`--max-chars` で制限されます。`--plan --json` は、理由付きのスキップ対象ファイルを含むプランを JSON で出力します。既定の docs スキャンでは、その `budgetTokens` は `null` です。

### 目的を意識した候補

`--objective "<text>"` は現在の目的を指定します。するとガイダンスは 2 種類の候補を求めます。目的に役立つ `OBJECTIVE: task` の候補と、その後も残す価値のある `OBJECTIVE: durable` の候補です。候補の文法では、`SCOPE: workspace|global`、`APPLIES_TO: <globs>`(相対 glob を最大 8 件)、`DIRECTIVE: <line>`(最大 160 文字)も使えます。[save-session](save-session.md#candidate-fields) を参照してください。承認された `OBJECTIVE: task` の候補は [作業ティア](save-session.md#working-memory-promote-and-prune) に保存されます。

### 鮮度

コード、設定、マニフェストのメモリは、ダイジェストのハッシュ(`source_hash_mode: digest`)を記録するため、空白のみの変更や本体のみの変更で古い扱いにはなりません。docs のメモリは生ファイルのハッシュを記録します。`engram verify --sources` は、変更または欠落したソースを Git 管理外の `stale.json` に記録し、`engram take-control --refresh` は、それらのソースだけを再ダイジェストして、古くなったメモリごとに 1 件の `UPDATE: <id>` 候補を通常の承認ゲート経由で提案します。[verify](verify-repair-quality.md#verify) を参照してください。

### ホストのメモリ

`--from claude-auto-memory|codex-memories` は、ワークスペースをスキャンする代わりに、ホストローカルのメモリストアをレビュー用にインポートします。Claude の自動メモリは `~/.claude/projects/<project>/memory/`(またはユーザー設定かローカルの Claude 設定にある `autoMemoryDirectory`。`CLAUDE_CONFIG_DIR` が `~/.claude` を置き換えます)から、Codex のメモリは `~/.codex/memories/` から読み込まれます。ストアを一意に特定できない場合は、`--dir <path>` でストアを指定します。`type: feedback` はルールとして、`project` と `reference` はナレッジとして提案され、`type: user`、型のないファイル、`MEMORY.md` インデックスはスキップされます。`--from` は `--file`、`--include`、`--exclude`、`--kind`、`--all`、`--budget-tokens`、`--refresh` と組み合わせられません。

Engram がホストのストアに書き込むことはありません。インポートはリダクションとインジェクションフィルターを通り、通常の承認ゲートを経て、`source: host-memory` と、プリセットからの相対パスの `source_files`(例: `claude-auto-memory/feedback_testing.md`。ホームのパスは記録されません)とともに記録されます。`engram verify --sources` は、ストアを持つマシンでのみドリフトを確認します(それ以外では `host memory store not on this machine` と報告されます)。Gemini のプリセットはありません。

## metacognize

```bash
engram metacognize --workspace
engram metacognize --global --dry-run
engram metacognize --all --force
```

既存の Engram メモリフォルダーを AI エージェントにレビューさせ、同じ save-session の承認フローを通じて、より安全な構造を提案させたい場合は `metacognize` を使います。エージェントは、統合や文言の整理には `UPDATE: memory-id` を、階層化されたメモリには `DEPENDS_ON: memory-id` を使う必要があります。


## スキーマ v3 (schema v3) へのレガシーメモリ移行

`engram upgrade --latest` は、ワークスペースと設定済みのグローバルルートにあるアクティブな v1/v2 メモリファイルも、スキーマ v3 (schema v3) に移行します。Engram は各 Markdown 本文をそのまま保持し、`backups/schema-v3/<memory-file>.pre-v3.bak` を書き出し(Git 管理外のフォルダーです。メモリの隣に残っている古いバックアップは `engram repair --move-backups` で移動できます)、決定的なメタデータだけを補い、整合性ハッシュを更新し、インデックス、グラフ、対象となるベクトルサイドカーを再構築します。`evidence_refs` を勝手に作ることはなく、検証済みのトレースへのリンクがないメモリには `evidence_status: unverified` が付きます。無効なメモリは報告されてスキップされ、アーカイブ済みのメモリは書き換えられず、2 回目の実行は冪等です。

書き込みを行わずにすべての変更をプレビューします。

```bash
engram upgrade --latest --plan
```

リンク済みのエージェント成果物を上書きせずに、メモリ移行だけを実行します。

```bash
engram upgrade --migrate-memories
```

最新へのアップグレード中にメモリ移行をスキップします。

```bash
engram upgrade --latest --no-migrate-memories
```

## 次のステップ

- [profiles / workspaces / config](profiles-workspaces-config.md)
- [エージェント連携の概要](../integrations/overview.md)


<!-- configuration-upgrade-inventory -->
## 設定アップグレードのインベントリ

パッケージ更新後は、`engram upgrade --latest` の前に `engram upgrade --latest --plan` を実行してください。共有インベントリは、ワークスペースとグローバルの Engram 管理下にあるメモリ、指示、スキルセット、設定、フック、プラグインをスキャンします。ユーザーが書いたバイト列は保持され、判別できない混在ファイルはコンフリクトとして報告されます。[設定アップグレード](../operations/configuration-upgrades.md) を参照してください。
