---
title: Cline
sidebar_position: 9
description: ワークスペースルールを介した Cline と Engram の統合。
---

# Cline

Cline は `.clinerules` からワークスペースルールを読み込みます。

## インストール

```bash
engram link cline
```

## 書き込まれるファイル

| ファイル | 用途 |
| --- | --- |
| `.clinerules` | Cline スタイルのワークスペースルール |

## コンパクト/手動フォールバックターゲット

Cline はコンパクト/手動フォールバックターゲットです。フックのサポートはプラグインベースであり、v1における Engram のファイル優先アダプターインストーラーと一致していないため、フックのインストールはスキップされ、フック構成は書き込まれません。

## 次のステップ

- [エージェント統合の概要](overview.md)
