---
title: Copilot
sidebar_position: 8
description: リポジトリおよびユーザーのカスタム指示を介した GitHub Copilot と Engram の統合。
---

# Copilot

GitHub Copilot は、`.github/copilot-instructions.md` からリポジトリのカスタム指示を読み込みます。グローバルな Copilot インストールの場合、Engram は `~/.copilot/copilot-instructions.md` に管理ブロックを追加します。

## インストール

```bash
engram link copilot
```

## 書き込まれるファイル

| ファイル | 用途 |
| --- | --- |
| `.github/copilot-instructions.md` | リポジトリのカスタム指示 |

## グローバルインストール

```bash
engram link --global copilot
```

`~/.copilot/copilot-instructions.md` に管理ブロックを追加します。

## コンパクト/手動フォールバックターゲット

Copilot はコンパクト/手動フォールバックターゲットです。現在のフックはセッション開始時のコンテキストは公開しますが、v1ではプロンプト送信時の信頼性の高いコンテキスト注入がないため、完全なコンパクトプロトコルが適用されます。フックのインストールはスキップされ、フック構成は書き込まれません。

## 次のステップ

- [エージェント統合の概要](overview.md)
- [フックと検証行](hooks.md)
