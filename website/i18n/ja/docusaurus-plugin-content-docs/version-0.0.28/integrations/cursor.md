---
title: Cursor
sidebar_position: 5
description: ルール、MCP、ローカルプラグイン、スラッシュコマンド、およびセッション開始フックを介した Cursor と Engram の統合。
---

# Cursor

Cursor は `.cursor/rules/*.mdc` ファイルからプロジェクトルールを読み込みます。Engram は、有効なフロントマター（`alwaysApply: true`）とブートストラップ指示ブロックを含む `.cursor/rules/engram.mdc` を書き込みます。

## インストール

```bash
engram link cursor
```

## 書き込まれるファイル

| ファイル | 用途 |
| --- | --- |
| `.cursor/rules/engram.mdc` | `alwaysApply: true` を持つプロジェクトルール |
| `.cursor/mcp.json` | MCP 登録 (`type: "stdio"`) |
| `.cursor/hooks.json` | `sessionStart` フック |
| `.cursor/commands/engram.md` | `/engram` スラッシュアダプター |

## グローバルインストール

```bash
engram link --global cursor
```

Engram は、プラグインマニフェスト、ルール、スキル、コマンド、MCP 設定、およびフックを含むローカルプラグインを `~/.cursor/plugins/local/engram/` に作成します。

## ランタイム優先ターゲット

Cursor はランタイム優先のターゲットです。プロジェクトルールには、詳細なプロトコルについて MCP ツールとフックに依存する短いブートストラップ指示が含まれています。実際の書き込み/承認ワークフローは Agent Skill ファイルが担います。

## フックの動作

`sessionStart` フックは、`additional_context` 出力フィールドを介して Engram の起動コンテキストを注入します。`beforeSubmitPrompt` は許可/ブロックのみに使用され、コンテキスト注入には使用されません。

## 次のステップ

- [エージェント統合の概要](overview.md)
- [フックと検証行](hooks.md)
