---
title: sync / clone-memory / archive
sidebar_position: 7
description: Команды синхронизации, клонирования и архивирования для перемещения памяти между областями видимости.
---

# sync / clone-memory / archive

Перемещайте память между областями видимости и безопасно отправляйте неверную память в архив.

## clone-memory

```bash
engram clone-memory workspace global
engram clone-memory global workspace --force
engram clone-memory workspace global --metacognize
```

Копируйте активный Markdown `rules/`, `skills/` и `knowledge/` между областями видимости рабочего пространства и глобальной области. Добавьте `--metacognize`, если хотите, чтобы клонированные воспоминания предлагались через поток одобрения save-session вместо копирования без изменений.

Агенты могут преобразовывать обычные запросы клонирования в `engram clone-memory`, например, "clone workspace memory to global" -> `engram clone-memory workspace global`. Измените области видимости на противоположные, чтобы скопировать глобальную память в рабочее пространство; используйте `--force` только тогда, когда человек явно просит перезаписать целевые копии.

## archive

```bash
engram archive --reason "<why>" <id-or-file>
```

Архивируйте неверную или устаревшую память. Файл покидает активную маршрутизацию только после одобрения и остается сохраненным в папке `archive/`. Используйте архив, а не удаление, для обеспечения возможности аудита.

## observe (inbox)

```bash
engram observe --file session.md
engram save-session --file .agents/.engram/inbox/<note>.md
```

`observe` сохраняет очищенные необработанные заметки в папке `inbox/`. Заметки inbox не являются активной памятью.

## Глобальная синхронизация Git

Глобальная синхронизация Git контролируется полями конфигурации `global_git.*`. См. [Entry Web UI: Вкладка Construct](../entry/construct.md) для получения подробной информации о каждом поле. Используйте вкладку Runtime в `engram entry` для проверки разрешенного обнаружения Git.

## Следующие шаги

- [profiles / workspaces / config](profiles-workspaces-config.md)
- [Операции: командный рабочий процесс Git](../operations/team-git-workflow.md)
