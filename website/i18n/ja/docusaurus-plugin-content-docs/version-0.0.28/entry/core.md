---
title: Core タブ (核心)
sidebar_position: 7
description: スコープとタイプのフィルターを使用して、重複および競合するメモリを確認します。
---

# Core タブ

Core タブは、重複および競合するメモリを確認します。Entry パネル内でのメタ認知（metacognition）ワークスペースです。

## スコープチップ (Scope chips): profile / global / workspace

メモリソースごとに重複/競合分析フィルターを適用します。単一のスコープを監査するか、スコープ間で重複を比較します。少なくとも1つのスコープを選択した状態に維持する必要があります。

## タイプチップ (Type chips): rule / skill / workflow / knowledge

メモリタイプごとに重複候補フィルターを適用します。クリーンアップ作業はルール(rule)または知識(knowledge)ファクトの整理にまず集中してください。各タイプの定義をインラインドキュメントとして提供し、どのような重複が無害であるかをユーザーが理解できるようにします。

## 意味論的候補を含める (Include semantic candidates)

完全な言葉の一致だけでなく、意味論的な重複検索を追加します。十分に管理されたメモリリポジトリを整理するときに使用しますが、誤検出が多く発生する可能性があることを念頭に置いてください。

## プロンプトをコピー (Copy prompt)

性能のより高いエージェントやモデルが重複を解決できるように `/engram` プロンプトをコピーします。人間が確認しながら行うクリーンアップとレビューに適しています。生成された変更については、承認ゲートを介して確認するようユーザーに促してください。

## プレビュー (Preview)

コピーする前にプロンプトを表示します。リスクを伴うクリーンアップ操作の前にプレビューを推奨します。

## CLI 等価コマンド

```bash
engram resolve-conflicts --dry-run --metacognize
engram resolve-conflicts --metacognize
engram metacognize --workspace --force
```

## 次のステップ

- [Memories タブ](memories.md)
- [CLI: verify / repair / quality-check](../cli/verify-repair-quality.md)

