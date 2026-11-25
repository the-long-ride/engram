---
title: OpenCode
sidebar_position: 7
description: Integración de Engram con OpenCode a través de AGENTS.md, Agent Skills, MCP, comandos personalizados y un plugin local.
---

# OpenCode

OpenCode lee `AGENTS.md` del proyecto y el archivo global `~/.config/opencode/AGENTS.md` para buscar reglas. Engram escribe un bloque gestionado allí, escribe la guía completa en `.opencode/engram.md` o `~/.config/opencode/engram.md`, escribe la skill completa en `.opencode/skills/engram/SKILL.md` o `~/.config/opencode/skills/engram/SKILL.md`, y reserva el archivo `opencode.json` del proyecto (o un archivo `opencode.jsonc` existente) y el archivo global `~/.config/opencode/opencode.jsonc` para el registro de MCP.

## Instalación

```bash
engram link opencode
```

## Archivos escritos

| Archivo | Propósito |
| --- | --- |
| `AGENTS.md` | Reglas del proyecto con bloque gestionado |
| `.opencode/engram.md` | Guía completa |
| `.opencode/skills/engram/SKILL.md` | Agent Skill |
| `.opencode/commands/engram.md` | Adaptador slash `/engram` |
| `opencode.json` / `opencode.jsonc` | Registro de MCP (`mcp.engram`) |

## Instalación global

```bash
engram link --global opencode
```

También instala un plugin de JavaScript local gestionado en `~/.config/opencode/plugins/engram.js`. El plugin utiliza `chat.message` para enrutar el prompt del usuario actual y `experimental.chat.system.transform` para inyectar la memoria enrutada antes de cada solicitud de LLM.

:::warning
OpenCode debe reiniciarse o recargarse después de `link`/`unlink` porque los archivos de plugins locales se cargan al inicio.
:::

## Registro de MCP

```json
"engram": {
  "type": "local",
  "command": ["engram-mcp"],
  "args": [],
  "enabled": true
}
```

El servidor MCP implementa el protocolo de enlace JSON-RPC estándar (`initialize`, `notifications/initialized`, `tools/list` y `tools/call`) para que OpenCode pueda descubrir y llamar a las herramientas de Engram.

## Comportamiento del plugin

El plugin falla de forma abierta (fails open) y mantiene la memoria enrutada sin procesar solo en el proceso de OpenCode en ejecución. La caché de hooks de disco de Engram sigue conteniendo únicamente hashes, IDs de sesión, host, cwd y firmas enrutadas. `engram unlink --global opencode` elimina solo el plugin generado por Engram; un plugin `engram.js` escrito por un humano se conserva a menos que `--force` sea explícito.

## Siguientes pasos

- [Descripción general de las integraciones de agentes](overview.md)
- [Herramientas MCP](mcp.md)
- [Hooks y líneas de verificación](hooks.md)
