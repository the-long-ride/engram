---
title: verify / repair / quality-check
sidebar_position: 6
description: Команды обслуживания — проверка хэшей, восстановление неверных файлов, проверка качества и разрешение конфликтов.
---

# verify / repair / quality-check

Команды обслуживания поддерживают здоровье памяти.

## verify

```bash
engram verify
```

Проверяет целостность хэшей. Запускайте после ручного редактирования или импорта.

## repair

```bash
engram repair
engram rebuild-index
```

Используйте `repair` после ручного редактирования или импорта, чтобы найти некорректные файлы памяти, пропущенные при перестроении индекса.

## quality-check

```bash
engram quality-check
```

Компактно сообщает о потенциальных противоречиях. Обнаружение противоречий является эвристическим и рекомендательным.

## graph

```bash
engram graph "package manager"
engram graph --rebuild
```

Проверьте маршрутизацию графа перед архивированием. Запустите `engram graph --rebuild` после ручного редактирования.

## archive

```bash
engram archive --reason "Repo migrated to npm." rules/use-pnpm.md
```

Архивируйте неверную или устаревшую память. Используйте архив, а не удаление, для обеспечения возможности аудита. Файл покидает активную маршрутизацию только после одобрения и остается сохраненным в папке `archive/`.

## resolve-conflicts

```bash
engram resolve-conflicts --dry-run --metacognize
engram resolve-conflicts --metacognize
```

Просматривайте или разрешайте только конфликты памяти рабочего пространства, принадлежащие Engram. Добавьте `--metacognize`, когда агент должен проверить папку памяти после обработки конфликтов. Команда сохраняет детерминированную обработку конфликтов в области `.agents/.engram/`, а затем добавляет пакет исходников самоанализа рабочего пространства для кратких кандидатов `TYPE/TEXT`.

## benchmark

```bash
engram benchmark
```

Проверки регрессии извлечения.

## Следующие шаги

- [sync / archive](sync-archive.md)
- [Устранение неполадок при эксплуатации](../operations/troubleshooting.md)
