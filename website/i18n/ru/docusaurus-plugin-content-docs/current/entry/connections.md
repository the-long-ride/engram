---
title: Вкладка Connections
sidebar_position: 3
description: Обнаружение и подключение поддерживаемых ИИ-агентов из Entry Web UI.
---

import RiskCallout from '@site/src/components/RiskCallout';

# Вкладка Connections

Вкладка Connections сканирует вашу машину в поисках поддерживаемых поверхностей ИИ-агентов и позволяет подключить Engram к каждой из них на уровне рабочего пространства или глобально.

## Сканирование агентов

Вкладка показывает карточку для каждого поддерживаемого агента. Каждая карточка сообщает статус «обнаружен» или «отсутствует».

- **Detected** — Engram нашёл поддерживаемую локальную поверхность агента (путь конфигурации или установленное приложение).
- **Missing** — Engram не нашёл поверхность агента. «Отсутствует» не всегда означает «не поддерживается»: возможно, приложения или пути конфигурации пока нет.

<RiskCallout level="caution">
Статус Missing не всегда означает, что агент не поддерживается. Возможно, приложения или пути конфигурации пока нет на этой машине.
</RiskCallout>

## Переключатель связи с рабочим пространством {#workspace-link-toggle}

Подключает Engram к текущему репозиторию/рабочему пространству для этого агента. Используйте, когда память должна следовать за репозиторием: правила для проекта, память, специфичная для репозитория, инструкции, общие для команды.

## Глобальный переключатель связи {#global-link-toggle}

Подключает Engram глобально для этого агента. Используйте для личной памяти, рабочих процессов между проектами и переиспользуемых стилей/правил.

<RiskCallout level="risky">
Используйте глобальные связи осторожно на общих машинах. Engram записывает управляемые блоки в общие файлы инструкций. Перед глобальным подключением проверьте, какие файлы Engram записывает для каждого агента.
</RiskCallout>

## Какие файлы Engram записывает для каждого агента

| Цель | Файл |
| --- | --- |
| `codex` | `AGENTS.md`, `.agents/skills/engram/SKILL.md` |
| `agents-md` | `AGENTS.md` |
| `copilot` | `.github/copilot-instructions.md`; глобально: `~/.copilot/copilot-instructions.md` |
| `claude` | `AGENTS.md`, `.claude/engram.md`, `.agents/engram.md`, плюс блок `CLAUDE.md` только если этот файл уже существует |
| `cursor` | `.cursor/rules/engram.mdc`; глобально: `~/.cursor/plugins/local/engram/` |
| `gemini` | `GEMINI.md`; глобально: `~/.gemini/GEMINI.md`, `~/.gemini/skills/engram/SKILL.md` |
| `cline` | `.clinerules` |
| `windsurf` | `.windsurf/rules/engram.md`; глобально: `~/.codeium/windsurf/memories/global_rules.md` |
| `opencode` | `AGENTS.md`, `.opencode/engram.md`, `.opencode/skills/engram/SKILL.md`, `opencode.json` |
| `mcp` | `.mcp.json`; глобально: файлы конфигурации MCP хоста |
| `slash` | `.claude/commands/engram.md`, `.claude/skills/engram/SKILL.md`, `.cursor/commands/engram.md`, `.gemini/commands/engram.toml`, `.opencode/commands/engram.md` |

## Когда отключать связь

- Архивирование репозитория или тестового рабочего пространства
- Переключение агента с Engram на другое решение
- Очистка устаревших управляемых блоков перед свежим `engram upgrade --latest`

`engram unlink` удаляет только управляемые Engram записи хуков и адаптерные файлы. Файлы, написанные человеком, сохраняются, если явно не указан `--force`.

## Эквивалент в CLI

```bash
engram link codex
engram link claude
engram link --global opencode
engram unlink
```

## Дальнейшие шаги

- [Вкладка Construct](construct.md)
- [Обзор интеграций с агентами](../integrations/overview.md)
