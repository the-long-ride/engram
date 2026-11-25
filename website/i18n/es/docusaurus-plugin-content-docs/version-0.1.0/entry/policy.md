---
title: Política de autoguardado
sidebar_position: 5
description: Configure denegación por defecto para escrituras autónomas, cuotas, retención de reversiones, controles de revisión y metadatos requeridos.
---

# Política de autoguardado

La pestaña Construct edita `.agents/engram.policy.json`. Los flujos normales de `engram save` y `engram save-session` permanecen aprobados por humanos; esta política solo se aplica a candidatos autónomos explícitamente controlados por política.

## Escrituras autónomas

### Permitir autoguardado {#autonomous-writes-enabled}

Se asigna a `autonomous_writes.enabled`. Por defecto: `false`. Cuando está deshabilitado, ningún candidato puede escribir de forma autónoma.

### Modo de escritura {#autonomous-writes-mode}

Se asigna a `autonomous_writes.mode`. `review_only` aplaza a los candidatos para su revisión; `autonomous` permite a los candidatos que pasan todas las puertas restantes escribir.

### Tipos permitidos {#autonomous-writes-allowed-types}

Se asigna a `autonomous_writes.allowed_types`. Los valores permitidos son `rule`, `skill`, `workflow` y `knowledge`. Se requiere al menos un tipo.

### Ámbitos permitidos {#autonomous-writes-allowed-scopes}

Se asigna a `autonomous_writes.allowed_scopes`. Los valores permitidos son `workspace` y `global`.

### Fuentes permitidas {#autonomous-writes-allowed-sources}

Se asigna a `autonomous_writes.allowed_sources`. Entry ofrece `autosave`, `agent-hook`, `cli` y `mcp`; las cadenas de fuente personalizadas no vacías siguen siendo válidas en el JSON de la política.

### Umbral de confianza {#autonomous-writes-confidence-threshold}

Se asigna a `autonomous_writes.confidence_threshold`. Los valores permitidos son `low`, `medium` y `high`.

### Límite de escritura diario {#autonomous-writes-daily-limit}

Se asigna a `autonomous_writes.daily_limit`. Use un entero no negativo. `0` impide escrituras autónomas.

### Días de retención de reversión {#autonomous-writes-rollback-retention-days}

Se asigna a `autonomous_writes.rollback_retention_days`. Use un entero no negativo que coincida con el período en el cual los registros de auditoría de la política deben permanecer elegibles para reversión.

## Puertas de revisión

### Límite de líneas de reglas {#review-max-rule-lines}

Se asigna a `review.max_rule_lines`. Los candidatos a reglas por encima de este entero positivo fallan la revisión.

### Punto de referencia de recall mínimo {#review-benchmark-min-recall-at-k}

Se asigna a `review.benchmark_min_recall_at_k`. Use un número entre `0` y `1`.

### Requerir metadatos de context {#review-mandatory-metadata-context}

Se asigna a `review.mandatory_metadata.context`. Cuando está habilitado, los candidatos sin metadatos de `context` fallan la revisión.

### Requerir metadatos de triggers {#review-mandatory-metadata-triggers}

Se asigna a `review.mandatory_metadata.triggers`. Cuando está habilitado, los candidatos sin metadatos de `triggers` fallan la revisión.

### Requerir metadatos de role {#review-mandatory-metadata-role}

Se asigna a `review.mandatory_metadata.role`. Cuando está habilitado, los candidatos sin metadatos de `role` fallan la revisión.

## Flujo de trabajo CLI

```bash
engram policy init
engram policy validate --json
engram autosave --policy --dry-run
engram policy audit --json
engram policy rollback <audit-id>
```

Utilice dry-run antes de habilitar el modo autónomo. Los recibos de auditoría contienen identificadores en lugar de cuerpos de memoria, y la reversión archiva la memoria escrita por la política.

## Páginas relacionadas

- [Pestaña Construct](construct.md)
- [Ruta de escritura y aprobación](../concepts/write-path.md)
- [Privacidad, reglas de ignorar y seguridad](../concepts/safety.md)
