---
title: 変更履歴
sidebar_position: 5
description: Engram のリリース履歴。
---

# 変更履歴 (Changelog)

Engram のリリース履歴は、リポジトリの [`CHANGELOG.md`](https://github.com/the-long-ride/engram/blob/main/CHANGELOG.md) にあります。

現在のパッケージバージョンについては、[`package.json`](https://github.com/the-long-ride/engram/blob/main/package.json) を参照してください。

## 現在のバージョン

現在リリースされている Engram のバージョンは `0.1.0` です。

## 0.1.0 の主な変更点

- **検索とトークン化**: 3 ストリーム BM25F（`title`、`tags`、`body`）、完全一致アンカーがない場合に機能する 24 個の概念クラスターとコーパス共起ブリッジ、Unicode / ベトナム語 / CJK のトークン化に対応しました。
- **鮮度・並び順・起動時圧縮**: `knowledgeFreshnessBoost` による新しさ・working 層のスコアリング、`orderForAgentConsumption` によるアテンション配慮のトポロジカル整列、`read: auto` モードでの `hookStartupAuto` 起動カード圧縮を導入しました。
- **クローズドループ利用テレメトリ**: ローカルの gitignore 対象 `usage.json` で結果（`applied`、`corrected`、有用性ゼロの反復注入に対するノイズ減衰）を記録し、`engram stats --backfill` を追加しました。
- **Option A セッション学習と作業ノート**: 決定論的なプロンプト時・トランスクリプト学習により、期限付きの gitignore 対象 `working/` メモリとステージングされた `inbox/r-*.json` レシート（`engram review inbox|triage|apply|dismiss`）を出力し、`engram working note` / `engram_note` MCP ツール、オプトインの `SessionEnd` トランスクリプトキュー（`engram link claude|codex --session-end`）を追加しました。
- **CLI の使いやすさ**: `engram status`（`engram stat`）、`engram why <id> ["<query>"]`、`engram help --compact`、`engram graph link <parent-id> <child-id...>`、`engram review triage`、`engram benchmark --from-git` を追加しました。
- **Entry Web UX とセキュリティ**: Entry Web UI のワークフローを強化し、脆弱性ゼロの依存関係に更新しました。

## アップグレード

```bash
npm install -g @the-long-ride/engram@latest
engram upgrade
```

詳細は [リリースおよびアップグレードプロセス](release-upgrade.md) を参照してください。
