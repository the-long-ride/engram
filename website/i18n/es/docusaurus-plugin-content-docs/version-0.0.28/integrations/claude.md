---
title: Claude
sidebar_position: 3
description: Integración de Engram con Claude Code a través de CLAUDE.md, comandos slash, Agent Skills, MCP y hooks.
---

# Claude

Claude Code lee `CLAUDE.md` para obtener guía del proyecto y soporta la configuración de herramientas externas a través de `.mcp.json`.

## Instalación

```bash
engram link claude
```

## Archivos escritos

| Archivo | Propósito |
| --- | --- |
| `CLAUDE.md` | Bootstrap de guía de proyecto |
| `.claude/commands/engram.md` | Comando slash `/engram` clásico |
| `.claude/skills/engram/SKILL.md` | Agent Skill para invocación de slash |
| `.claude/settings.json` | Hooks `SessionStart` y `UserPromptSubmit` |
| `.mcp.json` | Registro de MCP |

Claude recibe tanto `.claude/commands/engram.md` como `.claude/skills/engram/SKILL.md` para que `/engram` aparezca en los menús de comandos antiguos y en las sesiones de Claude Code más nuevas conscientes de skills.

## Instalación global

```bash
engram link --global claude
```

Engram añade un bloque gestionado a `~/.claude/CLAUDE.md` (preservando el texto del usuario) y escribe la skill de Claude en `~/.claude/skills/engram/SKILL.md`. El MCP global escribe en `~/.claude/mcp.json`.

## Objetivo centrado en tiempo de ejecución

Claude es un objetivo centrado en el tiempo de ejecución. `CLAUDE.md` contiene instrucciones breves de bootstrap que dependen de herramientas y hooks de MCP para el protocolo detallado; el archivo Agent Skill maneja todo el flujo de escritura/aprobación.

## Comportamiento de los hooks

Claude soporta la inyección de contexto adicional en el inicio y en el momento del prompt. `SessionStart` carga la memoria enrutada al inicio; `UserPromptSubmit` vuelve a inyectar solo cuando cambia el contexto de Engram enrutado.

## Siguientes pasos

- [Descripción general de las integraciones de agentes](overview.md)
- [Adaptadores slash](slash.md)
- [Herramientas MCP](mcp.md)
