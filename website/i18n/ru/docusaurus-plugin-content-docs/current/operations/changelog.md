---
title: Журнал изменений
sidebar_position: 5
description: История выпусков Engram.
---

# Журнал изменений (Changelog)

История выпусков Engram находится в репозитории [`CHANGELOG.md`](https://github.com/the-long-ride/engram/blob/main/CHANGELOG.md).

Текущую версию пакета можно найти в [`package.json`](https://github.com/the-long-ride/engram/blob/main/package.json).

## Текущая версия

Текущая выпущенная версия Engram — `0.1.0`.

## Основные изменения 0.1.0

- **Поиск и токенизация**: трёхпотоковый BM25F (`title`, `tags`, `body`), 24 концептуальных кластера и мосты совместной встречаемости в корпусе при отсутствии точных якорей, а также токенизация Unicode/вьетнамского/CJK.
- **Свежесть, упорядочивание и сжатие при запуске**: оценка свежести и рабочего уровня `knowledgeFreshnessBoost`, топологическое упорядочивание с учётом внимания `orderForAgentConsumption` и сжатие стартовых карточек `hookStartupAuto` в режиме `read: auto`.
- **Замкнутая телеметрия использования**: отслеживание исходов в локальном игнорируемом Git файле `usage.json` (`applied`, `corrected` и затухание шума после повторных бесполезных инъекций), а также `engram stats --backfill`.
- **Обучение сессий Option A и рабочие заметки**: детерминированное обучение на уровне промптов и транскриптов с записью в истекающие игнорируемые Git воспоминания `working/` и подготовленные квитанции `inbox/r-*.json` (`engram review inbox|triage|apply|dismiss`), команда `engram working note` / инструмент MCP `engram_note` и опциональная постановка транскриптов в очередь `SessionEnd` (`engram link claude|codex --session-end`).
- **Эргономика CLI**: `engram status` (`engram stat`), `engram why <id> ["<query>"]`, `engram help --compact`, `engram graph link <parent-id> <child-id...>`, `engram review triage` и `engram benchmark --from-git`.
- **UX и безопасность Entry Web**: улучшенные рабочие процессы Entry Web UI и зависимости без известных уязвимостей.

## Обновление

```bash
npm install -g @the-long-ride/engram@latest
engram upgrade
```

Подробности см. в разделе [Процесс релиза и обновления](release-upgrade.md).
