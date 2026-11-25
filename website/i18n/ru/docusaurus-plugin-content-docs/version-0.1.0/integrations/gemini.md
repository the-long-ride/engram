---
title: Gemini
sidebar_position: 4
description: Интеграция Engram с Gemini CLI и совместимыми с Gemini интерфейсами Antigravity.
---

# Gemini

Gemini CLI выполняет поиск файлов `GEMINI.md` в качестве контекста. Цель `slash` записывает `.gemini/commands/engram.toml`, делая `/engram <args>` пользовательской командой проекта в Gemini CLI.

Engram также рассматривает `gemini` как публичную цель для Antigravity 2.0, Antigravity CLI и Antigravity IDE, поскольку текущая документация Google по-прежнему привязывает контекст и навыки Antigravity к путям, совместимым с Gemini. Скрытые имена целей `antigravity` и `antigravity-cli` остаются явными путями совместимости, но не отображаются в `engram link list`, справке, автодополнении или `all`.

## Установка {#install}

```bash
engram link gemini
```

## Записываемые файлы {#files-written}

| Файл | Назначение |
| --- | --- |
| `GEMINI.md` | Начальная загрузка контекста проекта |
| `.gemini/commands/engram.toml` | Слэш-адаптер `/engram` |
| `.gemini/settings.json` | Хуки `SessionStart`, `BeforeAgent`, `AfterTool` и `PreCompress` |
| `.gemini/settings.json` | Регистрация MCP (`mcpServers.engram`, объединяется рядом с хуками) |

## Глобальная установка {#global-install}

```bash
engram link --global gemini
```

Записывает `~/.gemini/GEMINI.md`, `~/.gemini/skills/engram/SKILL.md` и объединяет `mcpServers.engram` в `~/.gemini/settings.json`.

## Цель, ориентированная на среду выполнения {#runtime-first-target}

Gemini ориентирован на среду выполнения (runtime-first). `GEMINI.md` содержит краткие инструкции начальной загрузки, которые опираются на инструменты MCP и хуки для детального протокола; сопроводительное руководство содержит полный рабочий процесс записи/одобрения, а файл Agent Skill служит краткой ссылкой на него.

## Поведение хуков {#hook-behavior}

Gemini поддерживает внедрение `hookSpecificOutput.additionalContext` при запуске и во время промпта через события `SessionStart` и `BeforeAgent`; `PreCompress` (перед тем, как CLI обобщает историю) сбрасывает набор доставленных воспоминаний. `AfterTool` (matcher `read_file|write_file|replace`, таймаут в миллисекундах) внедряет до 3 недоставленных воспоминаний, чьи глобы `applies_to` совпадают с файлом, затронутым инструментом; контекст добавляется к результату инструмента, поэтому он поступает через один шаг после чтения. Он разделяет набор доставленных воспоминаний с `BeforeAgent` и никогда не возвращает решение. `engram link gemini` или `engram upgrade --latest` добавляет это событие к существующей установке.

Если `mcpServers.engram` в `.gemini/settings.json` устанавливает `trust: true`, Gemini пропускает подтверждение для `engram_commit`; `engram doctor` предупреждает об этом (`host.gemini_trust`).

## Совместимость с Antigravity {#antigravity-compatibility}

Для хуков `gemini` также является публичным запасным вариантом для Antigravity. Скрытые цели хуков `antigravity` и `antigravity-cli` нормализуются к поведению и путям хуков Gemini до тех пор, пока Google не опубликует стабильную основную документацию по хукам/конфигурации Antigravity.

## Следующие шаги {#next-steps}

- [Обзор интеграций агентов](overview.md)
- [Хуки и строки подтверждения](hooks.md)
