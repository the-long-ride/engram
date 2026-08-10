---
title: Типы памяти
sidebar_position: 2
description: Память Engram разделена на типы — Rule (Правило), Skill (Навык) и Knowledge (Знание) — для фокусировки маршрутизации и обзора.
---

# Типы памяти

Каждая активная запись памяти Engram имеет тип. Тип управляет маршрутизацией, проверкой и тем, как память отображается для агентов.

| Тип | Использование |
| --- | --- |
| Rule | пользовательские предпочтения, исправления, ограничения, руководства "всегда/никогда" |
| Skill | повторяемый рабочий процесс, контрольный список, процедура, руководство (runbook) |
| Knowledge | объективный факт проекта, решение, детали реализации |

Каждый активный файл памяти содержит разделы `Context`, `Content` и `Example`. Память типа Rule также имеет лаконичные ограничения по количеству строк, чтобы загруженные инструкции оставались полезными.

## Хорошая память

Хорошая память Engram:

- достаточно стабильна, чтобы иметь значение на следующей неделе
- достаточно конкретна, чтобы маршрутизировать её позже
- достаточно коротка, чтобы загрузить её в контекст агента
- достаточно безопасна, чтобы делиться ею в рамках предполагаемой области видимости
- записана как правило, рабочий процесс или элемент знаний

Плохая память — это временный шум чата, секреты, учетные данные, разовые предположения или факты, которые никто не одобрял.

## Варианты правил

Engram всегда сохраняет память правил в легкой (light), сбалансированной (balanced) и строгой (strict) версиях. Режим вариантов правил представляет собой линзу рендеринга для памяти, обращенной к агенту:

- **Strict** помогает моделям более низкого уровня оставаться под контролем.
- **Light** или **balanced** формулировки обычно помогают более сильным моделям, чтобы правила не ограничивали их рассуждения.

Когда варианты отключены, Engram по умолчанию отображает сбалансированную формулировку правила. Настройка:

```bash
engram set-rule-variant strict|balanced|light|off
```

## Вывод для агентов (`--full`)

При запуске `engram load "<task>"` вывод сокращается для ИИ-агентов:

| Аспект | Человек (`engram load`) | Агент (`--full`) |
| --- | --- | --- |
| Frontmatter | Все поля (id, type, tags, confidence, scope, author, created, updated, depends_on и т. д.) | Только `id`, `type`, `tags`, `confidence`, `depends_on` |
| Тело правила | Полный раздел `## Rule Variants` со всеми тремя вариантами | Один выбранный вариант в разделе `## Rule variants (1/3 based on current: <active>)` |
| Содержимое без правил | Полный раздел `## Content` | То же содержимое, заголовок без изменений |

Инструмент MCP `engram_load` и хуки SessionStart по умолчанию используют `--full` (отказ через `full: true` в инструменте MCP). Адаптеры наборов навыков жестко прописывают `--full` в создаваемых ими инструкциях.

## Следующие шаги

- [Память Workspace против глобальной памяти](scopes.md)
- [Путь чтения и маршрутизация](read-path.md)

<!-- evidence-foundation:v3:start -->
## Память, подкреплённая доказательствами

New files use `schema_version: 3`. Rule and skill memories default to `authority: instruction`; knowledge defaults to `authority: reference`. `revision` starts at 1 and increments on updates. Trace IDs belong in `evidence_refs`, while session or source identities belong in `derived_from`. Legacy v1 (`Context` + `Content` + `Example`) and v2 (`Content`, optional `Origin`) remain readable. Traces live in `.agents/.engram/traces/` with `traces/<trace-id>.jsonl` files recording `engram observe --file` and `save-session --file` provenance, `trust_level`, `sensitivity`, and `retention`.
Frontmatter contains `authority` and `evidence_refs`.
<!-- evidence-foundation:v3:end -->

## Git author identity

Engram can store a global author and an optional workspace override. Resolution is workspace, global, then read-only Git fallback. Settings affect future memories only; a workspace override never changes global Git configuration. Use explicit plan and confirmation for global Git sync or legacy-memory migration.

```bash
engram author show
engram author set --name "Jane Doe" --email "jane@example.com"
engram author unset --scope workspace
engram author sync-git-global --plan
engram author sync-git-global --confirm
engram author migrate-memories --plan
engram author migrate-memories --confirm
```

Read the complete [Git author settings guide](../operations/git-author-settings.md).
