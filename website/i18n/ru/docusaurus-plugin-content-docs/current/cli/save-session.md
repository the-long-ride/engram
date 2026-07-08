---
title: save / save-session / observe
sidebar_position: 3
description: Команды записи — сохранение одного воспоминания, сохранение нескольких воспоминаний сессии и сбор необработанных заметок.
---

# save / save-session / observe

Команды записи предлагают память через шлюз подтверждения.

## save

```bash
engram save [rule|workflow|knowledge] "<text>"
engram save --role frontend "<text>"
engram save --scope global "<text>"
```

`engram save` захватывает лучший единственный кандидат памяти, автоматически обновляет соответствующую память или создает новую и всегда показывает шлюз подтверждения A/B/C перед записью.

Когда `engram save` находит связанную активную память, превью одобрения сообщает о ней с предлагаемым `depends_on` или предупреждением о возможном дублировании.

## save-session

```bash
engram save-session
engram ss
engram save-session --query-level 3
engram ss -a
engram ss -a last 50 sessions
engram save-session --file transcript.md
engram save-session --accept-all
```

Используйте `save-session`, когда долгое взаимодействие привело к созданию нескольких кандидатов:

```text
TYPE: rule | TEXT: Always run tests before release. | CONTEXT: Created from release planning so future agents preserve the test gate.
TYPE: knowledge | TEXT: Release notes live in CHANGELOG.md.
TYPE: workflow | TEXT: When releasing, run tests, update changelog, then tag.
```

`CONTEXT: ...` необязателен. Добавляйте его только тогда, когда он объясняет, почему память существует. Кандидаты также могут добавлять поля `DEPENDS_ON`, `LEVEL` или `UPDATE` при реструктуризации связанной памяти.

- `--query-level <n>` — извлечь до n недавних доступных чатов между человеком и агентом; должно быть положительным целым числом; агенты не должны придумывать недоступную историю
- `--accept-all` / `-a` — каждый сгенерированный кандидат сохраняется, потому что человек явно одобрил это сокращение
- `--file <path>` — для транскриптов или длинных резюме, уже находящихся на диске

Для `/engram take-control --accept-all` или обычного `/engram take control accept all` слеш-адаптер нормализует формулировку, генерирует только кратких кандидатов `TYPE: ... | TEXT: ...` и позволяет Engram сохранить их без второго запроса одобрения.

## observe

```bash
engram observe --file session.md
engram save-session --file .agents/.engram/inbox/<note>.md
```

`observe` сохраняет очищенные необработанные заметки в папке `inbox/`. Заметки из папки inbox не являются активной памятью. Используйте это, когда хотите сохранить черновые заметки перед тем, как решить, что должно стать постоянной памятью.

## Подсказки о связанной памяти

Если запуск «принять все» сообщает о связанных воспоминаниях перед записью, файлы еще не сохранены. Агент должен перезапустить процесс со структурированными кандидатами:

```text
TYPE: rule | TEXT: OAuth rotation follows release foundations. | DEPENDS_ON: release-foundation | LEVEL: advanced
TYPE: knowledge | TEXT: Invoice retries use exponential backoff. | UPDATE: invoice-retry-baseline
```

## Следующие шаги

- [inject / link / upgrade](inject-link-upgrade.md)
- [Концепции: путь записи и одобрение](../concepts/write-path.md)
