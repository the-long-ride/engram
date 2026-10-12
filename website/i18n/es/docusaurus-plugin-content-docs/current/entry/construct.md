---
title: Pestaña Construct
sidebar_position: 4
description: Configure los campos de ejecución de Engram desde Construct; la configuración de Git global se gestiona desde Git → Global.
---

import RiskCallout from '@site/src/components/RiskCallout';

# Pestaña Construct

La pestaña Construct expone los campos de configuración en tiempo de ejecución de Engram agrupados como en la interfaz, salvo la **configuración de Git global**, que se gestiona intencionadamente desde **Git → Global**. Cada campo de Construct tiene una descripción, casos de uso, un valor por defecto seguro, validación y una advertencia de riesgo.

<RiskCallout level="caution">
Los campos marcados como **risky** pueden desactivar Engram, cambiar los destinos de guardado, cambiar el comportamiento de Git o afectar a la seguridad de la memoria. Lea la advertencia antes de cambiarlos.
</RiskCallout>

## Grupo Core {#core-group}

### Enabled

**Clave de configuración:** `enabled`  
**Control:** toggle  
**Valor por defecto:** `true`  
**Riesgo:** risky

Interruptor general. Desactivarlo detiene por completo el comportamiento de Engram. Úsese solo para un apagado temporal o para pruebas.

### Save Target

**Clave de configuración:** `scope`  
**Control:** select — `workspace`, `global`, `both`  
**Valor por defecto:** `both`  
**Riesgo:** risky

Controla dónde se guardan las nuevas memorias aprobadas. Use `workspace` para memoria específica del repositorio, `global` para memoria personal o de equipo y `both` para instalaciones nuevas que quieran ambas.

### Update Mode

**Clave de configuración:** `update`  
**Control:** select — `auto`, `manual`, `off`  
**Valor por defecto:** `auto`  
**Riesgo:** normal

Controla la comprobación silenciosa, una sola vez, de actualización del paquete que ejecutan los comandos normales. Use `manual` u `off` solo cuando las actualizaciones se gestionen fuera de Engram.

### Read Mode

**Clave de configuración:** `read`  
**Control:** select — `auto`, `startup`, `always`, `manual`, `off`  
**Valor por defecto:** `auto`  
**Riesgo:** normal

Controla cuándo los hooks de agente inyectan contexto de memoria. `auto` carga al iniciar la sesión y vuelve a inyectar solo cuando cambia el contexto enrutado. `manual` y `off` reducen la automatización a costa de inflar el contexto.

### Proof Mode

**Clave de configuración:** `proof`  
**Control:** select — `off`, `compact`  
**Valor por defecto:** `off`  
**Riesgo:** normal

Indica si los hooks añaden una línea compacta `Engram proof:` en cada turno elegible. Útil para depuración y visibilidad de auditoría.

### Global Memory Path

**Clave de configuración:** `global_path`  
**Control:** text/path  
**Valor por defecto:** vacío hasta que se configure  
**Riesgo:** risky

Ruta del sistema de archivos para la memoria global. Use una carpeta estable y propia del usuario, como `~/Documents/engram`. Evite las carpetas temporales, las carpetas públicas sincronizadas y los directorios en los que no pueda escribir.

<RiskCallout level="risky">
Usar una carpeta pública sincronizada en la nube para memoria privada puede filtrar secretos. Use una ruta privada o un repositorio Git privado.
</RiskCallout>

**Equivalente en la CLI:**

```bash
engram update-global-folder ~/Documents/engram
engram ugf ~/Documents/engram
```

### Default Profile

**Clave de configuración:** `default_profile`  
**Control:** select  
**Valor por defecto:** vacío  
**Riesgo:** risky

Perfil que se usa cuando no se establece ninguno explícitamente. Consulte [Perfiles y resolución de ámbito](../concepts/profiles.md).

### Active Roles

**Clave de configuración:** `roles`  
**Control:** roles/comma input  
**Valor por defecto:** lista vacía  
**Riesgo:** normal

Restringe y reordena las memorias por rol. Use nombres seguros que cumplan `^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$`.

## Grupo Ignore Rules {#ignore-rules-group}

| Campo | Control | Valor por defecto | Notas |
| --- | --- | --- | --- |
| `ignore.source` | select | `engramignore` | Elija `engramignore`, `gitignore`, `both` u `off` como fuentes de reglas de análisis. |
| `ignore.gitignore_path` | text | `.gitignore` | Archivo de exclusión de Git que se usa cuando está activado. |
| `ignore.engramignore_path` | text | `.engramignore` | Archivo de exclusión de Engram que se usa cuando está activado. |
| `ignore.global_engramignore` | toggle | `true` | Aplica las reglas de exclusión globales cuando hay memoria global configurada. |
| `ignore.also_ignore` | list | `*.secret`, `private/**` | Patrones glob adicionales separados por comas. |

### Global Ignore Patterns

**Clave de configuración:** `ignore.global_patterns`  
**Control:** textarea, un patrón glob por línea  
**Valor por defecto:** lista vacía  
**Riesgo:** normal

Los patrones se aplican a las lecturas de memoria global. Cada `engram inject` los sincroniza en un bloque gestionado del `.engramignore` del workspace; las líneas escritas por personas fuera de ese bloque se conservan.

### Auto-save policy

El editor **Auto-save policy** escribe `.agents/engram.policy.json`. Controla si las candidatas aprobadas por la política pueden guardarse sin un aviso interactivo; los guardados normales siguen basándose en la aprobación.

Consulte la [referencia de Auto-save Policy](policy.md) para ver cada control, valor por defecto, valor permitido, puerta de revisión, cuota y ajuste de reversión.

## Grupo Load Routing {#load-routing-group}

### Load Limit

**Clave de configuración:** `load.limit`  
**Control:** number 1–32  
**Valor por defecto:** `8`  
**Riesgo:** normal

Máximo de memorias devueltas por una carga normal. Los valores bajos reducen el exceso de contexto en modelos de poco contexto; los altos ayudan en tareas de arquitectura profundas.

### Working Memory TTL (days)

**Clave de configuración:** `load.working_ttl_days`  
**Control:** number 1–365  
**Valor por defecto:** `14`  
**Riesgo:** normal

Días que una memoria `OBJECTIVE: task` aprobada permanece en el nivel de trabajo, ignorado por Git, antes de caducar. El cambio se aplica a las memorias guardadas después. Conserve una memoria de trabajo con `engram promote <id>`; elimine las caducadas con `engram working prune`.

## Grupo Memory Limits {#memory-limits-group}

### Rule Line Target

**Clave de configuración:** `memory.rule_line_target`  
**Control:** number 50–200, step 10  
**Valor por defecto:** `70`  
**Riesgo:** normal

Tamaño recomendado para las memorias de reglas. Las reglas concisas se enrutan mejor que las políticas demasiado largas.

### Rule Line Hard Limit

**Clave de configuración:** `memory.rule_line_hard_limit`  
**Control:** number 50–200, step 10  
**Valor por defecto:** `100`  
**Riesgo:** risky

Máximo estricto para las memorias de reglas.

<RiskCallout level="risky">
Subirlo puede aumentar el exceso de contexto y empeorar la calidad del enrutamiento. Mantenga las reglas concisas.
</RiskCallout>

### Write Author Email

**Clave de configuración:** `memory.include_author_email`  
**Control:** toggle  
**Valor por defecto:** `false`  
**Riesgo:** risky

Cuando está activado, las memorias nuevas y las actualizadas también escriben `author_email` junto a `author_name`. Está desactivado por defecto para que los archivos de memoria confirmados no incluyan ninguna dirección de correo; su correo permanece en el perfil de autor y en los commits de Git creados por Engram.

<RiskCallout level="risky">
Activarlo escribe direcciones de correo en archivos de memoria confirmados. Vuelva a desactivarlo y ejecute `engram author migrate-memories --strip-email --confirm` para eliminarlas.
</RiskCallout>

## Grupo Hooks {#hooks-group}

### hooks.path_rules

**Clave de configuración:** `hooks.path_rules`  
**Control:** select - `native`, `hook`  
**Valor por defecto:** `native`  
**Riesgo:** normal

`native` escribe archivos de reglas generados para las memorias con `applies_to` (Claude `.claude/rules/engram/`, Cursor `.cursor/rules/engram/`) y registra `InstructionsLoaded` de Claude. `hook` mantiene el hook `PreToolUse` de Engram para Claude y elimina los archivos de reglas de Claude. Codex usa siempre `PreToolUse`.

## Grupo Graph {#graph-group}

### graph.enabled

**Control:** toggle  
**Valor por defecto:** `true`  
**Riesgo:** normal

Activa el enrutamiento por dependencias/relaciones mediante `depends_on`, memorias relacionadas y la vista del grafo.

### graph.max_related

**Control:** number 1–20  
**Valor por defecto:** `4`  
**Riesgo:** normal

Limita las memorias relacionadas que se obtienen mediante señales del grafo.

### graph.min_related_score

**Control:** number 0–1, step 0.01  
**Valor por defecto:** `0.22`  
**Riesgo:** normal

Puntuación mínima de similitud para las aristas relacionadas. Suélo para ganar precisión, bájelo para ganar cobertura.

## Grupo Vector Search {#vector-search-group}

### vector.provider

**Control:** select — `sqlite-vec`  
**Valor por defecto:** `sqlite-vec`  
**Riesgo:** normal

Selecciona el proveedor vectorial local. `sqlite-vec` es el único proveedor compatible.

### vector.enabled

**Control:** toggle  
**Valor por defecto:** `false`  
**Riesgo:** normal

Experimental. Activa un enrutamiento vectorial local opcional basado en vectores hash de 64 dimensiones, que no son embeddings semánticos. Desactivado por defecto; una configuración de workspace que ya almacena `true` sigue activada. Sin dependencia de la nube.

### vector.auto_threshold

**Control:** number 10–1000  
**Valor por defecto:** `100`  
**Riesgo:** normal

Número de memorias a partir del cual se activa la búsqueda vectorial. Es posible que los vaults pequeños no necesiten búsqueda vectorial.

### vector.candidate_pool

**Control:** number 8–100  
**Valor por defecto:** `24`  
**Riesgo:** normal

Cuántas candidatas considera la búsqueda vectorial antes de reordenar. Un valor mayor mejora la cobertura a costa de latencia.

### vector.dimensions

**Control:** number 16–512  
**Valor por defecto:** `64`  
**Riesgo:** normal

Dimensiones de embedding del sidecar vectorial local. Cambiarlo requiere una reconstrucción.

## Grupo Rule Variants {#rule-variants-group}

### rule_variants.enabled

**Control:** toggle  
**Valor por defecto:** `false`  
**Riesgo:** normal

Presenta al cargar la redacción light y strict derivada del Content de cada regla (desactivado presenta el Content balanced). Los archivos de reglas almacenan una sección `## Rule Variants` solo para redacción personalizada.

### rule_variants.active

**Control:** select — `light`, `balanced`, `strict`  
**Valor por defecto:** `balanced`  
**Riesgo:** normal

Controla la firmeza de las reglas cargadas. `strict` ayuda a los modelos de gama baja; `light`/`balanced` suelen convenir a los modelos más potentes.

## Grupo Live Sync {#live-sync-group}

### live_sync.enabled

**Control:** toggle  
**Valor por defecto:** `false`  
**Riesgo:** normal

Sincroniza los archivos de contexto de agente generados al guardar.

### live_sync.targets

**Control:** list  
**Valor por defecto:** `agents-md`, `claude-md`, `cursor-rules`

Destinos de contexto generados, separados por comas, que se actualizan cuando se ejecuta live sync.

## La configuración de Git global se movió a Git

La configuración de Git global ya no aparece en Construct. Abra **Git → Global** para editar los ajustes `global_git.*` existentes con la misma validación y el mismo backend de revisión de riesgo. La pestaña Workspace dentro de Git nunca expone estos controles globales.

Para los detalles clave por clave, use la [referencia de campos](field-reference.md#global-git) o la [guía de ajustes de Git](../operations/git-author-settings.md#global-git-configuration).

## Grupo Pattern Mining {#pattern-mining-group}

| Campo | Control | Valor por defecto | Notas |
| --- | --- | --- | --- |
| `pattern_mining.enabled` | toggle | `false` | Extracción experimental de patrones recurrentes |
| `pattern_mining.threshold` | number 1–20 | `3` | Repeticiones antes de que un patrón candidato importe |
| `pattern_mining.lookback_sessions` | number 1–100 | `20` | Sesiones recientes que se inspeccionan |

## Grupo PR Workflow {#pr-workflow-group}

| Campo | Control | Valor por defecto | Notas |
| --- | --- | --- | --- |
| `pr_workflow.enabled` | toggle | `false` | Flujo experimental de PR de equipo para cambios de memoria |
| `pr_workflow.provider` | text | vacío | Identificador del proveedor de un flujo de equipo ya configurado |
| `pr_workflow.repo` | text | vacío | Identificador del repositorio de un flujo de equipo ya configurado |
| `pr_workflow.target_branch` | text | `main` | Rama que recibe los PR de memoria |

## Grupo Encryption {#encryption-group}

<RiskCallout level="risky">
La configuración de cifrado existe, pero el almacenamiento cifrado aún no está implementado. Documente con claridad las limitaciones actuales a los usuarios.
</RiskCallout>

| Campo | Control | Valor por defecto | Notas |
| --- | --- | --- | --- |
| `encryption.enabled` | toggle | `false` | Modo de cifrado futuro/avanzado |
| `encryption.scope` | select — `workspace`, `global` | `global` | Ámbito al que se aplica el cifrado |
| `encryption.key_source` | select — `portable-file` | `portable-file` | Estrategia de origen de la clave; riesgo de pérdida de la copia de seguridad |

## Próximos pasos

- [Referencia completa de campos](field-reference.md)
- [Pestaña Memories](memories.md)
- [Pestaña Core](core.md)
