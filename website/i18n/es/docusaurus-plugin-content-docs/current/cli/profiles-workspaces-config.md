---
title: profiles / workspaces / config
sidebar_position: 5
description: Gestione perfiles, destinos de guardado, límites de carga, modos de lectura/prueba, roles y configuración en tiempo de ejecución.
---

# profiles / workspaces / config

Gestione perfiles, destinos de guardado, límites de carga, modos de lectura/prueba, roles y configuración en tiempo de ejecución.

## profile

```bash
engram profile status
engram profile create personal --global-path ~/Documents/engram-personal --use
engram profile use company --workspace
engram profile merge personal company --dry-run
```

El orden de resolución del perfil es: `--profile` explícito o `ENGRAM_PROFILE`, después el `default_profile` del workspace y, por último, el perfil de usuario activo. Si el workspace `W` está fijado al perfil `B` mientras el perfil por defecto del usuario sigue siendo `A`, toda carga normal, carga MCP e inyección de hooks de agente para `W` lee la memoria global del perfil `B` y nunca la del perfil `A`. Un perfil explícito distinto del predeterminado del workspace usa la memoria global de ese perfil y desactiva la memoria del workspace para ese comando.

## set-save-target

```bash
engram set-save-target status
engram set-save-target workspace
engram set-save-target global
engram set-save-target both
```

## set-load-limit

```bash
engram set-load-limit 1..32
engram set-load-limit status
engram set-load-limit reset
```

<a id="load-configuration"></a>
## Configuración de carga

Estas claves viven en el bloque `load` de `.agents/.engram/engram.config.json`; `engram config set` no las acepta.

| Clave | Valor por defecto | Significado |
| --- | --- | --- |
| `load.disclosure` | `auto` | `auto` expande los mejores resultados y reduce el resto a tarjetas; `full` mantiene la salida sin niveles |
| `load.expand_top` | `3` | Cuerpos que se expanden con la divulgación `auto` |
| `load.working_ttl_days` | `14` | Días que una memoria `OBJECTIVE: task` aprobada permanece en el nivel de trabajo (1 a 365). También editable en la pestaña Construct de Entry |

## set-read

```bash
engram set-read startup|auto|always|manual|off
engram set-read status
```

## set-proof

```bash
engram set-proof off|compact
engram set-proof status
```

## set-role

```bash
engram set-role frontend
engram set-role backend security
engram set-role
```

Cuando `engram set-role ...` o `engram set-rule-variant ...` se ejecuta con éxito, la CLI devuelve una línea `Agent action:`. Los adaptadores slash compatibles con Engram y los hosts MCP deben volver a ejecutar de inmediato `engram load "<current task/request>"`.

## set-rule-variant

```bash
engram set-rule-variant strict|balanced|light|off|status
```

## config

```bash
engram config view
engram config set <key> <value>
```

### Referencia de ajustes clave

| Clave | Descripción | Valor por defecto | Rango / Opciones |
| --- | --- | --- | --- |
| `memory.rule_line_target` | Número de líneas recomendado para las memorias de reglas | `70` | `50` a `200` |
| `memory.rule_line_hard_limit` | Número máximo de líneas permitido para las memorias de reglas | `100` | `50` a `200` |
| `memory.include_author_email` | Escribe `author_email` en el frontmatter de las memorias nuevas (`author_name` se escribe siempre) | `false` | `true`, `false` |
| `mcp.resource_limit` | Memorias que devuelve `resources/list` de MCP además de `engram://index`, ordenadas por uso inyectado + obtenido (solo en la configuración JSON; `engram config set` no lo establece) | `20` | `0` a `200` |
| `load.limit` | Máximo de memorias devueltas por una carga normal | `8` | `1` a `32` |
| `hooks.path_rules` | `native` escribe archivos de reglas de Claude y Cursor para las memorias con `applies_to` y registra `InstructionsLoaded` de Claude; `hook` mantiene el hook `PreToolUse` de Claude | `native` | `native`, `hook` |
| `rule_variants.enabled` | Activa o desactiva la generación de variantes de reglas | `false` | `true`, `false` |
| `rule_variants.active` | Modo de variante de regla activo | `balanced` | `light`, `balanced`, `strict` |
| `graph.enabled` | Activa o desactiva el enrutamiento basado en el grafo | `true` | `true`, `false` |
| `graph.max_related` | Máximo de memorias relacionadas que se obtienen de las aristas del grafo | `4` | `1` a `20` |
| `graph.min_related_score` | Puntuación mínima de similitud para añadir aristas al grafo | `0.22` | `0.0` a `1.0` |
| `vector.enabled` | Búsqueda vectorial de respaldo experimental con vectores hash (no son embeddings semánticos) | `false` | `true`, `false` |
| `live_sync.enabled` | Sincroniza los archivos de contexto de agente generados al guardar | `false` | `true`, `false` |
| `global_git.enabled` | Activa la automatización de sincronización del repositorio Git global | `true` | `true`, `false` |
| `global_git.remote` | Nombre del remoto Git para la sincronización global | `origin` | Cadena |
| `global_git.branch` | Nombre de la rama Git para la sincronización global | `main` | Cadena |

Estos ajustes también pueden gestionarse visualmente en la pestaña **Construct** de `engram entry`.

## Próximos pasos

- [verify / repair / quality-check](verify-repair-quality.md)
- [Entry Web UI: pestaña Construct](../entry/construct.md)


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
