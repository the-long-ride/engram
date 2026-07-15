---
title: Установка и настройка
sidebar_position: 3
description: Установка Engram CLI, инициализация рабочего пространства, настройка глобальной памяти и связывание AI-агентов.
---

# Установка и настройка

## Требования

- Node.js `>=20`
- Поддерживаемый AI-агент (Codex, Claude, Gemini, Cursor, Windsurf, OpenCode, Copilot, Cline или любой хост, совместимый с AGENTS.md)

## Установка CLI

```bash
npm install -g @the-long-ride/engram
```

Проверить:

```bash
engram --version
```

Устанавливаются два исполняемых файла:

- `engram` — основной CLI
- `engram-mcp` — исполняемый файл сервера MCP для хостов, регистрирующих процессы внешних инструментов

## Инициализация рабочего пространства (workspace)

Из корневой папки проекта:

```bash
engram inject
```

Это создает каталог `.agents/.engram/` и по умолчанию устанавливает компактную цель Codex: `AGENTS.md` плюс `.agents/skills/engram/SKILL.md`.

Используйте `engram inject --no-skillset` для пропуска файлов агента или `engram inject --skillset all` для установки каждого поддерживаемого адаптера во время внедрения. Существующие файлы, созданные человеком, пропускаются.

## Настройка с помощью Entry Web UI

Самый дружественный способ настройки:

```bash
engram entry
```

Это запускает локальную панель управления. Настраивайте корни памяти, связывайте агентов и настраивайте маршрутизацию без ручного редактирования JSON. См. [Entry Web UI](entry/index.md) для получения информации о каждой вкладке и поле.

## Настройка глобальной памяти

Глобальная память не является обязательной и находится там, где вы ее настроите. Она хранит настройки и контекст команды, которые должны сопровождать вас в разных репозиториях.

```bash
engram inject --global-only --global-path ~/Documents/engram
```

Или обновите глобальную папку позже:

```bash
engram update-global-folder ~/Documents/engram
engram ugf ~/Documents/engram
```

Формы в стиле чата, такие как `engram set global memory path to <new-path>` и `engram move global folder from <old-path> to <new-path>`, приводятся к одной и той же команде. Добавьте `--move-from-path <old-path>`, если они также хотят, чтобы Engram переместил весь старый глобальный корень в новое местоположение.

## Связывание AI-агентов

Установите хуки агента и регистрацию MCP для хоста:

```bash
engram link codex
engram link claude
engram link gemini
engram link cursor
engram link windsurf
engram link --global opencode
engram set-proof compact
```

`engram link all` устанавливает набор публичных целей и сообщает о детерминированных причинах `SKIPPED` для частичных хостов в файлах инструкций наборов навыков, конфигурации MCP, слеш-адаптерах и хуках агента в одной унифицированной установке. `engram unlink` удаляет все это вместе.

См. [Интеграция агентов](integrations/overview.md) для получения полной матрицы целей.

## Рабочий процесс с подмодулями (Submodule)

Если человек хочет, чтобы `.agents/.engram` отслеживался как отдельный репозиторий:

```bash
engram inject --submodule
```

Добавляйте `--submodule-remote <git-url>` только после того, как человек предоставит URL. Engram проверяет URL, инициализирует подмодуль на ветке `main` и создает первый коммит подмодуля с сообщением `Initialize engram`.

## Общий глобальный Git-источник

Если `engram entry` не показывает `global_git_detected.remote_url`, спросите человека, должна ли глобальная память совместно использоваться через Git. Когда он предоставит URL:

```bash
engram inject --global-remote <git-url>
```

## Проверка установки

```bash
engram verify
engram load --dry-run "setup"
engram llm
```

`engram llm` выводит упакованное руководство по использованию AI-агента и не требует инициализированного рабочего пространства.

## Следующие шаги

- [Ежедневный рабочий процесс](daily-workflow.md)
- [Entry Web UI](entry/index.md)
- [Интеграция агентов](integrations/overview.md)
