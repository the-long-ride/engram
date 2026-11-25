---
title: Codex
sidebar_position: 2
description: AGENTS.md および Agent Skills による Engram と OpenAI Codex の統合。
---

# Codex

OpenAI Codex およびその他の AGENTS.md 互換エージェントは、プロジェクト指示ファイルとして `AGENTS.md` を使用します。`codex` エイリアスは `.agents/skills/engram/SKILL.md` も書き込むため、Agent Skills を検出するエージェントは Engram を呼び出し可能なスキルとしてルーティングできます。

## インストール {#install}

```bash
engram link codex
```

## 書き込まれるファイル {#files-written}

| ファイル | 目的 |
| --- | --- |
| `AGENTS.md` | プロジェクト指示のブートストラップ |
| `.agents/skills/engram/SKILL.md` | ガイドを指す短い Agent Skill ポインター |
| `.agents/engram.md` | 完全な書き込み/承認ワークフローを含む付属ガイド |
| `.codex/hooks.json` | `SessionStart`、`UserPromptSubmit`、`PreToolUse`、`PreCompact`、および `SubagentStart` フック |
| `.mcp.json` | MCP 登録 |

## グローバル インストール {#global-install}

```bash
engram link --global codex
```

Codex スキルを `~/.codex/skills/engram/SKILL.md` に書き込み、共有 Codex 指示ファイルに管理ブロックを追記します。グローバル MCP は `~/.codex/config.toml` 内の管理された `[mcp_servers.engram]` ブロックです。また、Codex が各コミットの前に確認するように `[mcp_servers.engram.tools.engram_commit]` に `approval_mode = "approve"` を設定します（`engram upgrade` または `engram link codex` で古いブロックを更新）。`engram doctor` は Codex の 32 KiB の制限に対して AGENTS.md チェーンのサイズを報告します（`host.agents_md_chain`）。

## フックの動作 {#hook-behavior}

Codex は起動時およびプロンプト時の追加コンテキスト注入をサポートします。`SessionStart` は起動時にルーティングされたメモリを読み込みます。`UserPromptSubmit` はセッションでまだ配信されていないメモリ本文のみを注入します。`PreToolUse` は `apply_patch` を介して編集されたファイルと `applies_to` glob が一致するメモリを注入し（読み取り時には起動しません）、`PreCompact` は配信済みセットをリセットします。`SubagentStart`（matcher `*`）はルーティングされたコンテキストを各サブエージェントに注入します。サブエージェントの配信済みセットは `<session_id>#agent:<agent_id>` でキー指定されるため、親のセットに影響を与えることはありません。Codex はフック メッセージを約 2,500 トークンに制限するため、Engram は `additionalContext` を 2,400 トークン以下に保ち、本文を切り詰めるのではなくカードに降格します。

## ランタイム優先ターゲット {#runtime-first-target}

Codex はランタイム優先ターゲットです。`AGENTS.md` には、詳細なプロトコルを MCP ツールとフックに依存する短いブートストラップ指示が含まれています。付属のガイドには完全な書き込み/承認ワークフローが記載されており、Agent Skill ファイルはその短いポインターとなります。

## 次のステップ {#next-steps}

- [エージェント統合の概要](overview.md)
- [フックと証明行](hooks.md)
