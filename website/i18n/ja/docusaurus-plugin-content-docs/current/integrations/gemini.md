---
title: Gemini
sidebar_position: 4
description: Gemini CLI および Antigravity の Gemini 互換インターフェースによる Engram の統合。
---

# Gemini

Gemini CLI はコンテキストとして `GEMINI.md` ファイルを検索します。`slash` ターゲットは `.gemini/commands/engram.toml` を書き込み、`/engram <args>` を Gemini CLI のプロジェクト カスタム コマンドにします。

現在の Google ドキュメントは Antigravity のコンテキストとスキルを Gemini 互換の場所に結び付けているため、Engram は `gemini` を Antigravity 2.0、Antigravity CLI、および Antigravity IDE の公開ターゲットとしても扱います。非表示のターゲット名 `antigravity` および `antigravity-cli` は明示的な互換性パスのままですが、`engram link list`、ヘルプ、補完、または `all` には表示されません。

## インストール {#install}

```bash
engram link gemini
```

## 書き込まれるファイル {#files-written}

| ファイル | 目的 |
| --- | --- |
| `GEMINI.md` | プロジェクト コンテキストのブートストラップ |
| `.gemini/commands/engram.toml` | `/engram` スラッシュ アダプター |
| `.gemini/settings.json` | `SessionStart`、`BeforeAgent`、`AfterTool`、および `PreCompress` フック |
| `.gemini/settings.json` | MCP 登録（`mcpServers.engram`、フックの隣にマージ） |

## グローバル インストール {#global-install}

```bash
engram link --global gemini
```

`~/.gemini/GEMINI.md`、`~/.gemini/skills/engram/SKILL.md` を書き込み、`~/.gemini/settings.json` に `mcpServers.engram` をマージします。

## ランタイム優先ターゲット {#runtime-first-target}

Gemini はランタイム優先ターゲットです。`GEMINI.md` には、詳細なプロトコルを MCP ツールとフックに依存する短いブートストラップ指示が含まれています。付属のガイドには完全な書き込み/承認ワークフローが記載されており、Agent Skill ファイルはその短いポインターとなります。

## フックの動作 {#hook-behavior}

Gemini は `SessionStart` および `BeforeAgent` イベントを通じて、起動時およびプロンプト時の `hookSpecificOutput.additionalContext` 注入をサポートします。`PreCompress`（CLI が履歴を要約する前）は配信済みセットをリセットします。`AfterTool`（matcher `read_file|write_file|replace`、ミリ秒単位のタイムアウト）は、ツールが触れたファイルに `applies_to` glob が一致する未配信メモリを最大 3 件注入します。コンテキストはツール結果に追加されるため、読み取りの 1 ステップ後に届きます。`BeforeAgent` と配信済みセットを共有し、決定を返すことはありません。`engram link gemini` または `engram upgrade --latest` は既存のインストールにイベントを追加します。

`.gemini/settings.json` の `mcpServers.engram` が `trust: true` を設定している場合、Gemini は `engram_commit` の確認をスキップします。`engram doctor` はこれについて警告します（`host.gemini_trust`）。

## Antigravity 互換性 {#antigravity-compatibility}

フックについては、`gemini` は Antigravity のパブリック フォールバックでもあります。Google が安定した主要な Antigravity フック/設定ドキュメントを公開するまで、非表示の `antigravity` および `antigravity-cli` フック ターゲットは Gemini のフック動作とパスに正規化されます。

## 次のステップ {#next-steps}

- [エージェント統合の概要](overview.md)
- [フックと証明行](hooks.md)
