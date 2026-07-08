---
title: load / search / graph
sidebar_position: 2
description: Comandos de lectura — cargar memoria enrutada, buscar en la bóveda e inspeccionar el enrutamiento del grafo.
---

# load / search / graph

Los comandos de lectura cargan la memoria enrutada, buscan en la bóveda e inspeccionan el enrutamiento del grafo.

## load

```bash
engram load "<task>"
engram load --for-agents "<task>"
engram load --dry-run "<task>"
engram load --all "<task>"
```

`load` primero ancla el enrutamiento en términos de consulta significativos, ignorando palabras de memoria genéricas como `rule`, `knowledge` y stopwords comunes. Luego refina el grupo de candidatos más amplio en un paquete de contexto compacto. La carga normal informa de los recuentos seleccionados y totales relacionados, como `loaded 8 memory files / 14 total related memories`.

- `--for-agents` — ruta compacta orientada al agente (solo `id`, `type`, `tags`, `confidence`, `depends_on` en el frontmatter; una variante de regla seleccionada)
- `--dry-run` — muestra recuentos de candidatos, etiquetas de reducción y motivos de coincidencia sin imprimir el contenido
- `--all` — devuelve cada coincidencia enrutada visible en lugar del límite compacto

`workflow` y `workflows` siguen enrutándose a memorias de habilidades, pero las palabras de tipo genérico no crean una coincidencia amplia por sí mismas.

## search

```bash
engram search "<topic>"
engram search --semantic "<topic>"
```

La búsqueda predeterminada es la búsqueda léxica determinista. `search --semantic` agrega similitud local determinista, no búsqueda semántica respaldada por embeddings.

## graph

```bash
engram graph "<topic>"
engram graph --rebuild
```

Inspecciona el enrutamiento del grafo. Ejecuta `engram graph --rebuild` después de ediciones manuales. El grafo informa de las capas de dependencia, y `engram load` extrae los requisitos previos enrutados al mismo paquete de contexto compacto antes de las memorias más profundas.

Los bordes relacionados del grafo y las coincidencias vectoriales no pueden cargar memorias no relacionadas por sí mismos; solo ayudan a reclasificar o expandir memorias que ya coinciden con términos de consulta significativos. Los requisitos previos explícitos de `depends_on` pueden seguir cargándose sin su propia coincidencia de palabras clave.

## Capas de dependencia (Dependency layers)

```yaml
depends_on: [release-foundation]
level: advanced
```

Usa el frontmatter `depends_on` cuando una memoria deba basarse en otra memoria en lugar de repetirla.

## Siguientes pasos

- [save / save-session / observe](save-session.md)
- [Conceptos: ruta de lectura y enrutamiento](../concepts/read-path.md)
