---
title: リリースとアップグレードの手順
sidebar_position: 2
description: Engram パッケージをアップグレードし、メモリルートを安全に調整します。
---

# リリースとアップグレードの手順

## npm パッケージの更新後

次に通常の Engram コマンドを実行すると、初期化済みのワークスペース/グローバルのルートが、新しいバージョン向けに 1 回だけ静かに調整されます。これにより、古いメタデータが検出された場合に生成されたヘルプ、メモリのインデックス、グラフファイル、対象となるベクトルのサイドカーが更新され、v0.0.8 以降のリリース間のメモリスキーマの変更に対応します。

起動時のチェックは、初回実行後は意図的に軽量になっており、現在のバージョンがすでに記録されている場合は、小さな設定マーカーだけを読み取ります。npm の postinstall からは実行されず、新しいメモリルートも作成せず、人間が作成したファイルも置換しません。コマンドでこのチェックをスキップするには、`--no-auto-upgrade` または `ENGRAM_NO_AUTO_UPGRADE=1` を使用します。

## 明示的なアップグレード

```bash
engram upgrade
engram upgrade --plan
engram upgrade --latest
```

`engram upgrade` は、人間が作成したファイルを保持したまま、生成されたワークスペースのヘルプ、メモリのインデックス、グラフファイル、対象となるベクトルのサイドカー、既存の Engram 生成のワークスペース skillset ファイル、登録済みのグローバル skillset を更新します。

`engram upgrade --latest` はより強力です。すでにリンクされているワークスペースのエージェントと登録済みのグローバルインストールに対して、Engram 管理下の現在のリンク済みエージェントアーティファクト（instruction ファイル、ルール、MCP/プラグイン設定、管理下のフックを含む）を上書きし、リンクされたホストが新しいパッケージの出力をすぐに反映できます。

`--force` は、生成された Engram のアダプターファイルを意図的に置換する場合に限って使用してください。

## 所有権を考慮した設定の調整

最新アップグレードのインベントリは、登録済みの統合を物理ファイル単位で重複排除します。複数のホストが同じ Engram ガイドを共有している場合、Engram はホストごとの行が互いに書き換えるのを防ぎ、そのファイルを 1 回だけレンダリングして書き込みます。

手動の編集によって既知の Engram アーティファクトを通常の方法で置換できなくなった場合、Entry は所有権を証明できる場合に限って **Force upgrade** を提示できます。マーカー付きの Engram ブロックでは、強制によってそのブロックだけが置換され、周囲のユーザーのテキストは保持されます。登録済み/生成された Engram ファイルでは、強制によって生成ファイル全体を置換できます。所有権が不明な場合は強制できず、一括確認で強制操作が実行されることもありません。

適用の成功は、書き込み後の再スキャンで検証されます。ロールバックまたは失敗したトランザクション、および更新が期待されるのに `current` に収束しないアーティファクトはエラーとして報告され、これらの場合、Entry はアップグレード成功のトーストを表示しません。

## Skillset のレンダリングプロファイル

ランタイム対応のホストでは、Engram は完全なプロトコルではなく小さなブートストラップ用の instruction をインストールします。フックがルーティングされたタスクコンテキストを提供し、MCP ツールがロード/検索/提案の動作を提供し、詳細なワークフローは 1 つの付属ガイドにまとめられ、スラッシュアダプターと Agent Skills はそれへの短いポインターとして機能します。信頼できるランタイムコンテキストの注入ができないフォールバック対象には、引き続きコンパクトな手動用の instruction が提供されます。

## SQLite 設定 DB のフォールバック

Engram の SQLite 設定 DB は、ワークスペース/プロファイル管理のための最適化です。DB を開けない、または初期化できない場合、通常の読み取り/書き込みコマンドは JSON 設定スナップショットにフォールバックします。DB 固有のコマンドは、通常のメモリの利用を妨げるのではなく、SQLite が利用できないことを報告します。

## ホストネイティブリリースで変更されること

既存のインストールで `engram upgrade --latest`（または `engram link <host>`）を実行した後の変更点は次のとおりです。

- **Hooks**: Claude と Codex に `SubagentStart` が追加され、Gemini に `AfterTool` が追加され、新しいフックエントリは各ホストのペイロード上限を尊重します。Claude では管理下の `PreToolUse` エントリが削除され、`InstructionsLoaded` と生成される `.claude/rules/engram/` のルールファイルが追加されます。以前の動作を維持するには、先に `engram config set hooks.path_rules hook && engram link claude` を実行してください。通常の `engram upgrade` はフック設定を更新しません。
- **Instructions**: `link claude` は管理ブロックを `AGENTS.md` に書き込み、`CLAUDE.md` は作成しなくなります。既存の `CLAUDE.md` のブロックは維持されます。生成される `SKILL.md` ファイルは、Agent Skills 仕様に準拠するようになります。
- **MCP**: サーバーは MCP 2026-07-28 と従来のハンドシェイクの両方に対応し、`engram_commit` は Claude Code と Codex で呼び出しごとの確認が必要になります（`engram upgrade` は管理下の Codex ブロックを再書き込みします）。
- **メモリファイル**: 新しいメモリは `author_email` を含めないようになり（古いものを整理するには `engram author migrate-memories --strip-email --confirm` を実行します）、ルールは Content のみを保存し、移行バックアップは gitignore 対象の `backups/` フォルダーに保存されます（`engram repair --move-backups` で古いものを移動できます）。
- **Config**: `vector.enabled` は新しい設定では既定で `false` になります。すでに `true` を保存している設定はオンのままです。`cursorrules` は 1 リリースの間、`cursor-rules` エクスポート形式の非推奨エイリアスとして残ります。

完全な一覧と未対応の項目については、[changelog](changelog.md) の Unreleased セクションをご覧ください。

## 従来のメモリのスキーマ v3 (schema v3) への移行

`engram upgrade --latest` は、ワークスペースと設定済みグローバルルートにあるアクティブな v1/v2 のメモリファイルもスキーマ v3 に移行します。Engram は各 Markdown 本文をそのまま保持し、`backups/schema-v3/<memory-file>.pre-v3.bak` を書き込み（gitignore 対象のフォルダーです。メモリの隣に残っている古いバックアップは `engram repair --move-backups` で移動できます）、決定的なメタデータだけを補完し、整合性ハッシュを更新し、インデックス、グラフ、対象となるベクトルのサイドカーを再構築します。`evidence_refs` を勝手に作成することはありません。検証済みのトレースリンクがないメモリは `evidence_status: unverified` とマークされます。無効なメモリは報告されてスキップされ、アーカイブ済みのメモリは書き換えられず、2 回目の実行は冕等です。

書き込みを行わずにすべての変更をプレビューします。

```bash
engram upgrade --latest --plan
```

リンク済みエージェントのアーティファクトを上書きせず、メモリの移行だけを実行します。

```bash
engram upgrade --migrate-memories
```

最新アップグレード中にメモリの移行をスキップします。

```bash
engram upgrade --latest --no-migrate-memories
```

## 次のステップ

- [トラブルシューティング](troubleshooting.md)
- [CLI: inject / link / upgrade](../cli/inject-link-upgrade.md)


## Git 作成者 ID

Engram はグローバルの作成者と、任意のワークスペースのオーバーライドを保存できます。解決順序はワークスペース、グローバル、そして読み取り専用の Git フォールバックです。設定の影響を受けるのは今後のメモリのみであり、ワークスペースのオーバーライドがグローバルの Git 設定を変更することはありません。グローバル Git への同期や従来メモリの移行では、明示的なプランと確定を使用してください。

```bash
engram author show
engram author set --name "Jane Doe" --email "jane@example.com"
engram author unset --scope workspace
engram author sync-git-global --plan
engram author sync-git-global --confirm
engram author migrate-memories --plan
engram author migrate-memories --confirm
```

完全な [Git 作成者設定ガイド](git-author-settings.md)をお読みください。


<!-- configuration-upgrade-inventory -->

競合レビューは CLI と Entry で同じ共有プランを使用します。`engram upgrade --latest --review` を実行すると、型を考慮した最新の提案を承認したり、`$VISUAL`/`$EDITOR` で編集したり、**Keep current** を確定したりできます。Entry は **Current**、**Proposed**、**Diff** のビューを提供し、**Diff** は既定で **Inline** で、**Parallel** に切り替えられ、削除された内容は赤、追加された内容は緑でハイライトされます。`pendingReviewCount` が 0 でない間は最終適用がブロックされ、`engram upgrade --latest --yes` は未解決または古い判断を拒否します。各判断は、書き込みの前にそのソースハッシュと照合されます。

## 設定アップグレードのインベントリ

パッケージの更新後、`engram upgrade --latest` の前に `engram upgrade --latest --plan` を実行してください。共有インベントリは、ワークスペースとグローバルの Engram 管理下のメモリ、instruction、skillset、設定、フック、プラグインをスキャンします。ユーザーが記述したバイトは保持され、複数の所有者が混在して曖昧なファイルは、適用前に明示的なレビューが必要な競合として報告されます。[設定のアップグレード](configuration-upgrades.md)もご覧ください。
