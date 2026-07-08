---
title: Слэш-адаптеры
sidebar_position: 10
description: Слэш-адаптеры Engram предоставляют команды /engram для Claude, Cursor, Gemini и OpenCode.
---

# Слэш-адаптеры

Цель `slash` записывает нативные слэш-адаптеры `/engram` для хостов, поддерживающих слэш-команды проекта или Agent Skills.

## Записанные файлы

| Файл | Хост |
| --- | --- |
| `.claude/commands/engram.md` | Claude Code |
| `.claude/skills/engram/SKILL.md` | Claude Code (в виде навыка) |
| `.cursor/commands/engram.md` | Cursor |
| `.gemini/commands/engram.toml` | Gemini CLI |
| `.opencode/commands/engram.md` | OpenCode |

## Общие команды

```text
/engram
/engram propose
/engram load deployment workflow
/engram entry
/engram save knowledge
/engram save-session
/engram save-session --query-level 3
/engram ss
/engram ss -a
/engram ss -a last 50 sessions
/engram take-control
/engram take control accept all
/engram restructure workspace memory accept all
/engram resolve conflicts and metacognize
/engram graph release workflow
/engram archive --reason "Superseded" knowledge/old-fact.md
/engram set-rule-variant strict
/engram verify
```

## Поведение

Если хост предоставляет только одну видимую команду `/engram`, простая команда `/engram` должна возвращать компактное меню из команд `load`, `search`, `save`, `propose`, `entry` и `help` вместо запуска CLI. `/engram propose` является алиасом уровня слэша: нормализует команду до `engram save-session` для текущего чата/сессии.

`/engram ss -a` — это ярлык для автоматического принятия всего. Агенты не должны добавлять флаг `--accept-all`, если человек сам этого не потребовал.

## Нормализация выражений на естественном языке

| Естественный язык | Нормализуется в |
| --- | --- |
| `/engram auto save` | `engram save-session` |
| `/engram take control accept all` | `engram take-control --accept-all` |
| `/engram restructure workspace memory accept all` | `engram metacognize --workspace --accept-all` |
| `/engram take control accept all metacognize` | `engram take-control --accept-all --metacognize` |
| `/engram resolve conflicts and metacognize` | `engram resolve-conflicts --metacognize` |
| `/engram ss -a last 50 sessions` | `engram save-session --query-level 50 --accept-all` |

## Дальнейшие шаги

- [Инструменты MCP](mcp.md)
- [Хуки и строки подтверждения](hooks.md)
