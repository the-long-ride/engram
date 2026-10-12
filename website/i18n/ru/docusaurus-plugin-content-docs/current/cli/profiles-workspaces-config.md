---
title: profiles / workspaces / config
sidebar_position: 5
description: Управление профилями, целями сохранения, лимитами загрузки, режимами чтения/подтверждения, ролями и конфигурацией среды выполнения.
---

# profiles / workspaces / config

Управление профилями, целями сохранения, лимитами загрузки, режимами чтения/подтверждения, ролями и конфигурацией среды выполнения.

## profile

```bash
engram profile status
engram profile create personal --global-path ~/Documents/engram-personal --use
engram profile use company --workspace
engram profile merge personal company --dry-run
```

Порядок определения профиля: явный `--profile` или `ENGRAM_PROFILE`, затем `default_profile` рабочего пространства, затем активный профиль пользователя. Если рабочее пространство `W` закреплено за профилем `B`, а профилем пользователя по умолчанию остаётся `A`, каждая обычная загрузка, загрузка через MCP и инъекция хуков агента для `W` читают глобальную память профиля `B` и никогда не читают профиль `A`. Явно указанный профиль, отличный от профиля рабочего пространства по умолчанию, использует глобальную память этого профиля и отключает память рабочего пространства для этой команды.

## set-save-target

```bash
engram set-save-target status
engram set-save-target workspace
engram set-save-target global
engram set-save-target both
```

## set-load-limit

```bash
engram set-load-limit 1..32
engram set-load-limit status
engram set-load-limit reset
```

<a id="load-configuration"></a>
## Конфигурация загрузки {#load-configuration}

Эти ключи находятся в блоке `load` файла `.agents/.engram/engram.config.json`; `engram config set` их не принимает.

| Ключ | По умолчанию | Значение |
| --- | --- | --- |
| `load.disclosure` | `auto` | `auto` раскрывает лучшие совпадения и показывает остальные карточками; `full` сохраняет вывод без разделения на уровни |
| `load.expand_top` | `3` | Количество тел, раскрываемых при раскрытии `auto` |
| `load.working_ttl_days` | `14` | Сколько дней утверждённое воспоминание `OBJECTIVE: task` остаётся в рабочем уровне (от 1 до 365). Также редактируется на вкладке Construct в Entry |

## set-read

```bash
engram set-read startup|auto|always|manual|off
engram set-read status
```

## set-proof

```bash
engram set-proof off|compact
engram set-proof status
```

## set-role

```bash
engram set-role frontend
engram set-role backend security
engram set-role
```

Когда `engram set-role ...` или `engram set-rule-variant ...` завершается успешно, CLI возвращает строку `Agent action:`. Slash-адаптеры и хосты MCP, поддерживающие Engram, должны немедленно повторно выполнить `engram load "<current task/request>"`.

## set-rule-variant

```bash
engram set-rule-variant strict|balanced|light|off|status
```

## config

```bash
engram config view
engram config set <key> <value>
```

### Справочник основных настроек

| Ключ | Описание | По умолчанию | Диапазон / варианты |
| --- | --- | --- | --- |
| `memory.rule_line_target` | Рекомендуемое целевое число строк для воспоминаний-правил | `70` | от `50` до `200` |
| `memory.rule_line_hard_limit` | Максимально допустимое число строк для воспоминаний-правил | `100` | от `50` до `200` |
| `memory.include_author_email` | Записывать `author_email` во frontmatter новых воспоминаний (`author_name` записывается всегда) | `false` | `true`, `false` |
| `mcp.resource_limit` | Сколько воспоминаний MCP `resources/list` возвращает помимо `engram://index`, в порядке убывания использования (внедрено + получено) (только в JSON-конфигурации; `engram config set` это значение не задаёт) | `20` | от `0` до `200` |
| `load.limit` | Максимум воспоминаний, возвращаемых обычной загрузкой | `8` | от `1` до `32` |
| `hooks.path_rules` | `native` записывает файлы правил Claude и Cursor для воспоминаний с `applies_to` и регистрирует Claude `InstructionsLoaded`; `hook` сохраняет хук Claude `PreToolUse` | `native` | `native`, `hook` |
| `rule_variants.enabled` | Включить или отключить генерацию вариантов правил | `false` | `true`, `false` |
| `rule_variants.active` | Активный режим варианта правил | `balanced` | `light`, `balanced`, `strict` |
| `graph.enabled` | Включить или отключить маршрутизацию с учётом графа | `true` | `true`, `false` |
| `graph.max_related` | Максимум связанных воспоминаний, извлекаемых по рёбрам графа | `4` | от `1` до `20` |
| `graph.min_related_score` | Минимальная оценка сходства для добавления рёбер графа | `0.22` | от `0.0` до `1.0` |
| `vector.enabled` | Экспериментальный резервный векторный поиск на хешах (не семантические эмбеддинги) | `false` | `true`, `false` |
| `live_sync.enabled` | Синхронизировать сгенерированные файлы контекста агента при сохранении | `false` | `true`, `false` |
| `global_git.enabled` | Включить автоматизацию синхронизации глобального репозитория Git | `true` | `true`, `false` |
| `global_git.remote` | Имя удалённого репозитория Git для глобальной синхронизации | `origin` | Строка |
| `global_git.branch` | Имя ветки Git для глобальной синхронизации | `main` | Строка |

Эти настройки также можно менять визуально на вкладке **Construct** в `engram entry`.

## Дальнейшие шаги

- [verify / repair / quality-check](verify-repair-quality.md)
- [Entry Web UI: вкладка Construct](../entry/construct.md)


## Личность автора Git

Engram может хранить глобального автора и необязательное переопределение для рабочего пространства. Порядок разрешения: рабочее пространство, глобальный, затем резервный Git только для чтения. Настройки влияют только на будущие воспоминания; переопределение рабочего пространства никогда не меняет глобальную конфигурацию Git. Для синхронизации с глобальным Git или миграции устаревших воспоминаний используйте явный план и подтверждение.

```bash
engram author show
engram author set --name "Jane Doe" --email "jane@example.com"
engram author unset --scope workspace
engram author sync-git-global --plan
engram author sync-git-global --confirm
engram author migrate-memories --plan
engram author migrate-memories --confirm
```

Прочитайте полное [руководство по настройкам автора Git](../operations/git-author-settings.md).
