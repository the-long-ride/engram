---
title: インストールと構成
sidebar_position: 3
description: Engram CLI のインストール、ワークスペースの初期化、グローバルメモリの構成、および AI エージェントのリンク。
---

# インストールと構成

## 要件

- Node.js `>=20`
- サポートされている AI エージェント (Codex、Claude、Gemini、Cursor、Windsurf、OpenCode、Copilot、Cline、または任意の AGENTS.md 互換ホスト)

## CLI のインストール

```bash
npm install -g @the-long-ride/engram
```

検証：

```bash
engram --version
```

2 つのバイナリがインストールされます：

- `engram` — メイン CLI
- `engram-mcp` — 外部ツールプロセスを登録するホスト用の MCP サーバーバイナリ

## ワークスペース (workspace) の初期化

プロジェクトのルートから：

```bash
engram inject
```

これにより `.agents/.engram/` が作成され、デフォルトでコンパクトな Codex ターゲットがインストールされます：`AGENTS.md` プラス `.agents/skills/engram/SKILL.md`。

エージェントファイルをスキップするには `engram inject --no-skillset` を使用し、インジェクション中にサポートされているすべての アダプターをインストールするには `engram inject --skillset all` を使用します。人間が作成した既存のファイルはスキップされます。

## Entry Web UI による構成

最も簡単なセットアップパス：

```bash
engram entry
```

これにより、ローカル専用のコントロールパネルが起動します。手動で JSON を編集することなく、メモリルートを構成し、エージェントをリンクし、ルーティングを調整できます。各タブとフィールドについては、[Entry Web UI](entry/index.md) を参照してください。

## グローバルメモリの構成

グローバルメモリはオプションであり、構成した場所に配置されます。リポジトリ間で引き継ぐべき設定やチームのコンテキストを保持します。

```bash
engram inject --global-only --global-path ~/Documents/engram
```

または、後でグローバルフォルダを更新する：

```bash
engram update-global-folder ~/Documents/engram
engram ugf ~/Documents/engram
```

`engram set global memory path to <new-path>` や `engram move global folder from <old-path> to <new-path>` などのチャット形式は、同じコマンドに正規化されます。古いグローバルルート全体を新しい場所に移動させたい場合は、`--move-from-path <old-path>` を追加します。

## AI エージェントのリンク

ホストのエージェント hook と MCP 登録をインストールします：

```bash
engram link codex
engram link claude
engram link gemini
engram link cursor
engram link windsurf
engram link --global opencode
engram set-proof compact
```

`engram link all` は、パブリックターゲットセットをインストールし、スキルセット指示ファイル、MCP 構成、スラッシュアダプター、およびエージェント hook において、部分的なホストに対する決定論的な `SKIPPED` 理由を 1 つの統合インストールで報告します。`engram unlink` はこれらをすべてまとめて削除します。

完全なターゲットマトリックスについては、[エージェントの統合](integrations/overview.md)を参照してください。

## サブモジュールワークフロー (Submodule)

人間が `.agents/.engram` を別のリポジトリとして追跡したい場合：

```bash
engram inject --submodule
```

人間が URL を提供した後にのみ、`--submodule-remote <git-url>` を追加します。Engram は URL を検証し、`main` でサブモジュールを初期化し、最初のサブモジュールコミットを `Initialize engram` として作成します。

## 共有グローバル Git オリジン

`engram entry` に `global_git_detected.remote_url` が表示されない場合は、グローバルメモリを Git を介して共有すべきかどうかを人間に確認してください。URL が提供された場合：

```bash
engram inject --global-remote <git-url>
```

## インストールの検証

```bash
engram verify
engram load --dry-run "setup"
engram llm
```

`engram llm` は、パッケージ化された AI エージェントの使用ガイドを印刷します。インジェクトされたワークスペースは必要ありません。

## 次のステップ

- [日常のワークフロー](daily-workflow.md)
- [Entry Web UI](entry/index.md)
- [エージェントの統合](integrations/overview.md)
