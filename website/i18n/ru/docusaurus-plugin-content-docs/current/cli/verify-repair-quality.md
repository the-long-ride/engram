---
title: verify / repair / quality-check
sidebar_position: 6
description: Команды обслуживания — проверка хешей, восстановление некорректных файлов, проверка качества и разрешение конфликтов.
---

# verify / repair / quality-check

Команды обслуживания поддерживают память в здоровом состоянии.

## status

```bash
engram status
engram stat
engram status --json
```

Выводит сводку на одном экране: корни памяти рабочего пространства и глобальный корень, активный профиль, подключённые хосты, ожидающие квитанции проверки, количество записей уровня `working` и состояние целостности/актуальности. `engram stat` — короткий псевдоним, а `--json` выводит структурированный снимок для скриптов.

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
engram stats --backfill [--git <range>] [--limit <n>]
```

`--usage` читает локальный, исключённый из Git `.agents/.engram/usage.json` и показывает счётчики выборок (`engram load --id`), замкнутые счётчики исходов (`applied`, `corrected` и `noisy` / бесполезные инъекции), а также воспоминания, которые были внедрены, но ни разу не получены за 30 дней. `--backfill` дозаполняет историческую телеметрию использования в `usage.json` из истории коммитов Git (недавние не-merge коммиты через `backfillUsageFromGit`, с опциональными `[--git <range>] [--limit <n>]`).

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
engram graph link <parent-id> <child-id...>
```

Проверяйте маршрутизацию по графу перед архивированием, связывайте явные предварительные условия `depends_on` командой `engram graph link <parent-id> <child-id...>` или запускайте `engram graph --rebuild` после ручных правок.

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
engram benchmark <cases.json> --json
engram benchmark <cases.json> --baseline <baseline.json> --fail-on forbidden,recall
engram benchmark <cases.json> --write-report <report.json>
engram benchmark --from-git [--out <path>]
```

Запускает версионированные наборы регрессионных проверок извлечения, включая `freshness-ordering` (бонус свежести и упорядочивание тел с учётом внимания), `multi-turn-session` (экономия токенов хуков между репликами) и `telemetry-loop` (замкнутая телеметрия исходов `real-stacks-v1` и затухание шума). Используйте `--from-git [--out <path>]` для синтеза локальных кейсов бенчмарка из недавней истории Git, `--baseline` для сравнения с сохранёнными метриками, `--write-report` для записи JSON-отчёта только с идентификаторами и `--fail-on` для падения CI при конкретных регрессиях.

## Дальнейшие шаги

- [sync / archive](sync-archive.md)
- [Устранение неполадок](../operations/troubleshooting.md)
