---
title: OpenCode
sidebar_position: 7
description: Интеграция Engram с OpenCode через AGENTS.md, Agent Skills, MCP, пользовательские команды и локальный плагин.
---

# OpenCode

OpenCode считывает файл правил проекта `AGENTS.md` и глобальный файл `~/.config/opencode/AGENTS.md` для поиска правил. Engram записывает туда управляемый блок, записывает полное руководство в `.opencode/engram.md` или `~/.config/opencode/engram.md`, записывает навык полностью в `.opencode/skills/engram/SKILL.md` или `~/.config/opencode/skills/engram/SKILL.md`, а также резервирует файл проекта `opencode.json` (или существующий `opencode.jsonc`) и глобальный файл `~/.config/opencode/opencode.jsonc` для регистрации MCP.

## Установка

```bash
engram link opencode
```

## Записанные файлы

| Файл | Назначение |
| --- | --- |
| `AGENTS.md` | Правила проекта с управляемым блоком |
| `.opencode/engram.md` | Полное руководство |
| `.opencode/skills/engram/SKILL.md` | Навык агента |
| `.opencode/commands/engram.md` | Слэш-адаптер `/engram` |
| `opencode.json` / `opencode.jsonc` | Регистрация MCP (`mcp.engram`) |

## Глобальная установка

```bash
engram link --global opencode
```

Также устанавливает управляемый локальный плагин JavaScript в `~/.config/opencode/plugins/engram.js`. Плагин использует `chat.message` для перенаправления текущего промпта пользователя и `experimental.chat.system.transform` для внедрения перенаправленной памяти перед каждым LLM-запросом.

:::warning
OpenCode необходимо перезапустить или перезагрузить после команд `link`/`unlink`, поскольку файлы локальных плагинов загружаются при запуске.
:::

## Регистрация MCP

```json
"engram": {
  "type": "local",
  "command": ["engram-mcp"],
  "args": [],
  "enabled": true
}
```

MCP-сервер реализует стандартное JSON-RPC рукопожатие (`initialize`, `notifications/initialized`, `tools/list` и `tools/call`), позволяя OpenCode обнаруживать и вызывать инструменты Engram.

## Поведение плагина

Плагин в случае сбоя переходит в режим обхода (fails open) и сохраняет необработанную перенаправленную память только в запущенном процессе OpenCode. Кэш дисковых хуков Engram хранит исключительно хэши, идентификаторы сессий, хост, cwd и перенаправленные сигнатуры. Команда `engram unlink --global opencode` удаляет только созданный Engram плагин; написанный человеком `engram.js` сохраняется, если не указан флаг `--force`.

## Дальнейшие шаги

- [Обзор интеграций с агентами](overview.md)
- [Инструменты MCP](mcp.md)
- [Хуки и строки подтверждения](hooks.md)
