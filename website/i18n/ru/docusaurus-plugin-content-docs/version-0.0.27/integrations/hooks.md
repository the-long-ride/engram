---
title: Хуки и строки подтверждения
sidebar_position: 12
description: Агентские хуки Engram внедряют перенаправленную память при запуске сессии и вводе промптов. Строки подтверждения делают внедрение видимым.
---

# Хуки и строки подтверждения

Агентские хуки — это дополнительные хуки хоста, которые внедряют перенаправленный контекст Engram при старте сессии и последующей смене задач, когда хост предоставляет безопасный контекстный канал во время ввода промпта.

## Установка хуков

```bash
engram link codex
engram link claude
engram link gemini
engram link cursor
engram link windsurf
engram link --global opencode
engram set-proof compact
```

Используйте `--global` для конфигурации на уровне пользователя и `engram unlink` для удаления только управляемых Engram записей хуков.

## Режим чтения

`engram set-read startup|auto|always|manual|off` управляет поведением во время выполнения:

- `auto` загружает при старте сессии и повторно внедряет только при изменении перенаправленного контекста Engram.
- `startup` загружает только при старте сессии.
- `always` повторно внедряет при каждом подходящем запросе.
- `manual` и `off` снижают автоматизацию.

Кэш хуков хранит хэши, идентификаторы сессий, хост, cwd и перенаправленные сигнатуры — и никогда не хранит исходный текст промпта.

## Режим подтверждения

`engram set-proof off|compact` управляет тем, будут ли поддерживаемые хуки также добавлять компактную строку `Engram proof:` на каждом подходящем шаге. Видимость строки подтверждения не зависит от `set-read`: режим `compact` может сообщать о загруженных, повторно используемых или пропущенных шагах без изменения момента внедрения полной памяти Engram.

## Матрица возможностей хуков

| Хост | Путь конфигурации | События |
| --- | --- | --- |
| `codex` | `.codex/hooks.json`; global `~/.codex/hooks.json` | `SessionStart`, `UserPromptSubmit` |
| `claude` | `.claude/settings.json`; global `~/.claude/settings.json` | `SessionStart`, `UserPromptSubmit` |
| `gemini` | `.gemini/settings.json`; global `~/.gemini/settings.json` | `SessionStart`, `BeforeAgent` |
| `cursor` | `.cursor/hooks.json`; глобальный плагин `hooks/hooks.json` | `sessionStart` |
| `windsurf` / `cascade` | `.windsurf/hooks.json`; global `~/.codeium/windsurf/hooks.json` | `pre_user_prompt` |
| `opencode` | `~/.config/opencode/plugins/engram.js` | `chat.message`, `experimental.chat.system.transform` |
| `copilot` | Не записано | N/A |
| `cline` | Не записано | N/A |

## Дальнейшие шаги

- [Обзор интеграций с агентами](overview.md)
- [CLI: внедрение / привязка / обновление](../cli/inject-link-upgrade.md)
