---
title: Tipos de memoria
sidebar_position: 2
description: La memoria de Engram está tipificada — Regla, Habilidad y Conocimiento — para que el enrutamiento y la revisión se mantengan enfocados.
---

# Tipos de memoria

Cada memoria activa de Engram tiene un tipo. El tipo controla el enrutamiento, la revisión y cómo se presenta la memoria a los agentes.

| Tipo | Uso |
| --- | --- |
| Rule | preferencia del usuario, corrección, restricción, guía de siempre/nunca |
| Skill | flujo de trabajo repetible, lista de verificación, procedimiento, libro de ejecución |
| Knowledge | hecho objetivo del proyecto, decisión, detalle de implementación |

Cada archivo de memoria activo tiene las secciones `Context`, `Content` y `Example`. Las memorias de tipo Rule también tienen límites de líneas concisos para que la guía cargada siga siendo útil.

## Buena memoria

La buena memoria de Engram es:

- lo suficientemente estable como para importar la próxima semana
- lo suficientemente específica como para enrutarse más tarde
- lo suficientemente corta como para cargarse en el contexto de un agente
- lo suficientemente segura como para compartirse con el alcance previsto
- escrita como una regla, flujo de trabajo o elemento de conocimiento

La mala memoria es el ruido de chat temporal, secretos, credenciales, especulaciones únicas o hechos que nadie ha aprobado.

## Variantes de reglas

Engram siempre guarda las memorias de reglas con versiones ligeras (light), equilibradas (balanced) y estrictas (strict). El modo de variante de regla es una lente de renderizado para la memoria orientada al agente:

- **Strict** ayuda a que los modelos de nivel inferior se mantengan controlados.
- **Light** o **balanced** generalmente ayuda a los modelos más fuertes para que las reglas no limiten su razonamiento.

Cuando las variantes están desactivadas, Engram renderiza la redacción de la regla equilibrada por defecto. Sintonice con:

```bash
engram set-rule-variant strict|balanced|light|off
```

## Salida orientada al agente (`--full`)

Cuando se ejecuta `engram load "<task>"`, la salida se simplifica para los agentes de IA:

| Aspecto | Humano (`engram load`) | Agente (`--full`) |
| --- | --- | --- |
| Frontmatter | Todos los campos (id, type, tags, confidence, scope, author, created, updated, depends_on, etc.) | Solo `id`, `type`, `tags`, `confidence`, `depends_on` |
| Cuerpo de regla | Sección completa `## Rule Variants` con las tres variantes | Una variante seleccionada bajo `## Rule variants (1/3 based on current: <active>)` |
| Contenido que no es regla | Sección completa `## Content` | Mismo contenido, encabezado sin cambios |

Las herramientas MCP `engram_load` y los hooks SessionStart tienen como valor predeterminado `--full` (exclusión voluntaria a través de `full: true` en la herramienta MCP). Los adaptadores de skillset codifican `--full` en sus instrucciones generadas.

## Siguientes pasos

- [Memoria de espacio de trabajo frente a memoria global](scopes.md)
- [Ruta de lectura y enrutamiento](read-path.md)

