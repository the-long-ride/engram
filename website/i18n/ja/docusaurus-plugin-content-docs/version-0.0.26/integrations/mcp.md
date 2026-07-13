---
title: MCP ツール
sidebar_position: 11
description: Engram MCP サーバーは、MCP 対応ホストに対して、ロード、検索、および提案専用ツールを公開します。
---

# MCP ツール

Engram は、MCP 対応ホストにツールを公開する MCP サーバーバイナリ `engram-mcp` を同梱しています。

## 登録

デフォルトで、`engram link <target>` はそのターゲット用の既知 MCP 登録もインストールします。

| スコープ | パス |
| --- | --- |
| ワークスペース（ほとんどのホスト） | `.mcp.json` |
| Cursor ワークスペース | `.cursor/mcp.json` |
| OpenCode ワークスペース | `opencode.json` / `opencode.jsonc` の `mcp` フィールド |
| Claude グローバル | `~/.claude/mcp.json` |
| Gemini / Antigravity グローバル | Gemini MCP 設定ファイル |
| OpenCode グローバル | `~/.config/opencode/opencode.jsonc` / `opencode.json` の `mcp` フィールド |
| Cursor グローバル | ローカルプラグインに同梱 |
| Windsurf グローバル | `~/.codeium/windsurf/mcp_config.json` |

Windsurf ワークスペースの MCP は、公式仕様書がユーザーレベルの MCP 設定のみを規定しているため、スキップされます。

## ツール

MCP ホストは、`engram_save` および `engram_autosave` を**提案専用**ツールとして扱う必要があります。最終的な書き込みは、人間が確認できる CLI 承認ワークフローを介してルーティングされる必要があります。`engram_load` のデフォルトは `--full` です（`full: true` でオプトアウト可能）。

## 全承認ルール

ショートカット `/engram ss -f` を含む明示的な `/engram save-session --force` 要求は、MCP 自動保存が提案専用のままであるため、CLI 書き込みパスを使用する必要があります。回数指定のショートカット `/engram ss -f last 50 sessions` は、`engram save-session --query-level 50 --force` を使用する必要があります。

## OpenCode MCP エントリ

```json
"engram": {
  "type": "local",
  "command": ["engram-mcp"],
  "args": [],
  "enabled": true
}
```

MCP サーバーは、標準の JSON-RPC ハンドシェイク（`initialize`、`notifications/initialized`、`tools/list`、および `tools/call`）を実装しています。

## 次のステップ

- [エージェント統合の概要](overview.md)
- [フックと検証行](hooks.md)

