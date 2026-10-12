---
title: Политика автосохранения
sidebar_position: 5
description: Настройте запрет по умолчанию для автономной записи, квоты, удержание отката, шлюзы проверки и обязательные метаданные.
---

# Политика автосохранения

Вкладка Construct редактирует файл `.agents/engram.policy.json`. Обычные процессы `engram save` и `engram save-session` по-прежнему требуют одобрения человека; эта политика применяется только к автономным кандидатам, явно ограниченным политикой.

## Автономная запись

### Разрешить автосохранение {#autonomous-writes-enabled}

Сопоставляется с `autonomous_writes.enabled`. По умолчанию: `false`. Когда отключено, ни один кандидат не может производить запись автономно.

### Режим записи {#autonomous-writes-mode}

Сопоставляется с `autonomous_writes.mode`. `review_only` откладывает кандидатов на проверку; `autonomous` разрешает кандидатов, прошедших все остальные шлюзы.

### Разрешенные типы {#autonomous-writes-allowed-types}

Сопоставляется с `autonomous_writes.allowed_types`. Допустимые значения: `rule`, `skill`, `workflow` и `knowledge`. Требуется как минимум один тип.

### Разрешенные области {#autonomous-writes-allowed-scopes}

Сопоставляется с `autonomous_writes.allowed_scopes`. Допустимые значения: `workspace` и `global`.

### Разрешенные источники {#autonomous-writes-allowed-sources}

Сопоставляется с `autonomous_writes.allowed_sources`. Entry предлагает `autosave`, `agent-hook`, `cli` и `mcp`; пользовательские непустые строки источников остаются действительными в JSON политики.

### Порог достоверности {#autonomous-writes-confidence-threshold}

Сопоставляется с `autonomous_writes.confidence_threshold`. Допустимые значения: `low`, `medium` и `high`.

### Дневной лимит записей {#autonomous-writes-daily-limit}

Сопоставляется с `autonomous_writes.daily_limit`. Используйте неотрицательное целое число. `0` предотвращает автономную запись.

### Дни хранения отката {#autonomous-writes-rollback-retention-days}

Сопоставляется с `autonomous_writes.rollback_retention_days`. Используйте неотрицательное целое число, соответствующее периоду, в течение которого записи аудита политики остаются доступными для отката.

## Шлюзы проверки

### Лимит строк правил при проверке {#review-max-rule-lines}

Сопоставляется с `review.max_rule_lines`. Кандидаты правил, превышающие это положительное целое число, не проходят проверку.

### Минимальный эталон recall {#review-benchmark-min-recall-at-k}

Сопоставляется с `review.benchmark_min_recall_at_k`. Используйте число от `0` до `1`.

### Требовать метаданные context {#review-mandatory-metadata-context}

Сопоставляется с `review.mandatory_metadata.context`. При включении кандидаты без метаданных `context` не проходят проверку.

### Требовать метаданные triggers {#review-mandatory-metadata-triggers}

Сопоставляется с `review.mandatory_metadata.triggers`. При включении кандидаты без метаданных `triggers` не проходят проверку.

### Требовать метаданные role {#review-mandatory-metadata-role}

Сопоставляется с `review.mandatory_metadata.role`. При включении кандидаты без метаданных `role` не проходят проверку.

## Рабочий процесс CLI

```bash
engram policy init
engram policy validate --json
engram autosave --policy --dry-run
engram policy audit --json
engram policy rollback <audit-id>
```

Используйте dry-run перед включением автономного режима. Квитанции аудита содержат идентификаторы, а не тела воспоминаний, а откат архивирует воспоминание, записанное в рамках политики.

## Связанные страницы

- [Вкладка Construct](construct.md)
- [Путь записи и одобрение](../concepts/write-path.md)
- [Конфиденциальность, правила игнорирования и безопасность](../concepts/safety.md)
