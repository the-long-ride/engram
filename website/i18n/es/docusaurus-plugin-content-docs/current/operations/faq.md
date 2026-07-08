---
title: Preguntas frecuentes
sidebar_position: 4
description: Preguntas frecuentes sobre Engram.
---

# Preguntas frecuentes (FAQ)

## ¿Es Engram una base de datos vectorial?

No. La búsqueda predeterminada de Engram es una búsqueda léxica determinista. `engram search --semantic` agrega similitud local determinista, no búsqueda semántica respaldada por incrustaciones (embeddings). Los vectores del grafo son vectores de palabras hash locales, no incrustaciones semánticas. El sqlite-vec local opcional es una capa de aceleración, no la fuente de verdad.

## ¿Engram escribe la memoria automáticamente?

No. Los agentes proponen candidatos; los humanos aprueban. La CLI directa de la terminal utiliza A/B/C. El chat del agente de IA utiliza `yes`/`audit`/`cancel`. Solo las solicitudes explícitas de aceptar todo (`ss -a`) guardan a todos los candidatos, y los agentes no deben agregar `--accept-all` a menos que el humano lo haya solicitado.

## ¿Dónde vive la memoria?

- Memoria del espacio de trabajo: `<project>/.agents/.engram/`
- Memoria global: donde sea que la configure (vacía por defecto hasta que se configure)

La memoria del espacio de trabajo prevalece. La memoria global es alternativa para preferencias reutilizables y contexto de equipo.

## ¿Qué agentes son compatibles?

Codex, Claude, Gemini (y las superficies compatibles con Gemini de Antigravity), Cursor, Windsurf/Cascade, OpenCode, Copilot, Cline, hosts compatibles con AGENTS.md genéricos, hosts compatibles con MCP y hosts de comandos de barra inclinada (slash). Consulte la [Información general de integraciones de agentes](../integrations/overview.md).

## ¿Está implementado el cifrado?

Existe la configuración de cifrado, pero el almacenamiento cifrado aún no está implementado. Documente las limitaciones actuales con claridad.

## ¿Puedo usar Engram sin Git?

Sí. Git es opcional pero recomendado para el historial de auditoría, la portabilidad y la revisión del equipo.

## ¿Cómo archivo una memoria incorrecta?

```bash
engram archive --reason "<motivo>" <id-o-archivo>
```

El archivo abandona el enrutamiento activo solo después de la aprobación y permanece conservado en `archive/`. Utilice archivar, no eliminar, para facilitar la auditoría.

## ¿Cómo muevo la memoria global?

```bash
engram update-global-folder <nueva-ruta>
engram ugf <nueva-ruta>
engram move global folder from <ruta-anterior> to <nueva-ruta>
```

Agregue `--move-from-path <ruta-anterior>` cuando también deseen que Engram mueva toda la raíz global anterior a la nueva ubicación.

## Siguientes pasos

- [Resolución de problemas](troubleshooting.md)
- [Comparación y hoja de ruta](../comparison/overview.md)
