---
title: Codex
sidebar_position: 2
description: Интеграция Engram с OpenAI Codex через AGENTS.md и Agent Skills.
---

# Codex

OpenAI Codex и другие совместимые с AGENTS.md агенты используют `AGENTS.md` в качестве файла инструкций проекта. Алиас `codex` также записывает `.agents/skills/engram/SKILL.md`, чтобы агенты, обнаруживающие Agent Skills, могли перенаправлять Engram как вызываемый навык.

## Установка

```bash
engram link codex
```

## Записанные файлы

| Файл | Назначение |
| --- | --- |
| `AGENTS.md` | Загрузчик инструкций проекта |
| `.agents/skills/engram/SKILL.md` | Agent Skill с полным рабочим процессом записи/утверждения |
| `.codex/hooks.json` | Хуки `SessionStart` и `UserPromptSubmit` |
| `.mcp.json` | Регистрация MCP |

## Глобальная установка

```bash
engram link --global codex
```

Записывает навык Codex в `~/.codex/skills/engram/SKILL.md` и добавляет управляемый блок в общие файлы инструкций Codex.

## Поведение хуков

Codex поддерживает запуск и внедрение дополнительного контекста во время ввода промпта. `SessionStart` загружает перенаправленную память при запуске; `UserPromptSubmit` выполняет повторное внедрение только при изменении перенаправленного контекста Engram.

## Runtime-first цель

Codex является runtime-first целью. `AGENTS.md` содержит краткие инструкции по загрузке, которые полагаются на инструменты MCP и хуки для детального протокола; файл Agent Skill содержит полный рабочий процесс записи/утверждения.

## Дальнейшие шаги

- [Обзор интеграций с агентами](overview.md)
- [Хуки и строки подтверждения](hooks.md)
