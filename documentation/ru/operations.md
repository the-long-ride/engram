# Руководство по Эксплуатации

Эта страница содержит подробную информацию по использованию, чтобы файл README оставался коротким.

## Список Поддерживаемых Команд

| Задача | Команда |
| --- | --- |
| Загрузка памяти задачи | `engram load "<задача>"` |
| Загрузка компактной памяти для агента | `engram load --for-agents "<задача>"` |
| Печать руководства ИИ-агента | `engram llm` |
| Просмотр файлов маршрутизации | `engram load --dry-run "<задача>"` |
| Поиск в памяти | `engram search "<тема>"` |
| Сохранение одной записи | `engram save [rule\|workflow\|knowledge] "<текст>"` |
| Сохранение памяти сессии | `engram save-session` или `engram ss` |
| Сбор последних доступных чатов | `engram save-session --query-level 3` |
| Одобрение всех кандидатов | `engram ss -a` |
| Сбор и одобрение последних чатов | `engram ss -a last 50 sessions` |
| Запись черновой заметки | `engram observe --file session.md` |
| Импорт существующих документов | `engram take-control --all` |
| Предварительный просмотр импорта | `engram take-control --plan` |
| Импорт и самоанализ инструкций | `engram take-control --all --metacognize --accept-all` |
| Реструктуризация каталога памяти | `engram metacognize --workspace\|--global\|--all` |
| Разрешение конфликтов и самоанализ | `engram resolve-conflicts --metacognize` |
| Проверка маршрутизации графа | `engram graph "<тема>"` |
| Проверка контрольных сумм | `engram verify` |
| Поиск поврежденных файлов памяти | `engram repair` |
| Архивация неверной записи | `engram archive --reason "<причина>" <id-или-файл>` |
| Настройка строгости правил | `engram set-rule-variant strict\|balanced\|light\|off` |
| Настройка места сохранения | `engram set-save-target workspace\|global\|both\|status` |
| Настройка лимита загрузки | `engram set-load-limit 1..32\|status\|reset` |
| Настройка авточтения хуков | `engram set-read startup\|auto\|always\|manual\|off\|status` |
| Настройка доказательства хуков | `engram set-proof off\|compact\|status` |
| Установка хуков агента | `engram link codex\|claude\|gemini\|opencode\|cursor\|windsurf` |
| Управление глобальными профилями | `engram profile status\|create\|use\|merge` |
| Клонирование памяти workspace/global | `engram clone-memory workspace global [--metacognize]` |

Используйте `save-session` для предложений памяти в длинных сессиях. Краткая форма: `ss`.
Используйте `--query-level <n>`, когда человек хочет, чтобы агент собрал до n последних доступных чатов человек-агент вместо только текущей сессии. Естественная формулировка, такая как `engram ss -a last 50 sessions`, преобразуется в `engram save-session --query-level 50 --accept-all`.

Используйте `load --dry-run`, когда вы хотите проверить, какие файлы памяти будут маршрутизироваться, без вывода их содержимого.
Для контекста ИИ-агента используйте `load --for-agents`: сохраняет только `id`, `type`, `tags` и `confidence` во frontmatter, рендерит один выбранный вариант правила и помечает как `## Rule variants (1/3 based on current: <active>)`.
`load` по умолчанию сохраняет тот же компактный маршрут для хостов, ориентированных на агентов. Метод MCP `engram_load` по умолчанию использует `--for-agents`, поэтому хосты агентов получают компактную форму без повторения флага. SessionStart хуки вызывают тот же маршрутизированный путь загрузки при запуске, затем повторно используют или пропускают при неизменной маршрутной сигнатуре.
`load` сначала привязывает маршрутизацию к значимым поисковым терминам, игнорируя общие слова памяти, такие как `rule`, `knowledge`, и распространенные стоп-слова (stopwords). Затем он сужает более широкий пул кандидатов до компактного пакета контекста. Обычная загрузка сообщает о выбранном количестве и общем количестве связанных записей, например `loaded 8 memory files / 14 total related memories`. `load --dry-run` показывает количество кандидатов, теги сужения и причины совпадения; `load --all` возвращает каждое видимое сопоставленное воспоминание вместо применения лимита компактности.
`workflow` и `workflows` по-прежнему маршрутизируются к воспоминаниям о навыках, но общие слова типов сами по себе не создают широкого соответствия.

## Слои Зависимостей (Dependency Layers)

Используйте frontmatter `depends_on`, когда одна запись должна строиться на основе другой вместо её повторения:

```yaml
depends_on: [release-foundation]
level: advanced
```

Выполните `engram graph --rebuild` после ручного редактирования. Граф сообщает о слоях зависимостей, и `engram load` загружает маршрутизируемые предварительные требования в тот же компактный пакет контекста перед более глубокими воспоминаниями. Связанные ребра графа и векторные совпадения не могут сами по себе загрузить несвязанные воспоминания; они лишь помогают переранжировать или расширить воспоминания, которые уже перекрываются со значимыми терминами запроса. Явные предварительные требования `depends_on` все еще могут загружаться без собственного перекрытия ключевых слов.

## Согласование Обновлений (Upgrade Reconciliation)

Используйте `engram upgrade` после установки более нового пакета Engram. Команда сравнивает инициализированные каталоги памяти, начиная с версии v0.0.8, с текущей схемой выпуска и обновляет сгенерированные файлы HELP.md, индексы памяти, файлы графов, подходящие векторные сайдкары, созданные наборы навыков рабочей области, глобальную структуру памяти и зарегистрированные глобальные наборы навыков агентов, сохраняя файлы, созданные человеком. Обычные команды также бесшумно запускают то же согласование каталогов один раз для каждой версии пакета, если только не установлено `--no-auto-upgrade` или `ENGRAM_NO_AUTO_UPGRADE=1`.
Когда `engram save` находит связанные активные воспоминания, предварительный просмотр одобрения сообщает о них с предложенным `depends_on` или предупреждением о возможном дубликате. Принятие сохраняет предварительный просмотр как есть; сначала отклоните, если хотите изменить структуру зависимостей или архивировать дубликаты перед сохранением.
Для `save-session --accept-all` Engram приостанавливает работу перед записью, когда появляются эти подсказки о связанных воспоминаниях. Агент должен использовать ответ для планирования структурированного перезапуска: добавить `DEPENDS_ON: memory-id` для зависимостей, `LEVEL: advanced`, когда воспоминание глубже его предварительного требования, или `UPDATE: memory-id`, когда кандидат должен быть объединен с возможным дубликатом.

## Профили, Места Сохранения и Клонирование

Используйте `set-save-target`, чтобы выбрать, куда направляются обычные сохранения:

```bash
engram set-save-target status
engram set-save-target workspace
engram set-save-target global
engram set-save-target both
```

Используйте `profile`, когда личная, корпоративная или глобальная память команды должна оставаться изолированной:

```bash
engram profile create personal --global-path ~/Documents/engram-personal --use
engram profile use company --workspace
engram profile merge personal company --dry-run
```

Используйте `clone-memory` для копирования активных Markdown-файлов `rules/`, `skills/` и `knowledge/` между пространствами workspace и global:

```bash
engram clone-memory workspace global
engram clone-memory global workspace --force
```

Добавьте `--metacognize`, если вы хотите, чтобы клонированные воспоминания предлагались через процесс одобрения save-session вместо копирования один в один.

## Самоанализ Памяти (Metacognize Memory)

Используйте `metacognize`, когда вы хотите, чтобы ИИ-агент проанализировал существующую папку памяти Engram и предложил более безопасную структуру через тот же процесс одобрения save-session:

```bash
engram metacognize --workspace
engram metacognize --global --dry-run
engram metacognize --all --accept-all
```

Команда проверяет активные воспоминания `rules/`, `skills/` и `knowledge/` в выбранной области, возвращает компактный пакет источников, когда кандидаты не предоставлены, а затем записывает только сгенерированные строки `TYPE: ... | TEXT: ...` после одобрения. Агенты должны использовать `UPDATE: memory-id` для объединения или исправления формулировок и `DEPENDS_ON: memory-id` для многоуровневых воспоминаний. Естественная формулировка, такая как `engram restructure workspace memory accept all`, преобразуется в `engram metacognize --workspace --accept-all`.

## Сохранение Сессии (Save Session)

Используйте `save-session`, когда долгое взаимодействие привело к созданию нескольких кандидатов:

```text
TYPE: rule | TEXT: Always run tests before release. | CONTEXT: Created from release planning so future agents preserve the test gate.
TYPE: knowledge | TEXT: Release notes live in CHANGELOG.md.
TYPE: workflow | TEXT: When releasing, run tests, update changelog, then tag.
```

`CONTEXT: ...` является необязательным. Добавляйте его только тогда, когда он объясняет, почему существует память, исходную ситуацию, предполагаемое использование или границу. Простые факты могут опускать его и использовать стандартный контекст утверждения Engram.

Без `--accept-all` Engram спрашивает, каких кандидатов сохранить. С `ss -a` сохраняется каждый созданный кандидат, так как человек явно одобрил этот шорткат.
Когда запуск accept-all сообщает о связанных воспоминаниях перед записью, файлы еще не сохранены. Агент должен перезапустить команду со структурированными кандидатами, такими как:

```text
TYPE: rule | TEXT: OAuth rotation follows release foundations. | DEPENDS_ON: release-foundation | LEVEL: advanced
TYPE: knowledge | TEXT: Invoice retries use exponential backoff. | UPDATE: invoice-retry-baseline
```

`--query-level` должен быть положительным целым числом. Агенты должны включать только те чаты, к которым они действительно имеют доступ, и не должны выдумывать недоступную историю. `engram ss -a last 50 sessions` использует `50` в качестве уровня запроса и `-a` для автоматического одобрения пользователем.

## Взять под Контроль (Take Control)

`take-control` помогает внедрить Engram в существующие репозитории. Он сканирует инструкции агента, заметки, документы и выбранные файлы, а затем запрашивает у агента кратких кандидатов.

Полезные фильтры:

```bash
engram take-control --plan
engram take-control --all
engram take-control --file AGENTS.md
engram take-control --dir docs
engram take-control --include "docs/**/*.md" --exclude "docs/private/**"
engram take-control --max-sources 5 --max-chars 900
engram take-control --all --metacognize --accept-all
```

Сохраненные воспоминания take-control записывают `source_files` и `source_hashes`, поэтому неизмененные источники в будущем пропускаются.
Используйте `--metacognize` с запрошенным человеком accept-all, когда подсказки о связанной памяти должны приостановить запись и позволить агенту перезапустить процесс с `UPDATE` или `DEPENDS_ON`.

## Разрешение Конфликтов с Самоанализом (Resolve Conflicts With Metacognition)

Используйте `resolve-conflicts` для предварительного просмотра или разрешения конфликтов памяти workspace, принадлежащих только Engram. Добавьте `--metacognize`, когда агент должен проанализировать папку памяти после разрешения конфликтов:

```bash
engram resolve-conflicts --dry-run --metacognize
engram resolve-conflicts --metacognize
engram resolve conflicts and metacognize
```

Команда удерживает детерминированное разрешение конфликтов в пределах `.agents/.engram/`, а затем добавляет пакет исходников самоанализа рабочей области для получения кратких кандидатов `TYPE/TEXT`.

## Запись (Observe)

`observe` сохраняет очищенные необработанные заметки в папке `inbox/`. Заметки во входящих не являются активной памятью.

```bash
engram observe --file session.md
engram save-session --file .agents/.engram/inbox/<название_заметки>.md
```

Используйте это, когда хотите сохранить черновые заметки, прежде чем решить, что из этого должно стать долговечной памятью.

## Восстановление и Обзор

Используйте `repair` после ручного редактирования или импорта:

```bash
engram repair
engram rebuild-index
engram verify
```

Используйте граф и проверки качества перед архивацией:

```bash
engram graph "package manager"
engram quality-check
engram archive --reason "Repo migrated to npm." rules/use-pnpm.md
```

Далее: [Сравнение и дорожная карта](comparison.md).
