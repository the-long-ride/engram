---
title: save / save-session / observe
sidebar_position: 3
description: Команды записи — сохранение одного воспоминания, нескольких воспоминаний из сессии и фиксация сырых заметок.
---

# save / save-session / observe

Команды записи предлагают воспоминания через шлюз подтверждения.

## save

```bash
engram save [rule|workflow|knowledge] "<text>"
engram save --role frontend "<text>"
engram save --scope global "<text>"
```

`engram save` захватывает лучшего единственного кандидата в воспоминания, автоматически обновляет подходящее воспоминание или создаёт новое и всегда показывает шлюз подтверждения A/B/C перед записью.

Когда `engram save` находит связанные активные воспоминания, предпросмотр подтверждения сообщает о них с предлагаемой связью `depends_on` или предупреждением о возможном дубликате.

## save-session

```bash
engram save-session
engram ss
engram save-session --query-level 3
engram ss -f
engram ss -f last 50 sessions
engram save-session --file transcript.md
engram save-session --force
```

Используйте `save-session`, когда длинное взаимодействие породило несколько кандидатов:

```text
TYPE: rule | TEXT: Always run tests before release. | CONTEXT: Created from release planning so future agents preserve the test gate.
TYPE: knowledge | TEXT: Release notes live in CHANGELOG.md.
TYPE: workflow | TEXT: When releasing, run tests, update changelog, then tag.
```

`CONTEXT: ...` необязателен. Добавляйте его только тогда, когда он объясняет, зачем существует воспоминание. При реструктуризации связанных воспоминаний кандидаты могут также содержать поля `DEPENDS_ON`, `LEVEL` или `UPDATE`.

- `--query-level <n>` — извлечь до n недавних доступных чатов человека с агентом; должно быть положительным целым числом; агенты не должны выдумывать недоступную историю
- `--force` / `-f` — каждый сгенерированный кандидат сохраняется, потому что человек явно одобрил этот ярлык
- `--file <path>` — для транскриптов или длинных сводок, уже лежащих на диске

### Вердикты сохранения

Предпросмотр каждого кандидата (CLI, MCP и Entry) выводит одну строку `Verdict:` сразу после `File:`: `ADD`, `UPDATE <id>`, `SUPERSEDE <id>` или `NOOP duplicate of <id>`. Вердикт детерминирован (используются существующие оценки дедупликации и связанных воспоминаний; без вызова модели). `A` и `B` пропускают кандидатов `NOOP` и перечисляют их как пропущенные; `A 1,3` записывает ровно пронумерованные. Подтверждение `SUPERSEDE` записывает `supersedes: [old]` в новое воспоминание и `lifecycle: superseded` в старое, поэтому `engram load` его отбрасывает. `--force` и автосохранение никогда не применяют `SUPERSEDE`: он откладывается, пока вы не запустите команду снова без `--force` и не проверите его.

<a id="candidate-fields"></a>
### Поля кандидата {#candidate-fields}

Помимо `CONTEXT`, `DEPENDS_ON`, `LEVEL` и `UPDATE`, кандидат может содержать:

| Поле | Значение |
| --- | --- |
| `OBJECTIVE: task` или `durable` | `task` сохраняет в [рабочий уровень](#working-memory-promote-and-prune); по умолчанию `durable` |
| `SCOPE: workspace` или `global` | Переопределяет область команды для этого кандидата. Предпросмотр подтверждения называет цель в строке `Scope:`. При `--force` кандидат, область которого выходит за область команды, откладывается, а не записывается |
| `APPLIES_TO: <globs>` | До 8 относительных glob-шаблонов; воспоминание внедряется, когда читается или редактируется подходящий файл |
| `DIRECTIVE: <line>` | Одна строка не длиннее 160 символов, отображается на карточке воспоминания |

```text
TYPE: rule | TEXT: Route commands through MediatR. | DIRECTIVE: Route commands through MediatR | APPLIES_TO: src/Api/**
```

Имена полей нечувствительны к регистру в формате с `|`. В многострочном формате они распознаются только в верхнем регистре, поэтому обычные строки текста вроде `Scope: the billing module` остаются содержимым.

Для `/engram take-control --force` или естественной формы `/engram take control force` slash-адаптер нормализует формулировку, генерирует только краткие кандидаты `TYPE: ... | TEXT: ...` и позволяет Engram сохранить их без второго запроса подтверждения.

<a id="working-memory-promote-and-prune"></a>
## Рабочая память: продвижение и очистка {#working-memory-promote-and-prune}

```bash
engram promote <id>
engram promote workspace:<id>
engram working note "<text>" [--objective "<text>"] [--type knowledge|rule] [--scope workspace|global]
engram working prune --dry-run
engram working prune
```

Утверждённый кандидат `OBJECTIVE: task` записывается в исключённую из Git папку `.agents/.engram/working/` (или `<global>/working/`) с `tier: working`, текстом `--objective` и `valid_until` = сегодня + `load.working_ttl_days` (по умолчанию 14, диапазон от 1 до 365). Предпросмотр подтверждения показывает `Tier: working (expires <date>)`. Рабочие воспоминания загружаются, ищутся и маршрутизируются так же, как постоянные, пока не истекут; затем они выпадают из `load` с причиной пропуска `lifecycle`. Карточки и тела агентов помечаются `working`.

- `engram promote <id>` показывает предпросмотр A/B/C и после подтверждения переносит воспоминание в постоянное хранилище: удаляет `tier` и `valid_until`, сохраняет `objective` и увеличивает `revision`. Истёкшие рабочие воспоминания продвигать нельзя. Используйте `workspace:<id>` или `global:<id>`, когда обе области содержат один и тот же id.
- `engram working prune` удаляет рабочие воспоминания, у которых `valid_until` уже прошёл, и перестраивает индексы, хеши и графы; `--dry-run` сначала перечисляет их. Постоянная память никогда не затрагивается.
- `engram working note "<text>"` сохраняет одну заметку к задаче (`source: note`, тип по умолчанию `knowledge`, разрешён `--type rule`) в рабочий уровень. Текст проходит редактирование (redaction), а строки, похожие на инструкции, отклоняются. Запись защищена одним запросом Y/C, а отмена ничего не записывает. Заметка никогда не обновляет постоянное воспоминание с тем же id. Начало сессии пропускает её, если `ENGRAM_SESSION_OBJECTIVE` не совпадает с `--objective` заметки; иначе она показывается как карточка. Продвиньте её командой `engram promote <id>`.

Рабочие воспоминания никогда не попадают в Git, а их записи индекса, графа и хешей остаются в локальных sidecar-файлах в `working/`.

## observe

```bash
engram observe --file session.md
engram save-session --file .agents/.engram/inbox/<note>.md
```

`observe` сохраняет очищенные сырые заметки во `inbox/`. Заметки во входящих не являются активной памятью. Используйте её, когда хотите сохранить черновые заметки до решения, что должно стать постоянным воспоминанием.

<!-- evidence-foundation:v3:start -->
## Память, подкреплённая доказательствами

```bash
engram observe --file session.md
# Output includes Trace: tr_... and the inbox wrapper path
engram save-session --file .agents/.engram/inbox/<observation>.md
```

Неизменяемый источник находится в `.agents/.engram/traces/<trace-id>.jsonl`; Markdown во входящих — лишь обёртка для проверки. Продвижение заново открывает след и записывает утверждённое воспоминание с `evidence_refs` и `derived_from`. `engram observe --propose --file session.md` может сразу войти в обычный поток подтверждения, но всё равно использует след как исходное доказательство. `engram observe --queue [--dry-run] [--limit n]` разбирает опциональную очередь транскриптов `SessionEnd` в те же очищенные следы и обёртки во входящих и не записывает никакой памяти.
<!-- evidence-foundation:v3:end -->

## Подсказки о связанных воспоминаниях

Когда запуск с принятием всего сообщает о связанных воспоминаниях до записи, ни один файл ещё не сохранён. Агент должен повторить запуск со структурированными кандидатами:

```text
TYPE: rule | TEXT: OAuth rotation follows release foundations. | DEPENDS_ON: release-foundation | LEVEL: advanced
TYPE: knowledge | TEXT: Invoice retries use exponential backoff. | UPDATE: invoice-retry-baseline
```

## Дальнейшие шаги

- [inject / link / upgrade](inject-link-upgrade.md)
- [Концепции: путь записи и подтверждение](../concepts/write-path.md)


## Личность автора Git

Engram может хранить глобального автора и необязательное переопределение для рабочего пространства. Порядок разрешения: рабочее пространство, глобальный, затем резервный Git только для чтения. Настройки влияют только на будущие воспоминания; переопределение рабочего пространства никогда не меняет глобальную конфигурацию Git. Для синхронизации с глобальным Git или миграции устаревших воспоминаний используйте явный план и подтверждение.

```bash
engram author show
engram author set --name "Jane Doe" --email "jane@example.com"
engram author unset --scope workspace
engram author sync-git-global --plan
engram author sync-git-global --confirm
engram author migrate-memories --plan
engram author migrate-memories --confirm
```

Прочитайте полное [руководство по настройкам автора Git](../operations/git-author-settings.md).
