---
title: verify / repair / quality-check
sidebar_position: 6
description: Comandos de mantenimiento — verificar hashes, reparar archivos no válidos, verificar calidad y resolver conflictos.
---

# verify / repair / quality-check

Los comandos de mantenimiento mantienen la memoria saludable.

## verify

```bash
engram verify
```

Verifica la integridad de los hashes. Ejecútalo después de ediciones manuales o importaciones.

## repair

```bash
engram repair
engram rebuild-index
```

Usa `repair` después de ediciones manuales o importaciones para buscar archivos de memoria mal formados que se hayan omitido en la reconstrucción del índice.

## quality-check

```bash
engram quality-check
```

Informa de candidatos de contradicción de forma compacta. La detección de contradicciones es heurística y consultiva.

## graph

```bash
engram graph "package manager"
engram graph --rebuild
```

Inspecciona el enrutamiento del grafo antes de archivar. Ejecuta `engram graph --rebuild` después de ediciones manuales.

## archive

```bash
engram archive --reason "Repo migrated to npm." rules/use-pnpm.md
```

Archiva memoria incorrecta o superada. Usa archivar, no eliminar, para fines de auditoría. El archivo sale del enrutamiento activo solo después de la aprobación y permanece preservado en `archive/`.

## resolve-conflicts

```bash
engram resolve-conflicts --dry-run --metacognize
engram resolve-conflicts --metacognize
```

Previsualiza o resuelve solo los conflictos de memoria del espacio de trabajo propiedad de Engram. Agrega `--metacognize` cuando un agente deba revisar la carpeta de memoria después del manejo de conflictos. El comando mantiene el manejo de conflictos determinista delimitado a `.agents/.engram/`, luego agrega el paquete de origen de metacognición del espacio de trabajo para candidatos `TYPE/TEXT` concisos.

## benchmark

```bash
engram benchmark
```

Verificaciones de regresión de recuperación.

## Siguientes pasos

- [sync / archive](sync-archive.md)
- [Resolución de problemas de operaciones](../operations/troubleshooting.md)
