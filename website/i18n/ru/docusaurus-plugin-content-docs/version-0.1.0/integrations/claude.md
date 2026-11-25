---
title: Claude
sidebar_position: 3
description: Интеграция Engram с Claude Code через CLAUDE.md, слэш-команды, Agent Skills, MCP и хуки.
---

# Claude

Claude Code читает `CLAUDE.md` для получения инструкций проекта (и проектный `AGENTS.md` только тогда, когда `CLAUDE.md` отсутствует) и поддерживает настройку внешних инструментов через `.mcp.json`. Начальная загрузка Engram ориентирована в первую очередь на AGENTS.md.

## Установка {#install}

```bash
engram link claude
```

## Записываемые файлы {#files-written}

| Файл | Назначение |
| --- | --- |
| `AGENTS.md` | Начальная загрузка инструкций проекта (управляемый блок, общий с Codex и OpenCode) |
| `CLAUDE.md` или `.claude/CLAUDE.md` | Блок начальной загрузки, только если этот файл уже существует и не импортирует `@AGENTS.md`; никогда не создается заново |
| `.claude/engram.md`, `.agents/engram.md` | Сопроводительные руководства с полным процессом записи/одобрения |
| `.claude/rules/engram/<id>.md` | Одно сгенерированное правило пути на каждое воспоминание workspace с `applies_to` (`hooks.path_rules native`) |
| `.claude/commands/engram.md` | Классическая слэш-команда `/engram` |
| `.claude/skills/engram/SKILL.md` | Agent Skill для вызова через слэш |
| `.claude/settings.json` | Хуки `SessionStart`, `UserPromptSubmit`, `InstructionsLoaded`, `PreCompact` и `SubagentStart` |
| `.mcp.json` | Регистрация MCP |

Claude получает как `.claude/commands/engram.md`, так и `.claude/skills/engram/SKILL.md`, поэтому `/engram` отображается в старых меню команд и в новых сессиях Claude Code с поддержкой навыков.

## Глобальная установка {#global-install}

```bash
engram link --global claude
```

Engram добавляет управляемый блок в `~/.claude/CLAUDE.md` (сохраняя текст пользователя) и записывает навык Claude в `~/.claude/skills/engram/SKILL.md`. Claude Code не читает `~/.claude/mcp.json`, поэтому глобальный MCP является подсказкой: Engram выводит команду `claude mcp add --scope user engram -- engram-mcp` для самостоятельного запуска.

## Цель, ориентированная на среду выполнения {#runtime-first-target}

Claude ориентирован на среду выполнения (runtime-first). Блок `AGENTS.md` (и блок `CLAUDE.md`, если этот файл существует) содержит краткие инструкции начальной загрузки, опирающиеся на инструменты MCP и хуки для детального протокола; сопроводительное руководство содержит полный рабочий процесс записи/одобрения, а файл Agent Skill служит краткой ссылкой на него. Существующий блок `CLAUDE.md` обновляется и никогда не удаляется, а `engram link` сообщает о наличии `CLAUDE.local.md` или `CLAUDE.md` в родительском каталоге, скрывающем `AGENTS.md` от Claude. Сгенерированный навык соответствует спецификации Agent Skills и добавляет `when_to_use` и `user-invocable: true`; `engram doctor` проверяет его (`host.skill_frontmatter`). Глобальная установка по-прежнему записывает в `~/.claude/CLAUDE.md`, поскольку Claude не читает `AGENTS.md` на уровне пользователя.

## Поведение хуков {#hook-behavior}

Claude поддерживает внедрение дополнительного контекста при запуске и во время промпта. `SessionStart` загружает маршрутизированные воспоминания при запуске; `UserPromptSubmit` внедряет только тела воспоминаний, еще не доставленные в этой сессии. `PreCompact` сбрасывает набор доставленных воспоминаний. `SubagentStart` (matcher `*`) внедряет маршрутизированный контекст в каждого субагента в рамках его собственного набора доставленного, а вывод хука удерживается в пределах 9 500 символов. Воспоминания с глобами `applies_to` поступают в Claude как нативные правила путей: `engram link claude` записывает `.claude/rules/engram/<id>.md` (фронтметтер только с путями плюс маркер `<!-- engram:<scope>:<file> sha:<8> -->`), а хук `InstructionsLoaded` (matcher `path_glob_match`) фиксирует каждую загрузку в наборе доставленного и в `usage.json`. Воспоминания рабочего уровня никогда не записываются, глобальные воспоминания отправляются в `~/.claude/rules/engram/` при `engram link --global claude`, а файлы без маркера остаются нетронутыми. Глобы в фигурных скобках требуют Claude Code v2.1.217 или новее. Чтобы сохранить старый механизм внедрения `PreToolUse`, выполните `engram config set hooks.path_rules hook` и `engram link claude`; это также удалит сгенерированные файлы правил.

## Одобрение MCP {#mcp-approval}

`engram_commit` несет флаг `_meta["anthropic/requiresUserInteraction"]: true`, поэтому Claude Code запрашивает подтверждение перед каждым вызовом даже в режимах обхода. Сохраняйте это поведение: `approval_token` подтверждает лишь наличие предложения. См. [Инструменты MCP](mcp.md).

## Следующие шаги {#next-steps}

- [Обзор интеграций агентов](overview.md)
- [Слэш-адаптеры](slash.md)
- [Инструменты MCP](mcp.md)
