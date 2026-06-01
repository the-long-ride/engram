# Engram

Engram es un protocolo de memoria para agentes de IA, propiedad del ser humano. Guarda conocimiento duradero de proyectos, equipos y preferencias personales en archivos que se pueden leer, revisar, sincronizar y reparar.

No es un cerebro oculto del agente. El agente puede proponer memoria; la fuente de verdad son archivos Markdown aprobados en `.agents/.engram/` o en una memoria global opcional.

## Qué Problema Resuelve

Los agentes olvidan decisiones del proyecto, repiten preguntas de configuración y mezclan contexto antiguo con instrucciones nuevas. La memoria integrada suele vivir dentro de un proveedor, una aplicación o una máquina.

Engram da un contrato estable:

- hechos, reglas y flujos aprobados viven en Markdown
- índices y grafos aceleran el enrutamiento
- toda escritura requiere aprobación humana
- los hashes detectan cambios inseguros
- las reglas de ignore protegen privacidad
- Git aporta historial, portabilidad y revisión de equipo

## Modelo Mental

Engram funciona como un centro de memoria de conocimiento:

| Capa | Función |
| --- | --- |
| Markdown | fuente de verdad durable |
| JSON index | búsqueda rápida |
| JSON graph | rutas por tema y relación |
| Approval gate | frontera de confianza |
| Hashes | integridad antes de leer |
| Ignore rules | controles de privacidad |
| Git | auditoría y sincronización |
| Agent adapters | comodidad, no autoridad |

## Prioridad De Alcance

1. Memoria workspace: `<project>/.agents/.engram/`
2. Memoria global: `$ENGRAM_GLOBAL_DIR` o `engram init --global-path <path>`

La memoria workspace gana. La global sirve como fallback para preferencias reutilizables y contexto entre repos.

## Qué Incluye

- `save` para una memoria aprobada
- `save-session` / `ss` para varias memorias de una sesión
- `observe` para notas crudas no activas
- `take-control` para importar guías y documentos existentes
- `graph` y `quality-check` para señales de revisión
- `archive` para memoria incorrecta u obsoleta
- `repair` para archivos inválidos omitidos por rebuild
- `benchmark` para regresiones de recuperación
- skillsets, slash adapters y herramientas MCP de propuesta

Antes de usar comandos, lee la página conceptual: [Entender Engram](understanding.md).

Siguiente: [Quickstart con agente](quickstart.md).
