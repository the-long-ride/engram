---
title: Claude
sidebar_position: 3
description: CLAUDE.md、スラッシュ コマンド、Agent Skills、MCP、およびフックによる Engram と Claude Code の統合。
---

# Claude

Claude Code はプロジェクトの指示として `CLAUDE.md` を読み取り（`CLAUDE.md` が存在しない場合のみプロジェクトの `AGENTS.md` を読み取ります）、`.mcp.json` を介した外部ツールの設定をサポートします。Engram のブートストラップは AGENTS.md 優先です。

## インストール {#install}

```bash
engram link claude
```

## 書き込まれるファイル {#files-written}

| ファイル | 目的 |
| --- | --- |
| `AGENTS.md` | プロジェクト指示のブートストラップ（Codex および OpenCode と共有される管理ブロック） |
| `CLAUDE.md` または `.claude/CLAUDE.md` | ブートストラップ ブロック（そのファイルが既に存在し、`@AGENTS.md` をインポートしていない場合のみ作成、新規作成はされません） |
| `.claude/engram.md`, `.agents/engram.md` | 完全な書き込み/承認ワークフローを含む付属ガイド |
| `.claude/rules/engram/<id>.md` | `applies_to` を持つワークスペース メモリごとに 1 つ生成されたパス ルール（`hooks.path_rules native`） |
| `.claude/commands/engram.md` | クラシックな `/engram` スラッシュ コマンド |
| `.claude/skills/engram/SKILL.md` | スラッシュ呼び出し用の Agent Skill |
| `.claude/settings.json` | `SessionStart`、`UserPromptSubmit`、`InstructionsLoaded`、`PreCompact`、および `SubagentStart` フック |
| `.mcp.json` | MCP 登録 |

Claude は `.claude/commands/engram.md` と `.claude/skills/engram/SKILL.md` の両方を受け取るため、以前のコマンド メニューと最新のスキル対応 Claude Code セッションの両方に `/engram` が表示されます。

## グローバル インストール {#global-install}

```bash
engram link --global claude
```

Engram はユーザー テキストを保持しながら管理ブロックを `~/.claude/CLAUDE.md` に追記し、Claude スキルを `~/.claude/skills/engram/SKILL.md` に書き込みます。Claude Code は `~/.claude/mcp.json` を読み取らないため、グローバル MCP はヒントとなります。実行用の `claude mcp add --scope user engram -- engram-mcp` が出力されます。

## ランタイム優先ターゲット {#runtime-first-target}

Claude はランタイム優先ターゲットです。`AGENTS.md` ブロック（およびファイルが存在する場合の `CLAUDE.md` ブロック）には、詳細なプロトコルを MCP ツールとフックに依存する短いブートストラップ指示が含まれています。付属のガイドには完全な書き込み/承認ワークフローが記載されており、Agent Skill ファイルはその短いポインターとなります。既存の `CLAUDE.md` ブロックは更新され、削除されることはありません。また、`engram link` は Claude から `AGENTS.md` を隠す `CLAUDE.local.md` や親ディレクトリの `CLAUDE.md` を報告します。生成されたスキルは Agent Skills 仕様に従い、`when_to_use` と `user-invocable: true` を追加します。`engram doctor` はこれを検証します（`host.skill_frontmatter`）。Claude はユーザー レベルの `AGENTS.md` を読み取らないため、グローバル インストールでも `~/.claude/CLAUDE.md` に書き込みます。

## フックの動作 {#hook-behavior}

Claude は起動時およびプロンプト時の追加コンテキスト注入をサポートします。`SessionStart` は起動時にルーティングされたメモリを読み込みます。`UserPromptSubmit` はセッションでまだ配信されていないメモリ本文のみを注入します。`PreCompact` は配信済みセットをリセットします。`SubagentStart`（matcher `*`）は独自の配信済みセットの下で各サブエージェントにルーティングされたコンテキストを注入し、フック出力は 9,500 文字未満に保たれます。`applies_to` glob を持つメモリはネイティブ パス ルールとして Claude に届きます。`engram link claude` は `.claude/rules/engram/<id>.md` を書き込み（パス専用のフロントマターと `<!-- engram:<scope>:<file> sha:<8> -->` マーカー）、`InstructionsLoaded` フック（matcher `path_glob_match`）は配信済みセットと `usage.json` に各読み込みを記録します。作業層メモリは書き込まれず、グローバル メモリは `engram link --global claude` で `~/.claude/rules/engram/` に配置され、マーカーのないファイルはそのまま残されます。中括弧の glob には Claude Code v2.1.217 以降が必要です。以前の `PreToolUse` 注入を維持するには、`engram config set hooks.path_rules hook` と `engram link claude` を実行します（これにより生成されたルール ファイルも削除されます）。

## MCP 承認 {#mcp-approval}

`engram_commit` は `_meta["anthropic/requiresUserInteraction"]: true` を持つため、バイパス モードであっても Claude Code は各呼び出しの前に確認を求めます。この状態を維持してください。`approval_token` は提案が存在することのみを証明します。[MCP ツール](mcp.md) を参照してください。

## 次のステップ {#next-steps}

- [エージェント統合の概要](overview.md)
- [スラッシュ アダプター](slash.md)
- [MCP ツール](mcp.md)
