---
title: スラッシュアダプター
sidebar_position: 10
description: Engram スラッシュアダプターは、Claude、Cursor、Gemini、および OpenCode にわたって /engram コマンドを公開します。
---

# スラッシュアダプター

`slash` ターゲットは、プロジェクトのスラッシュコマンドまたは Agent Skills をサポートするホスト用のネイティブ `/engram` スラッシュアダプターを書き込みます。

## 書き込まれるファイル

| ファイル | ホスト |
| --- | --- |
| `.claude/commands/engram.md` | Claude Code |
| `.claude/skills/engram/SKILL.md` | Claude Code (スキル形式) |
| `.cursor/commands/engram.md` | Cursor |
| `.gemini/commands/engram.toml` | Gemini CLI |
| `.opencode/commands/engram.md` | OpenCode |

## 共通コマンド

```text
/engram
/engram propose
/engram load deployment workflow
/engram entry
/engram save knowledge
/engram save-session
/engram save-session --query-level 3
/engram ss
/engram ss -f
/engram ss -f last 50 sessions
/engram take-control
/engram take control accept all
/engram restructure workspace memory accept all
/engram resolve conflicts and metacognize
/engram graph release workflow
/engram archive --reason "Superseded" knowledge/old-fact.md
/engram set-rule-variant strict
/engram verify
```

## 動作

ホストが視覚的な `/engram` コマンドを1つだけ公開している場合、引数なしの `/engram` は CLI を実行する代わりに、`load`、`search`、`save`、`propose`、`entry`、および `help` のコンパクトなメニューを返す必要があります。`/engram propose` はスラッシュレベルのエイリアスです。現在のチャット/セッションにおいて `engram save-session` に正規化されます。

`/engram ss -f` は全承認のショートカットです。エージェントは、人間が明示的に要求しない限り `--force` を追加してはなりません。

## 自然文の正規化

| 自然な表記 | 正規化先 |
| --- | --- |
| `/engram auto save` | `engram save-session` |
| `/engram take control accept all` | `engram take-control --force` |
| `/engram restructure workspace memory accept all` | `engram metacognize --workspace --force` |
| `/engram take control accept all metacognize` | `engram take-control --force --metacognize` |
| `/engram resolve conflicts and metacognize` | `engram resolve-conflicts --metacognize` |
| `/engram ss -f last 50 sessions` | `engram save-session --query-level 50 --force` |

## 次のステップ

- [MCP ツール](mcp.md)
- [フックと検証行](hooks.md)

