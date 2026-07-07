---
title: "Protocolo de memoria de propiedad humana"
sidebar_position: 1
description: "Engram es un protocolo que hace que la memoria del agente de IA sea inspeccionable, portable y gobernada por humanos."
---

# Entender Engram

Lea esto antes de la guía de comandos. Engram es útil debido a quién es el propietario de la memoria, no porque tenga muchos comandos.

## Modelo en Una Frase

Engram es un protocolo de archivos que permite a los agentes de IA utilizar memoria duradera mientras los humanos deciden qué se vuelve duradero.

## Qué Es Engram

Engram es un centro de memoria de conocimiento para:

- reglas del proyecto
- decisiones del equipo
- flujos de trabajo repetibles
- hechos duraderos
- preferencias personales que deben viajar a través de los proyectos

La memoria es Markdown simple. El índice, el grafo, los hashes y los archivos de adaptador existen para hacer que ese Markdown sea más fácil y seguro de usar.

## Qué No Es Engram

Engram no es:

- un cerebro oculto para un agente
- un silo de memoria propiedad de un proveedor
- un reemplazo para la documentación del proyecto
- una base de datos vectorial que pretende ser la autoridad
- un grabador automático que guarda todo para siempre

Los agentes pueden proponer memoria. Los humanos aprueban, rechazan, editan, archivan y son dueños de la memoria.

## La Promesa Central

Engram intenta hacer que la memoria de IA sea:

- revisable: se puede leer en un editor normal
- portable: se puede sincronizar con Git y usar con diferentes agentes
- corregible: la memoria errónea se puede archivar en lugar de alterar silenciosamente el trabajo futuro
- privada por defecto: las reglas de omisión (ignore rules) y las puertas de aprobación detienen la captura accidental
- aburrida a propósito: Markdown es más fácil de confiar que el estado invisible de una plataforma

## Las Capas

| Capa | Significado |
| --- | --- |
| Markdown | Fuente de verdad duradera |
| JSON index | Capa de búsqueda rápida |
| JSON graph | Capa de enrutamiento de temas y relaciones |
| Hashes | Comprobaciones de integridad |
| Approval | Límite de confianza antes de las escrituras |
| Ignore rules | Controles de privacidad |
| Git | Historial, portabilidad, revisión, recuperación |
| Agent adapters | Capa de conveniencia para Codex, Claude, Cursor, Gemini y otros agentes |

El JSON generado ayuda a los agentes a encontrar la memoria más rápido, pero no es la autoridad. Si los archivos generados no coinciden con Markdown, gana Markdown.

## Ciclo de Vida de la Memoria

1. Una sesión, archivo o nota humana contiene conocimiento útil.
2. Un agente propone candidatos a memoria concisos.
3. Un humano aprueba todos, selecciona algunos, añade una nota o los rechaza.
4. Engram escribe la memoria en Markdown aprobado.
5. Engram actualiza los hashes, el índice, el grafo y el registro de cambios (changelog).
6. Los agentes futuros cargan solo la memoria relevante para la tarea actual.
7. Si la memoria se vuelve incorrecta, Engram la archiva junto con un motivo.

Este ciclo de vida mantiene la memoria activa sin hacerla invisible.

## Humano, Agente, Engram, Git

| Actor | Rol |
| --- | --- |
| Humano | Elige qué se convierte en memoria duradera |
| Agente | Detecta patrones y propone candidatos |
| Engram | Aplica el esquema, la seguridad, el enrutamiento, la aprobación y el mantenimiento |
| Git | Transporta la memoria entre máquinas y proporciona el historial de revisiones |

El agente es útil, pero no es el propietario.

## Buena Memoria

La buena memoria de Engram es:

- lo suficientemente estable como para importar la próxima semana
- lo suficientemente específica como para enrutarse más tarde
- lo suficientemente corta como para cargarse en el contexto de un agente
- lo suficientemente segura como para compartirse en el ámbito previsto
- escrita como una regla, flujo de trabajo o elemento de conocimiento

La mala memoria es ruido de chat temporal, secretos, credenciales, especulaciones puntuales o hechos que nadie ha aprobado.

## Alcance

La memoria del espacio de trabajo vive en:

```text
<proyecto>/.agents/.engram/
```

La memoria global es opcional y vive donde el usuario la configure.

La memoria del espacio de trabajo gana. La memoria global es el respaldo para preferencias reutilizables, hábitos personales o valores predeterminados de todo el equipo.

## Por Qué No Solo la Memoria Integrada del Agente

La memoria integrada es conveniente, pero puede ser difícil de inspeccionar, comparar, exportar, compartir o corregir. A menudo pertenece a una sola aplicación o cuenta.

Engram hace visible la capa duradera. La memoria integrada aún puede ayudar, pero Engram debe ser la fuente de propiedad cuando el conocimiento importa.

## Límites a Conocer

La búsqueda predeterminada de Engram es una búsqueda léxica determinista. `engram search --semantic` añade similitud local determinista, no búsqueda semántica respaldada por embeddings. Los vectores del grafo son vectores locales de palabras hasheadas, no embeddings semánticos. La detección de contradicciones es consultiva. La configuración de cifrado existe, pero el almacenamiento cifrado aún no está implementado.

Estos límites se declaran intencionadamente de forma clara. Engram debe decir a los usuarios qué es real hoy y qué es trabajo futuro.

Siguiente: [Inicio rápido para agentes de IA](../quickstart.md).
