---
title: sync / clone-memory / archive
sidebar_position: 7
description: Команды sync, clone и archive для перемещения воспоминаний между областями.
---

# sync / clone-memory / archive

Перемещайте воспоминания между областями и безопасно выводите из обращения ошибочные воспоминания.

## clone-memory

```bash
engram clone-memory workspace global
engram clone-memory global workspace --force
engram clone-memory workspace global --metacognize
```

Копирует активный Markdown из `rules/`, `skills/` и `knowledge/` между областями workspace и global. Добавьте `--metacognize`, если хотите, чтобы клонированные воспоминания предлагались через процесс одобрения save-session, а не копировались дословно.

Агенты могут нормализовать запросы на клонирование на естественном языке в `engram clone-memory`, например "clone workspace memory to global" -> `engram clone-memory workspace global`. Поменяйте области местами для клонирования глобальной памяти в workspace; используйте `--force` только тогда, когда человек явно запросил перезапись дубликатов в месте назначения.

## archive

```bash
engram archive --reason "<why>" <id-or-file>
```

Архивирует неверные или вытесненные воспоминания. Файл покидает активную маршрутизацию только после одобрения и сохраняется в `archive/`. Используйте архив, а не удаление, для сохранения истории аудита.

## observe (inbox)

```bash
engram observe --file session.md
engram save-session --file .agents/.engram/inbox/<note>.md
```

`observe` сохраняет очищенные необработанные заметки в папку `inbox/`. Заметки во входящих не являются активными воспоминаниями.

## Глобальная синхронизация Git {#global-git-sync}

Глобальная синхронизация Git управляется полями конфигурации `global_git.*`. Описание каждого поля см. в [Веб-интерфейс Entry: вкладка Construct](../entry/construct.md). Используйте `engram entry` и вкладку Construct или `engram config view` для проверки разрешенного обнаружения Git.

## Следующие шаги {#next-steps}

- [профили / workspaces / конфигурация](profiles-workspaces-config.md)
- [Операции: командный рабочий процесс Git](../operations/team-git-workflow.md)
