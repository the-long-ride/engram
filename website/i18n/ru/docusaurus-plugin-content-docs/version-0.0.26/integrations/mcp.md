---
title: Инструменты MCP
sidebar_position: 11
description: Сервер Engram MCP предоставляет инструменты загрузки, поиска и только для предложений MCP-совместимым хостам.
---

# Инструменты MCP

Engram поставляется с бинарным файлом MCP-сервера `engram-mcp`, который предоставляет инструменты MCP-совместимым хостам.

## Регистрация

`engram link <target>` также по умолчанию устанавливает известную регистрацию MCP для этой цели.

| Область видимости | Путь |
| --- | --- |
| Рабочая область (большинство хостов) | `.mcp.json` |
| Рабочая область Cursor | `.cursor/mcp.json` |
| Рабочая область OpenCode | поле `mcp` в `opencode.json` / `opencode.jsonc` |
| Глобальный Claude | `~/.claude/mcp.json` |
| Глобальный Gemini / Antigravity | Конфигурационный файл Gemini MCP |
| Глобальный OpenCode | поле `mcp` в `~/.config/opencode/opencode.jsonc` / `opencode.json` |
| Глобальный Cursor | Встроен в локальный плагин |
| Глобальный Windsurf | `~/.codeium/windsurf/mcp_config.json` |

Регистрация MCP для рабочей области Windsurf пропускается, так как официальная документация предусматривает конфигурацию MCP только на уровне пользователя.

## Инструменты

Хосты MCP должны рассматривать `engram_save` и `engram_autosave` как инструменты **только для предложений**; они по-прежнему должны направлять окончательные записи через видимый человеку рабочий процесс утверждения CLI. `engram_load` по умолчанию использует `--full` (отключение через `full: true`).

## Правило автоматического принятия всего

Явные запросы `/engram save-session --force`, включая сокращение `/engram ss -f`, должны использовать путь записи CLI, так как автосохранение MCP остается только в режиме предложений. Сокращение с указанием количества сессий `/engram ss -f last 50 sessions` должно использовать команду `engram save-session --query-level 50 --force`.

## OpenCode MCP запись

```json
"engram": {
  "type": "local",
  "command": ["engram-mcp"],
  "args": [],
  "enabled": true
}
```

Сервер MCP реализует стандартное рукопожатие JSON-RPC (`initialize`, `notifications/initialized`, `tools/list` и `tools/call`).

## Дальнейшие шаги

- [Обзор интеграций с агентами](overview.md)
- [Хуки и строки подтверждения](hooks.md)

