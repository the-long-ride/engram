# Engram

Engram は AI agent のための、人間が所有するメモリプロトコルです。プロジェクト、チーム、個人設定の長く残すべき知識を、読めて、レビューできて、同期できて、修復できるファイルとして保存します。

Engram は agent の隠れた脳ではありません。agent は memory を提案できますが、source of truth は `.agents/.engram/` または任意の global memory フォルダにある承認済み Markdown です。

## 解決する問題

AI agent はプロジェクトの決定を忘れ、セットアップを何度も聞き、古い文脈と新しい指示を混ぜます。内蔵メモリは多くの場合、特定のベンダー、アプリ、マシンに閉じています。

Engram の契約:

- 承認済み facts, rules, workflows は Markdown に保存
- index と graph は高速化レイヤー
- 書き込みは人間の承認が必要
- hash が整合性を確認
- ignore rules が privacy を制御
- Git が履歴、portability、team review を提供

## Mental Model

| Layer | 役割 |
| --- | --- |
| Markdown | durable source of truth |
| JSON index | fast lookup |
| JSON graph | topic/relationship routing |
| Approval gate | trust boundary |
| Hashes | integrity checks |
| Ignore rules | privacy controls |
| Git | audit history and sync |
| Agent adapters | convenience, not authority |

## Scope 優先順位

1. Workspace memory: `<project>/.agents/.engram/`
2. Global memory: `$ENGRAM_GLOBAL_DIR` または `engram init --global-path <path>`

Workspace が優先です。Global は複数 repo で再利用する好みやチーム文脈の fallback です。

## 現在の機能

- `save`: 1つの承認済み memory
- `save-session` / `ss`: session から複数 memory
- `observe`: active memory ではない raw note
- `take-control`: 既存 guidance/docs の取り込み
- `graph`, `quality-check`: review signals
- `archive`: 誤った/古い memory を routing から外す
- `repair`: rebuild で skip された invalid memory の報告
- `benchmark`: retrieval regression check
- agent skillsets, slash adapters, MCP-style proposal tools

コマンドを使う前に concept page を読んでください: [Engram を理解する](understanding.md)。

次: [AI agent quickstart](quickstart.md)。
