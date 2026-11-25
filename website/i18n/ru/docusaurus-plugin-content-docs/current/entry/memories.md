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

## Симулятор маршрутизации

Используйте панель **Simulate route**, чтобы проверить, как Engram маршрутизирует запрос, ещё до того, как его увидит агент. Отправка запроса вызывает `/api/recall?simulate=true` и показывает разбивку:

- **Packed bodies** — воспоминания, полностью включённые в маршрутизируемый пакет
- **Cards** — компактные карточки воспоминаний, включённые вместе с полными телами
- **Omitted candidates** — совпавшие воспоминания, исключённые из-за ранжирования или лимита бюджета
- **Token budget** — расход бюджета токенов в симулированном ответе выборки

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

## Значки Working и Noisy

Карточки и панель подробностей отображают значки состояния для воспоминаний, требующих внимания:

- **Working** — отмечает активные воспоминания, хранящиеся в исключённом из Git уровне `working/`. Нажмите кнопку **Promote** (которая сразу отправляет `POST /api/memory/promote`), чтобы перенести активное воспоминание из `working/` в постоянное хранилище без переключения в CLI.
- **Noisy** — помечает воспоминания, которые часто совпадают, но не приносят пользы, чтобы вы могли сузить их триггеры, отредактировать или архивировать их.

## Архивация воспоминания

Удаляет воспоминание из активной маршрутизации, сохраняя его в `archive/`. Нажатие на архивацию открывает диалог подтверждения **Delete memory?** (без модального поля для ввода причины; по умолчанию записывается `'Deleted from Memories graph view'`). Для аудируемости используйте архивацию, а не ручное удаление.

<RiskCallout level="caution">
Archiving changes routing immediately. Use archive, not manual deletion, so history is preserved.
</RiskCallout>

<!-- evidence-foundation:v3:start -->
## Память, подкреплённая доказательствами

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
