---
title: Процесс релиза и обновления
sidebar_position: 2
description: Обновление пакетов Engram и безопасная сверка корней памяти.
---

# Процесс релиза и обновления

## После обновления npm-пакета

Следующая стандартная команда Engram без лишнего шума один раз сверяет уже инициализированные корни рабочего пространства и глобальные корни для новой версии. Это охватывает изменения схемы памяти от релиза к релизу, начиная с версии v0.0.8, путем обновления сгенерированной справки, индексов памяти, файлов графов и подходящих векторных сайдкаров при обнаружении устаревших метаданных.

Проверка при запуске намеренно сделана дешевой после первого запуска: она считывает только небольшие маркеры конфигурации, если текущая версия уже записана. Она не запускается из npm postinstall, не создает новых корней памяти и не заменяет файлы, созданные человеком. Используйте `--no-auto-upgrade` или `ENGRAM_NO_AUTO_UPGRADE=1`, чтобы пропустить её для конкретной команды.

## Явное обновление

```bash
engram upgrade
engram upgrade --plan
engram upgrade --latest
```

`engram upgrade` обновляет сгенерированную справку рабочего пространства, индексы памяти, файлы графов, подходящие векторные сайдкары, существующие файлы наборов навыков рабочего пространства, созданные Engram, и зарегистрированные глобальные наборы навыков, сохраняя при этом файлы, созданные вручную.

`engram upgrade --latest` действует сильнее: перезаписывает текущие связанные артефакты агентов под управлением Engram для уже связанных агентов рабочего пространства и зарегистрированных глобальных установок, включая файлы инструкций, правила, конфигурацию MCP/плагинов и управляемые хуки, чтобы связанные хосты немедленно получали новые выходные данные пакета.

Используйте `--force` только при намеренной замене сгенерированных файлов адаптеров Engram.

## Профили рендеринга наборов навыков (Skillset)

Для хостов с возможностью выполнения в рантайме Engram устанавливает небольшие инструкции загрузчика (bootstrap) вместо полного протокола. Хуки обеспечивают маршрутизацию контекста задач, инструменты MCP предоставляют функции загрузки, поиска и предложений, а слэш-адаптеры или Agent Skills выполняют подробные рабочие процессы команд. Резервные цели без надежного внедрения контекста выполнения рантайма по-прежнему получают компактные инструкции вручную.

## Резервный вариант с БД конфигурации SQLite

Конфигурационная БД SQLite в Engram — это оптимизация для управления рабочими пространствами и профилями. Если базу данных невозможно открыть или инициализировать, обычные команды чтения/записи переходят на использование снимков конфигурации JSON. Команды, зависящие от БД, сообщают о недоступности SQLite вместо блокирования стандартного использования памяти.

## Следующие шаги

- [Устранение неполадок](troubleshooting.md)
- [CLI: inject / link / upgrade](../cli/inject-link-upgrade.md)

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

<!-- configuration-upgrade-inventory -->

Проверка конфликтов использует один и тот же общий план в CLI и Entry. Запустите ngram upgrade --latest --review, чтобы принять последнее предложение с учетом типа, отредактировать его через $VISUAL/$EDITOR или подтвердить **Keep current**. Entry предоставляет режимы просмотра **Current**, **Proposed** и **Diff**; **Diff** по умолчанию работает в режиме **Inline** и может переключаться в **Parallel**, при этом удалённый контент подсвечивается красным цветом, а добавленный — зелёным. Финальное применение блокируется, пока pendingReviewCount не равен нулю, а ngram upgrade --latest --yes отклоняет нерешённые или устаревшие решения. Каждое решение проверяется по исходному хэшу перед записью.

## Согласование конфигурации с учётом владения

Инвентаризация обновлений устраняет дублирование зарегистрированных интеграций по физическому файлу. Если несколько хостов используют одно и то же руководство Engram, Engram рендерит и записывает этот файл один раз.

Когда ручные правки делают нормальную замену артефакта Engram небезопасной, Entry предлагает **Force upgrade** только в том случае, если владение можно доказать. Для отмеченного блока Engram принудительное обновление заменяет только этот блок Engram и сохраняет окружающий пользовательский текст. Для зарегистрированного/сгенерированного файла Engram принудительное обновление может заменить весь сгенерированный файл. Неизвестное владение никогда не может быть принудительным, и пакетное подтверждение никогда не выполняет принудительных действий.

Успешное применение проверяется повторным сканированием после записи. Ожидаемые обновлённые артефакты, которые не сходятся к current, регистрируются как ошибки проверки.

## Git author identity

Engram can store a global author and an optional workspace override. Resolution is workspace, global, then read-only Git fallback. Settings affect future memories only; a workspace override never changes global Git configuration. Use explicit plan and confirmation for global Git sync or legacy-memory migration.

```bash
engram author show
engram author set --name "Jane Doe" --email "jane@example.com"
engram author unset --scope workspace
engram author sync-git-global --plan
engram author sync-git-global --confirm
engram author migrate-memories --plan
engram author migrate-memories --confirm
```

Read the complete [Git author settings guide](git-author-settings.md).
