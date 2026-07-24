---
title: Referencia completa de campos
sidebar_position: 10
description: Referencia de búsqueda para cada entrada y control de la interfaz Entry Web UI.
---

# Referencia completa de campos

Esta página es la referencia de campos canónica del usuario final para cada entrada y control de la interfaz Entry Web UI.

## Cómo leer esta referencia

Cada campo incluye:

- **Clave de configuración** — la clave utilizada en los archivos de configuración y la CLI
- **Control** — el tipo de entrada
- **Predeterminado** — el valor predeterminado seguro
- **Riesgo** — `normal`, `caution` (precaución) o `risky` (riesgoso)
- **Notas** — qué hace el campo y cuándo cambiarlo

## Core (Núcleo)

| Clave de configuración | Control | Predeterminado | Riesgo | Notas |
| --- | --- | --- | --- | --- |
| `enabled` | alternancia | `true` | risky | Interruptor principal. Deshabilitar detiene el comportamiento de Engram. |
| `scope` | selección | `both` | risky | Ámbito de guardado: `workspace`, `global`, `both`. |
| `read` | selección | `auto` | normal | Cuándo los hooks inyectan memoria: `auto`, `startup`, `always`, `manual`, `off`. |
| `proof` | selección | `off` | normal | Línea de prueba del hook: `off`, `compact`. |
| `global_path` | texto | vacío | risky | Ruta del sistema de archivos para la memoria global. |
| `default_profile` | selección | vacío | risky | Perfil utilizado cuando no se establece ninguno explícitamente. |
| `roles` | roles | vacío | normal | Nombres de roles separados por comas para el enrutamiento. |
| `theme` | selección | `dark` | hidden | Interno/oculto. No de cara al usuario. |

## Load Routing (Enrutamiento de carga)

| Clave de configuración | Control | Predeterminado | Riesgo | Notas |
| --- | --- | --- | --- | --- |
| `load.limit` | número 1–32 | `8` | normal | Cantidad máxima de memorias por carga normal. |

## Memory Limits (Límites de memoria)

| Clave de configuración | Control | Predeterminado | Riesgo | Notas |
| --- | --- | --- | --- | --- |
| `memory.rule_line_target` | número 50–200, paso 10 | `70` | normal | Recuento de líneas recomendado para reglas. |
| `memory.rule_line_hard_limit` | número 50–200, paso 10 | `100` | risky | Recuento máximo estricto de líneas para reglas. |

## Graph (Grafo)

| Clave de configuración | Control | Predeterminado | Riesgo | Notas |
| --- | --- | --- | --- | --- |
| `graph.enabled` | alternancia | `true` | normal | Habilita el enrutamiento de dependencias/relaciones. |
| `graph.max_related` | número 1–20 | `4` | normal | Limita las memorias relacionadas desde las aristas del grafo. |
| `graph.min_related_score` | número 0–1, paso 0.01 | `0.22` | normal | Puntaje mínimo de similitud para aristas relacionadas. |

## Vector Search (Búsqueda vectorial)

| Clave de configuración | Control | Predeterminado | Riesgo | Notas |
| --- | --- | --- | --- | --- |
| `vector.enabled` | alternancia | `true` | normal | Habilita el enrutamiento vectorial local opcional. |
| `vector.auto_threshold` | número 10–1000 | `100` | normal | Cantidad de memorias para activar la búsqueda vectorial. |
| `vector.candidate_pool` | número 8–100 | `24` | normal | Candidatos considerados antes de volver a clasificar. |
| `vector.dimensions` | número 16–512 | `64` | normal | Dimensiones de incrustación; reconstruir tras cambio. |

## Rule Variants (Variantes de reglas)

| Clave de configuración | Control | Predeterminado | Riesgo | Notas |
| --- | --- | --- | --- | --- |
| `rule_variants.enabled` | alternancia | `false` | normal | Habilita las variantes de roles/estrictez. |
| `rule_variants.active` | selección | `balanced` | normal | Variante activa: `light`, `balanced`, `strict`. |

## Live Sync (Sincronización en vivo)

| Clave de configuración | Control | Predeterminado | Riesgo | Notas |
| --- | --- | --- | --- | --- |
| `live_sync.enabled` | alternancia | `false` | normal | Sincroniza archivos de contexto del agente al guardar. |

## Global Git (Git global)

| Clave de configuración | Control | Predeterminado | Riesgo | Notas |
| --- | --- | --- | --- | --- |
| `global_git.enabled` | alternancia | `true` | risky | Habilita comportamiento Git para memoria global. |
| `global_git.remote` | texto | `origin` | risky | Nombre de remoto Git; sin espacios. |
| `global_git.remote_url` | texto | vacío | risky | URL de remoto de memoria global compartida. |
| `global_git.branch` | texto | `main` | risky | Rama destino para la sincronización. |
| `global_git.auto_sync` | alternancia | `true` | risky | Comportamiento automático de pull/push. |
| `global_git.auto_resolve` | alternancia | `true` | risky | Manejo automático de conflictos; revisar diffs. |

## Pattern Mining (Minería de patrones)

| Clave de configuración | Control | Predeterminado | Riesgo | Notas |
| --- | --- | --- | --- | --- |
| `pattern_mining.enabled` | alternancia | `false` | normal | Extracción experimental de patrones recurrentes. |
| `pattern_mining.threshold` | número 1–20 | `3` | normal | Repeticiones antes de que un patrón sea relevante. |
| `pattern_mining.lookback_sessions` | número 1–100 | `20` | normal | Sesiones recientes a inspeccionar. |

## PR Workflow (Flujo de trabajo de PR)

| Clave de configuración | Control | Predeterminado | Riesgo | Notas |
| --- | --- | --- | --- | --- |
| `pr_workflow.enabled` | alternancia | `false` | risky | Flujo de trabajo de PR de equipo experimental. |
| `pr_workflow.target_branch` | texto | `main` | risky | Rama que recibe las PR de memoria. |

## Encryption (Cifrado)

| Clave de configuración | Control | Predeterminado | Riesgo | Notas |
| --- | --- | --- | --- | --- |
| `encryption.enabled` | alternancia | `false` | risky | Modo de cifrado futuro/avanzado. |
| `encryption.scope` | selección | `global` | risky | Ámbito: `workspace`, `global`. |
| `encryption.key_source` | selección | `portable-file` | risky | Estrategia de origen; riesgo de pérdida de copia. |

## Controles que no son de configuración

Consulte las páginas por pestaña para los controles que no son de configuración:

- [Pestaña Connections](connections.md)
- [Pestaña Profiles](profiles.md)
- [Pestaña Workspaces](workspaces.md)
- [Pestaña Core](core.md)
- [Pestaña Memories](memories.md)
- [Pestaña Runtime](runtime.md)

## Siguientes pasos

- [Pestaña Construct](construct.md)
- [Pautas de redacción de campos](field-authoring-guidelines.md)
