---
title: Copilot
sidebar_position: 8
description: Интеграция Engram с GitHub Copilot через пользовательские инструкции репозитория и пользователя.
---

# Copilot

GitHub Copilot читает пользовательские инструкции репозитория из `.github/copilot-instructions.md`. Для глобальных установок Copilot Engram добавляет свой управляемый блок в `~/.copilot/copilot-instructions.md`.

## Установка {#install}

```bash
engram link copilot
```

## Записываемые файлы {#files-written}

| Файл | Назначение |
| --- | --- |
| `.github/copilot-instructions.md` | Пользовательские инструкции репозитория |

## Глобальная установка {#global-install}

```bash
engram link --global copilot
```

Добавляет управляемый блок в `~/.copilot/copilot-instructions.md`.

## Компактная/ручная резервная цель {#compact-manual-fallback-target}

Copilot является компактной/ручной резервной целью. Он получает полный компактный протокол. Установка хуков в v1 пропускается; используйте набор навыков (skillset) Engram или ручной `engram load` для получения контекста.

## Следующие шаги {#next-steps}

- [Обзор интеграций агентов](overview.md)
- [Хуки и строки подтверждения](hooks.md)
