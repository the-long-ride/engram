---
title: Codex
sidebar_position: 2
description: Интеграция Engram с OpenAI Codex через AGENTS.md и Agent Skills.
---

# Codex

OpenAI Codex и другие агенты, совместимые с AGENTS.md, используют `AGENTS.md` в качестве файла инструкций проекта. Псевдоним `codex` также записывает `.agents/skills/engram/SKILL.md`, поэтому агенты, обнаруживающие Agent Skills, могут маршрутизировать Engram как вызываемый навык (skill).

## Установка {#install}

```bash
engram link codex
```

## Записываемые файлы {#files-written}

| Файл | Назначение |
| --- | --- |
| `AGENTS.md` | Начальная загрузка инструкций проекта |
| `.agents/skills/engram/SKILL.md` | Краткий указатель Agent Skill на руководство |
| `.agents/engram.md` | Сопроводительное руководство с полным процессом записи/одобрения |
| `.codex/hooks.json` | Хуки `SessionStart`, `UserPromptSubmit`, `PreToolUse`, `PreCompact` и `SubagentStart` |
| `.mcp.json` | Регистрация MCP |

## Глобальная установка {#global-install}

```bash
engram link --global codex
```

Записывает навык Codex в `~/.codex/skills/engram/SKILL.md` и добавляет управляемый блок в общие файлы инструкций Codex. Глобальный MCP представляет собой управляемый блок `[mcp_servers.engram]` в `~/.codex/config.toml`; он также устанавливает `approval_mode = "approve"` для `[mcp_servers.engram.tools.engram_commit]`, поэтому Codex запрашивает подтверждение перед каждым коммитом (`engram upgrade` или `engram link codex` обновляет старые блоки). `engram doctor` сообщает размер цепочки AGENTS.md относительно лимита Codex в 32 КиБ (`host.agents_md_chain`).

## Поведение хуков {#hook-behavior}

Codex поддерживает внедрение дополнительного контекста при запуске и во время промпта. `SessionStart` загружает маршрутизированные воспоминания при запуске; `UserPromptSubmit` внедряет только тела воспоминаний, еще не доставленные в этой сессии. `PreToolUse` внедряет воспоминания, чьи глобы `applies_to` совпадают с файлами, отредактированными через `apply_patch` (не срабатывает при чтении), а `PreCompact` сбрасывает набор доставленных воспоминаний. `SubagentStart` (matcher `*`) внедряет маршрутизированный контекст в каждого субагента; набор доставленного субагента имеет ключ `<session_id>#agent:<agent_id>`, поэтому он никогда не касается родительского набора. Codex ограничивает сообщение хука примерно 2 500 токенами, поэтому Engram держит `additionalContext` на уровне 2 400 токенов или ниже и понижает тела до карточек, а не обрезает их.

## Цель, ориентированная на среду выполнения {#runtime-first-target}

Codex ориентирован на среду выполнения (runtime-first). `AGENTS.md` содержит краткие инструкции начальной загрузки, которые опираются на инструменты MCP и хуки для детального протокола; сопроводительное руководство содержит полный рабочий процесс записи/одобрения, а файл Agent Skill служит краткой ссылкой на него.

## Следующие шаги {#next-steps}

- [Обзор интеграций агентов](overview.md)
- [Хуки и строки подтверждения](hooks.md)
