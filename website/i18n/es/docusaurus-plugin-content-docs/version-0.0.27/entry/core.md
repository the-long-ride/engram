---
title: Pestaña Core (Núcleo)
sidebar_position: 7
description: Revise memorias duplicadas y en conflicto con filtros de alcance y tipo.
---

# Pestaña Core

La pestaña Core revisa memorias duplicadas y en conflicto. Es el espacio de trabajo de metacognición dentro del panel Entry.

## Fichas de alcance (Scope chips): profile / global / workspace

Filtre el análisis de duplicados/conflictos por origen de memoria. Audite un alcance o compare duplicados entre alcances. Mantenga al menos un alcance seleccionado.

## Fichas de tipo (Type chips): rule / skill / workflow / knowledge

Filtre los candidatos a duplicados por tipo de memoria. Concéntrese primero en la limpieza de reglas o en los hechos de conocimiento. Documente los significados de los tipos en línea para que los usuarios entiendan cuándo los duplicados son inofensivos.

## Incluir candidatos semánticos (Include semantic candidates)

Añade la búsqueda de duplicados semánticos, no solo coincidencias exactas/léxicas. Úselo al limpiar almacenes de memoria maduros; espere más falsos positivos.

## Copiar sugerencia (Copy prompt)

Copia una sugerencia `/engram` para que un agente o modelo más fuerte resuelva los duplicados. Úselo para limpiezas y revisiones guiadas por humanos. Recuerde a los usuarios revisar los cambios generados a través de las puertas de aprobación.

## Vista previa (Preview)

Muestra la sugerencia antes de copiarla. Fomente la vista previa para operaciones de limpieza riesgosas.

## Equivalente en CLI

```bash
engram resolve-conflicts --dry-run --metacognize
engram resolve-conflicts --metacognize
engram metacognize --workspace --force
```

## Siguientes pasos

- [Pestaña Memories](memories.md)
- [CLI: verify / repair / quality-check](../cli/verify-repair-quality.md)

