---
title: "Descripción general comparativa"
sidebar_position: 1
description: "Cómo se compara Engram con la memoria integrada del agente, agentmemory, Obsidian, Tolaria y Hermes Agent."
---

# Comparación, Pros, Contras y Hoja de Ruta

Engram se sitúa en una parte diferente del espacio de memoria que los motores de memoria automática. Se optimiza para la propiedad humana, la capacidad de revisión y la portabilidad.

## Fortalezas de Engram

- Fuente de verdad en Markdown simple.
- Aprobación humana antes de escrituras duraderas.
- Historial de auditoría y sincronización nativos de Git.
- Memoria con prioridad en el espacio de trabajo y respaldo en la global.
- Agnóstico al agente: cualquier agente puede leer Markdown.
- Capas de seguridad: validación de esquemas, escaneo de secretos, escaneo de inyección, hashes y reglas de omisión.
- No se requiere daemon, base de datos ni cuenta en la nube.
- Los flujos de importación, observación, archivado, grafo, benchmark y reparación respaldan el mantenimiento a largo plazo.

## Compensaciones (Tradeoffs) de Engram

- Menos automático que los sistemas de memoria basados en daemon.
- La búsqueda predeterminada es una búsqueda léxica determinista; `search --semantic` añade similitud local determinista, no búsqueda semántica respaldada por embeddings completos.
- Los vectores del grafo son vectores locales de palabras hasheadas, no embeddings semánticos.
- La detección de contradicciones es heurística y consultiva.
- `deduplicate --semantic` utiliza similitud local determinista, no embeddings externos.
- La minería de patrones, la configuración de cifrado y los activos del flujo de trabajo de PR existen, pero los flujos de trabajo completos en tiempo de ejecución aún no están conectados.
- El grafo depende de las etiquetas y resúmenes generados.

## Comparado con Agentmemory

[rohitg00/agentmemory](https://github.com/rohitg00/agentmemory) es un potente motor de memoria automática para agentes de codificación. Su README presenta memoria basada en servidor, integración de MCP/hooks/REST, muchos adaptadores de agente, afirmaciones de benchmark, un visor, reproducción (replay), recuperación híbrida e integración con Hermes.

Use `agentmemory` cuando desee captura automática, visor/reproducción en vivo, recuperación de vectores, muchas herramientas MCP y memoria compartida de estilo de servidor.

Use `Engram` cuando desee que la memoria sea un protocolo legible por el repositorio: Markdown primero, aprobado por humanos, revisado por Git y portable entre agentes incluso sin un servidor en ejecución.

| Dimensión | Engram | agentmemory |
| --- | --- | --- |
| Fuente de verdad | Archivos Markdown aprobados | Servidor/almacén de memoria |
| Límite de confianza | Aprobación humana A/B/C | Captura automática más gobernanza de herramientas |
| Modo predeterminado | Protocolo de archivos, no requiere daemon | Se recomienda servicio en ejecución |
| Revisión | Git diff y revisión de Markdown | Visor/API y sesiones almacenadas |
| Mejor ajuste | Equipos que necesitan propiedad y auditabilidad | Usuarios que desean recuerdo y reproducción automáticos |
| Riesgo | Más disciplina manual | Más estado invisible a menos que se gobierne con cuidado |

## Comparado con Hermes Agent

### Resumen (TL;DR)

| | Engram | Hermes Agent |
|---|---|---|
| **Filosofía** | Protocolo de archivos primero, propiedad humana (automatización opcional) | Memoria autónoma y siempre activa |
| **Almacenamiento** | Archivos Markdown clasificados en `.agents/.engram/` | `MEMORY.md` + `USER.md` (límites estrictos de caracteres) |
| **Modelo de escritura** | Aprobado por el humano por defecto (puerta A/B/C; automatizable mediante reglas) | El agente escribe de forma autónoma |
| **Recuperación** | Bajo demanda: `engram load "<tarea>"` inyecta archivos relevantes | Siempre activo: archivos principales congelados en el prompt del sistema cada sesión |
| **Búsqueda vectorial** | sqlite-vec local opcional (determinista, no respaldado por embeddings) | Vía proveedor externo (por ejemplo, agentmemory — BM25 + vector) |
| **Multi-agente** | Cualquier agente lector de archivos puede consumir la memoria de Engram | El núcleo de Hermes es mono-agente; multi-agente vía plugin agentmemory |
| **Portability** | Nativo de Git, primero sin conexión, Markdown simple | Archivos locales; los proveedores externos pueden añadir dependencia de la nube |
| **Sobrecarga (Overhead)** | Sin daemon, requiere disciplina de guardado (a menos que se automatice) | Proceso de servidor + interfaz de usuario de visualización, API REST, servidor MCP |

---

### Formatos de almacenamiento

**Engram** almacena cada memoria como un archivo Markdown clasificado con frontmatter YAML, comprobaciones de integridad hash y un gráfico de dependencias opcional (`depends_on`). Un índice JSON, un gráfico y un sidecar sqlite-vec actúan como capas de aceleración — Markdown es la fuente de verdad.

**Hermes** comprime toda la memoria persistente en dos archivos limitados:
- `~/.hermes/memories/MEMORY.md` — notas del agente, limitadas a 2,200 caracteres
- `~/.hermes/memories/USER.md` — perfil de usuario, limitado a 1,375 caracteres

Los límites estrictos de caracteres obligan al agente a curar en lugar de acumular. El historial de sesiones se puede buscar mediante SQLite FTS5.

---

### Modelo de escritura

**Engram** — puerta humana explícita por defecto. Los agentes proponen candidatos; un humano debe aprobar antes de que algo se guarde en el disco. El escaneo de secretos y de inyección de prompts ocurren al momento de guardar. *(Nota: Los usuarios pueden optar por automatizar este proceso guardando una regla para guardar automáticamente las nuevas memorias propuestas cuando se completa una respuesta, lo que permite un flujo de guardado automático).*

**Hermes** — autónomo. El agente decide qué escribir y cuándo, limitado únicamente por los topes de caracteres. Sin aprobación humana en el bucle principal.

---

### Modelo de recuperación

**Engram** — enrutamiento bajo demanda. `engram load "<tarea>"` clasifica de nuevo los candidatos por etiquetas, tipo, antigüedad, gráfico y señales vectoriales opcionales, luego inyecta un paquete compacto (por defecto: 8 archivos) en el contexto.

**Hermes** — inyección siempre activa. Los archivos principales se congelan en el prompt del sistema al inicio de la sesión. Un proveedor externo opcional (por ejemplo, agentmemory) realiza una búsqueda previa antes de cada turno del LLM y se sincroniza después.

---

### Cuándo usar cuál

**Use Engram** cuando necesite una memoria almacenable y revisada por humanos; compartir en equipo a través de Git; garantías de privacidad; o portabilidad independiente del agente entre herramientas (con la opción de automatizar el guardado a través de reglas personalizadas).

**Use Hermes** cuando desee una memoria que se acumule automáticamente sin disciplina de guardado, inyección de contexto siempre activa o un entorno de ejecución más rico con visualizadores, API REST y backends vectoriales acoplables.

---

## Comparado con la Memoria Integrada del Agente

La memoria integrada del agente es conveniente, pero a menudo está vinculada a un solo host. Puede ser difícil de comparar (diff), exportar, revisar o compartir con otro agente.

Engram trata la memoria integrada como una capa de conveniencia, no como la autoridad. La autoridad sigue siendo los archivos de los que el humano es propietario.

## Ideas para la Hoja de Ruta

- Proveedor de embeddings locales opcional para vectores de grafos y búsqueda.
- Mejores diagnósticos de grafo que expliquen por qué se enrutó una memoria.
- Fixtures de benchmark registrados en el repositorio para el seguimiento de regresiones.
- Flujo de trabajo de revisión de contradicciones más sólido que combine grafos, control de calidad y archivado.
- Más pruebas de importación para variantes de exportación de `agentmemory`.
- Proveedor de embeddings externos opcional para la detección semántica de duplicados.
- Flujos de trabajo de reparación que puedan proponer correcciones después de informar sobre archivos de memoria no válidos.

Siguiente: volver al [Inicio](../intro.md).
