---
title: Profiles タブ (プロファイル)
sidebar_position: 5
description: Entry Web UI から分離されたグローバルメモリプロファイルを管理します。
---

import RiskCallout from '@site/src/components/RiskCallout';

# Profiles タブ

Profiles タブは、隔離管理されるグローバルメモリプロファイルを制御します。プロファイルを隔離することで、クライアント、企業、個人のメモリがそれぞれの境界を越えて混ざり合う事故を防ぎます。

## プロファイル名 (Profile name)

`personal`, `client-a`, `team-platform` などの名前付きメモリコンテキスト。英数字、`.`, `_`, `-` を使用できます。空白文字や機密性の高い識別子名は避けてください。`^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$` ルールに従う必要があります。

## グローバル物理パス (Global path)

該当するプロファイルが保存されるファイルシステム上のフォルダ。一時フォルダではない永続的な絶対パスを指定し、書き込み権限を確認してください。

## プロファイル有効化 (Activate)

指定したプロファイルをユーザーレベルのデフォルト解決に適用します。個人メモリから仕事/クライアントメモリへの切り替えは、今後のロードおよび保存に影響します。

<RiskCallout level="caution">
プロファイルを有効化すると、今後ロード・保存に使用されるグローバルメモリのパスが切り替わります。有効化する前に変更するプロファイル名を確認してください。
</RiskCallout>

## 削除 (Delete)

プロファイルの登録属性を解除します。プロファイルのメタデータは削除されますが、コードの動作が変更されない限り、メモリファイルはディスク上に残る場合があります。削除を行う前にフォルダを直接確認してください。

## CLI 等価コマンド

```bash
engram profile create personal --global-path ~/Documents/engram-personal --use
engram profile use company --workspace
engram profile merge personal company --dry-run
```

## 次のステップ

- [プロファイルとスコープの解決](../concepts/profiles.md)
- [Workspaces タブ](workspaces.md)
