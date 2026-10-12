---
title: verify / repair / quality-check
sidebar_position: 6
description: Команды обслуживания — проверка хешей, восстановление некорректных файлов, проверка качества и разрешение конфликтов.
---

# verify / repair / quality-check

Команды обслуживания поддерживают память в здоровом состоянии.

## verify

```bash
engram verify
engram verify --sources
engram verify --sources --json
```

Проверяет хеши на целостность. Запускайте после ручных правок или импорта.

`--sources` также заново хеширует `source_files` воспоминаний take-control и сверяет их с `source_hashes`, записывая изменённые или отсутствующие в локальный, исключённый из Git `.agents/.engram/stale.json`. Устаревшие источники никогда не приводят к сбою `verify`: `load` ранжирует устаревшие воспоминания ниже и заканчивает их карточки меткой ` (stale)`, а `engram take-control --refresh` предлагает для них обновления. Пути источников должны оставаться внутри рабочего пространства; абсолютные пути, `..`, символические и жёсткие ссылки, секретные файлы, `.git` и данные Engram сообщаются как непроверенные и никогда не читаются. В `--json` поле `skipped` перечисляет объекты `{key, reason}`. Глобальное воспоминание take-control запоминает рабочее пространство, из которого оно пришло, и проверяется только там.

## stats

```bash
engram stats
engram stats --usage
```

`--usage` читает локальный, исключённый из Git `.agents/.engram/usage.json` и показывает, какие воспоминания агенты действительно получают через `engram load --id`, а какие были внедрены, но ни разу не получены за 30 дней.

## repair

```bash
engram repair
engram rebuild-index
```

Используйте `repair` после ручных правок или импорта, чтобы найти некорректные файлы памяти, пропущенные при перестроении индекса.

```bash
engram repair --move-backups
engram repair workspace --move-backups --confirm
```

`--move-backups` планирует перенос разрозненных резервных копий миграции `*.bak` из `rules`, `skills` и `knowledge` в исключённую из Git папку `backups/<kind>-<label>/` (например, `backups/schema-v3/rules/x.md.pre-v3.bak`). Добавьте `--confirm`, чтобы выполнить перенос; другой файл, уже лежащий в месте назначения, сообщается как конфликт и остаётся на месте. `engram doctor` сообщает об этих файлах как о `memory.stray_backups`.

## quality-check

```bash
engram quality-check
```

Компактно сообщает о кандидатах на противоречия. Обнаружение противоречий эвристическое и носит рекомендательный характер.

## graph

```bash
engram graph "package manager"
engram graph --rebuild
```

Проверяйте маршрутизацию по графу перед архивированием. Запускайте `engram graph --rebuild` после ручных правок.

## archive

```bash
engram archive --reason "Repo migrated to npm." rules/use-pnpm.md
```

Архивируйте неверные или заменённые воспоминания. Для аудируемости используйте архивирование, а не удаление. Файл покидает активную маршрутизацию только после подтверждения и остаётся сохранённым в `archive/`.

## resolve-conflicts

```bash
engram resolve-conflicts --dry-run --metacognize
engram resolve-conflicts --metacognize
```

Предпросмотр или разрешение только тех конфликтов памяти рабочего пространства, которыми владеет Engram. Добавьте `--metacognize`, если агент должен просмотреть папку памяти после обработки конфликтов. Команда ограничивает детерминированную обработку конфликтов областью `.agents/.engram/`, а затем добавляет пакет источников metacognize рабочего пространства для кратких кандидатов `TYPE/TEXT`.

## benchmark

```bash
engram benchmark
```

Проверки регрессии извлечения.

## Дальнейшие шаги

- [sync / archive](sync-archive.md)
- [Устранение неполадок](../operations/troubleshooting.md)
