---
title: Вкладка Connections (Подключения)
sidebar_position: 3
description: Обнаружение и привязка поддерживаемых AI-агентов из Entry Web UI.
---

import RiskCallout from '@site/src/components/RiskCallout';

# Вкладка Connections

Вкладка Connections сканирует ваш компьютер на наличие поддерживаемых интерфейсов AI-агентов и позволяет привязать Engram к каждому из них на уровне рабочей области или глобально.

## Сканирование агентов (Agent scan)

Вкладка показывает карточку для каждого поддерживаемого агента. Каждая карточка сообщает о статусе: обнаружен (detected) или отсутствует (missing).

- **Detected** — Engram нашел поддерживаемый локальный интерфейс агента (существует путь конфигурации или приложение).
- **Missing** — Engram не нашел интерфейс агента. Статус «отсутствует» не всегда означает, что агент не поддерживается; это может означать, что приложение или путь конфигурации еще не созданы.

<RiskCallout level="caution">
Статус «отсутствует» не всегда означает, что агент не поддерживается. Это может означать, что приложение или путь конфигурации еще не установлены на этом компьютере.
</RiskCallout>

## Переключатель привязки к рабочей области (Workspace link toggle)

Привязывает Engram к текущему репозиторию/рабочей области для этого агента. Используйте, когда память должна быть привязана к репозиторию: правила для конкретного проекта, память репозитория, общие инструкции команды.

## Переключатель глобальной привязки (Global link toggle)

Привязывает Engram глобально для этого агента. Используйте для личной памяти, кросс-проектных рабочих процессов и повторно используемых стилей/правил.

<RiskCallout level="risky">
Используйте глобальные привязки с осторожностью на общих компьютерах. Engram записывает управляемые блоки в общие файлы инструкций. Перед глобальной привязкой проверьте, какие файлы Engram записывает для каждого агента.
</RiskCallout>

## Какие файлы Engram записывает для каждого агента

| Цель | Файл |
| --- | --- |
| `codex` | `AGENTS.md`, `.agents/skills/engram/SKILL.md` |
| `agents-md` | `AGENTS.md` |
| `copilot` | `.github/copilot-instructions.md`; глобально: `~/.copilot/copilot-instructions.md` |
| `claude` | `CLAUDE.md` |
| `cursor` | `.cursor/rules/engram.mdc`; глобально: `~/.cursor/plugins/local/engram/` |
| `gemini` | `GEMINI.md`; глобально: `~/.gemini/GEMINI.md`, `~/.gemini/skills/engram/SKILL.md` |
| `cline` | `.clinerules` |
| `windsurf` | `.windsurf/rules/engram.md`; глобально: `~/.codeium/windsurf/memories/global_rules.md` |
| `opencode` | `AGENTS.md`, `.opencode/engram.md`, `.opencode/skills/engram/SKILL.md`, `opencode.json` |
| `mcp` | `.mcp.json`; глобально: файлы конфигурации MCP хоста |
| `slash` | `.claude/commands/engram.md`, `.cursor/commands/engram.md`, `.gemini/commands/engram.toml`, `.opencode/commands/engram.md` |

## Когда отвязывать

- Архивация репозитория или тестовой рабочей области
- Отключение агента от Engram
- Очистка устаревших управляемых блоков перед чистым обновлением `engram upgrade --latest`

`engram unlink` удаляет только записи хуков и файлы адаптеров, управляемые Engram. Файлы, созданные человеком, сохраняются, если явно не указан параметр `--force`.

## Эквивалент в CLI

```bash
engram link codex
engram link claude
engram link --global opencode
engram unlink
```

## Следующие шаги

- [Вкладка Construct](construct.md)
- [Обзор интеграции агентов](../integrations/overview.md)
