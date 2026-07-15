---
title: OpenCode
sidebar_position: 7
description: AGENTS.md、Agent Skills、MCP、カスタムコマンド、およびローカルプラグインを介した OpenCode と Engram の統合。
---

# OpenCode

OpenCode は、ルールのためにプロジェクトの `AGENTS.md` およびグローバルの `~/.config/opencode/AGENTS.md` を読み込みます。Engram はそこに管理ブロックを書き込み、完全なガイドを `.opencode/engram.md` または `~/.config/opencode/engram.md` に書き込み、完全なスキルを `.opencode/skills/engram/SKILL.md` または `~/.config/opencode/skills/engram/SKILL.md` に書き込み、プロジェクトの `opencode.json`（または既存の `opencode.jsonc`）およびグローバルの `~/.config/opencode/opencode.jsonc` を MCP 登録用に予約します。

## インストール

```bash
engram link opencode
```

## 書き込まれるファイル

| ファイル | 用途 |
| --- | --- |
| `AGENTS.md` | 管理ブロック付きのプロジェクトルール |
| `.opencode/engram.md` | 完全なガイド |
| `.opencode/skills/engram/SKILL.md` | エージェントスキル |
| `.opencode/commands/engram.md` | `/engram` スラッシュアダプター |
| `opencode.json` / `opencode.jsonc` | MCP 登録 (`mcp.engram`) |

## グローバルインストール

```bash
engram link --global opencode
```

また、`~/.config/opencode/plugins/engram.js` に管理されたローカルの JavaScript プラグインをインストールします。このプラグインは、`chat.message` を使用して現在のユーザープロンプトをルーティングし、`experimental.chat.system.transform` を使用して各 LLM リクエストの前にルーティングされたメモリを注入します。

:::warning
ローカルプラグインファイルは起動時に読み込まれるため、`link`/`unlink` 後は OpenCode を再起動または再読み込みする必要があります。
:::

## MCP 登録

```json
"engram": {
  "type": "local",
  "command": ["engram-mcp"],
  "args": [],
  "enabled": true
}
```

MCP サーバーは、OpenCode が Engram ツールを検出して呼び出すことができるように、標準の JSON-RPC ハンドシェイク（`initialize`、`notifications/initialized`、`tools/list`、および `tools/call`）を実装しています。

## プラグインの動作

プラグインはフェイルオープンし（正常に実行を継続し）、生のルーティングされたメモリは実行中の OpenCode プロセス内にのみ保持されます。Engram のディスクフックキャッシュは、ハッシュ、セッション ID、ホスト、cwd、およびルーティングされた署名のみのままです。`engram unlink --global opencode` は、Engram が生成したプラグインのみを削除します。人間が作成した `engram.js` は、`--force` が明示されない限り保持されます。

## 次のステップ

- [エージェント統合の概要](overview.md)
- [MCP ツール](mcp.md)
- [フックと検証行](hooks.md)
