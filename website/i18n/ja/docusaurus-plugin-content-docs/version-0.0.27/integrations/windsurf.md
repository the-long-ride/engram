---
title: Windsurf / Cascade
sidebar_position: 6
description: ルール、MCP、フック、およびグローバルメモリを介した Windsurf Cascade と Engram の統合。
---

# Windsurf / Cascade

Windsurf は `.windsurf/rules/*.md` からワークスペースルールを読み込みます。Engram は、`trigger: always_on` フロントマターを含む `.windsurf/rules/engram.md` を書き込みます。`cascade` は `windsurf` のエイリアスです。

## インストール

```bash
engram link windsurf
```

ワークスペース MCP は、公式ドキュメントがユーザーレベルの MCP 設定のみを規定しているため、生成されません。`engram link windsurf` はこれを明示的に報告し、MCP 用に `engram link --global windsurf` を提案します。

## 書き込まれるファイル

| ファイル | 用途 |
| --- | --- |
| `.windsurf/rules/engram.md` | プロジェクトルールと `trigger: always_on` |
| `.windsurf/hooks.json` | フック `pre_user_prompt` |

## グローバルインストール

```bash
engram link --global windsurf
```

Engram は、`~/.codeium/windsurf/memories/global_rules.md` に管理ブロックを書き込み（ユーザーテキストを保持し、文字数制限内に収めます）、MCP を `~/.codeium/windsurf/mcp_config.json` にマージし、フックを `~/.codeium/windsurf/hooks.json` にマージします。

## フックの動作

`pre_user_prompt` フックは監査/プリロード/ブロックを実行できますが、モデルのコンテキストを直接注入することはできません。ルールと MCP が信頼性の高い AI コンテキストチャネルを提供します。

## 次のステップ

- [エージェント統合の概要](overview.md)
- [フックと検証行](hooks.md)
