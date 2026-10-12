---
title: Cursor
sidebar_position: 5
description: Integración de Engram con Cursor mediante reglas, MCP, plugin local, comandos slash y hooks de inicio de sesión.
---

# Cursor

Cursor lee las reglas del proyecto desde los archivos `.cursor/rules/*.mdc`. Engram escribe `.cursor/rules/engram.mdc` con frontmatter válido (`alwaysApply: true`) y un bloque de instrucciones de inicialización.

## Instalación {#install}

```bash
engram link cursor
```

## Archivos escritos {#files-written}

| Archivo | Propósito |
| --- | --- |
| `.cursor/rules/engram.mdc` | Reglas del proyecto con `alwaysApply: true` |
| `.cursor/mcp.json` | Registro MCP (`type: "stdio"`) |
| `.cursor/rules/engram/<id>.mdc` | Una regla generada por memoria de workspace con `applies_to` (`alwaysApply: false`, globs separados por comas); las memorias del nivel de trabajo nunca se escriben |
| `.cursor/hooks.json` | Hook `sessionStart` |
| `.cursor/commands/engram.md` | Adaptador slash `/engram` |

## Instalación global {#global-install}

```bash
engram link --global cursor
```

Engram crea un plugin local en `~/.cursor/plugins/local/engram/` que contiene el manifiesto del plugin, reglas, skills, comandos, configuración de MCP y hooks.

## Destino orientado a tiempo de ejecución {#runtime-first-target}

Cursor es un destino orientado al runtime. Las reglas del proyecto contienen instrucciones breves de inicialización que se basan en herramientas MCP y hooks para el protocolo detallado; la guía complementaria contiene el flujo completo de escritura/aprobación, y el archivo Agent Skill es un puntero breve hacia ella.

## Comportamiento de los hooks {#hook-behavior}

El hook `sessionStart` inyecta el contexto de inicio de Engram a través del campo de salida `additional_context`. `beforeSubmitPrompt` es solo de permitir/bloquear y no se usa para inyección de contexto.

## Formato de exportación {#export-format}

`engram export --format cursor-rules` escribe `.cursor/rules/engram.mdc` con frontmatter `description` y `alwaysApply: false`. Reemplaza a `cursorrules`, que sigue siendo un alias aceptado durante una versión e imprime un aviso de desuso en stderr. `live_sync.targets` utiliza el nuevo nombre.

## Próximos pasos {#next-steps}

- [Resumen de integraciones de agentes](overview.md)
- [Hooks y líneas de prueba](hooks.md)
