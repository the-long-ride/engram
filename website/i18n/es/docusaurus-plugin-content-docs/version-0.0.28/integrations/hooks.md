---
title: Hooks y líneas de verificación
sidebar_position: 12
description: Los hooks de agente de Engram inyectan memoria enrutada al inicio de la sesión y en los turnos de prompt. Las líneas de verificación hacen visible la inyección.
---

# Hooks y líneas de verificación

Los hooks de agente son hooks del host opcionales que inyectan el contexto de Engram enrutado en el inicio de la sesión y en los turnos posteriores de cambio de tarea cuando el host expone un canal de contexto seguro en el momento del prompt.

## Instalar hooks

```bash
engram link codex
engram link claude
engram link gemini
engram link cursor
engram link windsurf
engram link --global opencode
engram set-proof compact
```

Use `--global` para la configuración a nivel de usuario y `engram unlink` para eliminar solo las entradas de hooks gestionadas por Engram.

## Modo de lectura

`engram set-read startup|auto|always|manual|off` controla el comportamiento en tiempo de ejecución:

- `auto` se carga al inicio de la sesión y se vuelve a inyectar solo cuando cambia el contexto de Engram enrutado.
- `startup` se carga solo al inicio de la sesión.
- `always` vuelve a inyectar en cada turno elegible.
- `manual` y `off` reducen la automatización.

La caché de hooks almacena hashes, ids de sesión, host, cwd y firmas enrutadas, nunca texto de prompt sin procesar.

## Modo de verificación

`engram set-proof off|compact` controla si los hooks compatibles también añaden una línea compacta `Engram proof:` en cada turno elegible. La visibilidad de la verificación es independiente de `set-read`: `compact` puede reportar turnos cargados, reutilizados o omitidos sin cambiar cuándo se inyecta la memoria completa de Engram.

## Matriz de capacidad de hooks

| Host | Ruta de configuración | Eventos |
| --- | --- | --- |
| `codex` | `.codex/hooks.json`; global `~/.codex/hooks.json` | `SessionStart`, `UserPromptSubmit` |
| `claude` | `.claude/settings.json`; global `~/.claude/settings.json` | `SessionStart`, `UserPromptSubmit` |
| `gemini` | `.gemini/settings.json`; global `~/.gemini/settings.json` | `SessionStart`, `BeforeAgent` |
| `cursor` | `.cursor/hooks.json`; plugin global `hooks/hooks.json` | `sessionStart` |
| `windsurf` / `cascade` | `.windsurf/hooks.json`; global `~/.codeium/windsurf/hooks.json` | `pre_user_prompt` |
| `opencode` | `~/.config/opencode/plugins/engram.js` | `chat.message`, `experimental.chat.system.transform` |
| `copilot` | Ninguno escrito | N/A |
| `cline` | Ninguno escrito | N/A |

## Siguientes pasos

- [Descripción general de las integraciones de agentes](overview.md)
- [CLI: inject / link / actualización](../cli/inject-link-upgrade.md)
