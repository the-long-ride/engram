---
title: sync / clone-memory / archive
sidebar_position: 7
description: Comandos de sincronización, clonación y archivado para mover memoria entre ámbitos.
---

# sync / clone-memory / archive

Mueve la memoria entre ámbitos y retira la memoria incorrecta de forma segura.

## clone-memory

```bash
engram clone-memory workspace global
engram clone-memory global workspace --force
engram clone-memory workspace global --metacognize
```

Copia Markdown activo de `rules/`, `skills/` y `knowledge/` entre los ámbitos de espacio de trabajo y global. Agrega `--metacognize` cuando desees que las memorias clonadas se propongan a través del flujo de aprobación de save-session en lugar de copiarse textualmente.

Los agentes pueden normalizar solicitudes de clonación naturales en `engram clone-memory`, por ejemplo, "clone workspace memory to global" -> `engram clone-memory workspace global`. Invierte los ámbitos para copiar la memoria global en un espacio de trabajo; usa `--force` solo cuando el humano pida explícitamente sobrescribir las copias de destino.

## archive

```bash
engram archive --reason "<why>" <id-or-file>
```

Archiva memoria incorrecta o superada. El archivo sale del enrutamiento activo solo después de la aprobación y permanece preservado bajo `archive/`. Usa archivar, no eliminar, para fines de auditoría.

## observe (inbox)

```bash
engram observe --file session.md
engram save-session --file .agents/.engram/inbox/<note>.md
```

`observe` almacena notas sin procesar e higienizadas en `inbox/`. Las notas de la bandeja de entrada no son memoria activa.

## Sincronización global de Git

La sincronización global de Git está controlada por los campos de configuración `global_git.*`. Consulta [Interfaz Web de Entry: pestaña Construct](../entry/construct.md) para ver cada campo. Usa la pestaña Runtime de `engram entry` para inspeccionar la detección de Git resuelta.

## Siguientes pasos

- [profiles / workspaces / config](profiles-workspaces-config.md)
- [Operaciones: flujo de trabajo Git del equipo](../operations/team-git-workflow.md)
