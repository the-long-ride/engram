---
title: agentmemory
sidebar_position: 3
description: Engram frente a rohitg00/agentmemory — protocolo de archivos frente a motor de memoria automática.
---

# agentmemory

[rohitg00/agentmemory](https://github.com/rohitg00/agentmemory) es un potente motor de memoria automática para agentes de codificación. Su README presenta memoria basada en servidor, integración de MCP/hooks/REST, muchos adaptadores de agente, afirmaciones de benchmark, un visor, reproducción, recuperación híbrida e integración de Hermes.

Usa agentmemory cuando desees captura automática, visor/reproducción en vivo, recuperación vectorial, muchas herramientas MCP y memoria compartida de estilo servidor.

Usa Engram cuando desees que la memoria sea un protocolo legible por el repositorio: Markdown primero, aprobado por el humano, revisado por Git, portátil entre agentes incluso sin un servidor en ejecución.

| Dimensión | Engram | agentmemory |
| --- | --- | --- |
| Fuente de verdad | Archivos Markdown aprobados | Servidor/almacén de memoria |
| Límite de confianza | Aprobación humana A/B/C | Captura automática más gobernanza de herramientas |
| Modo predeterminado | Protocolo de archivos, no requiere demonio | Servicio en ejecución recomendado |
| Revisión | Git diff y revisión de Markdown | Visor/API y sesiones almacenadas |
| Ideal para | equipos que necesitan propiedad y audibilidad | usuarios que desean memoria automática y reproducción |
| Riesgo | más disciplina manual | más estado invisible a menos que se gobierne cuidadosamente |

## Siguientes pasos

- [Hermes Agent](hermes-agent.md)
- [Descripción general de comparación](overview.md)
