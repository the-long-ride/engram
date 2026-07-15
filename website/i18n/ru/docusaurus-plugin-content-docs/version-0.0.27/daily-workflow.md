---
title: Ежедневный рабочий процесс
sidebar_position: 4
description: Ежедневный цикл Engram — загрузка, работа, поиск, сохранение и поддержание здоровья памяти.
---

# Ежедневный рабочий процесс

Ежедневный цикл Engram намеренно сделан простым: загрузка памяти в начале, поиск при необходимости, сохранение при появлении долговечных данных и аудит в конце.

## Начало сессии

```text
/engram load "текущая задача"
```

Или из терминала:

```bash
engram load "<задача>"
```

Агент должен ответить компактной строкой подсчета, например `Engram loaded: 8 memories / 24 total related memories.`, если только человек не запросит ID, правила или необработанный вывод.

## Во время работы

Выполняйте поиск при изменении задачи или если подозреваете, что отсутствуют знания о проекте:

```text
/engram search "тема, которую я могу упустить"
```

Предварительный просмотр файлов памяти, которые будут маршрутизированы, без вывода их содержимого:

```bash
engram load --dry-run "<запрос>"
```

Возврат всех видимых совпадений маршрутизации вместо компактного лимита:

```bash
engram load --all "<запрос>"
```

## Сохранение одного долговечного факта

```text
/engram save knowledge
```

`engram save` захватывает лучший единственный кандидат памяти, автоматически обновляет соответствующую память или создает новую и всегда показывает шлюз подтверждения A/B/C перед записью.

## Сохранение нескольких воспоминаний сессии

```text
/engram save-session
/engram ss
```

Предоставьте кандидатов в следующей форме:

```text
TYPE: rule | TEXT: Always run tests before release. | CONTEXT: Created from release planning so future agents preserve the test gate.
TYPE: knowledge | TEXT: Release notes live in CHANGELOG.md.
TYPE: workflow | TEXT: When releasing, run tests, update changelog, then tag.
```

`CONTEXT: ...` необязателен. Добавляйте его только тогда, когда он объясняет, почему память существует.

## Анализ недавних чатов

```text
/engram save-session --query-level 3
/engram ss -f last 50 sessions
```

`--query-level` должен быть положительным целым числом. Агент может использовать до указанного количества недавних сессий чата человека и агента, включая текущую, и не должен выдумывать недоступную историю.

## Быстрое подтверждение всего

```text
/engram ss -f
```

`-f` означает, что человек явно одобряет каждого рекомендованного агентом кандидата. Агенты не должны добавлять `--force`, если человек этого не просил.

Если запуск «принять все» сообщает о связанных воспоминаниях перед записью, файлы еще не сохранены. Агент должен перезапустить процесс со структурированными кандидатами:

```text
TYPE: rule | TEXT: OAuth rotation follows release foundations. | DEPENDS_ON: release-foundation | LEVEL: advanced
TYPE: knowledge | TEXT: Invoice retries use exponential backoff. | UPDATE: invoice-retry-baseline
```

## Маршрутизация ролей (Role routing)

Сохранение памяти для конкретной роли:

```bash
engram save --role frontend ...
engram save-session --role backend ...
```

Настройка маршрутизации ролей:

```bash
engram set-role frontend
engram set-role backend security
engram set-role
```

При успешном выполнении `engram set-role ...` или `engram set-rule-variant ...` CLI возвращает строку `Agent action:`. Совместимые с Engram слеш-адаптеры и MCP-хосты должны немедленно перезапустить `engram load "<текущая задача/запрос>"` и рассматривать этот результат как замену ранее загруженного контекста Engram.

## Конец значимой работы

```text
Check Engram health, report invalid memories, and propose anything worth saving from this session.
```

Полезные команды:

```bash
engram upgrade
engram verify
engram repair
engram graph "<тема>"
engram quality-check
engram archive --reason "<почему>" <id-или-файл>
```

## Следующие шаги

- [Справочник по CLI](cli/overview.md)
- [Устранение неполадок при эксплуатации](operations/troubleshooting.md)
- [Entry Web UI](entry/index.md)

