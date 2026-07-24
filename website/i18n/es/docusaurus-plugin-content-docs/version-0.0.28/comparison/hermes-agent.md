---
title: Hermes Agent
sidebar_position: 6
description: Engram frente a Hermes Agent — protocolo de archivos propiedad del humano frente a memoria autónoma siempre activa.
---

# Hermes Agent

## TL;DR

| | Engram | Hermes Agent |
|---|---|---|
| **Filosofía** | Protocolo prioritario de archivos, propiedad del humano (automatización opcional) | Memoria autónoma siempre activa |
| **Almacenamiento** | Archivos Markdown tipados en `.agents/.engram/` | `MEMORY.md` + `USER.md` (límites estrictos de caracteres) |
| **Modelo de escritura** | Aprobado por el humano de forma predeterminada (puerta A/B/C; automatizable mediante reglas) | El agente escribe de forma autónoma |
| **Recuperación** | Bajo demanda: `engram load "<task>"` inyecta archivos relevantes | Siempre activa: archivos principales congelados en el system prompt de cada sesión |
| **Búsqueda vectorial** | Sqlite-vec local opcional (determinista, no basada en embeddings) | A través de proveedor externo (por ejemplo, agentmemory — BM25 + vector) |
| **Multitáctico** | Cualquier agente que lea archivos puede consumir la memoria de Engram | El núcleo de Hermes es monomando; multiagente mediante complemento agentmemory |
| **Portabilidad** | Nativo de Git, primero fuera de línea, Markdown simple | Archivos locales; los proveedores externos pueden agregar bloqueo en la nube |
| **Sobrecarga** | Sin demonio, requiere disciplina de guardado (a menos que esté automatizado) | Proceso de servidor + visor UI, API REST, servidor MCP |

## Formatos de almacenamiento

**Engram** almacena cada memoria como un archivo Markdown tipado con frontmatter YAML, verificaciones de integridad de hash y un grafo de dependencia opcional (`depends_on`). Un índice JSON, grafo y sidecar sqlite-vec actúan como capas de aceleración — Markdown es la fuente de verdad.

**Hermes** comprime toda la memoria persistente en dos archivos limitados:

- `~/.hermes/memories/MEMORY.md` — notas del agente, limitadas a 2200 caracteres
- `~/.hermes/memories/USER.md` — perfil de usuario, limitado a 1375 caracteres

Los límites estrictos de caracteres obligan al agente a curar en lugar de acumular. El historial de sesiones se puede buscar a través de SQLite FTS5.

## Modelo de escritura

**Engram** — puerta humana explícita de forma predeterminada. Los agentes proponen candidatos; un humano debe aprobar antes de que algo aterrice en el disco. El escaneo de secretos e inyecciones de prompts se realiza al guardar. Los usuarios pueden optar por automatizar este proceso guardando una regla para guardar automáticamente nuevas memorias propuestas cuando se completa una respuesta.

**Hermes** — autónomo. El agente decide qué escribir y cuándo, limitado solo por los límites de caracteres. Sin aprobación humana en el bucle principal.

## Modelo de recuperación

**Engram** — enrutamiento bajo demanda. `engram load "<task>"` reclasifica a los candidatos por etiquetas, tipo, actualidad, grafo y señales vectoriales opcionales, luego inyecta un paquete compacto (predeterminado: 8 archivos) en el contexto.

**Hermes** — inyección siempre activa. Los archivos principales se congelan en el system prompt al inicio de la sesión. Un proveedor externo opcional (por ejemplo, agentmemory) ejecuta una recuperación previa antes de cada turno de LLM y se sincroniza después.

## Cuándo usar cuál

**Usa Engram** cuando necesites memoria auditable y revisada por humanos; uso compartido del equipo a través de Git; garantías de privacidad; o portabilidad agnóstica de agente a través de herramientas (con la opción de automatizar el guardado a través de reglas personalizadas).

**Usa Hermes** cuando desees memoria que se acumule automáticamente sin disciplina de guardado, inyección de contexto siempre activa o un tiempo de ejecución más rico con visores, API REST y backends vectoriales conectables.

## Siguientes pasos

- [agentmemory](agentmemory.md)
- [Descripción general de comparación](overview.md)
