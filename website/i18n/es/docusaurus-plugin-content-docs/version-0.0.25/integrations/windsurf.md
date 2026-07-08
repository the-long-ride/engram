---
title: Windsurf / Cascade
sidebar_position: 6
description: Integración de Engram con Windsurf Cascade a través de reglas, MCP, hooks y memorias globales.
---

# Windsurf / Cascade

Windsurf lee las reglas del espacio de trabajo desde `.windsurf/rules/*.md`. Engram escribe `.windsurf/rules/engram.md` con frontmatter `trigger: always_on`. `cascade` es un alias para `windsurf`.

## Instalación

```bash
engram link windsurf
```

El MCP del espacio de trabajo no se genera porque los documentos oficiales solo detallan la configuración de MCP a nivel de usuario. `engram link windsurf` informa esto explícitamente y sugiere `engram link --global windsurf` para MCP.

## Archivos escritos

| Archivo | Propósito |
| --- | --- |
| `.windsurf/rules/engram.md` | Reglas del proyecto con `trigger: always_on` |
| `.windsurf/hooks.json` | Hook `pre_user_prompt` |

## Instalación global

```bash
engram link --global windsurf
```

Engram escribe un bloque gestionado en `~/.codeium/windsurf/memories/global_rules.md` (preservando el texto del usuario y manteniéndose por debajo del límite de caracteres), fusiona MCP en `~/.codeium/windsurf/mcp_config.json` y fusiona hooks en `~/.codeium/windsurf/hooks.json`.

## Comportamiento de los hooks

El hook `pre_user_prompt` puede auditar/precargar/bloquear pero no puede inyectar contexto del modelo directamente. Las reglas y el MCP proporcionan canales de contexto de IA confiables.

## Siguientes pasos

- [Descripción general de las integraciones de agentes](overview.md)
- [Hooks y líneas de verificación](hooks.md)
