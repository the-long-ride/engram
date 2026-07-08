---
title: Memoria de espacio de trabajo frente a memoria global
sidebar_position: 3
description: La memoria del espacio de trabajo prevalece. La memoria global es alternativa para preferencias reutilizables y contexto de equipo entre proyectos.
---

# Memoria de espacio de trabajo frente a memoria global

Engram resuelve la memoria en dos alcances.

## Memoria del espacio de trabajo

La memoria del espacio de trabajo vive en:

```text
<project>/.agents/.engram/
```

Contiene reglas, decisiones y flujos de trabajo específicos del proyecto. La memoria del espacio de trabajo prevalece sobre los duplicados globales.

## Memoria global

La memoria global es opcional y vive donde el usuario la configure. Contiene preferencias y contexto de equipo que deben seguirlo a través de los repositorios.

```bash
engram inject --global-only --global-path ~/Documents/engram
```

La memoria global es alternativa para preferencias reutilizables, hábitos personales o valores predeterminados de todo el equipo.

## Prioridad de alcance

1. Memoria del espacio de trabajo: `<project>/.agents/.engram/`
2. Memoria global: `$ENGRAM_GLOBAL_DIR` o `engram inject --global-path <path>`

La memoria del espacio de trabajo prevalece. La memoria global es alternativa para preferencias reutilizables y contexto de equipo entre proyectos.

## Elegir un destino de guardado

Use `set-save-target` para elegir a dónde van los guardados normales:

```bash
engram set-save-target status
engram set-save-target workspace
engram set-save-target global
engram set-save-target both
```

Las instalaciones de nuevos espacios de trabajo guardan por defecto las operaciones normales tanto en el espacio de trabajo como en el global cuando se configura la memoria global. Los agentes pueden anular una escritura con `--scope workspace|global|both`.

Si el alcance de configuración activo está establecido en `global` (`scope: "global"`), la vinculación de skillset a nivel de espacio de trabajo se deshabilita y se omite para evitar escribir archivos en la carpeta de ejecución. Para vincular agentes en una configuración de alcance global, use `engram link --global`.

## Siguientes pasos

- [Perfiles y resolución de alcance](profiles.md)
- [Ruta de lectura y enrutamiento](read-path.md)
