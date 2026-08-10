---
title: Часто задаваемые вопросы
sidebar_position: 4
description: Часто задаваемые вопросы об Engram.
---

# Часто задаваемые вопросы (FAQ)

## Является ли Engram векторной базой данных?

Нет. Поиск в Engram по умолчанию — это детерминированный лексический поиск. Команда `engram search --semantic` добавляет детерминированное локальное сходство, а не семантический поиск на основе эмбеддингов (embeddings). Векторы графа — это локальные хэшированные векторы слов, а не семантические эмбеддинги. Дополнительный локальный sqlite-vec является слоем ускорения, а не первоисточником истины.

## Записывает ли Engram память автоматически?

Нет. Агенты предлагают кандидатов; люди одобряют. Прямой интерфейс CLI в терминале использует A/B/C. Чат ИИ-агента использует `yes`/`audit`/`cancel`. Только явные запросы на принятие всего (`ss -f`) сохраняют каждого кандидата, и агенты не должны добавлять флаг `--force`, если только человек не запросил его сам.

## Где хранится память?

- Память рабочего пространства: `<project>/.agents/.engram/`
- Глобальная память: везде, где вы её настроите (по умолчанию пуста до настройки)

Память рабочего пространства имеет приоритет. Глобальная память является резервной для многократно используемых настроек и контекста команды.

## Какие агенты поддерживаются?

Codex, Claude, Gemini (и совместимые с Gemini интерфейсы Antigravity), Cursor, Windsurf/Cascade, OpenCode, Copilot, Cline, универсальные хосты, совместимые с AGENTS.md, хосты с поддержкой MCP и хосты с косыми командами (slash-commands). См. [Обзор интеграции агентов](../integrations/overview.md).

## Реализовано ли шифрование?

Конфигурация шифрования существует, но зашифрованное хранилище еще не реализовано. Четко документируйте текущие ограничения.

## Могу ли я использовать Engram без Git?

Да. Git необязателен, но рекомендуется для хранения истории аудита, переносимости и командного анализа.

## Как архивировать неверную запись памяти?

```bash
engram archive --reason "<причина>" <id-или-файл>
```

Файл покидает активную маршрутизацию только после утверждения и остается в папке `archive/`. Используйте архивацию, а не удаление, для обеспечения аудитоспособности.

## Как мне переместить глобальную память?

```bash
engram update-global-folder <новый-путь>
engram ugf <новый-путь>
engram move global folder from <старый-путь> to <новый-путь>
```

Добавьте флаг `--move-from-path <старый-путь>`, если хотите, чтобы Engram также переместил весь старый глобальный корень в новое место.

## Следующие шаги

- [Устранение неполадок](troubleshooting.md)
- [Сравнение и план развития](../comparison/overview.md)

## Legacy memory migration to schema v3

`engram upgrade --latest` also migrates active v1/v2 memory files in the workspace and configured global roots to schema v3. Engram preserves each Markdown body exactly, creates `<memory-file>.pre-v3.bak`, fills only deterministic metadata, refreshes integrity hashes, and rebuilds the index, graph, and eligible vector sidecars. It never invents `evidence_refs`; a memory without verified trace links is marked `evidence_status: unverified`. Invalid memories are reported and skipped, archived memories are not rewritten, and a second run is idempotent.

Preview all changes without writing:

```bash
engram upgrade --latest --plan
```

Run only the memory migration, without overwriting linked agent artifacts:

```bash
engram upgrade --migrate-memories
```

Skip memory migration during a latest upgrade:

```bash
engram upgrade --latest --no-migrate-memories
```
