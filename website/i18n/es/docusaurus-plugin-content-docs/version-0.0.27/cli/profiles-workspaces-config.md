---
title: profiles / workspaces / config
sidebar_position: 5
description: Administrar perfiles, destinos de guardado, límites de carga, modos de lectura/prueba, roles y configuración de tiempo de ejecución.
---

# profiles / workspaces / config

Administrar perfiles, destinos de guardado, límites de carga, modos de lectura/prueba, roles y configuración de tiempo de ejecución.

## profile

```bash
engram profile status
engram profile create personal --global-path ~/Documents/engram-personal --use
engram profile use company --workspace
engram profile merge personal company --dry-run
```

El orden de resolución del perfil es el `--profile` explícito o `ENGRAM_PROFILE`, luego el `default_profile` del espacio de trabajo, y luego el perfil de usuario activo. Si el espacio de trabajo `W` está fijado al perfil `B` mientras el predeterminado del usuario sigue siendo el perfil `A`, cada carga normal, carga MCP e inyección de hook de agente para `W` lee la memoria global del perfil `B` y nunca la del perfil `A`. Un perfil explícito diferente al predeterminado del espacio de trabajo utiliza la memoria global de ese perfil y deshabilita la memoria del espacio de trabajo para ese comando.

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

Cuando `engram set-role ...` o `engram set-rule-variant ...` tiene éxito, la CLI devuelve una línea `Agent action:`. Los adaptadores de comandos slash y hosts MCP compatibles con Engram deben volver a ejecutar inmediatamente `engram load "<current task/request>"`.

## set-rule-variant

```bash
engram set-rule-variant strict|balanced|light|off
```

## config

```bash
engram config view
engram config set <key> <value>
```

### Referencia de configuraciones clave

| Clave | Descripción | Predeterminado | Rango / Opciones |
| --- | --- | --- | --- |
| `memory.rule_line_target` | Recuento de líneas recomendado para memorias de reglas | `70` | `50` a `200` |
| `memory.rule_line_hard_limit` | Recuento de líneas máximo permitido para memorias de reglas | `100` | `50` a `200` |
| `load.limit` | Memorias máximas devueltas por carga normal | `8` | `1` a `32` |
| `rule_variants.enabled` | Habilitar o deshabilitar la generación de variantes de reglas | `true` | `true`, `false` |
| `rule_variants.active` | Modo de variante de regla activa | `balanced` | `light`, `balanced`, `strict` |
| `graph.enabled` | Habilitar o deshabilitar el enrutamiento compatible con grafos | `true` | `true`, `false` |
| `graph.max_related` | Memorias relacionadas máximas a obtener de bordes de grafo | `8` | `1` a `20` |
| `graph.min_related_score` | Puntuación de similitud mínima para agregar bordes de grafo | `0.3` | `0.0` a `1.0` |
| `vector.enabled` | Habilitar o deshabilitar la búsqueda vectorial de respaldo | `true` | `true`, `false` |
| `live_sync.enabled` | Sincronizar archivos de contexto de agente generados al guardar | `true` | `true`, `false` |
| `global_git.enabled` | Habilitar automatización de sincronización de repositorio Git global | `false` | `true`, `false` |
| `global_git.remote` | Nombre remoto de Git para sincronización global | `origin` | Cadena |
| `global_git.branch` | Nombre de rama de Git para sincronización global | `main` | Cadena |

Estas configuraciones también se pueden administrar visualmente en la pestaña **Construct** en `engram entry`.

## Siguientes pasos

- [verify / repair / quality-check](verify-repair-quality.md)
- [Interfaz Web de Entry: pestaña Construct](../entry/construct.md)
