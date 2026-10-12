---
title: Referencia completa de campos
sidebar_position: 10
description: Referencia con búsqueda de cada entrada y control de la Entry Web UI.
---

# Referencia completa de campos

Esta página es la referencia canónica para el usuario final de cada entrada y control de la Entry Web UI.

## Cómo leer esta referencia

Cada campo indica:

- **Config key** — la clave usada en los archivos de configuración y en la CLI
- **Control** — el tipo de entrada
- **Default** — el valor por defecto seguro
- **Risk** — `normal`, `caution` o `risky`
- **Notes** — qué hace el campo y cuándo conviene cambiarlo

## Core {#core}

| Config key | Control | Default | Risk | Notes |
| --- | --- | --- | --- | --- |
| <span id="enabled"></span>`enabled` | toggle | `true` | risky | Interruptor general. Desactivarlo detiene el comportamiento de Engram. |
| <span id="scope"></span>`scope` | select | `both` | risky | Destino de guardado: `workspace`, `global`, `both`. |
| <span id="update"></span>`update` | select | `auto` | normal | Comprobación silenciosa de actualización del paquete: `auto`, `manual`, `off`. |
| <span id="read"></span>`read` | select | `auto` | normal | Cuándo los hooks inyectan memoria: `auto`, `startup`, `always`, `manual`, `off`. |
| <span id="proof"></span>`proof` | select | `off` | normal | Línea de prueba del hook: `off`, `compact`. |
| <span id="global-path"></span>`global_path` | text | vacío | risky | Ruta del sistema de archivos para la memoria global. |
| <span id="default-profile"></span>`default_profile` | select | vacío | risky | Perfil que se usa cuando no se establece ninguno explícitamente. |
| <span id="roles"></span>`roles` | roles | vacío | normal | Nombres de rol separados por comas para el enrutamiento. |

## Ignore Rules {#ignore-rules}

| Config key | Control | Default | Risk | Notes |
| --- | --- | --- | --- | --- |
| <span id="ignore-source"></span>`ignore.source` | select | `engramignore` | normal | Fuentes de reglas de análisis: `engramignore`, `gitignore`, `both`, `off`. |
| <span id="ignore-gitignore-path"></span>`ignore.gitignore_path` | text | `.gitignore` | normal | Ruta del archivo de exclusión de Git. |
| <span id="ignore-engramignore-path"></span>`ignore.engramignore_path` | text | `.engramignore` | normal | Ruta del archivo de exclusión de Engram. |
| <span id="ignore-global-engramignore"></span>`ignore.global_engramignore` | toggle | `true` | normal | Aplica las reglas de exclusión globales cuando están configuradas. |
| <span id="ignore-also-ignore"></span>`ignore.also_ignore` | list | `*.secret`, `private/**` | normal | Patrones glob adicionales separados por comas. |
| <span id="ignore-global-patterns"></span>`ignore.global_patterns` | textarea | vacío | normal | Un glob global por línea; inject sincroniza un bloque gestionado del workspace. |

## Load Routing {#load-routing}

| Config key | Control | Default | Risk | Notes |
| --- | --- | --- | --- | --- |
| <span id="load-limit"></span>`load.limit` | number 1–32 | `8` | normal | Máximo de memorias devueltas por una carga normal. |
| <span id="load-working-ttl-days"></span>`load.working_ttl_days` | number 1–365 | `14` | normal | Días que una memoria de objetivo de tarea permanece en el nivel de trabajo. |

## Memory Limits {#memory-limits}

| Config key | Control | Default | Risk | Notes |
| --- | --- | --- | --- | --- |
| <span id="memory-rule-line-target"></span>`memory.rule_line_target` | number 50–200, step 10 | `70` | normal | Número de líneas recomendado para las reglas. |
| <span id="memory-rule-line-hard-limit"></span>`memory.rule_line_hard_limit` | number 50–200, step 10 | `100` | risky | Número máximo estricto de líneas para las reglas. |
| <span id="memory-include-author-email"></span>`memory.include_author_email` | toggle | `false` | risky | Escribe `author_email` en el frontmatter de las memorias nuevas (`author_name` se escribe siempre). |

## Hooks {#hooks}

| Config key | Control | Default | Risk | Notes |
| --- | --- | --- | --- | --- |
| <span id="hooks-path-rules"></span>`hooks.path_rules` | select | `native` | normal | `native`: Claude y Cursor cargan las memorias con `applies_to` desde archivos de reglas generados y Claude registra `InstructionsLoaded`. `hook`: mantiene el hook `PreToolUse` de Claude y elimina los archivos de reglas de Claude. |

## Graph {#graph}

| Config key | Control | Default | Risk | Notes |
| --- | --- | --- | --- | --- |
| <span id="graph-enabled"></span>`graph.enabled` | toggle | `true` | normal | Activa el enrutamiento por dependencias/relaciones. |
| <span id="graph-max-related"></span>`graph.max_related` | number 1–20 | `4` | normal | Limita las memorias relacionadas procedentes de las aristas del grafo. |
| <span id="graph-min-related-score"></span>`graph.min_related_score` | number 0–1, step 0.01 | `0.22` | normal | Puntuación mínima de similitud para las aristas relacionadas. |

## Vector Search {#vector-search}

| Config key | Control | Default | Risk | Notes |
| --- | --- | --- | --- | --- |
| <span id="vector-enabled"></span>`vector.enabled` | toggle | `false` | normal | Experimental: activa un enrutamiento local opcional con vectores hash (no son embeddings semánticos). Desactivado por defecto. |
| <span id="vector-provider"></span>`vector.provider` | select | `sqlite-vec` | normal | El único proveedor vectorial local compatible. |
| <span id="vector-auto-threshold"></span>`vector.auto_threshold` | number 10–1000 | `100` | normal | Número de memorias a partir del cual se activa la búsqueda vectorial. |
| <span id="vector-candidate-pool"></span>`vector.candidate_pool` | number 8–100 | `24` | normal | Candidatas consideradas antes de reordenar. |
| <span id="vector-dimensions"></span>`vector.dimensions` | number 16–512 | `64` | normal | Dimensiones de embedding; reconstruya tras cambiarlas. |

## Rule Variants {#rule-variants}

| Config key | Control | Default | Risk | Notes |
| --- | --- | --- | --- | --- |
| <span id="rule-variants-enabled"></span>`rule_variants.enabled` | toggle | `false` | normal | Presenta la redacción light y strict derivada del Content de cada regla (desactivado presenta balanced). |
| <span id="rule-variants-active"></span>`rule_variants.active` | select | `balanced` | normal | Variante activa: `light`, `balanced`, `strict`. |

## Live Sync {#live-sync}

| Config key | Control | Default | Risk | Notes |
| --- | --- | --- | --- | --- |
| <span id="live-sync-enabled"></span>`live_sync.enabled` | toggle | `false` | normal | Sincroniza los archivos de contexto de agente generados al guardar. |
| <span id="live-sync-targets"></span>`live_sync.targets` | list | `agents-md`, `claude-md`, `cursor-rules` | normal | Destinos de contexto generados que live sync actualiza. |

## Global Git {#global-git}

| Config key | Control | Default | Risk | Notes |
| --- | --- | --- | --- | --- |
| <span id="global-git-enabled"></span>`global_git.enabled` | toggle | `true` | risky | Activa el comportamiento de Git para la memoria global. |
| <span id="global-git-remote"></span>`global_git.remote` | text | `origin` | risky | Nombre del remoto Git; sin espacios en blanco. |
| <span id="global-git-remote-url"></span>`global_git.remote_url` | text | vacío | risky | URL del remoto compartido de la memoria global. |
| <span id="global-git-branch"></span>`global_git.branch` | text | `main` | risky | Rama de destino para la sincronización. |
| <span id="global-git-auto-sync"></span>`global_git.auto_sync` | toggle | `true` | risky | Comportamiento automático de pull/push. |
| <span id="global-git-auto-resolve"></span>`global_git.auto_resolve` | toggle | `true` | risky | Gestión automática de conflictos; revise los diffs. |

## Pattern Mining {#pattern-mining}

| Config key | Control | Default | Risk | Notes |
| --- | --- | --- | --- | --- |
| <span id="pattern-mining-enabled"></span>`pattern_mining.enabled` | toggle | `false` | normal | Extracción experimental de patrones recurrentes. |
| <span id="pattern-mining-threshold"></span>`pattern_mining.threshold` | number 1–20 | `3` | normal | Repeticiones antes de que un patrón importe. |
| <span id="pattern-mining-lookback-sessions"></span>`pattern_mining.lookback_sessions` | number 1–100 | `20` | normal | Sesiones recientes que se inspeccionan. |

## PR Workflow {#pr-workflow}

| Config key | Control | Default | Risk | Notes |
| --- | --- | --- | --- | --- |
| <span id="pr-workflow-enabled"></span>`pr_workflow.enabled` | toggle | `false` | risky | Flujo experimental de PR de equipo. |
| <span id="pr-workflow-provider"></span>`pr_workflow.provider` | text | vacío | risky | Identificador del proveedor de un flujo de equipo configurado. |
| <span id="pr-workflow-repo"></span>`pr_workflow.repo` | text | vacío | risky | Identificador del repositorio de un flujo de equipo configurado. |
| <span id="pr-workflow-target-branch"></span>`pr_workflow.target_branch` | text | `main` | risky | Rama que recibe los PR de memoria. |

## Encryption {#encryption}

| Config key | Control | Default | Risk | Notes |
| --- | --- | --- | --- | --- |
| <span id="encryption-enabled"></span>`encryption.enabled` | toggle | `false` | risky | Modo de cifrado futuro/avanzado. |
| <span id="encryption-scope"></span>`encryption.scope` | select | `global` | risky | Ámbito: `workspace`, `global`. |
| <span id="encryption-key-source"></span>`encryption.key_source` | select | `portable-file` | risky | Estrategia de origen de la clave; riesgo de pérdida de la copia de seguridad. |

<!-- evidence-foundation:v3:start -->
## Memoria respaldada por evidencia

| Campo | Significado |
| --- | --- |
| `schema_version` | `3` para las memorias creadas o actualizadas recientemente; las v1/v2 heredadas siguen siendo legibles. |
| `authority` | `instruction` para reglas/skills, `reference` para conocimiento. Los registros de traza usan `authority: evidence`. |
| `evidence_refs` | ID de traza inmutables `tr_...` que respaldan la memoria. |
| `derived_from` | Identificadores de sesión u origen de los que se destiló la memoria. |
| `revision` | Entero positivo que se incrementa cuando se actualiza una memoria existente. |
| `supersedes` / `superseded_by` | Relaciones explícitas de reemplazo. |
| `valid_from` / `valid_until` | Intervalo de tiempo en el que la memoria es válida; `valid_until` puede quedar abierto. |
| `last_confirmed` | Fecha en la que la memoria se confirmó por última vez. |
<!-- evidence-foundation:v3:end -->

## Controles que no son de configuración

Consulte las páginas de cada pestaña para ver los controles que no son de configuración:

- [Pestaña Construct](construct.md)
- [Pestaña Memories](memories.md)
- [Pestaña Review](review.md)
- [Pestaña Core](core.md)
- [Pestaña Connections](connections.md)

La gestión de perfiles y workspaces está disponible en la pestaña Construct y mediante `engram profile` y `engram workspace`. Consulte [Perfiles y resolución de ámbito](../concepts/profiles.md).

## Próximos pasos

- [Pestaña Construct](construct.md)
- [Guía de redacción de campos](field-authoring-guidelines.md)


## Identidad de autor de Git

Engram puede almacenar un autor global y una anulación opcional por workspace. La resolución es workspace, global y, por último, un respaldo de Git de solo lectura. Los ajustes afectan solo a memorias futuras; una anulación de workspace nunca cambia la configuración global de Git. Use plan y confirmación explícitos para la sincronización con Git global o la migración de memorias heredadas.

```bash
engram author show
engram author set --name "Jane Doe" --email "jane@example.com"
engram author unset --scope workspace
engram author sync-git-global --plan
engram author sync-git-global --confirm
engram author migrate-memories --plan
engram author migrate-memories --confirm
```

Lea la [guía completa de ajustes del autor de Git](../operations/git-author-settings.md).


<!-- configuration-upgrade-inventory -->
## Inventario de actualización de configuración

Tras actualizar un paquete, ejecute `engram upgrade --latest --plan` antes de `engram upgrade --latest`. El inventario compartido analiza las memorias, instrucciones, skillsets, configuraciones, hooks y plugins gestionados por Engram en el workspace y en el ámbito global. Los bytes escritos por personas se conservan; los archivos mixtos ambiguos se informan como conflictos. Consulte [Actualizaciones de configuración](../operations/configuration-upgrades.md).
