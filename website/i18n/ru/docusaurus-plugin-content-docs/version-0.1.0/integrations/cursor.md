---
title: Cursor
sidebar_position: 5
description: Интеграция Engram с Cursor через правила, MCP, локальный плагин, слэш-команды и хуки начала сессии.
---

# Cursor

Cursor считывает правила проекта из файлов `.cursor/rules/*.mdc`. Engram записывает `.cursor/rules/engram.mdc` с валидным фронтметтером (`alwaysApply: true`) и блоком инструкций начальной загрузки.

## Установка {#install}

```bash
engram link cursor
```

## Записываемые файлы {#files-written}

| Файл | Назначение |
| --- | --- |
| `.cursor/rules/engram.mdc` | Правила проекта с `alwaysApply: true` |
| `.cursor/mcp.json` | Регистрация MCP (`type: "stdio"`) |
| `.cursor/rules/engram/<id>.mdc` | Одно сгенерированное правило на каждое воспоминание workspace с `applies_to` (`alwaysApply: false`, глобы через запятую); воспоминания рабочего уровня никогда не записываются |
| `.cursor/hooks.json` | Хук `sessionStart` |
| `.cursor/commands/engram.md` | Слэш-адаптер `/engram` |

## Глобальная установка {#global-install}

```bash
engram link --global cursor
```

Engram создает локальный плагин в `~/.cursor/plugins/local/engram/`, содержащий манифест плагина, правила, навыки (skills), команды, конфигурацию MCP и хуки.

## Цель, ориентированная на среду выполнения {#runtime-first-target}

Cursor ориентирован на среду выполнения (runtime-first). Правила проекта содержат краткие инструкции начальной загрузки, которые опираются на инструменты MCP и хуки для детального протокола; сопроводительное руководство содержит полный рабочий процесс записи/одобрения, а файл Agent Skill служит краткой ссылкой на него.

## Поведение хуков {#hook-behavior}

Хук `sessionStart` внедряет контекст запуска Engram через выходное поле `additional_context`. `beforeSubmitPrompt` работает только на разрешение/блокировку и не используется для внедрения контекста.

## Формат экспорта {#export-format}

`engram export --format cursor-rules` записывает `.cursor/rules/engram.mdc` с фронтметтером `description` и `alwaysApply: false`. Он заменяет `cursorrules`, который остается допустимым псевдонимом на протяжении одного релиза и выводит предупреждение об устаревании в stderr. `live_sync.targets` использует новое имя.

## Следующие шаги {#next-steps}

- [Обзор интеграций агентов](overview.md)
- [Хуки и строки подтверждения](hooks.md)
