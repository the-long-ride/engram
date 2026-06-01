# Engram

Engram es un protocolo de memoria de propiedad humana para agentes de IA. Conserva el conocimiento duradero del proyecto, del equipo y de las preferencias personales en archivos que los humanos pueden inspeccionar, revisar, sincronizar y reparar.

Engram no es un cerebro de agente oculto. El agente puede proponer memoria, pero la fuente de verdad es un Markdown aprobado bajo `.agents/.engram/` o una carpeta de memoria global opcional.

## Qué Problema Resuelve

Los agentes de IA olvidan las decisiones del proyecto, repiten las preguntas de configuración y mezclan el contexto antiguo con las nuevas instrucciones. La memoria integrada suele ser privada de un proveedor, una aplicación o una máquina.

Engram le da a la memoria un contrato estable:

- Los hechos, reglas y flujos de trabajo aprobados viven como Markdown.
- Los índices y los grafos aceleran el enrutamiento.
- Las escrituras requieren aprobación humana.
- Los hashes revelan modificaciones inseguras.
- Las reglas de omisión (ignore rules) protegen el contexto privado.
- Git proporciona historial, portabilidad y revisión por parte del equipo.

## Modelo Mental

Piense en Engram como un centro de memoria de conocimiento:

| Capa | Trabajo |
| --- | --- |
| Markdown | Fuente de verdad duradera |
| JSON index | Capa de búsqueda rápida |
| JSON graph | Capa de enrutamiento de temas y relaciones |
| Approval gate | Límite de confianza antes de las escrituras |
| Hashes | Comprobaciones de integridad antes de las lecturas |
| Ignore rules | Controles de privacidad |
| Git | Historial de auditoría y sincronización |
| Agent adapters | Conveniencia, no autoridad |

## Prioridad de Alcance

Engram resuelve la memoria en este orden:

1. Memoria del espacio de trabajo (workspace): `<proyecto>/.agents/.engram/`
2. Memoria global: `$ENGRAM_GLOBAL_DIR` o `engram init --global-path <ruta>`

La memoria del espacio de trabajo gana. La memoria global es el respaldo para preferencias reutilizables y contexto del equipo en diferentes proyectos.

## Estado Actual

Engram incluye:

- `save` para una memoria aprobada.
- `save-session` / `ss` para varias memorias de una sesión.
- `observe` para notas en borrador que aún no son memoria activa.
- `take-control` para importar guías y documentos existentes del agente.
- `graph` y `quality-check` para señales de revisión.
- `archive` para memoria incorrecta o reemplazada.
- `repair` para archivos de memoria mal formados que el proceso de reconstrucción del índice omite.
- `benchmark` para comprobaciones de regresión de recuperación.
- Conjuntos de habilidades del agente (skillsets), adaptadores de comando slash y herramientas de propuesta de estilo MCP.

Antes de usar comandos, lea la página de conceptos: [Entender Engram](understanding.md).

Siguiente: [Inicio rápido para agentes de IA](quickstart.md).
