---
title: agentmemory
sidebar_position: 3
description: Engram 対 rohitg00/agentmemory — ファイルプロトコル対自動メモリエンジン。
---

# agentmemory

[rohitg00/agentmemory](https://github.com/rohitg00/agentmemory) は、コーディングエージェント向けの強力な自動メモリエンジンです。その README では、サーバーベースのメモリ、MCP/hooks/REST 統合、多くのエージェントアダプター、ベンチマークの主張、ビューア、リプレイ、ハイブリッド検索、Hermes 統合が紹介されています。

自動キャプチャ、ライブビューア/リプレイ、ベクトル検索、多くの MCP ツール、およびサーバー形式の共有メモリが必要な場合は、agentmemory を使用します。

メモリをリポジトリから読み取り可能なプロトコルにしたい場合は、Engram を使用します。Markdown ファースト、人間の承認、Git によるレビュー、実行中のサーバーがなくてもエージェント間で移植可能です。

| 次元 | Engram | agentmemory |
| --- | --- | --- |
| 信頼できるソース | 承認された Markdown ファイル | メモリサーバー/ストア |
| 信頼境界 | 人間による A/B/C 承認 | 自動キャプチャとツールガバナンス |
| デフォルトモード | ファイルプロトコル、デーモン不要 | 実行中のサービスを推奨 |
| レビュー | Git diff と Markdown のレビュー | ビューア/API と保存されたセッション |
| 最適な用途 | 所有権と監査性を必要とするチーム | 自動想起とリプレイを求めるユーザー |
| リスク | より多くの手動規律が必要 | 注意深く管理しない限り、目に見えない状態が増える |

## 次のステップ

- [Hermes Agent](hermes-agent.md)
- [比較の概要](overview.md)
