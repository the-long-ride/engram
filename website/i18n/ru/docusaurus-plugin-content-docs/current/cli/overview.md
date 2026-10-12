---
title: Обзор команд
sidebar_position: 1
description: Карта всех команд Engram CLI и того, что они делают.
---

# Обзор команд

Запустите `engram -h`, чтобы увидеть компактный список команд. Запустите `engram help <topic>` или `engram -h <topic>`, чтобы получить примеры и сценарии использования конкретной команды.

## Карта команд

| Задача | Команда |
| --- | --- |
| Загрузить память для задачи | `engram load "<task>"` |
| Загрузить компактную память для задачи | `engram load "<task>"` |
| Вывести руководство по использованию для ИИ-агента | `engram llm` |
| Предпросмотр маршрутизируемых файлов памяти | `engram load --dry-run "<task>"` |
| Загрузить с лимитом токенов | `engram load --budget-tokens 800 "<task>"` |
| Вывести все упакованные тела | `engram load --disclosure full "<task>"` |
| Получить карточки по id | `engram load --id <id>,<id>` |
| Поиск по памяти | `engram search "<topic>"` |
| Сохранить одно воспоминание | `engram save [rule\|workflow\|knowledge] "<text>"` |
| Сохранить несколько воспоминаний сессии | `engram save-session` или `engram ss` |
| Извлечь из недавних доступных чатов | `engram save-session --query-level 3` |
| Принудительно сохранить кандидатов сессии | `engram ss -f` |
| Извлечь из недавних чатов и принудительно сохранить | `engram ss -f last 50 sessions` |
| Зафиксировать сырую заметку | `engram observe --file session.md` |
| Разобрать опциональную очередь транскриптов SessionEnd | `engram observe --queue --dry-run` |
| Преобразовать существующую документацию/рекомендации | `engram take-control --all` |
| Предпросмотр перехвата источников | `engram take-control --plan` |
| Построить дайджест кода или конфигурации | `engram take-control --kind code --objective "<text>"` |
| Обновить устаревшую память, полученную из кода | `engram take-control --refresh` |
| Проверить актуальность источников | `engram verify --sources` |
| Сохранить рабочее воспоминание | `engram promote <id>` |
| Сохранить заметку к задаче | `engram working note "<text>"` |
| Удалить истёкшие рабочие воспоминания | `engram working prune [--dry-run]` |
| Посмотреть счётчики выдачи и инъекций | `engram stats --usage` |
| Перестроить существующую папку памяти | `engram metacognize --workspace\|--global\|--all` |
| Разрешить конфликты и выполнить metacognize | `engram resolve-conflicts --metacognize` |
| Проверить маршрутизацию по графу | `engram graph "<topic>"` |
| Проверить хеши | `engram verify` |
| Найти некорректные файлы памяти | `engram repair` |
| Архивировать ошибочное воспоминание | `engram archive --reason "<why>" <id-or-file>` |
| Настроить строгость правил | `engram set-rule-variant strict\|balanced\|light\|off` |
| Задать цель сохранения по умолчанию | `engram set-save-target workspace\|global\|both\|status` |
| Задать лимит компактной загрузки | `engram set-load-limit 1..32\|status\|reset` |
| Настроить автоматическое чтение хуками | `engram set-read startup\|auto\|always\|manual\|off\|status` |
| Настроить видимость подтверждений хуков | `engram set-proof off\|compact\|status` |
| Установить хуки агентов | `engram link codex\|claude\|gemini\|opencode\|cursor\|windsurf` |
| Управлять глобальными профилями | `engram profile status\|list\|create\|use\|merge` |
| Клонировать память рабочего пространства/глобальную | `engram clone-memory workspace global [--metacognize]` |

## Поиск команд

```bash
engram help save-session
engram help set-role
engram -h set-rule-variant
```

Все команды в справке имеют короткие псевдонимы. Псевдонимы ведут к тому же поведению CLI и тем же шлюзам подтверждения, что и канонические команды.

## Автодополнение оболочки

```bash
engram completion bash
engram completion zsh
engram completion powershell
```

## Дальнейшие шаги

- [load / search / graph](load-search-graph.md)
- [save / save-session / observe](save-session.md)
- [inject / link / upgrade](inject-link-upgrade.md)


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
