---
title: Вкладка Memories (Воспоминания)
sidebar_position: 8
description: Просмотр графа памяти, предварительный просмотр воспоминаний, их редактирование и архивирование.
---

import RiskCallout from '@site/src/components/RiskCallout';

# Вкладка Memories

Вкладка Memories проверяет граф памяти и выполняет действия по обслуживанию памяти.

## Фишки области действия (Scope chips)

Фильтрация графа по источнику памяти. Сравнение памяти рабочей области и глобальной памяти. Начните только с текущей рабочей области, если граф кажется зашумленным.

## Фишки типа (Type chips)

Фильтрация графа по типу памяти. Проверяйте правила, навыки или знания отдельно.

## Переключатель семантических связей

Показывает семантические связи графа. Отключайте, когда граф визуально зашумлен.

## Обновить / Перестроить (Refresh / rebuild)

Перезагружает или перестраивает данные графа. Используйте после редактирования, импорта, архивации или изменений конфигурации.

## Предварительный просмотр памяти

Читает содержимое выбранного воспоминания. Полезно для аудита того, что получит агент.

<RiskCallout level="caution">
Конфиденциальный локальный контент может быть виден в браузере. Относитесь к панели как к открытой во время предварительного просмотра.
</RiskCallout>

## Редактировать память

Открывает файл в редакторе и копирует путь. Используйте для ручного исправления или проверки. Источником истины является Markdown-файл.

## Архивировать память

Удаляет память из активной маршрутизации, сохраняя ее в каталоге `archive/`. Используйте архив, а не удаление, для обеспечения возможности аудита.

<RiskCallout level="caution">
Архивирование немедленно меняет маршрутизацию. Используйте архивацию, а не ручное удаление, чтобы сохранить историю.
</RiskCallout>

## Эквивалент в CLI

```bash
engram graph "<topic>"
engram quality-check
engram archive --reason "<why>" <id-or-file>
```

## Следующие шаги

- [Вкладка Core](core.md)
- [Вкладка Runtime](runtime.md)

<!-- evidence-foundation:v3:start -->
## Память, подкреплённая доказательствами

New files use `schema_version: 3`. Rule and skill memories default to `authority: instruction`; knowledge defaults to `authority: reference`. `revision` starts at 1 and increments on updates. Trace IDs belong in `evidence_refs`, while session or source identities belong in `derived_from`. Legacy v1 (`Context` + `Content` + `Example`) and v2 (`Content`, optional `Origin`) remain readable. Traces live in `.agents/.engram/traces/` with `traces/<trace-id>.jsonl` files recording `engram observe --file` and `save-session --file` provenance, `trust_level`, `sensitivity`, and `retention`.
<!-- evidence-foundation:v3:end -->
