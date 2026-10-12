---
title: FAQ
sidebar_position: 4
description: Engram についてのよくある質問です。
---

# FAQ

## Engram はベクトルデータベースですか?

いいえ。既定の Engram の検索は、決定的な字句検索です。`engram search --semantic` は決定的なローカルの類似度を加えるもので、埋め込みベースの意味検索ではありません。グラフのベクトルはローカルのハッシュ化された単語ベクトルで、意味的な埋め込みではありません。任意のローカル sqlite-vec は実験的な高速化レイヤー(既定ではオフ。`vector.enabled: true` で有効化)であり、信頼できる情報源ではありません。

## Engram は自動でメモリを書き込みますか?

いいえ。エージェントが候補を提案し、人間が承認します。直接のターミナル CLI は A/B/C を使います。AI エージェントのチャットは `yes`/`audit`/`cancel` を使います。すべての候補を保存するのは、明示的な強制の依頼(`ss -f`)だけで、人間が依頼しない限り、エージェントは `--force` を付けてはいけません。

## メモリはどこにありますか?

- ワークスペースメモリ: `<project>/.agents/.engram/`
- グローバルメモリ: 設定した場所(設定するまでは既定で空)

ワークスペースメモリが優先されます。グローバルメモリは、再利用できる好みやチーム共通の文脈のためのフォールバックです。

## どのエージェントに対応していますか?

Codex、Claude、Gemini(および Antigravity の Gemini 互換サーフェス)、Cursor、Windsurf/Cascade、OpenCode、Copilot、Cline、AGENTS.md 互換の汎用ホスト、MCP 対応ホスト、スラッシュコマンド対応ホストです。[エージェント連携の概要](../integrations/overview.md) を参照してください。

## 暗号化は実装されていますか?

暗号化の設定は存在しますが、暗号化ストレージはまだ実装されていません。現在の制限は明確に文書化してください。

## Git なしで Engram を使えますか?

はい。Git は任意ですが、監査履歴、ポータビリティ、チームレビューのために推奨します。

## 誤ったメモリをアーカイブするには?

```bash
engram archive --reason "<why>" <id-or-file>
```

ファイルは承認後にだけアクティブなルーティングから外れ、`archive/` 配下に保存されたまま残ります。監査可能性のために、削除ではなくアーカイブを使ってください。

## グローバルメモリを移動するには?

```bash
engram update-global-folder <new-path>
engram ugf <new-path>
engram move global folder from <old-path> to <new-path>
```

古いグローバルルート全体も新しい場所へ移動したい場合は、`--move-from-path <old-path>` を追加します。


## schema v3 へのレガシーメモリ移行

`engram upgrade --latest` は、ワークスペースと設定済みのグローバルルートにあるアクティブな v1/v2 メモリファイルも、schema v3 に移行します。Engram は各 Markdown 本文をそのまま保持し、`backups/schema-v3/<memory-file>.pre-v3.bak` を書き出し(Git 管理外のフォルダーです。メモリの隣に残っている古いバックアップは `engram repair --move-backups` で移動できます)、決定的なメタデータだけを補い、整合性ハッシュを更新し、インデックス、グラフ、対象となるベクトルサイドカーを再構築します。`evidence_refs` を勝手に作ることはなく、検証済みのトレースへのリンクがないメモリには `evidence_status: unverified` が付きます。無効なメモリは報告されてスキップされ、アーカイブ済みのメモリは書き換えられず、2 回目の実行は冪等です。

書き込まずにすべての変更をプレビューします。

```bash
engram upgrade --latest --plan
```

リンク済みのエージェント成果物を上書きせずに、メモリ移行だけを実行します。

```bash
engram upgrade --migrate-memories
```

最新へのアップグレード中にメモリ移行をスキップします。

```bash
engram upgrade --latest --no-migrate-memories
```

## 次のステップ

- [トラブルシューティング](troubleshooting.md)
- [比較とロードマップ](../comparison/overview.md)


<!-- configuration-upgrade-inventory -->
## 設定アップグレードのインベントリ

パッケージ更新後は、`engram upgrade --latest` の前に `engram upgrade --latest --plan` を実行してください。共有インベントリは、ワークスペースとグローバルの Engram 管理下にあるメモリ、指示、スキルセット、設定、フック、プラグインをスキャンします。ユーザーが書いたバイト列は保持され、判別できない混在ファイルはコンフリクトとして報告されます。[設定アップグレード](configuration-upgrades.md) を参照してください。
