---
title: Claude
sidebar_position: 3
description: Интеграция Engram с Claude Code через CLAUDE.md, слэш-команды, Agent Skills, MCP и хуки.
---

# Claude

Claude Code считывает `CLAUDE.md` для руководства по проекту и поддерживает настройку внешних инструментов через `.mcp.json`.

## Установка

```bash
engram link claude
```

## Записанные файлы

| Файл | Назначение |
| --- | --- |
| `CLAUDE.md` | Загрузчик руководства по проекту |
| `.claude/commands/engram.md` | Классическая слэш-команда `/engram` |
| `.claude/skills/engram/SKILL.md` | Agent Skill для вызова через слэш |
| `.claude/settings.json` | Хуки `SessionStart` и `UserPromptSubmit` |
| `.mcp.json` | Регистрация MCP |

Claude получает как `.claude/commands/engram.md`, так и `.claude/skills/engram/SKILL.md`, поэтому `/engram` появляется в старых меню команд и в новых сессиях Claude Code, поддерживающих навыки.

## Глобальная установка

```bash
engram link --global claude
```

Engram добавляет управляемый блок в `~/.claude/CLAUDE.md` (сохраняя пользовательский текст) и записывает навык Claude в `~/.claude/skills/engram/SKILL.md`. Глобальный MCP производит запись в `~/.claude/mcp.json`.

## Runtime-first цель

Claude является runtime-first целью. `CLAUDE.md` содержит краткие инструкции по загрузке, которые полагаются на инструменты MCP и хуки для детального протокола; файл Agent Skill содержит полный рабочий процесс записи/утверждения.

## Поведение хуков

Claude поддерживает запуск и внедрение дополнительного контекста во время ввода промпта. `SessionStart` загружает перенаправленную память при запуске; `UserPromptSubmit` выполняет повторное внедрение только при изменении перенаправленного контекста Engram.

## Дальнейшие шаги

- [Обзор интеграций с агентами](overview.md)
- [Слэш-адаптеры](slash.md)
- [Инструменты MCP](mcp.md)
