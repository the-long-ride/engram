# Руководство по операциям

На этой странице приведено подробное руководство по использованию, чтобы файл README оставался кратким.

## Список команд

| Потребность | Команда |
| --- | --- |
| Загрузить память для задачи | `engram load "<задача>"` |
| Найти запись в памяти | `engram search "<тема>"` |
| Сохранить одну запись памяти | `engram save [rule\|workflow\|knowledge] "<текст>"` |
| Сохранить несколько записей по итогам сессии | `engram save-session` или `engram ss` |
| Одобрить сохранение всех кандидатов сессии | `engram ss -a` |
| Создать черновую заметку | `engram observe --file session.md` |
| Импортировать существующие инструкции/документы | `engram take-control --all` |
| Предварительный просмотр плана импорта | `engram take-control --plan` |
| Проверить маршрутизацию графа | `engram graph "<тема>"` |
| Проверить целостность хэшей | `engram verify` |
| Найти поврежденные файлы памяти | `engram repair` |
| Отправить неверную память в архив | `engram archive --reason "<причина>" <id-или-файл>` |
| Настроить силу фильтрации правил | `engram set-rule-variant strict\|balanced\|light\|off` |

Используйте `save-session` для фиксации памяти по итогам длинных сессий взаимодействия. Короткая форма: `ss`.

## Сохранение сессии (Save Session)

Используйте команду `save-session`, когда длительное взаимодействие с агентом привело к появлению нескольких кандидатов на запись в память:

```text
TYPE: rule | TEXT: Always run tests before release.
TYPE: knowledge | TEXT: Release notes live in CHANGELOG.md.
TYPE: workflow | TEXT: When releasing, run tests, update changelog, then tag.
```

Без флага `--accept-all` Engram спросит вас, какие именно кандидаты следует сохранить. С флагом `ss -a` сохраняются все сгенерированные кандидаты, поскольку человек явно разрешил это действие.

## Импорт под контроль (Take Control)

Команда `take-control` помогает внедрить Engram в существующие репозитории. Она сканирует инструкции для агента, заметки, документацию и выбранные файлы, а затем предлагает лаконичные кандидаты для сохранения.

Полезные параметры фильтрации:

```bash
engram take-control --plan
engram take-control --all
engram take-control --file AGENTS.md
engram take-control --dir docs
engram take-control --include "docs/**/*.md" --exclude "docs/private/**"
engram take-control --max-sources 5 --max-chars 900
```

Сохраненная через `take-control` память записывает поля `source_files` и `source_hashes`, поэтому неизмененные файлы-источники при последующих запусках будут автоматически пропущены.

## Наблюдение (Observe)

Команда `observe` сохраняет очищенные сырые заметки в папку `inbox/`. Заметки из папки inbox не участвуют в активной работе памяти.

```bash
engram observe --file session.md
engram save-session --file .agents/.engram/inbox/<заметка>.md
```

Используйте этот рабочий процесс, когда хотите сохранить предварительные наброски, прежде чем решить, что из этого должно стать долговечной памятью.

## Восстановление и проверка

Используйте команду `repair` после ручного редактирования или импорта файлов:

```bash
engram repair
engram rebuild-index
engram verify
```

Используйте визуализацию графа и проверки качества перед архивацией устаревших файлов:

```bash
engram graph "package manager"
engram quality-check
engram archive --reason "Repo migrated to npm." rules/use-pnpm.md
```

Далее: [Сравнение и дорожная карта](comparison.md).
