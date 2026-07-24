---
title: profiles / workspaces / config
sidebar_position: 5
description: Управление профилями, целями сохранения, лимитами загрузки, режимами чтения/проверки, ролями и конфигурацией времени выполнения.
---

# profiles / workspaces / config

Управление профилями, целями сохранения, лимитами загрузки, режимами чтения/проверки, ролями и конфигурацией времени выполнения.

## profile

```bash
engram profile status
engram profile create personal --global-path ~/Documents/engram-personal --use
engram profile use company --workspace
engram profile merge personal company --dry-run
```

Порядок разрешения профиля: явный флаг `--profile` или `ENGRAM_PROFILE`, затем рабочий профиль по умолчанию `default_profile`, затем активный профиль пользователя. Если рабочее пространство `W` привязано к профилю `B`, а профиль пользователя по умолчанию остается `A`, то каждая обычная загрузка, загрузка MCP и внедрение хука агента для `W` считывает глобальную память профиля `B` и никогда профиля `A`. Явный профиль, отличный от профиля по умолчанию для рабочего пространства, использует глобальную память этого профиля и отключает память рабочего пространства для этой команды.

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

При успешном выполнении `engram set-role ...` или `engram set-rule-variant ...` CLI возвращает строку `Agent action:`. Слеш-адаптеры и MCP-хосты, знающие об Engram, должны немедленно перезапустить `engram load "<current task/request>"`.

## set-rule-variant

```bash
engram set-rule-variant strict|balanced|light|off
```

## config

```bash
engram config view
engram config set <key> <value>
```

### Справочник по ключевым настройкам

| Ключ | Описание | По умолчанию | Диапазон / Варианты |
| --- | --- | --- | --- |
| `memory.rule_line_target` | Рекомендуемое количество строк для правил памяти | `70` | от `50` до `200` |
| `memory.rule_line_hard_limit` | Максимально допустимое количество строк для правил памяти | `100` | от `50` до `200` |
| `load.limit` | Максимальное количество воспоминаний, возвращаемых при обычной загрузке | `8` | от `1` до `32` |
| `rule_variants.enabled` | Включить или отключить генерацию вариантов правил | `true` | `true`, `false` |
| `rule_variants.active` | Активный режим варианта правила | `balanced` | `light`, `balanced`, `strict` |
| `graph.enabled` | Включить или отключить маршрутизацию с учетом графа | `true` | `true`, `false` |
| `graph.max_related` | Макс. число связанных воспоминаний, получаемых из ребер графа | `8` | от `1` до `20` |
| `graph.min_related_score` | Минимальная оценка сходства для добавления ребер графа | `0.3` | от `0.0` до `1.0` |
| `vector.enabled` | Включить или отключить резервный векторный поиск | `true` | `true`, `false` |
| `live_sync.enabled` | Синхронизировать сгенерированные файлы контекста агента при сохранении | `true` | `true`, `false` |
| `global_git.enabled` | Включить автоматическую синхронизацию глобального Git-репозитория | `false` | `true`, `false` |
| `global_git.remote` | Имя удаленного Git-репозитория для глобальной синхронизации | `origin` | Строка |
| `global_git.branch` | Имя ветки Git для глобальной синхронизации | `main` |  Строка |

Эти настройки также можно визуально настроить на вкладке **Construct** в `engram entry`.

## Следующие шаги

- [verify / repair / quality-check](verify-repair-quality.md)
- [Entry Web UI: Вкладка Construct](../entry/construct.md)
