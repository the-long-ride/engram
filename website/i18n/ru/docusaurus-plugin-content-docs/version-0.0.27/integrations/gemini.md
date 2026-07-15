---
title: Gemini
sidebar_position: 4
description: Интеграция Engram с Gemini CLI и Gemini-совместимыми окружениями Antigravity.
---

# Gemini

Gemini CLI ищет файлы `GEMINI.md` в качестве контекста. Цель `slash` записывает `.gemini/commands/engram.toml`, чтобы `/engram <args>` стала пользовательской командой проекта в Gemini CLI.

Engram также рассматривает `gemini` как публичную цель для Antigravity 2.0, Antigravity CLI и Antigravity IDE, поскольку текущая документация Google все еще связывает контекст и навыки Antigravity с Gemini-совместимыми расположениями. Скрытые целевые имена `antigravity` и `antigravity-cli` остаются явными путями совместимости, но они не отображаются в `engram link list`, справке, автодополнении или `all`.

## Установка

```bash
engram link gemini
```

## Записанные файлы

| Файл | Назначение |
| --- | --- |
| `GEMINI.md` | Загрузчик контекста проекта |
| `.gemini/commands/engram.toml` | Слэш-адаптер `/engram` |
| `.gemini/settings.json` | Хуки `SessionStart` и `BeforeAgent` |
| Gemini MCP config | Регистрация MCP |

## Глобальная установка

```bash
engram link --global gemini
```

Записывает `~/.gemini/GEMINI.md`, `~/.gemini/skills/engram/SKILL.md` и конфигурационный файл Gemini MCP.

## Runtime-first цель

Gemini является runtime-first целью. `GEMINI.md` содержит краткие инструкции по загрузке, которые полагаются на инструменты MCP и хуки для детального протокола; файл Agent Skill содержит полный рабочий процесс записи/утверждения.

## Поведение хуков

Gemini поддерживает запуск и внедрение `hookSpecificOutput.additionalContext` во время ввода промпта через события `SessionStart` и `BeforeAgent`.

## Совместимость с Antigravity

Для хуков `gemini` также является общедоступным резервным вариантом для Antigravity. Скрытые цели хуков `antigravity` и `antigravity-cli` нормализуются до поведения и путей хуков Gemini, пока Google не опубликует стабильную основную документацию по хукам/конфигурациям Antigravity.

## Дальнейшие шаги

- [Обзор интеграций с агентами](overview.md)
- [Хуки и строки подтверждения](hooks.md)
