# Protocolo de Memoria de Propiedad Humana

Engram no es solo "memoria de agente". Es un protocolo que hace que la memoria sea inspeccionable, portable y gobernada por humanos.

## El Contrato

Markdown es memoria duradera.

Los archivos de índice y grafo JSON son capas de aceleración.

La aprobación es el límite de confianza.

Los hashes son comprobaciones de integridad.

Las reglas de omisión (ignore rules) son controles de privacidad.

Git es portabilidad e historial de auditoría.

Los adaptadores de agente son conveniencia, no autoridad.

Los agentes pueden sugerir memoria, pero los humanos son propietarios de lo que se convierte en memoria.

## Tipos de Memoria

| Tipo | Uso |
| --- | --- |
| Rule | preferencia del usuario, corrección, restricción, guía de siempre/nunca |
| Skill | flujo de trabajo repetible, lista de verificación, procedimiento, libro de ejecución (runbook) |
| Knowledge | hecho objetivo del proyecto, decisión, detalle de implementación |

Cada archivo de memoria activa tiene secciones de `Context`, `Content` y `Example`. Las memorias de tipo Rule (regla) también apuntan a límites de líneas concisos para que la guía cargada siga siendo útil.

## Flujo de Escritura

1. El agente propone uno o más candidatos.
   Con `save-session --query-level <n>`, el agente puede considerar hasta n chats humano-agente recientes y accesibles, pero solo como contexto de propuesta.
   La forma natural `/engram ss -a last 50 sessions` usa el mismo alcance con aprobación explícita de todos los candidatos: `engram save-session --query-level 50 --accept-all`.
2. Engram analiza el tipo de candidato y el alcance de destino (scope).
3. Engram comprueba el esquema, secretos, patrones de inyección de prompts y seguridad de ruta.
4. El humano ve una vista previa.
5. El humano responde `A`, `A 1,3`, `B <nota>` o `C`.
6. Solo se escribe la memoria aprobada.
7. Se actualizan el índice, grafo, hashes y registro de cambios (changelog).

## Flujo de Lectura

1. Engram carga el espacio de trabajo y los índices globales opcionales.
2. Las entradas del espacio de trabajo ganan sobre los duplicados globales.
3. Las reglas de omisión y los filtros de rol ocultan las entradas irrelevantes.
4. El enrutamiento sensible al grafo selecciona un paquete de contexto compacto.
5. Se ejecutan comprobaciones de hash y de seguridad antes de imprimir el contenido.

## Por Qué Importa Esto

Sin un protocolo, la memoria puede convertirse en un estado invisible. El estado invisible es difícil de revisar, difícil de compartir y fácil de envenenar accidentalmente por los agentes.

Engram hace que la memoria sea aburrida a propósito: archivos, diferencias (diffs), hashes, puertas de revisión y comandos que un humano puede volver a ejecutar.

Siguiente: [Operaciones](operations.md).
