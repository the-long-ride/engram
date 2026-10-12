---
title: エージェント統合の概要
sidebar_position: 1
description: Engramは、多くのAIホストにわたってスキルファイル、スラッシュアダプター、MCPツール、およびエージェントフックをサポートします。
---

# エージェント統合の概要 {#agent-integrations-overview}

Engramは2つの統合レイヤーをサポートしています：

- **スキルファイル** — プロジェクトのコンテキストを読み取るエージェント用に生成された指示。
- **スラッシュアダプター** — プロジェクトのスラッシュコマンドまたはAgent Skillsをサポートするエージェント用に生成された `/engram` コマンドプロンプト。
- **MCP形式のツール** — 外部ツールプロセスを登録できるエージェント用のJSON-linesラッパー。
- **エージェントフック** — セッション開始時およびその後のタスク切り替えターンでルーティングされたEngramコンテキストを注入するオプトインのホストフック。

## クイックスタート {#quick-start}

```bash
engram inject
engram link all
```

`engram link all` は公開ターゲットセットをインストールし、スキルセット指示ファイル、MCP設定、スラッシュアダプター、およびエージェントフックにわたる部分サポートホストの確定的な `SKIPPED` の理由を単一の統合インストールで報告します。

## ターゲットカテゴリ {#target-categories}

| カテゴリ | ターゲット | 動作 |
| --- | --- | --- |
| ランタイム優先 | `codex`, `claude`, `cursor`, `gemini` | 短いブートストラップ指示、完全なワークフローを含むコンパニオンガイド、短いAgent Skillポインター、およびMCP設定 |
| フック対応 | `codex`, `claude`, `gemini`, `opencode`, `cursor`, `windsurf`/`cascade` | ホスト固有のイベントスキーマを備えたエージェントフック |
| コンパクト/手動フォールバック | `agents-md`, `copilot`, `cline` | 完全なコンパクトプロトコル。v1では信頼性の高いランタイムコンテキスト注入はありません |

## サポートされているターゲット {#supported-targets}

| ターゲット | ファイル | 主な用途 |
| --- | --- | --- |
| `codex` | `AGENTS.md`, `.agents/skills/engram/SKILL.md` | OpenAI Codexプロジェクト指示およびAgent Skill |
| `agents-md` | `AGENTS.md` | リストにないAGENTS.md互換エージェント向けの汎用フォールバック |
| `copilot` | `.github/copilot-instructions.md`; グローバル: `~/.copilot/copilot-instructions.md` | GitHub Copilotリポジトリおよびユーザー指示 |
| `claude` | `AGENTS.md`, `.claude/engram.md`, `.agents/engram.md`、既存ファイルが存在する場合のみ追加される `CLAUDE.md` ブロック、および `.claude/rules/engram/<id>.md` パスルール | Claude Codeプロジェクトガイダンスおよびネイティブパスルール |
| `cursor` | `.cursor/rules/engram.mdc`, `.cursor/rules/engram/<id>.mdc` パスルール; グローバル: `~/.cursor/plugins/local/engram/` | Cursorプロジェクトルール、ネイティブパスルール、およびローカルプラグイン |
| `gemini` | `GEMINI.md`; グローバル: `~/.gemini/GEMINI.md`, `~/.gemini/skills/engram/SKILL.md` | AntigravityのGemini互換サーフェスを含むGemini CLIコンテキスト |
| `cline` | `.clinerules` | Clineスタイルのワークスペースルール |
| `windsurf` | `.windsurf/rules/engram.md`; グローバル: `~/.codeium/windsurf/memories/global_rules.md` | Windsurfワークスペースルールおよびグローバルルール/MCP |
| `opencode` | `AGENTS.md`, `.opencode/engram.md`, `.opencode/skills/engram/SKILL.md`, `opencode.json` | OpenCodeルール、Agent Skill、MCPツール、カスタムコマンド、プラグインフック |
| `mcp` | `.mcp.json`; グローバル: `~/.gemini/settings.json`, `~/.codex/config.toml`、および `claude mcp add` のヒント | MCP形式のJSON-linesラッパー登録 |
| `slash` | `.claude/commands/engram.md`, `.cursor/commands/engram.md`, `.gemini/commands/engram.toml`, `.opencode/commands/engram.md` | ネイティブ `/engram` スラッシュアダプター |

エイリアス: `codex` は `agents-md` アダプターと汎用Agent Skillファイルをインストールし、`open-code` は `opencode` にマップされ、`cascade` は `windsurf` にマップされます。以前の `antigravity` および `antigravity-cli` ターゲットは、現在は非表示の互換性エイリアスです。

## フック機能マトリックス {#hook-capability-matrix}

| ホスト | v1でのフックインストール | イベント |
| --- | --- | --- |
| `codex` | はい | `SessionStart`, `UserPromptSubmit`, `PreToolUse`, `PreCompact`, `SubagentStart` (オプトイン `SessionEnd`) |
| `claude` | はい | `SessionStart`, `UserPromptSubmit`, `InstructionsLoaded` (`hooks.path_rules hook` 使用時は `PreToolUse`), `PreCompact`, `SubagentStart` (オプトイン `SessionEnd`) |
| `gemini` | はい | `SessionStart`, `BeforeAgent`, `AfterTool`, `PreCompress` |
| `cursor` | はい | `sessionStart` |
| `windsurf` / `cascade` | はい | `pre_user_prompt` |
| `opencode` | ローカルプラグイン経由でサポート | `chat.message`, `experimental.chat.system.transform` |
| `copilot` | スキップ | 該当なし |
| `cline` | スキップ | 該当なし |

## 次のステップ {#next-steps}

- [Codex](codex.md)
- [Claude](claude.md)
- [Gemini](gemini.md)
- [Cursor](cursor.md)
- [Windsurf / Cascade](windsurf.md)
- [OpenCode](opencode.md)
- [Copilot](copilot.md)
- [Cline](cline.md)
- [スラッシュアダプター](slash.md)
- [MCPツール](mcp.md)
- [フックと証明行](hooks.md)
