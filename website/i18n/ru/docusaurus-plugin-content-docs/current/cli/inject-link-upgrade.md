---
title: inject / link / upgrade
sidebar_position: 4
description: Команды настройки и адаптеров — инициализация рабочих пространств, подключение агентов и согласование после обновления пакета.
---

# inject / link / upgrade

Команды настройки и адаптеров инициализируют рабочие пространства, подключают агентов и согласуют состояние после обновления пакета.

## inject

```bash
engram inject
engram inject --scope workspace|global|both
engram inject --global-only --global-path <path>
engram inject --submodule
engram inject --submodule-remote <git-url>
engram inject --global-remote <git-url>
engram inject --global-branch <branch>
engram inject --no-skillset
engram inject --skillset all
engram inject --no-global
```

`engram inject` создаёт `.agents/.engram/` и по умолчанию устанавливает компактную цель Codex. Существующие файлы, написанные человеком, пропускаются.

Интерактивный inject спрашивает в таком порядке: добавлять ли `./.agents/.engram` как подмодуль, использовать ли глобальный путь Engram и добавлять ли общий глобальный Git origin.

Используйте `engram update-global-folder <new-path>` или `engram ugf <new-path>`, чтобы обновить только настроенный глобальный путь. Формы в стиле чата, такие как `engram set global memory path to <new-path>` и `engram move global folder from <old-path> to <new-path>`, нормализуются к той же команде. Добавьте `--move-from-path <old-path>`, если Engram должен также перенести весь старый глобальный корень.

## link

```bash
engram link codex
engram link claude
engram link gemini
engram link cursor
engram link windsurf
engram link --global opencode
engram link all
engram link list
engram link --all-supported
engram unlink
```

`engram link all` устанавливает публичный набор целей и сообщает детерминированные причины `SKIPPED` для частично поддерживаемых хостов по файлам инструкций skillset, конфигурации MCP, slash-адаптерам и хукам агентов в одной унифицированной установке. `engram unlink` удаляет всё это вместе. `engram unlink --global <target>` удаляет только глобальный плагин, сгенерированный Engram; файл, написанный человеком, сохраняется, если явно не указан `--force`.

`engram link claude --session-end` (или `codex`) дополнительно регистрирует опциональный командный хук `SessionEnd`, который ставит путь к транскрипту сессии в очередь в исключённом из Git `session-queue.json`; по умолчанию он выключен, а `engram upgrade` его никогда не добавляет. Разберите очередь командой `engram observe --queue`; см. [Хуки](../integrations/hooks.md).

## upgrade

```bash
engram upgrade
engram upgrade --plan
engram upgrade --latest
engram upgrade --self
engram upgrade --memory-only
engram upgrade --global-skillsets-only
engram upgrade --target codex
```

Используйте `engram upgrade` после установки более нового пакета Engram. Команда сравнивает инициализированные корни памяти, начиная с v0.0.8, с текущей схемой выпуска и обновляет сгенерированные `HELP.md`, индексы памяти, графовые файлы, подходящие векторные sidecar-файлы, сгенерированные skillset рабочего пространства, каркас глобальной памяти и зарегистрированные глобальные skillset агентов, сохраняя файлы, написанные человеком.

Обычные команды также тихо выполняют то же согласование корней один раз за версию пакета, если не задан `--no-auto-upgrade` или `ENGRAM_NO_AUTO_UPGRADE=1`.

Используйте `engram upgrade --latest`, когда вывод нового пакета должен перезаписать текущие управляемые Engram артефакты связанных агентов. Этот путь заново применяет связанные файлы инструкций рабочего пространства, правила, конфигурацию MCP/плагинов и управляемые хуки, а также обновляет зарегистрированные глобальные установки агентов последними сгенерированными файлами.

Используйте `--force` только тогда, когда вы намеренно заменяете сгенерированные адаптерные файлы Engram.

## take-control

```bash
engram take-control --plan
engram take-control --all
engram take-control --file AGENTS.md
engram take-control --dir docs
engram take-control --include "docs/**/*.md" --exclude "docs/private/**"
engram take-control --max-sources 5 --max-chars 900
engram take-control --all --metacognize --force
engram take-control --plan --json --kind code
engram take-control --kind code --objective "add billing export"
engram take-control --refresh
engram take-control --from claude-auto-memory --plan
engram take-control --from codex-memories --plan
```

`take-control` — это поток перехвата существующих рекомендаций рабочего пространства с помощью агента. Он собирает компактный пакет источников из файлов вроде `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, правил Cursor, заметок memory-bank и папок верхнего уровня `rules/`, `skills/`, `workflows/`, `knowledge/` или `notes/`, включая заметки `.txt`.

Сохранённые воспоминания take-control записывают `source_files` и `source_hashes`, поэтому неизменённые источники позже пропускаются.

### Дайджесты кода и конфигурации

`--kind docs|code|config|all` (допускаются списки через запятую; по умолчанию `docs`, что сохраняет описанное выше поведение) добавляет экстракторы, которые выдают для каждого источника короткий дайджест вместо сырого текста:

- **code**: экспортируемые сигнатуры, первые строки doc-комментариев и импорты, но никогда не тела. В рекомендациях они показываются как карта репозитория по каталогам с именами символов и одной строкой импортов. Сканирование кода по умолчанию использует `--max-sources 40`.
- **config** и манифесты сборки: ключи, а значения — только для ключей из белого списка (`scripts`, имена зависимостей, `TargetFramework`, `engines`, `name`) и факты о стеке.

Каждый дайджест проходит редактирование (redaction). Файлы `.env*` и файлы с учётными данными всегда пропускаются как `secret file`; найденные файлы больше 256 КБ или похожие на двоичные пропускаются с указанием причины, а сканирование кода и конфигурации пропускает каталоги результатов сборки (`bin`, `obj`, `build`, `out`, `target`, `venv` и подобные) на любой глубине. Размер пакета ограничивают `--budget-tokens` (по умолчанию 6000 для сканирования кода и конфигурации; у сканирования документации лимита нет, пока он не запрошен), `--max-sources` и `--max-chars`. `--plan --json` выводит план, включая пропущенные файлы с причинами, в формате JSON; его `budgetTokens` равен `null` для сканирования документации по умолчанию.

### Кандидаты с учётом цели

`--objective "<text>"` задаёт текущую цель. Тогда рекомендации просят два вида кандидатов: `OBJECTIVE: task` — полезные для цели и `OBJECTIVE: durable` — достойные сохранения после неё. Грамматика кандидатов также принимает `SCOPE: workspace|global`, `APPLIES_TO: <globs>` (до 8 относительных glob-шаблонов) и `DIRECTIVE: <line>` (до 160 символов); см. [save-session](save-session.md#candidate-fields). Утверждённые кандидаты `OBJECTIVE: task` попадают в [рабочий уровень](save-session.md#working-memory-promote-and-prune).

### Актуальность

Воспоминания о коде, конфигурации и манифестах записывают хеш своего дайджеста (`source_hash_mode: digest`), поэтому правки, затрагивающие только пробелы или только тело, не делают их устаревшими; воспоминания о документации записывают хеш сырого файла. `engram verify --sources` записывает изменённые или отсутствующие источники в исключённый из Git `stale.json`, а `engram take-control --refresh` заново строит дайджест только для этих источников и предлагает по одному кандидату `UPDATE: <id>` на каждое устаревшее воспоминание через обычный шлюз подтверждения. См. [verify](verify-repair-quality.md#verify).

### Воспоминания хоста

`--from claude-auto-memory|codex-memories` импортирует локальное хранилище памяти хоста для проверки вместо сканирования рабочего пространства. Автопамять Claude читается из `~/.claude/projects/<project>/memory/` (или из `autoMemoryDirectory` ваших пользовательских либо локальных настроек Claude; `CLAUDE_CONFIG_DIR` заменяет `~/.claude`), воспоминания Codex — из `~/.codex/memories/`; `--dir <path>` переопределяет хранилище, если его нельзя найти однозначно. `type: feedback` предлагает правило, `project` и `reference` предлагают знание, а `type: user`, файлы без типа и индекс `MEMORY.md` пропускаются. `--from` нельзя сочетать с `--file`, `--include`, `--exclude`, `--kind`, `--all`, `--budget-tokens` или `--refresh`.

Engram никогда не пишет в хранилище хоста. Импорт проходит редактирование и фильтрацию инъекций, идёт через обычный шлюз подтверждения и записывает `source: host-memory` с `source_files`, заданными относительно пресета (например `claude-auto-memory/feedback_testing.md`, но никогда не домашний путь). `engram verify --sources` проверяет расхождение только на машине, где находится хранилище (в других местах сообщает `host memory store not on this machine`). Пресета для Gemini нет.

## metacognize

```bash
engram metacognize --workspace
engram metacognize --global --dry-run
engram metacognize --all --force
```

Используйте `metacognize`, когда нужно, чтобы ИИ-агент просмотрел существующую папку памяти Engram и предложил более безопасную структуру через тот же поток подтверждения save-session. Агентам следует использовать `UPDATE: memory-id` для консолидации или правки формулировок и `DEPENDS_ON: memory-id` для многоуровневых воспоминаний.


## Миграция устаревших воспоминаний на схему v3 (schema v3) {#legacy-memory-migration-to-schema-v3}

`engram upgrade --latest` также мигрирует активные файлы памяти v1/v2 в рабочем пространстве и настроенных глобальных корнях на схему v3. Engram в точности сохраняет каждое тело Markdown, записывает `backups/schema-v3/<memory-file>.pre-v3.bak` (папка, исключённая из Git; `engram repair --move-backups` переносит более старые резервные копии, оставшиеся рядом с воспоминаниями), заполняет только детерминированные метаданные, обновляет хеши целостности и перестраивает индекс, граф и подходящие векторные sidecar-файлы. Он никогда не придумывает `evidence_refs`; воспоминание без проверенных ссылок на следы помечается `evidence_status: unverified`. О некорректных воспоминаниях сообщается, и они пропускаются, архивные воспоминания не перезаписываются, а повторный запуск идемпотентен.

Просмотр всех изменений без записи:

```bash
engram upgrade --latest --plan
```

Запуск только миграции памяти без перезаписи артефактов связанных агентов:

```bash
engram upgrade --migrate-memories
```

Пропуск миграции памяти при latest-обновлении:

```bash
engram upgrade --latest --no-migrate-memories
```

## Дальнейшие шаги

- [profiles / workspaces / config](profiles-workspaces-config.md)
- [Обзор интеграций с агентами](../integrations/overview.md)


<!-- configuration-upgrade-inventory -->
## Инвентаризация обновлений конфигурации {#configuration-upgrade-inventory}

После обновления пакета выполните `engram upgrade --latest --plan` перед `engram upgrade --latest`. Общий инвентарь сканирует воспоминания, инструкции, skillset, конфигурации, хуки и плагины рабочего пространства и глобальной области, управляемые Engram. Байты, написанные пользователем, сохраняются; неоднозначные смешанные файлы сообщаются как конфликты. См. [Обновления конфигурации](../operations/configuration-upgrades.md).
