---
title: Cursor
sidebar_position: 5
description: Integración de Engram con Cursor a través de reglas, MCP, plugin local, comandos slash y hooks de inicio de sesión.
---

# Cursor

Cursor lee las reglas del proyecto desde los archivos `.cursor/rules/*.mdc`. Engram escribe `.cursor/rules/engram.mdc` con frontmatter válido (`alwaysApply: true`) y un bloque de instrucciones de bootstrap.

## Instalación

```bash
engram link cursor
```

## Archivos escritos

| Archivo | Propósito |
| --- | --- |
| `.cursor/rules/engram.mdc` | Reglas del proyecto con `alwaysApply: true` |
| `.cursor/mcp.json` | Registro de MCP (`type: "stdio"`) |
| `.cursor/hooks.json` | Hook `sessionStart` |
| `.cursor/commands/engram.md` | Adaptador slash `/engram` |

## Instalación global

```bash
engram link --global cursor
```

Engram crea un plugin local en `~/.cursor/plugins/local/engram/` que contiene el manifiesto del plugin, reglas, skills, comandos, configuración de MCP y hooks.

## Objetivo centrado en tiempo de ejecución

Cursor es un objetivo centrado en el tiempo de ejecución. Las reglas del proyecto contienen breves instrucciones de bootstrap que dependen de herramientas y hooks de MCP para el protocolo detallado; el archivo Agent Skill maneja todo el flujo de escritura/aprobación.

## Comportamiento de los hooks

El hook `sessionStart` inyecta el contexto de inicio de Engram a través del campo de salida `additional_context`. `beforeSubmitPrompt` es solo para permitir/bloquear y no se usa para la inyección de contexto.

## Siguientes pasos

- [Descripción general de las integraciones de agentes](overview.md)
- [Hooks y líneas de verificación](hooks.md)
