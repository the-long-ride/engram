---
title: Connections タブ
sidebar_position: 3
description: Entry Web UI からサポートされている AI エージェントを検出してリンクします。
---

import RiskCallout from '@site/src/components/RiskCallout';

# Connections タブ

Connections タブは、サポートされている AI エージェントのインターフェースをスキャンし、ワークスペースまたはグローバルレベルで Engram をそれぞれにリンクできるようにします。

## エージェントスキャン (Agent scan)

このタブには、サポートされているエージェントごとにカードが表示されます。各カードは、検出（detected）または未検出（missing）のステータスを報告します。

- **Detected** — Engram がサポートされているローカルエージェントのインターフェース（設定パスまたはアプリが存在）を検出しました。
- **Missing** — Engram がエージェントのインターフェースを見つけられませんでした。未検出は必ずしも非サポートを意味するわけではなく、アプリまたは設定パスがまだ存在していないことを意味する場合があります。

<RiskCallout level="caution">
未検出は必ずしも非サポートを意味するわけではありません。このマシンにアプリや設定パスがまだ存在しないことを意味する場合があります。
</RiskCallout>

## ワークスペースリンクの切り替え (Workspace link toggle)

該当するエージェントについて、現在のリポジトリ/ワークスペースに Engram をリンクします。プロジェクトごとのルール、リポジトリ固有のメモリ、チーム共有の指示など、メモリをリポジトリに追従させたい場合に使用します。

## グローバルリンクの切り替え (Global link toggle)

該当するエージェントについて、グローバルに Engram をリンクします。個人用のメモリ、クロスプロジェクトのワークフロー、再利用可能なスタイルやルールに使用します。

<RiskCallout level="risky">
共有マシンではグローバルリンクを慎重に使用してください。Engram は共有指示ファイルに管理ブロックを書き込みます。グローバルにリンクする前に、エージェントごとに Engram が書き込むファイルを確認してください。
</RiskCallout>

## エージェントごとに Engram が書き込むファイル

| 対象 | ファイル |
| --- | --- |
| `codex` | `AGENTS.md`, `.agents/skills/engram/SKILL.md` |
| `agents-md` | `AGENTS.md` |
| `copilot` | `.github/copilot-instructions.md`; グローバル: `~/.copilot/copilot-instructions.md` |
| `claude` | `CLAUDE.md` |
| `cursor` | `.cursor/rules/engram.mdc`; グローバル: `~/.cursor/plugins/local/engram/` |
| `gemini` | `GEMINI.md`; グローバル: `~/.gemini/GEMINI.md`, `~/.gemini/skills/engram/SKILL.md` |
| `cline` | `.clinerules` |
| `windsurf` | `.windsurf/rules/engram.md`; グローバル: `~/.codeium/windsurf/memories/global_rules.md` |
| `opencode` | `AGENTS.md`, `.opencode/engram.md`, `.opencode/skills/engram/SKILL.md`, `opencode.json` |
| `mcp` | `.mcp.json`; グローバル: ホストの MCP 設定ファイル |
| `slash` | `.claude/commands/engram.md`, `.cursor/commands/engram.md`, `.gemini/commands/engram.toml`, `.opencode/commands/engram.md` |

## リンクを解除するタイミング

- リポジトリまたはテストワークスペースのアーカイブ時
- エージェントを Engram から移行するとき
- 新規の `engram upgrade --latest` を実行する前に、古い管理ブロックをクリーンアップするとき

`engram unlink` は、Engram が管理するフックエントリとアダプターファイルのみを削除します。`--force` が明示されない限り、人間が作成したファイルは保護されます。

## CLI 等価コマンド

```bash
engram link codex
engram link claude
engram link --global opencode
engram unlink
```

## 次のステップ

- [Construct タブ](construct.md)
- [エージェント統合の概要](../integrations/overview.md)
