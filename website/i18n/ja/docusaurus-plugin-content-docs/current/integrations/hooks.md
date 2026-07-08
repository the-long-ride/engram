---
title: フックと検証行
sidebar_position: 12
description: Engram エージェントフックは、セッション開始時およびプロンプト送信時にルーティングされたメモリを注入します。検証行により、注入が視覚化されます。
---

# フックと検証行

エージェントフックはオプトインのホストフックであり、ホストが安全なプロンプト送信時コンテキストチャネルを公開している場合に、セッション開始時およびその後のタスク変更時にルーティングされた Engram コンテキストを注入します。

## フックのインストール

```bash
engram link codex
engram link claude
engram link gemini
engram link cursor
engram link windsurf
engram link --global opencode
engram set-proof compact
```

ユーザーレベルの構成には `--global` を使用し、Engram が管理するフックエントリのみを削除するには `engram unlink` を使用します。

## 読み込みモード

`engram set-read startup|auto|always|manual|off` はランタイム動作を制御します。

- `auto` はセッション開始時に読み込み、ルーティングされた Engram コンテキストが変更されたときにのみ再注入します。
- `startup` はセッション開始時にのみ読み込みます。
- `always` は対象となるすべてのターンで再注入します。
- `manual` および `off` は自動化を削減します。

フックキャッシュは、ハッシュ、セッション ID、ホスト、cwd、およびルーティングされた署名を保存し、生のプロンプトテキストは保存しません。

## 検証モード

`engram set-proof off|compact` は、サポートされているフックが、対象となる各ターンでコンパクトな `Engram proof:` 行を追加するかどうかを制御します。検証の可視性は `set-read` とは別です。`compact` は、完全な Engram メモリが注入されるタイミングを変更することなく、ロード、再利用、またはスキップされたターンを報告できます。

## フック機能マトリクス

| ホスト | 設定パス | イベント |
| --- | --- | --- |
| `codex` | `.codex/hooks.json`; global `~/.codex/hooks.json` | `SessionStart`, `UserPromptSubmit` |
| `claude` | `.claude/settings.json`; global `~/.claude/settings.json` | `SessionStart`, `UserPromptSubmit` |
| `gemini` | `.gemini/settings.json`; global `~/.gemini/settings.json` | `SessionStart`, `BeforeAgent` |
| `cursor` | `.cursor/hooks.json`; グローバルプラグイン `hooks/hooks.json` | `sessionStart` |
| `windsurf` / `cascade` | `.windsurf/hooks.json`; global `~/.codeium/windsurf/hooks.json` | `pre_user_prompt` |
| `opencode` | `~/.config/opencode/plugins/engram.js` | `chat.message`, `experimental.chat.system.transform` |
| `copilot` | 書き込みなし | N/A |
| `cline` | 書き込みなし | N/A |

## 次のステップ

- [エージェント統合の概要](overview.md)
- [CLI: 注入 / リンク / アップグレード](../cli/inject-link-upgrade.md)
