---
title: verify / repair / quality-check
sidebar_position: 6
description: Comandos de mantenimiento — verificar hashes, reparar archivos no válidos, comprobar la calidad y resolver conflictos.
---

# verify / repair / quality-check

Los comandos de mantenimiento mantienen la memoria saludable.

## verify

```bash
engram verify
engram verify --sources
engram verify --sources --json
```

Comprueba los hashes para garantizar la integridad. Ejecútelo después de ediciones manuales o importaciones.

`--sources` también vuelve a calcular el hash de los `source_files` de las memorias de take-control y los compara con sus `source_hashes`, y registra los modificados o ausentes en el archivo local `.agents/.engram/stale.json`, ignorado por Git. Las fuentes obsoletas nunca hacen fallar `verify`: `load` clasifica las memorias obsoletas más abajo y termina sus tarjetas con ` (stale)`, y `engram take-control --refresh` propone actualizaciones para ellas. Las rutas de origen deben permanecer dentro del workspace; las rutas absolutas, `..`, los enlaces simbólicos y físicos, los archivos secretos, `.git` y los datos de Engram se informan como no comprobados y nunca se leen. En `--json`, `skipped` lista objetos `{key, reason}`. Una memoria global de take-control registra el workspace del que procede y solo se comprueba allí.

## stats

```bash
engram stats
engram stats --usage
```

`--usage` lee el archivo local `.agents/.engram/usage.json`, ignorado por Git, y muestra qué memorias obtienen realmente los agentes con `engram load --id` y cuáles se inyectaron pero nunca se obtuvieron en 30 días.

## repair

```bash
engram repair
engram rebuild-index
```

Use `repair` después de ediciones manuales o importaciones para encontrar archivos de memoria mal formados que la reconstrucción del índice omitió.

```bash
engram repair --move-backups
engram repair workspace --move-backups --confirm
```

`--move-backups` planifica el traslado de las copias de seguridad `*.bak` de migración que quedaron sueltas en `rules`, `skills` y `knowledge` a la carpeta `backups/<kind>-<label>/`, ignorada por Git (por ejemplo `backups/schema-v3/rules/x.md.pre-v3.bak`). Añada `--confirm` para moverlas; si ya hay un archivo distinto en el destino, se informa como conflicto y se deja donde está. `engram doctor` informa de estos archivos como `memory.stray_backups`.

## quality-check

```bash
engram quality-check
```

Informa de forma compacta de las candidatas a contradicción. La detección de contradicciones es heurística y orientativa.

## graph

```bash
engram graph "package manager"
engram graph --rebuild
```

Inspeccione el enrutamiento del grafo antes de archivar. Ejecute `engram graph --rebuild` después de ediciones manuales.

## archive

```bash
engram archive --reason "Repo migrated to npm." rules/use-pnpm.md
```

Archive la memoria incorrecta o reemplazada. Use archive, no eliminar, para conservar la auditabilidad. El archivo sale del enrutamiento activo solo tras la aprobación y se conserva en `archive/`.

## resolve-conflicts

```bash
engram resolve-conflicts --dry-run --metacognize
engram resolve-conflicts --metacognize
```

Previsualice o resuelva solo los conflictos de memoria del workspace que pertenecen a Engram. Añada `--metacognize` cuando un agente deba revisar la carpeta de memoria tras gestionar los conflictos. El comando mantiene la gestión determinista de conflictos limitada a `.agents/.engram/` y después añade el paquete de fuentes de metacognize del workspace para obtener candidatas `TYPE/TEXT` concisas.

## benchmark

```bash
engram benchmark
```

Comprobaciones de regresión de la recuperación.

## Próximos pasos

- [sync / archive](sync-archive.md)
- [Solución de problemas de operaciones](../operations/troubleshooting.md)
