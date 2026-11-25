---
title: Полный справочник полей
sidebar_position: 10
description: Справочник с поиском по каждому полю ввода и элементу управления Entry Web UI.
---

# Полный справочник полей

Эта страница — канонический справочник по полям для конечного пользователя: он охватывает каждое поле ввода и элемент управления Entry Web UI.

## Как читать этот справочник

Для каждого поля указано:

- **Config key** — ключ, который используется в файлах конфигурации и в CLI
- **Control** — тип элемента ввода
- **Default** — безопасное значение по умолчанию
- **Risk** — `normal`, `caution` или `risky`
- **Notes** — что делает поле и когда его стоит менять

## Core {#core}

| Config key | Control | Default | Risk | Notes |
| --- | --- | --- | --- | --- |
| <span id="enabled"></span>`enabled` | toggle | `true` | risky | Главный переключатель. Отключение останавливает работу Engram. |
| <span id="scope"></span>`scope` | select | `both` | risky | Цель сохранения: `workspace`, `global`, `both`. |
| <span id="update"></span>`update` | select | `auto` | normal | Тихая проверка обновления пакета: `auto`, `manual`, `off`. |
| <span id="read"></span>`read` | select | `auto` | normal | Когда хуки внедряют память: `auto`, `startup`, `always`, `manual`, `off`. |
| <span id="proof"></span>`proof` | select | `off` | normal | Строка подтверждения хука: `off`, `compact`. |
| <span id="global-path"></span>`global_path` | text | пусто | risky | Путь в файловой системе для глобальной памяти. |
| <span id="default-profile"></span>`default_profile` | select | пусто | risky | Профиль, который используется, когда ничего не задано явно. |
| <span id="roles"></span>`roles` | roles | пусто | normal | Имена ролей для маршрутизации через запятую. |

## Ignore Rules {#ignore-rules}

| Config key | Control | Default | Risk | Notes |
| --- | --- | --- | --- | --- |
| <span id="ignore-source"></span>`ignore.source` | select | `engramignore` | normal | Источники правил сканирования: `engramignore`, `gitignore`, `both`, `off`. |
| <span id="ignore-gitignore-path"></span>`ignore.gitignore_path` | text | `.gitignore` | normal | Путь к файлу игнорирования Git. |
| <span id="ignore-engramignore-path"></span>`ignore.engramignore_path` | text | `.engramignore` | normal | Путь к файлу игнорирования Engram. |
| <span id="ignore-global-engramignore"></span>`ignore.global_engramignore` | toggle | `true` | normal | Применяет глобальные правила игнорирования, если они настроены. |
| <span id="ignore-also-ignore"></span>`ignore.also_ignore` | list | `*.secret`, `private/**` | normal | Дополнительные glob-шаблоны через запятую. |
| <span id="ignore-global-patterns"></span>`ignore.global_patterns` | textarea | пусто | normal | Один глобальный glob на строку; inject синхронизирует управляемый блок рабочего пространства. |

## Load Routing {#load-routing}

| Config key | Control | Default | Risk | Notes |
| --- | --- | --- | --- | --- |
| <span id="load-limit"></span>`load.limit` | number 1–32 | `8` | normal | Максимум воспоминаний, возвращаемых обычной загрузкой. |
| <span id="load-working-ttl-days"></span>`load.working_ttl_days` | number 1–365 | `14` | normal | Сколько дней воспоминание с целью-задачей остаётся в рабочем уровне. |

## Memory Limits {#memory-limits}

| Config key | Control | Default | Risk | Notes |
| --- | --- | --- | --- | --- |
| <span id="memory-rule-line-target"></span>`memory.rule_line_target` | number 50–200, step 10 | `70` | normal | Рекомендуемое число строк для правил. |
| <span id="memory-rule-line-hard-limit"></span>`memory.rule_line_hard_limit` | number 50–200, step 10 | `100` | risky | Жёсткий максимум строк для правил. |
| <span id="memory-include-author-email"></span>`memory.include_author_email` | toggle | `false` | risky | Записывать `author_email` во frontmatter новых воспоминаний (`author_name` записывается всегда). |

## Hooks {#hooks}

| Config key | Control | Default | Risk | Notes |
| --- | --- | --- | --- | --- |
| <span id="hooks-path-rules"></span>`hooks.path_rules` | select | `native` | normal | `native`: Claude и Cursor загружают воспоминания с `applies_to` из сгенерированных файлов правил, а Claude регистрирует `InstructionsLoaded`. `hook`: сохранить хук Claude `PreToolUse` и удалить файлы правил Claude. |

## Graph {#graph}

| Config key | Control | Default | Risk | Notes |
| --- | --- | --- | --- | --- |
| <span id="graph-enabled"></span>`graph.enabled` | toggle | `true` | normal | Включает маршрутизацию по зависимостям/связям. |
| <span id="graph-max-related"></span>`graph.max_related` | number 1–20 | `4` | normal | Ограничивает связанные воспоминания из рёбер графа. |
| <span id="graph-min-related-score"></span>`graph.min_related_score` | number 0–1, step 0.01 | `0.22` | normal | Минимальная оценка сходства для связанных рёбер. |

## Vector Search {#vector-search}

| Config key | Control | Default | Risk | Notes |
| --- | --- | --- | --- | --- |
| <span id="vector-enabled"></span>`vector.enabled` | toggle | `false` | normal | Экспериментально: включает необязательную локальную маршрутизацию на хешированных векторах (не семантические эмбеддинги). По умолчанию выключено. |
| <span id="vector-provider"></span>`vector.provider` | select | `sqlite-vec` | normal | Единственный поддерживаемый локальный векторный провайдер. |
| <span id="vector-auto-threshold"></span>`vector.auto_threshold` | number 10–1000 | `100` | normal | Количество воспоминаний, при котором активируется векторный поиск. |
| <span id="vector-candidate-pool"></span>`vector.candidate_pool` | number 8–100 | `24` | normal | Кандидаты, рассматриваемые перед переранжированием. |
| <span id="vector-dimensions"></span>`vector.dimensions` | number 16–512 | `64` | normal | Размерность эмбеддингов; после изменения нужна пересборка. |

## Rule Variants {#rule-variants}

| Config key | Control | Default | Risk | Notes |
| --- | --- | --- | --- | --- |
| <span id="rule-variants-enabled"></span>`rule_variants.enabled` | toggle | `false` | normal | Рендерит формулировки light и strict, выведенные из Content каждого правила (при off рендерится balanced). |
| <span id="rule-variants-active"></span>`rule_variants.active` | select | `balanced` | normal | Активный вариант: `light`, `balanced`, `strict`. |

## Live Sync {#live-sync}

| Config key | Control | Default | Risk | Notes |
| --- | --- | --- | --- | --- |
| <span id="live-sync-enabled"></span>`live_sync.enabled` | toggle | `false` | normal | Синхронизировать сгенерированные файлы контекста агента при сохранении. |
| <span id="live-sync-targets"></span>`live_sync.targets` | list | `agents-md`, `claude-md`, `cursor-rules` | normal | Цели сгенерированного контекста, которые обновляет live sync. |

## Global Git {#global-git}

| Config key | Control | Default | Risk | Notes |
| --- | --- | --- | --- | --- |
| <span id="global-git-enabled"></span>`global_git.enabled` | toggle | `true` | risky | Включает поведение Git для глобальной памяти. |
| <span id="global-git-remote"></span>`global_git.remote` | text | `origin` | risky | Имя удалённого репозитория Git; без пробелов. |
| <span id="global-git-remote-url"></span>`global_git.remote_url` | text | пусто | risky | URL общего удалённого репозитория глобальной памяти. |
| <span id="global-git-branch"></span>`global_git.branch` | text | `main` | risky | Целевая ветка для синхронизации. |
| <span id="global-git-auto-sync"></span>`global_git.auto_sync` | toggle | `true` | risky | Автоматический pull/push. |
| <span id="global-git-auto-resolve"></span>`global_git.auto_resolve` | toggle | `true` | risky | Автоматическое разрешение конфликтов; проверяйте диффы. |

## Pattern Mining {#pattern-mining}

| Config key | Control | Default | Risk | Notes |
| --- | --- | --- | --- | --- |
| <span id="pattern-mining-enabled"></span>`pattern_mining.enabled` | toggle | `false` | normal | Экспериментальное извлечение повторяющихся шаблонов. |
| <span id="pattern-mining-threshold"></span>`pattern_mining.threshold` | number 1–20 | `3` | normal | Сколько повторений нужно, чтобы шаблон стал значимым. |
| <span id="pattern-mining-lookback-sessions"></span>`pattern_mining.lookback_sessions` | number 1–100 | `20` | normal | Сколько недавних сессий проверять. |

## PR Workflow {#pr-workflow}

| Config key | Control | Default | Risk | Notes |
| --- | --- | --- | --- | --- |
| <span id="pr-workflow-enabled"></span>`pr_workflow.enabled` | toggle | `false` | risky | Экспериментальный командный PR-процесс. |
| <span id="pr-workflow-provider"></span>`pr_workflow.provider` | text | пусто | risky | Идентификатор провайдера для настроенного командного процесса. |
| <span id="pr-workflow-repo"></span>`pr_workflow.repo` | text | пусто | risky | Идентификатор репозитория для настроенного командного процесса. |
| <span id="pr-workflow-target-branch"></span>`pr_workflow.target_branch` | text | `main` | risky | Ветка, принимающая PR с памятью. |

## Encryption {#encryption}

| Config key | Control | Default | Risk | Notes |
| --- | --- | --- | --- | --- |
| <span id="encryption-enabled"></span>`encryption.enabled` | toggle | `false` | risky | Будущий/продвинутый режим шифрования. |
| <span id="encryption-scope"></span>`encryption.scope` | select | `global` | risky | Область: `workspace`, `global`. |
| <span id="encryption-key-source"></span>`encryption.key_source` | select | `portable-file` | risky | Стратегия источника ключа; риск потери резервной копии. |

<!-- evidence-foundation:v3:start -->
## Память, подкреплённая доказательствами

| Поле | Значение |
| --- | --- |
| `schema_version` | `3` для новых или обновлённых воспоминаний; устаревшие v1/v2 остаются читаемыми. |
| `authority` | `instruction` для правил/навыков, `reference` для знаний. Записи следов используют `authority: evidence`. |
| `evidence_refs` | Неизменяемые идентификаторы следов `tr_...`, подтверждающие воспоминание. |
| `derived_from` | Идентификаторы сессий или источников, из которых было извлечено воспоминание. |
| `revision` | Положительное целое число, которое увеличивается при обновлении существующего воспоминания. |
| `supersedes` / `superseded_by` | Явные отношения замещения. |
| `valid_from` / `valid_until` | Диапазон времени, в котором воспоминание действительно; `valid_until` может быть открытым. |
| `last_confirmed` | Дата, когда воспоминание было подтверждено в последний раз. |
<!-- evidence-foundation:v3:end -->

## Элементы управления без ключей конфигурации

Элементы управления, не связанные с ключами конфигурации, см. на страницах отдельных вкладок:

- [Вкладка Construct](construct.md)
- [Вкладка Memories](memories.md)
- [Вкладка Review](review.md)
- [Вкладка Core](core.md)
- [Вкладка Connections](connections.md)

Управление профилями и рабочими пространствами доступно на вкладке Construct и через `engram profile` и `engram workspace`. См. [Профили и разрешение области](../concepts/profiles.md).

## Дальнейшие шаги

- [Вкладка Construct](construct.md)
- [Руководство по описанию полей](field-authoring-guidelines.md)


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


<!-- configuration-upgrade-inventory -->
## Инвентаризация обновлений конфигурации

После обновления пакета выполните `engram upgrade --latest --plan` перед `engram upgrade --latest`. Общий инвентарь сканирует воспоминания, инструкции, skillset, конфигурации, хуки и плагины рабочего пространства и глобальной области, управляемые Engram. Байты, написанные пользователем, сохраняются; неоднозначные смешанные файлы сообщаются как конфликты. См. [Обновления конфигурации](../operations/configuration-upgrades.md).
