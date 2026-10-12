---
title: Copilot
sidebar_position: 8
description: リポジトリおよびユーザーのカスタム指示による Engram と GitHub Copilot の統合。
---

# Copilot

GitHub Copilot は `.github/copilot-instructions.md` からリポジトリのカスタム指示を読み取ります。グローバルな Copilot インストールの場合、Engram はその管理ブロックを `~/.copilot/copilot-instructions.md` に追記します。

## インストール {#install}

```bash
engram link copilot
```

## 書き込まれるファイル {#files-written}

| ファイル | 目的 |
| --- | --- |
| `.github/copilot-instructions.md` | リポジトリのカスタム指示 |

## グローバル インストール {#global-install}

```bash
engram link --global copilot
```

`~/.copilot/copilot-instructions.md` に管理ブロックを追記します。

## コンパクト/手動フォールバック ターゲット {#compact-manual-fallback-target}

Copilot はコンパクト/手動フォールバック ターゲットです。完全なコンパクト プロトコルを受け取ります。v1 ではフックのインストールはスキップされます。コンテキストには Engram スキルセットまたは手動の `engram load` を使用してください。

## 次のステップ {#next-steps}

- [エージェント統合の概要](overview.md)
- [フックと証明行](hooks.md)
