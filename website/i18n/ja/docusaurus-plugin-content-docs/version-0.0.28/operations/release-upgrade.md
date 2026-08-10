---
title: リリースおよびアップグレードプロセス
sidebar_position: 2
description: Engram パッケージをアップグレードし、メモリのルートを安全に調整します。
---

# リリースおよびアップグレードプロセス

## npm パッケージの更新後

次に通常の Engram コマンドを実行した際、新しいバージョン用に初期化済みのワークスペース/グローバルのルートがバックグラウンドで自動的に一度調整されます。これにより、古いメタデータが検出された場合に、生成されたヘルプ、メモリインデックス、グラフファイル、および対象となるベクトルサイドカーを更新することで、v0.0.8 以降のリリース間のメモリスキーマの変更がカバーされます。

起動時のチェックは、初回の実行後は意図的に低コストに抑えられています。現在のバージョンがすでに記録されている場合は、小さな構成マーカーのみを読み取ります。npm postinstall から実行されたり、新しいメモリのルートを作成したり、人間が作成したファイルを置き換えたりすることはありません。コマンドでこれをスキップするには、`--no-auto-upgrade` または `ENGRAM_NO_AUTO_UPGRADE=1` を使用します。

## 明示的なアップグレード

```bash
engram upgrade
engram upgrade --plan
engram upgrade --latest
```

`engram upgrade` は、人間が作成したファイルを保持したまま、生成されたワークスペースのヘルプ、メモリインデックス、グラフファイル、対象となるベクトルサイドカー、既存の Engram 生成ワークスペーススキルセットファイル、および登録されたグローバルスキルセットを更新します。

`engram upgrade --latest` はより強力です。すでにリンクされているワークスペースエージェントおよび登録されたグローバルインストールに対して、現在 Engram が管理するリンク済みエージェントの成果物（指示ファイル、ルール、MCP/プラグイン構成、および管理対象フックを含む）を上書きし、リンクされたホストが新しいパッケージの出力をすぐに受け取れるようにします。

生成された Engram アダプターファイルを意図的に置き換える場合にのみ `--force` を使用してください。

## スキルセットレンダリングプロファイル

ランタイム対応ホストの場合、Engram は完全なプロトコルの代わりに小さなブートストラップ手順をインストールします。フックはルーティングされたタスクコンテキストを提供し、MCP ツールはロード/検索/提案の動作を提供し、スラッシュアダプターまたは Agent Skills は詳細なコマンドワークフローを伝達します。信頼性の高いランタイムコンテキストの注入がないフォールバックターゲットは、引き続きコンパクトな手動指示を受け取ります。

## SQLite 設定 DB へのフォールバック

Engram の SQLite 設定 DB は、ワークスペース/プロファイル管理のための最適化です。DB をオープンまたは初期化できない場合、通常の読み取り/書き込みコマンドは JSON 設定のスナップショットにフォールバックします。DB 固有のコマンドは、通常のメモリ使用をブロックする代わりに SQLite が利用不可であることを報告します。

## 次のステップ

- [トラブルシューティング](troubleshooting.md)
- [CLI: inject / link / upgrade](../cli/inject-link-upgrade.md)

## Legacy memory migration to schema v3

`engram upgrade --latest` also migrates active v1/v2 memory files in the workspace and configured global roots to schema v3. Engram preserves each Markdown body exactly, creates `<memory-file>.pre-v3.bak`, fills only deterministic metadata, refreshes integrity hashes, and rebuilds the index, graph, and eligible vector sidecars. It never invents `evidence_refs`; a memory without verified trace links is marked `evidence_status: unverified`. Invalid memories are reported and skipped, archived memories are not rewritten, and a second run is idempotent.

Preview all changes without writing:

```bash
engram upgrade --latest --plan
```

Run only the memory migration, without overwriting linked agent artifacts:

```bash
engram upgrade --migrate-memories
```

Skip memory migration during a latest upgrade:

```bash
engram upgrade --latest --no-migrate-memories
```

<!-- configuration-upgrade-inventory -->

競合レビューは CLI と Entry で同じ共有プランを使用します。ngram upgrade --latest --review を実行して、タイプ認識された最新の提案を受け入れるか、$VISUAL/$EDITOR で編集するか、**Keep current** を確認します。Entry は **Current**、**Proposed**、**Diff** ビューを提供します。**Diff** はデフォルトで **Inline** に設定されており、**Parallel** に切り替えることができます。削除されたコンテンツは赤でハイライトされ、追加されたコンテンツは緑でハイライトされます。pendingReviewCount がゼロでない間は最終適用がブロックされ、ngram upgrade --latest --yes は未解決または古い決定を拒否します。各決定は書き込み前にソースハッシュと照合されます。

## 所有権を認識した構成の照合

最新のアップグレード インベントリは、物理ファイルごとに登録された統合を重複排除します。複数のホストが同じ Engram ガイドを共有している場合、Engram はそのファイルを 1 回だけレンダリングして書き込みます。

手動編集によって Engram アーティファクトの通常の置換が安全でない場合、Entry は所有権が証明できる場合にのみ **Force upgrade** を提供します。マークされた Engram ブロックの場合、強制置換はその Engram ブロックのみを置き換え、周囲のユーザーテキストを保持します。登録/生成された Engram ファイルの場合、強制置換は生成されたファイル全体を置き換えることができます。不明な所有権は一括操作で強制されることはありません。

書き込み後の再スキャンによって適用が成功したことが検証されます。current に収束しない予想更新アーティファクトは検証エラーとして報告されます。

## Git author identity

Engram can store a global author and an optional workspace override. Resolution is workspace, global, then read-only Git fallback. Settings affect future memories only; a workspace override never changes global Git configuration. Use explicit plan and confirmation for global Git sync or legacy-memory migration.

```bash
engram author show
engram author set --name "Jane Doe" --email "jane@example.com"
engram author unset --scope workspace
engram author sync-git-global --plan
engram author sync-git-global --confirm
engram author migrate-memories --plan
engram author migrate-memories --confirm
```

Read the complete [Git author settings guide](../operations/git-author-settings.md).
