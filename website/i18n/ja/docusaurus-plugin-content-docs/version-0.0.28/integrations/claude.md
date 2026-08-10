---
title: Claude
sidebar_position: 3
description: CLAUDE.md、スラッシュコマンド、Agent Skills、MCP、およびフックを介した Claude Code と Engram の統合。
---

# Claude

Claude Code はプロジェクトのガイダンスとして `CLAUDE.md` を読み込み、`.mcp.json` を介して外部ツールの構成をサポートします。

## インストール

```bash
engram link claude
```

## 書き込まれるファイル

| ファイル | 用途 |
| --- | --- |
| `CLAUDE.md` | プロジェクトガイダンスのブートストラップ |
| `.claude/commands/engram.md` | クラシックな `/engram` スラッシュコマンド |
| `.claude/skills/engram/SKILL.md` | スラッシュ呼び出し用の Agent Skill |
| `.claude/settings.json` | `SessionStart` および `UserPromptSubmit` フック |
| `.mcp.json` | MCP 登録 |

Claude は `.claude/commands/engram.md` と `.claude/skills/engram/SKILL.md` の両方を受信するため、古いコマンドメニューと新しいスキル対応の Claude Code セッションの両方で `/engram` が表示されます。

## グローバルインストール

```bash
engram link --global claude
```

Engram は `~/.claude/CLAUDE.md` に管理ブロックを追加し（ユーザーテキストは保持されます）、Claude スキルを `~/.claude/skills/engram/SKILL.md` に書き込みます。グローバル MCP は `~/.claude/mcp.json` に書き込まれます。

## ランタイム優先ターゲット

Claude はランタイム優先のターゲットです。`CLAUDE.md` には、詳細なプロトコルについて MCP ツールとフックに依存する短いブートストラップ指示が含まれています。実際の書き込み/承認ワークフローは Agent Skill ファイルが担います。

## フックの動作

Claude は、起動時およびプロンプト送信時の追加コンテキスト注入をサポートしています。`SessionStart` は起動時にルーティングされたメモリをロードし、`UserPromptSubmit` はルーティングされた Engram コンテキストが変更されたときにのみ再注入します。

## 次のステップ

- [エージェント統合の概要](overview.md)
- [スラッシュアダプター](slash.md)
- [MCP ツール](mcp.md)
