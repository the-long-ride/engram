---
title: Настройки автора Git
sidebar_position: 2
description: Настройте идентичность, записываемую в будущие памяти Engram и коммиты Git.
---

# Настройки автора Git

Engram хранит профиль автора, чтобы авторство памяти было явным и переносимым.

<!-- future-memories-only -->
Настройки автора влияют **только на будущие памяти**.

<a id="global-author"></a>
## Глобальный автор

Установите идентичность Engram по умолчанию для всех рабочих областей:

```bash
engram author set --name "Jane Doe" --email "jane@example.com"
engram author show
engram author --help
engram author set --help
```

Новые файлы используют отдельные поля `author_name` и `author_email`.

<a id="workspace-override"></a>
## Переопределение рабочей области

Рабочая область может переопределить глобальный профиль Engram:

```bash
engram author set --scope workspace --name "Workspace Jane" --email "jane@work.com"
engram author show --scope workspace
```

<!-- workspace-never-syncs-global-git -->
Переопределение рабочей области никогда не синхронизирует глобальный Git.

<a id="resolution-order"></a>
## Порядок разрешения

```bash
engram author show
engram author show --json
engram author show --help
```

Engram разрешает идентичность в следующем порядке:
1. Автор Engram рабочей области.
2. Глобальный автор Engram.
3. Резервный Git в режиме чтения.
4. Не разрешено.

В Entry источник обозначается значками `WORKSPACE`, `GLOBAL`, `GIT` или `UNRESOLVED`.

<a id="remove-an-author-profile"></a>
## Удаление профиля автора

```bash
engram author unset --scope workspace
engram author unset --scope global
engram author unset --help
```

Используйте `engram author unset --scope workspace` или `--scope global`.

<a id="global-git-configuration"></a>
## Глобальная конфигурация Git

Entry отображает настройки Git в вкладке Глобальные под **Настройки → Git**.

<a id="sync-to-global-git"></a>
## Синхронизация с глобальным Git

```bash
engram author sync-git-global --plan
engram author sync-git-global --confirm
engram author sync-git-global --help
```

Только глобальный профиль может быть скопирован. Используйте `--confirm` для выполнения.

<a id="migrate-existing-memories"></a>
## Миграция существующих памятей

```bash
engram author migrate-memories --plan
engram author migrate-memories --confirm
```

Заполните `author_name` и `author_email` с помощью `engram author migrate-memories --plan` и `--confirm`.
