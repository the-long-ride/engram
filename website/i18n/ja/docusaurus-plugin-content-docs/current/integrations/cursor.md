---
title: Cursor
sidebar_position: 5
description: ルール、MCP、ローカル プラグイン、スラッシュ コマンド、およびセッション開始フックによる Engram と Cursor の統合。
---

# Cursor

Cursor は `.cursor/rules/*.mdc` ファイルからプロジェクト ルールを読み取ります。Engram は有効なフロントマター（`alwaysApply: true`）とブートストラップ指示ブロックを含む `.cursor/rules/engram.mdc` を書き込みます。

## インストール {#install}

```bash
engram link cursor
```

## 書き込まれるファイル {#files-written}

| ファイル | 目的 |
| --- | --- |
| `.cursor/rules/engram.mdc` | `alwaysApply: true` のプロジェクト ルール |
| `.cursor/mcp.json` | MCP 登録（`type: "stdio"`） |
| `.cursor/rules/engram/<id>.mdc` | `applies_to` を持つワークスペース メモリごとに 1 つ生成されたルール（`alwaysApply: false`、カンマ区切りの glob）。作業層メモリは書き込まれません |
| `.cursor/hooks.json` | `sessionStart` フック |
| `.cursor/commands/engram.md` | `/engram` スラッシュ アダプター |

## グローバル インストール {#global-install}

```bash
engram link --global cursor
```

Engram はプラグイン マニフェスト、ルール、スキル、コマンド、MCP 設定、およびフックを含むローカル プラグインを `~/.cursor/plugins/local/engram/` に作成します。

## ランタイム優先ターゲット {#runtime-first-target}

Cursor はランタイム優先ターゲットです。プロジェクト ルールには、詳細なプロトコルを MCP ツールとフックに依存する短いブートストラップ指示が含まれています。付属のガイドには完全な書き込み/承認ワークフローが記載されており、Agent Skill ファイルはその短いポインターとなります。

## フックの動作 {#hook-behavior}

`sessionStart` フックは `additional_context` 出力フィールドを介して Engram の起動コンテキストを注入します。`beforeSubmitPrompt` は許可/ブロックのみを扱い、コンテキスト注入には使用されません。

## エクスポート形式 {#export-format}

`engram export --format cursor-rules` は `description` と `alwaysApply: false` フロントマターを含む `.cursor/rules/engram.mdc` を書き込みます。これは 1 つのリリース期間中に受け入れられるエイリアスとして維持され stderr に非推奨通知を出力する `cursorrules` を置き換えます。`live_sync.targets` は新しい名前を使用します。

## 次のステップ {#next-steps}

- [エージェント統合の概要](overview.md)
- [フックと証明行](hooks.md)
