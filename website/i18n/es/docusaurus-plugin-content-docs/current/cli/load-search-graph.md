---
title: load / search / graph
sidebar_position: 2
description: "Comandos de lectura: cargue memoria enrutada, busque en el almacén e inspeccione el enrutamiento de grafos."
---

# load / search / graph

Los comandos de lectura cargan memoria enrutada, buscan en el almacén e inspeccionan el enrutamiento de grafos.

## load

```bash
engram load "<task>"
engram load --full "<task>"
engram load --dry-run "<task>"
engram load --all "<task>"
engram load --budget-tokens 800 "<task>"
engram load --disclosure full "<task>"
engram load --id <id>,<id>
engram load --exclude-keys workspace:rules/use-pnpm.md "<task>"
```

`load` tokeniza consultas y memorias con tokenización compatible con Unicode/vietnamita/CJK y luego ancla el enrutamiento en términos de consulta significativos usando `rawStems` sin expandir (`hasAnchorOverlap`), ignorando palabras de memoria genéricas como `rule`, `knowledge` y palabras vacías comunes para que la expansión de sinónimos no admita memorias no relacionadas. Cuando faltan anclas exactas, 24 clústeres de conceptos deterministas y puentes de coocurrencia del corpus aún pueden enlazar terminología relacionada. Las candidatas se puntúan con BM25F de 3 flujos (`title`, `tags`, `body`) más la telemetría de resultados de ciclo cerrado de `usage.json` (impulsos `applied`, penalizaciones `corrected` y decaimiento de ruido para memorias inyectadas repetidamente sin utilidad). Luego refina el conjunto de candidatos en un paquete de contexto compacto y ordena los cuerpos expandidos con `orderForAgentConsumption` (primero reglas, instrucciones y prerrequisitos de `depends_on`; en el medio contexto duradero más antiguo; al final hojas recientes `<=14d` o del nivel `working`). La carga normal informa recuentos seleccionados y totales relacionados, como `loaded 8 memory files / 14 total related memories`.

- `load` por defecto — ruta escalonada orientada al agente: los mejores aciertos según `load.expand_top` (por defecto 3) como cuerpos completos, cada otro acierto seleccionado como una tarjeta de una sola línea y un aviso de cierre `fetch: engram load --id <ids>`; cada encabezado de cuerpo lleva la `authority` de la memoria, el frontmatter como `evidence_refs`, `## Context`, `## Example` y `## Origin` no se representan (use `--full` para verlos) y las reglas muestran una variante seleccionada.
- `--id <id,...>` — obtiene cuerpos completos para tarjetas; los identificadores pueden estar separados por comas, y una obtención explícita cuenta para `stats --usage`.
- `--budget-tokens <200-16000>` — límite estricto en la salida escalonada completa; los cuerpos se convierten primero en tarjetas y solo entonces se omiten las tarjetas de menor rango.
- `--disclosure auto|full` — `full` imprime cada cuerpo empaquetado en lugar del paquete escalonado (también `load.disclosure: full` en la configuración).
- `--exclude-keys <scope:file,...>` — omite memorias que el emisor ya posee; no se imprime cuerpo ni tarjeta, y `--json` las lista en `already_loaded`.
- `--full` — salida heredada más amplia con frontmatter completo y todas las variantes de regla.
- `--dry-run` — muestra recuentos de candidatos, etiquetas de filtrado y motivos de coincidencia sin imprimir contenido.
- `--all` — devuelve todas las coincidencias enrutadas visibles en lugar del límite compacto.

`workflow` y `workflows` siguen enrutando a memorias de habilidades (skill), pero las palabras de tipo genéricas no generan por sí solas una coincidencia amplia.

Bajo la divulgación `auto`, las listas JSON `selected` y `entries` describen solo los cuerpos expandidos; las tarjetas se informan por separado. Configure `load.expand_top` y `load.disclosure` en el bloque `load` de `engram.config.json` (consulte [perfiles / workspaces / configuración](profiles-workspaces-config.md#load-configuration)).

## search

```bash
engram search "<topic>"
engram search --semantic "<topic>"
```

La búsqueda predeterminada es una búsqueda léxica determinista. `search --semantic` agrega similitud local determinista, no búsqueda semántica respaldada por embeddings. Los resultados de `search --json` incluyen un campo `score`.

## why

```bash
engram why <id>
engram why <id> "<query>"
engram why <id> "<query>" --json
```

Explica por qué una memoria específica se incluyó, clasificó u omitió para una consulta: informa `status` (`expanded_body`, `card`, `omitted_budget`, `omitted_limit`, `rejected_no_anchor`, `excluded_lifecycle`, `not_found`), `rank`, `score`, `matched_stems`, `missing_stems`, `budget` y `hint`. Pase `--json` para obtener diagnósticos estructurados.

## graph

```bash
engram graph "<topic>"
engram graph --rebuild
engram graph link <parent-id> <child-id...>
```

Inspeccione el enrutamiento del grafo o declare aristas de dependencia explícitas. Ejecute `engram graph --rebuild` tras ediciones manuales, o use `engram graph link <parent-id> <child-id...>` para añadir enlaces `depends_on` desde memorias hijas hacia un prerrequisito padre y actualizar el grafo. El grafo informa capas de dependencia, y `engram load` incorpora los prerrequisitos enrutados en el mismo paquete compacto antes que las memorias más profundas.

Las aristas relacionadas en el grafo y las coincidencias vectoriales no cargan memorias no relacionadas automáticamente; solo ayudan a reclasificar o ampliar memorias que ya coinciden con términos de consulta significativos. Los prerrequisitos explícitos `depends_on` aún pueden cargarse sin coincidencias de términos propias.

## Capas de dependencia {#dependency-layers}

```yaml
depends_on: [release-foundation]
level: advanced
```

Use el frontmatter `depends_on` cuando una memoria deba construirse sobre otra en lugar de repetirla.

## Próximos pasos {#next-steps}

- [save / save-session / observe](save-session.md)
- [Conceptos: ruta de lectura y enrutamiento](../concepts/read-path.md)
