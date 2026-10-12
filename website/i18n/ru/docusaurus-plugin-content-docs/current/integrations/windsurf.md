---
title: Windsurf / Cascade
sidebar_position: 6
description: Интеграция Engram с Windsurf Cascade через правила, MCP, хуки и глобальную память.
---

# Windsurf / Cascade

Windsurf считывает правила рабочей области из `.windsurf/rules/*.md`. Engram записывает `.windsurf/rules/engram.md` с фронтматером `trigger: always_on`. `cascade` является алиасом для `windsurf`.

## Установка

```bash
engram link windsurf
```

MCP рабочей области не создается, поскольку официальная документация содержит только пользовательскую конфигурацию MCP. Команда `engram link windsurf` явно сообщает об этом и предлагает `engram link --global windsurf` для настройки MCP.

## Записанные файлы

| Файл | Назначение |
| --- | --- |
| `.windsurf/rules/engram.md` | Правила проекта с `trigger: always_on` |
| `.windsurf/hooks.json` | Хук `pre_user_prompt` |

## Глобальная установка

```bash
engram link --global windsurf
```

Engram записывает управляемый блок в `~/.codeium/windsurf/memories/global_rules.md` (сохраняя пользовательский текст и оставаясь в рамках лимита символов), объединяет MCP с `~/.codeium/windsurf/mcp_config.json` и объединяет хуки в `~/.codeium/windsurf/hooks.json`.

## Поведение хуков

Хук `pre_user_prompt` может проверять/предварительно загружать/блокировать, но не может напрямую внедрять контекст модели. Правила и MCP обеспечивают надежные каналы контекста ИИ.

## Дальнейшие шаги

- [Обзор интеграций с агентами](overview.md)
- [Хуки и строки подтверждения](hooks.md)
