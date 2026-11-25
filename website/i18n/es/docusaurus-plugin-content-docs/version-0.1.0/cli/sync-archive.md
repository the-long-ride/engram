---
title: sync / clone-memory / archive
sidebar_position: 7
description: Comandos sync, clone y archive para mover memoria entre ámbitos.
---

# sync / clone-memory / archive

Mueva memoria entre ámbitos y retire memoria incorrecta de forma segura.

## clone-memory

```bash
engram clone-memory workspace global
engram clone-memory global workspace --force
engram clone-memory workspace global --metacognize
```

Copia Markdown activo de `rules/`, `skills/` y `knowledge/` entre los ámbitos de workspace y global. Agregue `--metacognize` cuando desee que las memorias clonadas se propongan a través del flujo de aprobación de save-session en lugar de copiarse textualmente.

Los agentes pueden normalizar solicitudes de clonación en lenguaje natural a `engram clone-memory`, p. ej. "clone workspace memory to global" -> `engram clone-memory workspace global`. Invierta los ámbitos para clonar memoria global en un workspace; use `--force` solo cuando el humano solicite explícitamente sobrescribir duplicados de destino.

## archive

```bash
engram archive --reason "<why>" <id-or-file>
```

Archiva memoria incorrecta o reemplazada. El archivo sale del enrutamiento activo solo tras la aprobación y se conserva en `archive/`. Utilice archive, no delete, para conservar el historial de auditoría.

## observe (inbox)

```bash
engram observe --file session.md
engram save-session --file .agents/.engram/inbox/<note>.md
```

`observe` almacena notas sin procesar saneadas en `inbox/`. Las notas de inbox no son memoria activa.

## Sincronización Git global {#global-git-sync}

La sincronización Git global está controlada por los campos de configuración `global_git.*`. Consulte [Interfaz Web Entry: pestaña Construct](../entry/construct.md) para conocer cada campo. Utilice `engram entry` y la pestaña Construct, o `engram config view`, para inspeccionar la detección de Git resuelta.

## Próximos pasos {#next-steps}

- [perfiles / workspaces / configuración](profiles-workspaces-config.md)
- [Operaciones: flujo de trabajo de Git en equipo](../operations/team-git-workflow.md)
