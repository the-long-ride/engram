---
title: Обзор интеграций агентов
sidebar_position: 1
description: Engram поддерживает файлы навыков, адаптеры слэш-команд, инструменты MCP и хуки агентов во множестве сред ИИ.
---

# Обзор интеграций агентов {#agent-integrations-overview}

Engram поддерживает два уровня интеграции:

- **Файлы навыков (Skill files)** — сгенерированные инструкции для агентов, читающих контекст проекта.
- **Адаптеры слэш-команд (Slash adapters)** — сгенерированные промпты команд `/engram` для агентов, поддерживающих слэш-команды проекта или Agent Skills.
- **Инструменты в стиле MCP** — обертка JSON-lines для агентов, способных регистрировать процессы внешних инструментов.
- **Хуки агентов (Agent hooks)** — подключаемые хуки хоста, внедряющие маршрутизированный контекст Engram в начале сессии и при последующей смене задач.

## Быстрый старт {#quick-start}

```bash
engram inject
engram link all
```

`engram link all` устанавливает публичный набор целей и сообщает детерминированные причины `SKIPPED` для частично поддерживаемых хостов по файлам инструкций, конфигурации MCP, слэш-адаптерам и хукам агентов в единой установке.

## Категории целей {#target-categories}

| Категория | Цели | Поведение |
| --- | --- | --- |
| Сначала среда выполнения | `codex`, `claude`, `cursor`, `gemini` | Краткие начальные инструкции, сопутствующее руководство с полным рабочим процессом, краткие указатели Agent Skill и конфигурация MCP |
| Поддержка хуков | `codex`, `claude`, `gemini`, `opencode`, `cursor`, `windsurf`/`cascade` | Хуки агентов со специфичными для хоста схемами событий |
| Компактный/ручной фолбэк | `agents-md`, `copilot`, `cline` | Полный компактный протокол; без надежного внедрения контекста во время выполнения в v1 |

## Поддерживаемые цели {#supported-targets}

| Цель | Файл | Основное назначение |
| --- | --- | --- |
| `codex` | `AGENTS.md`, `.agents/skills/engram/SKILL.md` | Инструкции проекта OpenAI Codex и Agent Skill |
| `agents-md` | `AGENTS.md` | Универсальный фолбэк для неперечисленных агентов, совместимых с AGENTS.md |
| `copilot` | `.github/copilot-instructions.md`; глобально: `~/.copilot/copilot-instructions.md` | Инструкции репозитория и пользователя GitHub Copilot |
| `claude` | `AGENTS.md`, `.claude/engram.md`, `.agents/engram.md`, плюс блок `CLAUDE.md` только если этот файл уже существует, и правила путей `.claude/rules/engram/<id>.md` | Руководство проекта Claude Code и нативные правила путей |
| `cursor` | `.cursor/rules/engram.mdc`, правила путей `.cursor/rules/engram/<id>.mdc`; глобально: `~/.cursor/plugins/local/engram/` | Правила проекта Cursor, нативные правила путей и локальный плагин |
| `gemini` | `GEMINI.md`; глобально: `~/.gemini/GEMINI.md`, `~/.gemini/skills/engram/SKILL.md` | Контекст Gemini CLI, включая совместимые с Gemini интерфейсы Antigravity |
| `cline` | `.clinerules` | Правила рабочего пространства в стиле Cline |
| `windsurf` | `.windsurf/rules/engram.md`; глобально: `~/.codeium/windsurf/memories/global_rules.md` | Правила рабочего пространства Windsurf и глобальные правила/MCP |
| `opencode` | `AGENTS.md`, `.opencode/engram.md`, `.opencode/skills/engram/SKILL.md`, `opencode.json` | Правила OpenCode, Agent Skill, инструменты MCP, пользовательские команды, хуки плагинов |
| `mcp` | `.mcp.json`; глобально: `~/.gemini/settings.json`, `~/.codex/config.toml`, и подсказка `claude mcp add` | Регистрация обертки JSON-lines в стиле MCP |
| `slash` | `.claude/commands/engram.md`, `.cursor/commands/engram.md`, `.gemini/commands/engram.toml`, `.opencode/commands/engram.md` | Нативные слэш-адаптеры `/engram` |

Псевдонимы: `codex` устанавливает адаптер `agents-md` вместе с общим файлом Agent Skill, `open-code` сопоставляется с `opencode`, а `cascade` — с `windsurf`. Старые цели `antigravity` и `antigravity-cli` сейчас являются скрытыми псевдонимами совместимости.

## Матрица возможностей хуков {#hook-capability-matrix}

| Хост | Установка хука в v1 | События |
| --- | --- | --- |
| `codex` | Да | `SessionStart`, `UserPromptSubmit`, `PreToolUse`, `PreCompact`, `SubagentStart` (опционально `SessionEnd`) |
| `claude` | Да | `SessionStart`, `UserPromptSubmit`, `InstructionsLoaded` (`PreToolUse` с `hooks.path_rules hook`), `PreCompact`, `SubagentStart` (опционально `SessionEnd`) |
| `gemini` | Да | `SessionStart`, `BeforeAgent`, `AfterTool`, `PreCompress` |
| `cursor` | Да | `sessionStart` |
| `windsurf` / `cascade` | Да | `pre_user_prompt` |
| `opencode` | Поддерживается через локальный плагин | `chat.message`, `experimental.chat.system.transform` |
| `copilot` | Пропущено | Недоступно |
| `cline` | Пропущено | Недоступно |

## Следующие шаги {#next-steps}

- [Codex](codex.md)
- [Claude](claude.md)
- [Gemini](gemini.md)
- [Cursor](cursor.md)
- [Windsurf / Cascade](windsurf.md)
- [OpenCode](opencode.md)
- [Copilot](copilot.md)
- [Cline](cline.md)
- [Слэш-адаптеры](slash.md)
- [Инструменты MCP](mcp.md)
- [Хуки и строки подтверждения](hooks.md)
