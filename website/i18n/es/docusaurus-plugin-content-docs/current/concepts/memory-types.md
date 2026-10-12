---
title: Tipos de memoria
sidebar_position: 2
description: La memoria de Engram está tipada (Regla, Skill y Conocimiento) para que el enrutamiento y la revisión se mantengan enfocados.
---

# Tipos de memoria

Toda memoria activa de Engram tiene un tipo. El tipo controla el enrutamiento, la revisión y cómo se presenta la memoria a los agentes.

| Tipo | Uso |
| --- | --- |
| Rule | preferencia del usuario, corrección, restricción, guía de siempre/nunca |
| Skill | flujo de trabajo repetible, lista de comprobación, procedimiento, runbook |
| Knowledge | hecho objetivo del proyecto, decisión, detalle de implementación |

Los archivos nuevos usan `schema_version: 3`. Las memorias de reglas y skills usan por defecto `authority: instruction`; el conocimiento usa por defecto `authority: reference`. `revision` empieza en 1 y se incrementa con cada actualización. Los ID de traza pertenecen a `evidence_refs`, mientras que las identidades de sesión u origen pertenecen a `derived_from`.

## Una buena memoria

Una buena memoria de Engram es:

- lo bastante estable como para importar la semana próxima
- lo bastante específica como para enrutarse más adelante
- lo bastante corta como para cargarse en el contexto de un agente
- lo bastante segura como para compartirse con el ámbito previsto
- escrita como una regla, un flujo de trabajo o un elemento de conocimiento

Una mala memoria es ruido temporal de chat, secretos, credenciales, especulación puntual o hechos que nadie ha aprobado.

## Variantes de reglas

Engram deriva en el momento de la presentación la redacción light, balanced y strict de una regla a partir de su `## Content` (balanced es el Content tal cual), de modo que los archivos de reglas nuevos y reescritos almacenan solo el Content. Una sección `## Rule Variants` se conserva únicamente para la redacción personalizada que aporta una candidata con `LIGHT:`/`BALANCED:`/`STRICT:`. El modo de variante de regla es una lente de presentación para la memoria dirigida a agentes:

- **Strict** ayuda a que los modelos de gama baja se mantengan controlados.
- La redacción **light** o **balanced** suele ayudar a los modelos más potentes, para que las reglas no limiten su razonamiento.

Cuando las variantes están desactivadas, Engram presenta por defecto la redacción balanced de las reglas. Ajústelo con:

```bash
engram set-rule-variant strict|balanced|light|off
```

## Salida compacta por defecto

Cuando se ejecuta `engram load "<task>"`, la salida se organiza por niveles y se reduce para agentes de IA por defecto:

| Aspecto | Por defecto (`engram load`) | Completa (`engram load --full`) |
| --- | --- | --- |
| Frontmatter | No se presenta; el encabezado del cuerpo es `### <id> [<type>, <authority>]` más `requires: <ids>` | Esquema schema v3 completo y campos heredados, incluidos procedencia, revisión, sustitución y validez |
| Divulgación | Los mejores `load.expand_top` resultados como cuerpos, el resto como tarjetas de una línea (`- <id> [<type>] <directive-or-summary>`), y después una pista `fetch:` | Todos los cuerpos empaquetados |
| Cuerpo de regla | Una variante seleccionada | El Content, más la sección `## Rule Variants` almacenada solo cuando el archivo tiene variantes personalizadas |
| Otras secciones | `## Context`, `## Example` y `## Origin` no se presentan | El mismo contenido, con el encabezado sin cambios |

MCP `engram_load` y los hooks usan por defecto la salida por niveles. Pase `full: true` en la herramienta MCP o use `engram load --full "<task>"` cuando necesite una salida heredada más amplia.

## Campos de enrutamiento opcionales

Estos campos de frontmatter son opcionales; una memoria sin ellos se comporta como antes y `schema_version` sigue siendo 3.

| Campo | Significado |
| --- | --- |
| `directive` | Una línea de como máximo 160 caracteres; se muestra en las tarjetas y pesa en la clasificación |
| `applies_to` | Lista de globs; inyecta la memoria cuando se lee o edita un archivo que coincide y cuenta como un ancla fuerte |
| `tier` | `durable` (por defecto) o `working` (acotada a una tarea, ignorada por Git, caduca) |
| `objective` | Hasta 200 caracteres; el objetivo para el que se escribió una memoria de trabajo |
| `valid_until` | Fecha de caducidad; una memoria de trabajo recibe hoy + `load.working_ttl_days` |

<!-- evidence-foundation:v3:start -->
## Memoria respaldada por evidencia

Los archivos nuevos usan `schema_version: 3`. Las memorias de reglas y skills usan por defecto `authority: instruction`; el conocimiento usa por defecto `authority: reference`. `revision` empieza en 1 y se incrementa con cada actualización. Los ID de traza pertenecen a `evidence_refs`, mientras que las identidades de sesión u origen pertenecen a `derived_from`. Los formatos heredados v1 (`Context` + `Content` + `Example`) y v2 (`Content`, `Origin` opcional) siguen siendo legibles.
<!-- evidence-foundation:v3:end -->

## Próximos pasos

- [Memoria de workspace frente a global](scopes.md)
- [Ruta de lectura y enrutamiento](read-path.md)


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


<!-- configuration-upgrade-inventory -->
## Inventario de actualización de configuración

Tras actualizar un paquete, ejecute `engram upgrade --latest --plan` antes de `engram upgrade --latest`. El inventario compartido analiza las memorias, instrucciones, skillsets, configuraciones, hooks y plugins gestionados por Engram en el workspace y en el ámbito global. Los bytes escritos por personas se conservan; los archivos mixtos ambiguos se informan como conflictos. Consulte [Actualizaciones de configuración](../operations/configuration-upgrades.md).
