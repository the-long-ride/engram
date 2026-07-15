---
title: Herramientas MCP
sidebar_position: 11
description: El servidor Engram MCP expone herramientas de carga, búsqueda y solo-propuesta a hosts compatibles con MCP.
---

# Herramientas MCP

Engram incluye un binario de servidor MCP `engram-mcp` que expone herramientas a los hosts compatibles con MCP.

## Registro

`engram link <target>` también instala por defecto el registro MCP conocido para ese objetivo.

| Alcance | Ruta |
| --- | --- |
| Espacio de trabajo (la mayoría de los hosts) | `.mcp.json` |
| Espacio de trabajo de Cursor | `.cursor/mcp.json` |
| Espacio de trabajo de OpenCode | campo `mcp` en `opencode.json` / `opencode.jsonc` |
| Claude global | `~/.claude/mcp.json` |
| Gemini / Antigravity global | Archivo de configuración MCP de Gemini |
| OpenCode global | campo `mcp` en `~/.config/opencode/opencode.jsonc` / `opencode.json` |
| Cursor global | Empaquetado en el plugin local |
| Windsurf global | `~/.codeium/windsurf/mcp_config.json` |

Se omite el MCP del espacio de trabajo de Windsurf porque los documentos oficiales solo detallan la configuración de MCP a nivel de usuario.

## Herramientas

Los hosts de MCP deben tratar `engram_save` y `engram_autosave` como herramientas de **solo-propuesta**; aún deben enrutar las escrituras finales a través del flujo de aprobación de la CLI visible para el ser humano. `engram_load` tiene como valor predeterminado `--full` (exclusión mediante `full: true`).

## Regla de aceptar todo

Las solicitudes explícitas de `/engram save-session --force`, incluido el atajo `/engram ss -f`, deben usar la ruta de escritura de la CLI porque el guardado automático de MCP sigue siendo solo-propuesta. El atajo contado `/engram ss -f last 50 sessions` debe usar `engram save-session --query-level 50 --force`.

## Entrada MCP de OpenCode

```json
"engram": {
  "type": "local",
  "command": ["engram-mcp"],
  "args": [],
  "enabled": true
}
```

El servidor MCP implementa el protocolo de enlace JSON-RPC estándar (`initialize`, `notifications/initialized`, `tools/list` y `tools/call`).

## Siguientes pasos

- [Descripción general de las integraciones de agentes](overview.md)
- [Hooks y líneas de verificación](hooks.md)

