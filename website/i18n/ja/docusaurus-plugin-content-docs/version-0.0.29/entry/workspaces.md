---
title: Workspaces タブ (ワークスペース)
sidebar_position: 6
description: Entry Web UI からプロジェクトリポジトリを登録し、リンク状態を管理します。
---

import RiskCallout from '@site/src/components/RiskCallout';

# Workspaces タブ

Workspaces タブは、プロジェクトの保存先パスを登録し、そのリンク状態（フック連動）を制御します。

## ワークスペース名 (Workspace name)

リポジトリ/プロジェクトの論理的な識別用表示名。簡潔で分かりやすい名前にしてください。

## ワークスペース物理パス (Workspace path)

ソースリポジトリ/プロジェクトのある実際のファイルシステムパス。存在しないディレクトリや、書き込みのできないシステムフォルダは避けてください。

## リンク / リンク解除 (Link / Unlink)

生成されるエージェント用の指示ファイルや自動フックなどを、該当のワークスペースに連動させるかどうかを制御します。アクティブなリポジトリはリンクさせ、テスト用やアーカイブ済みのものはリンク解除してください。

<RiskCallout level="caution">
リンク解除を行うと、エージェントは Engram からの指示を受信できなくなります。作業中のプロジェクトのリンク解除時には注意してください。
</RiskCallout>

## 登録の削除 (Delete)

登録情報からワークスペースのメタデータを削除します。登録属性の解除のみを行うか、メモリファイル自体も消去されるかは、仕様を確認して十分に判断してください。通常は履歴保護のため、削除ではなくリンク解除を推奨します。

## CLI 等価コマンド

```bash
engram inject
engram link codex
engram unlink
```

## 次의ステップ

- [Profiles タブ](profiles.md)
- [Connections タブ](connections.md)
