---
title: Pestaña Review
sidebar_position: 5
description: Resuelva hallazgos de revisión, dirija un agente de IA y confirme explícitamente escrituras de memoria de respaldo.
---

import RiskCallout from '@site/src/components/RiskCallout';

# Pestaña Review

Review es la vía controlada para hallazgos y candidatos diferidos. Nunca llama directamente a un proveedor de IA. Usted inspecciona el contexto, copia un prompt acotado para un agente de IA y luego permite que dicho agente guarde mediante su terminal o confirma explícitamente una respuesta pegada.

## Cola y contexto

La cola combina hallazgos de revisión y candidatos diferidos de la bandeja de entrada. Seleccione un elemento para inspeccionar su resumen, metadatos de memoria vinculada y contenido completo. Los archivos vinculados vacíos o no disponibles se notifican sin detener la revisión de la cola restante.

## Prompt de revisión para IA

Elija cualquier memoria vinculada como dependencia o reemplazo y use **Copy AI review prompt**. El prompt incluye únicamente el candidato seleccionado, el contexto de memoria visible, las instrucciones de relación y el ámbito de escritura requerido.

Cuando el agente de IA tiene acceso a la terminal y aprobación para escribir, debe guardar el resultado saneado con el comando incrustado en el prompt. La vía dentro de la app es un respaldo, no una ruta de escritura autónoma.

## Pegado, diff y confirmación

Pegue únicamente la propuesta de memoria revisada por la IA. Review muestra un diff de líneas de solo lectura: las líneas eliminadas en rojo y las agregadas en verde. **Approve & write** abre un diálogo de confirmación antes de que Engram valide y escriba la propuesta.

<RiskCallout level="risky">
La confirmación escribe en la memoria del workspace o global de inmediato. Revise la propuesta, el ámbito y cualquier instrucción de reemplazo antes de confirmar.
</RiskCallout>

Solo se puede seleccionar una relación de reemplazo. Las dependencias se pueden seleccionar de forma independiente. Actualice la cola tras guardar para cargar su estado actual.

## Próximos pasos

- [Pestaña Construct](construct.md)
- [Pestaña Memories](memories.md)
- [CLI: save-session](../cli/save-session.md)
