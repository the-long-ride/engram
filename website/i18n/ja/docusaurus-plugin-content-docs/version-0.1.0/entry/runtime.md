---
title: Runtime タブ (時間実行)
sidebar_position: 9
description: 読み取り専用の解決された構成とパスのレポート、およびサーバー停止アクション。
---

import RiskCallout from '@site/src/components/RiskCallout';

# Runtime タブ

Runtime タブは、エンジンが最終的に解釈（Resolve）した構成と実際の物理パス情報の読み取り専用レポートです。何らかのトラブルシューティングが必要になった場合、まずこのリポートを検証してください。

## 主なランタイムレポート分類

リポートは以下のグループに分けられます:

- **Profile** — 有効なプロファイルと解決のソース情報
- **Memory roots** — ワークスペースおよびグローバルのメモリパス
- **Core config** — 有効化状態、適用スコープ、読み込みモード、監査行、ロール設定
- **Routing** — ロード制限数、グラフ、ベクトル設定
- **Graph** — 有効化状態、最大関連数、最低類似度スコア
- **Git detection** — 検出されたリモートリポジトリ名、リモート URL、ブランチ、自動同期設定

設定テキストの内容だけでなく、実際にエンジンにバインドされて解決された情報です。動作がおかしい場合は、このリポートをデバッグに活用してください。

## サーバー停止 (Close server)

稼働している Entry サーバーを即座に停止します。設定作業がすべて完了した後は、セキュリティ上の理由からサーバーを停止してください。

<RiskCallout level="risky">
起動したサーバーはローカル環境専用です。設定変更を終えたら、第三者からのアクセスを防ぐためサーバーを停止してください。
</RiskCallout>

## CLI 等価コマンド

```bash
engram config view
engram entry
```

## 次のステップ

- [完全なフィールドリファレンス](field-reference.md)
- [運用上のトラブルシューティング](../operations/troubleshooting.md)
