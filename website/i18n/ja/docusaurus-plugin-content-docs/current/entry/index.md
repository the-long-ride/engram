---
title: Entry Web UI の概要
sidebar_position: 1
description: Entry Web UI は、Engram メモリ、プロファイル、ワークスペース、およびエージェント接続を構成するためのローカル専用コントロールパネルです。
---

import RiskCallout from '@site/src/components/RiskCallout';

# Entry Web UI の概要

Entry Web UI は、Engram 用のローカル専用コントロールパネルです。これを使用して、メモリルートを構成し、AI エージェントをリンクし、ルーティングを調整し、重複メモリを確認し、メモリグラフを検査し、JSON ファイルを手動で編集することなく実行構成をデバッグできます。

## 使用するタイミング

- ワークスペースまたはグローバルメモリルートの初期設定時
- CLI フラグを覚えることなく AI エージェントの接続を有効/無効化したいとき
- ルーティング、グラフ、ベクトル、ルールバリアント設定を調整するとき
- 重複するメモリや競合するメモリを確認するとき
- メモリの関連性グラフをシ覚的に確認するとき
- 適用された最終設定、パス、Git 連携検出状態をデバッグするとき

## ローカル専用アクセスモデル (Local-only)

このパネルはローカルの PC 内で実行されます。クラウドサービスではありません。セキュリティ上の理由から、構成作業が完了したらサーバーを停止してください。

<RiskCallout level="risky">
Entry パネルはローカル単独で実行されます。メモリを設定している間のみ稼働させ、終了したらサイドバーのフッターからサーバーを停止してください。
</RiskCallout>

## CLI コマンドとの関係

UI に表示されるすべてのコントロールは、CLI コマンドまたは設定キーに対応しています。対応する CLI コマンドは、フィールドリファレンスガイドに記載されています。自動化やスクリプト作成の基準となるのは、常に CLI 環境です。

## ナビゲーションと URL ルーティング

Entry Web UI は URL の `#hash` ルーティングを使用しており、各タブをブックマーク、再読み込み、ブラウザー履歴で移動できます。

- `#config` — Construct
- `#author` — Git
- `#upgrade` — Updates
- `#recall` — Memories
- `#review` — Review
- `#maintain` — Core
- `#connect` — Connections

サイドバーにはワークスペース単位のコントロール用の **Workspace** セクションがあり、検出結果・保留候補・レシートがトリアージ待ちのときは **Review** に保留件数バッジが表示されます。狭いビューポートではサイドバーがモバイルドロワーに折りたたまれ、閉じるボタンまたは `Escape` キーで閉じられます。

## タブの要約

| タブ | ハッシュ | 役割 |
| --- | --- | --- |
| [Construct](construct.md) | `#config` | Engram の実行時フィールド、プロファイル、ワークスペース、ランタイム状態を構成 |
| [Git](../operations/git-author-settings.md) | `#author` | 作成者 ID と Global Git 設定を管理 |
| [Updates](../operations/configuration-upgrades.md) | `#upgrade` | パッケージ更新の確認と設定アップグレードの適用 |
| [Memories](memories.md) | `#recall` | アクティブメモリの検索、ルートシミュレーション、検査、昇格、アーカイブ |
| [Review](review.md) | `#review` | セッション学習レシート、検出結果、保留中メモリ書き込みのトリアージ |
| [Core](core.md) | `#maintain` | 重複するメモリや競合するメモリの確認 |
| [Connections](connections.md) | `#connect` | Doctor ヘルス確認、エージェント検出、対応 AI エージェントのリンク |

## 次のステップ

- [コントロールパネルの起動](launch.md)
- [Construct タブ](construct.md)
- [Core タブ](core.md)
- [完全なフィールドリファレンス](field-reference.md)


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

詳しくは [Git 作成者設定ガイド](../operations/git-author-settings.md)
