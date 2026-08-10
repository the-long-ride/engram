---
title: Gemini
sidebar_position: 4
description: Gemini CLI および Antigravity の Gemini 互換サーフェスを介した Engram の統合。
---

# Gemini

Gemini CLI はコンテキストとして `GEMINI.md` ファイルを検索します。`slash` ターゲットは `.gemini/commands/engram.toml` を書き込むため、`/engram <args>` は Gemini CLI のプロジェクトカスタムコマンドになります。

Engram は、現在の Google ドキュメントが依然として Antigravity のコンテキストとスキルを Gemini 互換の場所に結び付けているため、`gemini` を Antigravity 2.0、Antigravity CLI、および Antigravity IDE の公式ターゲットとして扱います。非表示の `antigravity` および `antigravity-cli` ターゲット名は明示的な互換パスのままですが、`engram link list`、ヘルプ、補完、または `all` には表示されません。

## インストール

```bash
engram link gemini
```

## 書き込まれるファイル

| ファイル | 用途 |
| --- | --- |
| `GEMINI.md` | プロジェクトコンテキストのブートストラップ |
| `.gemini/commands/engram.toml` | `/engram` スラッシュアダプター |
| `.gemini/settings.json` | `SessionStart` および `BeforeAgent` フック |
| Gemini MCP config | MCP 登録 |

## グローバルインストール

```bash
engram link --global gemini
```

`~/.gemini/GEMINI.md`、`~/.gemini/skills/engram/SKILL.md`、および Gemini MCP 構成ファイルを書き込みます。

## ランタイム優先ターゲット

Gemini はランタイム優先のターゲットです。`GEMINI.md` には、詳細なプロトコルについて MCP ツールとフックに依存する短いブートストラップ指示が含まれています。実際の書き込み/承認ワークフローは Agent Skill ファイルが担います。

## フックの動作

Gemini は、`SessionStart` および `BeforeAgent` イベントを介して、起動時およびプロンプト送信時の `hookSpecificOutput.additionalContext` 注入をサポートしています。

## Antigravity の互換性

フックに関しては、`gemini` は公開の Antigravity フォールバックでもあります。Google が安定したプライマリの Antigravity フック/構成ドキュメントを公開するまで、非表示の `antigravity` および `antigravity-cli` フックターゲットは Gemini のフック動作とパスに正規化されます。

## 次のステップ

- [エージェント統合の概要](overview.md)
- [フックと検証行](hooks.md)
