---
title: Ruta de escritura y aprobación
sidebar_position: 6
description: Los agentes proponen, las personas aprueban. Solo se escribe la memoria aprobada y después se actualizan índices, grafo, hashes y registro de cambios.
---

# Ruta de escritura y aprobación

El flujo de escritura es la frontera de confianza. Los agentes proponen, las personas aprueban.

## Flujo de escritura

1. El agente propone una o más candidatas.
   Con `save-session --query-level <n>`, el agente puede considerar hasta n chats recientes accesibles entre personas y agentes, pero solo como contexto de la propuesta.
   El natural `/engram ss -f last 50 sessions` tiene el mismo alcance más la aprobación forzada explícita: `engram save-session --query-level 50 --force`.
2. Engram analiza el tipo de candidata y el ámbito de destino.
3. Engram comprueba el esquema, los secretos, los patrones de inyección de prompts y la seguridad de las rutas.
4. La persona ve una vista previa. Cada candidata incluye una línea `Verdict:` determinista: `ADD`, `UPDATE <id>`, `SUPERSEDE <id>` o `NOOP duplicate of <id>` (sin llamadas a un modelo).
5. Las respuestas directas en la CLI usan `A`, `A 1,3`, `B <note>` o `C`.
6. Las respuestas en el chat del agente de IA usan `yes`, `audit` o `cancel` tras las candidatas exactas mostradas.
7. Solo se escribe la memoria aprobada. `A` y `B` omiten las candidatas `NOOP`, y aprobar un `SUPERSEDE` marca la memoria anterior como reemplazada; `--force` y el autoguardado nunca aplican un `SUPERSEDE`, lo aplazan para su revisión.
8. Se actualizan el índice, el grafo, los hashes y el registro de cambios.

## Palabras de aprobación

Las palabras de aprobación son `yes`, `approve`, `confirm` o `save`. Las palabras de auditoría son `audit`, `revise`, `correct` o un texto de reemplazo editado. Las palabras de cancelación son `cancel`, `stop` o un rechazo. Solo la aprobación tras la visualización exacta de las candidatas autoriza `engram save-session --force` para esas candidatas.

La CLI directa en terminal sigue siendo A/B/C. Las herramientas de propuesta de MCP siguen sin escribir nada.

## Sugerencias de memorias relacionadas

Cuando `engram save` encuentra memorias activas relacionadas, la vista previa de aprobación las informa con una sugerencia de `depends_on` o una advertencia de posible duplicado. Aceptar guarda la vista previa tal cual; rechace primero si quiere reestructurar dependencias o archivar duplicados antes de guardar.

Para `save-session --force`, Engram se detiene antes de escribir cuando aparecen esas sugerencias de memorias relacionadas. El agente debe usar la respuesta para planificar una nueva ejecución estructurada: añadir `DEPENDS_ON: memory-id` para las dependencias, `LEVEL: advanced` cuando una memoria es más profunda que su prerrequisito, o `UPDATE: memory-id` cuando una candidata debe fusionarse con un posible duplicado.

<!-- evidence-foundation:v3:start -->
## Memoria respaldada por evidencia

Para material de origen que debe revisarse antes de convertirse en memoria activa:

```bash
engram observe --file session.md
engram save-session --file .agents/.engram/inbox/<observation>.md
```

El primer comando sanea la fuente y escribe una traza inmutable identificada por `trace_id`, más un envoltorio de inbox editable. El segundo comando resuelve el envoltorio hasta su traza, verifica el hash y el ámbito, y escribe únicamente memoria schema v3 aprobada por una persona, con `evidence_refs`. Editar `## Raw Note` no puede reemplazar la evidencia de la traza.
<!-- evidence-foundation:v3:end -->

## Comprobaciones de seguridad al guardar

- Validación del esquema
- Análisis de secretos
- Análisis de inyección de prompts
- Seguridad de rutas
- Integridad de hashes

## Por qué importa

Sin un protocolo, la memoria puede convertirse en un estado invisible. El estado invisible es difícil de revisar, difícil de compartir y fácil de envenenar por accidente para los agentes.

Engram hace que la memoria sea aburrida a propósito: archivos, diffs, hashes, puertas de revisión y comandos que una persona puede volver a ejecutar.

## Próximos pasos

- [Privacidad, reglas de exclusión y seguridad](safety.md)
- [CLI: save / save-session / observe](../cli/save-session.md)
