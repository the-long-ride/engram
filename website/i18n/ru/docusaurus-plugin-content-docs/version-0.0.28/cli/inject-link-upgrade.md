---
title: inject / link / upgrade
sidebar_position: 4
description: Команды настройки и адаптера — инициализация рабочих пространств, связывание агентов и согласование после обновления пакетов.
---

# inject / link / upgrade

Команды настройки и адаптера инициализируют рабочие пространства, связывают агентов и согласовывают данные после обновления пакетов.

## inject

```bash
engram inject
engram inject --global-only --global-path <path>
engram inject --submodule
engram inject --submodule-remote <git-url>
engram inject --global-remote <git-url>
engram inject --no-skillset
engram inject --skillset all
```

`engram inject` создает `.agents/.engram/` и по умолчанию устанавливает компактную цель Codex. Существующие файлы, созданные человеком, пропускаются.

Интерактивное внедрение запрашивает в следующем порядке: добавить ли `./.agents/.engram` в качестве подмодуля, использовать ли глобальный путь Engram и добавить ли общий глобальный Git-источник.

Используйте `engram update-global-folder <new-path>` или `engram ugf <new-path>` для обновления только настроенного глобального пути. Формы в стиле чата, такие как `engram set global memory path to <new-path>` и `engram move global folder from <old-path> to <new-path>`, приводятся к одной и той же команде. Добавьте `--move-from-path <old-path>`, если они также хотят, чтобы Engram переместил весь старый глобальный корень.

## link

```bash
engram link codex
engram link claude
engram link gemini
engram link cursor
engram link windsurf
engram link --global opencode
engram link all
engram unlink
```

`engram link all` устанавливает набор публичных целей и сообщает о детерминированных причинах `SKIPPED` для частичных хостов в файлах инструкций наборов навыков, конфигурации MCP, слеш-адаптерах и хуках агента в одной унифицированной установке. `engram unlink` удаляет все это вместе. `engram unlink --global <target>` удаляет только глобальный плагин, сгенерированный Engram; файл, созданный человеком, сохраняется, если только не указан флаг `--force`.

## upgrade

```bash
engram upgrade
engram upgrade --plan
engram upgrade --latest
```

Используйте `engram upgrade` после установки более новой версии пакета Engram. Команда сравнивает инициализированные корни памяти, начиная с версии v0.0.8, с текущей схемой выпуска и обновляет сгенерированный `HELP.md`, индексы памяти, файлы графов, подходящие векторные контейнеры, сгенерированные наборы навыков рабочего пространства, глобальную структуру памяти и зарегистрированные наборы навыков глобального агента, сохраняя при этом файлы, созданные человеком.

Обычные команды также выполняют то же самое согласование корней без уведомления один раз для каждой версии пакета, если только не установлена переменная `--no-auto-upgrade` или `ENGRAM_NO_AUTO_UPGRADE=1`.

Используйте `engram upgrade --latest`, когда вывод нового пакета должен перезаписать текущие связанные артефакты агентов, управляемые Engram. Этот путь повторно применяет связанные файлы инструкций рабочего пространства, правила, конфигурацию MCP/плагинов и управляемые хуки, а также обновляет зарегистрированные глобальные установки агентов последними сгенерированными файлами.

Используйте `--force` только при намеренной замене сгенерированных файлов адаптера Engram.

## take-control

```bash
engram take-control --plan
engram take-control --all
engram take-control --file AGENTS.md
engram take-control --dir docs
engram take-control --include "docs/**/*.md" --exclude "docs/private/**"
engram take-control --max-sources 5 --max-chars 900
engram take-control --all --metacognize --force
```

`take-control` — это поддерживаемый агентом процесс перехвата существующих инструкций рабочего пространства. Он создает компактный пакет исходников из таких файлов, как `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, правила Cursor, заметки банка памяти и папки верхнего уровня `rules/`, `skills/`, `workflows/`, `knowledge/` или `notes/`, включая заметки `.txt`.

Сохраненные воспоминания take-control записывают `source_files` и `source_hashes`, поэтому неизмененные источники в дальнейшем пропускаются.

## metacognize

```bash
engram metacognize --workspace
engram metacognize --global --dry-run
engram metacognize --all --force
```

Используйте `metacognize`, когда вы хотите, чтобы AI-агент проверил существующую папку памяти Engram и предложил более безопасную структуру через тот же поток подтверждения save-session. Агенты должны использовать `UPDATE: memory-id` для консолидации или очистки формулировок и `DEPENDS_ON: memory-id` для многоуровневой памяти.

## Следующие шаги

- [profiles / workspaces / config](profiles-workspaces-config.md)
- [Обзор интеграции агентов](../integrations/overview.md)

