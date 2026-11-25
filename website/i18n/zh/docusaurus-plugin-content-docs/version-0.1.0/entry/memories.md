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

## 路由模拟器

使用 **Simulate route** 栏测试 Engram 在 agent 看到查询之前如何路由该查询。提交查询后会调用 `/api/recall?simulate=true` 并展示以下明细：

- **Packed bodies** — 完整包含在路由载荷中的记忆
- **Cards** — 与完整正文一同包含的精简记忆卡片
- **Omitted candidates** — 因排名或预算上限而被排除的匹配记忆
- **Token budget** — 模拟召回响应中的 token 预算使用情况

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

## Working 与 Noisy 徽章

记忆卡片与详情面板会展示状态徽章，以突出需要关注的记忆：

- **Working** — 标记存储在被 gitignore 的 `working/` 层中的活动记忆。点击 **Promote**（立即调用 `POST /api/memory/promote`）即可将活动 `working/` 记忆提升至持久存储，无需切换到 CLI。
- **Noisy** — 标记经常匹配但未带来价值的记忆，方便你收紧触发条件、编辑或归档它们。

## 归档记忆

将记忆从活动路由中移除，同时保留在 `archive/` 下。点击归档会打开 **Delete memory?** 确认对话框（不提供弹窗原因输入框；默认记录 `'Deleted from Memories graph view'`）。为保证可审计性，请使用归档而非手动删除。

<RiskCallout level="caution">
Archiving changes routing immediately. Use archive, not manual deletion, so history is preserved.
</RiskCallout>

<!-- evidence-foundation:v3:start -->
## 证据支持的记忆

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
