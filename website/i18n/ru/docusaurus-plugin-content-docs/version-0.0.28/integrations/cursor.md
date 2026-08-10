---
title: Cursor
sidebar_position: 5
description: Интеграция Engram с Cursor через правила, MCP, локальный плагин, слэш-команды и хуки начала сессии.
---

# Cursor

Cursor считывает правила проекта из файлов `.cursor/rules/*.mdc`. Engram записывает `.cursor/rules/engram.mdc` с валидным фронтматером (`alwaysApply: true`) и блоком инструкций по начальной загрузке.

## Установка

```bash
engram link cursor
```

## Записанные файлы

| Файл | Назначение |
| --- | --- |
| `.cursor/rules/engram.mdc` | Правила проекта с `alwaysApply: true` |
| `.cursor/mcp.json` | Регистрация MCP (`type: "stdio"`) |
| `.cursor/hooks.json` | Хук `sessionStart` |
| `.cursor/commands/engram.md` | Слэш-адаптер `/engram` |

## Глобальная установка

```bash
engram link --global cursor
```

Engram создает локальный плагин в директории `~/.cursor/plugins/local/engram/`, содержащий манифест плагина, правила, навыки, команды, конфигурацию MCP и хуки.

## Runtime-first цель

Cursor является runtime-first целью. Правила проекта содержат краткие инструкции по загрузке, которые полагаются на инструменты MCP и хуки для детального протокола; файл Agent Skill содержит полный рабочий процесс записи/утверждения.

## Поведение хуков

Хук `sessionStart` внедряет контекст запуска Engram через выходное поле `additional_context`. `beforeSubmitPrompt` предназначен только для разрешения/блокировки и не используется для внедрения контекста.

## Дальнейшие шаги

- [Обзор интеграций с агентами](overview.md)
- [Хуки и строки подтверждения](hooks.md)
