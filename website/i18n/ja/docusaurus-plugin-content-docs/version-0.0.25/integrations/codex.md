---
title: Codex
sidebar_position: 2
description: AGENTS.md および Agent Skills を介した OpenAI Codex と Engram の統合。
---

# Codex

OpenAI Codex およびその他の AGENTS.md 互換エージェントは、プロジェクト指示ファイルとして `AGENTS.md` を使用します。また、`codex` エイリアスは `.agents/skills/engram/SKILL.md` も書き込むため、Agent Skills を検出したエージェントは Engram を呼び出し可能なスキルとしてルーティングできます。

## インストール

```bash
engram link codex
```

## 書き込まれるファイル

| ファイル | 用途 |
| --- | --- |
| `AGENTS.md` | プロジェクト指示のブートストラップ |
| `.agents/skills/engram/SKILL.md` | 完全な書き込み/承認ワークフローを備えた Agent Skill |
| `.codex/hooks.json` | `SessionStart` および `UserPromptSubmit` フック |
| `.mcp.json` | MCP 登録 |

## グローバルインストール

```bash
engram link --global codex
```

Codex スキルを `~/.codex/skills/engram/SKILL.md` に書き込み、共有の Codex 指示ファイルに管理ブロックを追加します。

## フックの動作

Codex は、起動時およびプロンプト送信時の追加コンテキスト注入をサポートしています。`SessionStart` は起動時にルーティングされたメモリをロードし、`UserPromptSubmit` はルーティングされた Engram コンテキストが変更されたときにのみ再注入します。

## ランタイム優先ターゲット

Codex はランタイム優先のターゲットです。`AGENTS.md` には、詳細なプロトコルについて MCP ツールとフックに依存する短いブートストラップ指示が含まれています。実際の書き込み/承認ワークフローは Agent Skill ファイルが担います。

## 次のステップ

- [エージェント統合の概要](overview.md)
- [フックと検証行](hooks.md)
