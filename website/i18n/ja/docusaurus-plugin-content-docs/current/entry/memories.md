---
title: Memories tab
sidebar_position: 6
description: Inspect the memory graph, preview memories, edit, and archive.
---

import RiskCallout from '@site/src/components/RiskCallout';

# Memories tab

The Memories tab inspects active memory, explores its graph, and performs maintenance actions.

## Search

Use the search field to match text anywhere in each Markdown memory file. The search is case-insensitive and works together with the scope and type filters.

The search mode menu has two options:

- **Text matches only** shows memories whose file content or metadata directly matches the query.
- **Text matches + related memories** also shows connected dependency, duplicate, and semantic memories.

Clear the field to restore the full graph for the selected filters.

## ルートシミュレーター

**Simulate route** バーを使用して、エージェントがクエリを見る前に Engram がどのようにルーティングするかをテストできます。クエリを送信すると `/api/recall?simulate=true` が呼び出され、次の内訳が表示されます。

- **Packed bodies** — ルーティングされたペイロードに全文が含まれるメモリ
- **Cards** — 全文とともに含まれるコンパクトなメモリカード
- **Omitted candidates** — ランキングまたは予算制限により除外された一致メモリ
- **Token budget** — シミュレーションされたリコール応答全体のトークン予算使用量

## Scope chips {#scope-chips}

Filter the graph by memory source. Compare workspace vs global memory. Start with the current workspace only when the graph feels noisy.

## Type chips {#type-chips}

Filter the graph by memory type. Inspect rules, skills, or knowledge separately.

## Semantic links toggle {#semantic-links-toggle}

Shows semantic graph edges. Turn off when the graph is visually noisy.

## Refresh / rebuild

Reloads or rebuilds graph data. Use after edits, imports, archive actions, or config changes.

## Memory preview

Reads selected memory content. Useful to audit what the agent will receive.

<RiskCallout level="caution">
Sensitive local content may be visible in the browser. Treat the panel as open while previewing.
</RiskCallout>

## Edit memory

Opens the file in an editor and copies the path. Use for manual correction or review. The source of truth is the Markdown file.

## Working と Noisy バッジ

メモリカードと詳細パネルには、注意が必要なメモリを強調するステータスバッジが表示されます。

- **Working** — Git 管理外の `working/` ティアに保存されているアクティブなメモリを示します。**Promote** ボタン（即座に `POST /api/memory/promote` を呼び出します）を使うと、CLI に切り替えずにアクティブな `working/` メモリを永続ストレージへ移行できます。
- **Noisy** — 価値を加えずに頻繁に一致するメモリにフラグを立て、トリガーの絞り込み、編集、またはアーカイブを行えるようにします。

## メモリのアーカイブ

メモリをアクティブなルーティングから除外しつつ、`archive/` 配下に保持します。アーカイブをクリックすると **Delete memory?** 確認ダイアログが開きます（理由を入力するモーダルプロンプトはなく、既定値 `'Deleted from Memories graph view'` が記録されます）。監査可能性のため、手動削除ではなくアーカイブを使用してください。

<RiskCallout level="caution">
Archiving changes routing immediately. Use archive, not manual deletion, so history is preserved.
</RiskCallout>

<!-- evidence-foundation:v3:start -->
## 証拠に基づくメモリ

The detail panel mirrors CLI/index metadata. It shows `authority`, `revision`, `evidence_refs`, `derived_from`, `supersedes`, `superseded_by`, `valid_from`, `valid_until`, and `last_confirmed` when present. These fields explain why a memory exists and which immutable trace supports it; the Web UI does not turn evidence into an instruction.
<!-- evidence-foundation:v3:end -->

## CLI equivalent

```bash
engram graph "<topic>"
engram why <id> "<query>"
engram promote <id>
engram quality-check
engram archive --reason "<why>" <id-or-file>
```

## Next steps

- [Core tab](core.md)
- [CLI: verify / repair / quality-check](../cli/verify-repair-quality.md)
