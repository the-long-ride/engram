---
title: Codex
sidebar_position: 2
description: Integración de Engram con OpenAI Codex a través de AGENTS.md y Agent Skills.
---

# Codex

OpenAI Codex y otros agentes compatibles con AGENTS.md usan `AGENTS.md` como un archivo de instrucciones del proyecto. El alias `codex` también escribe `.agents/skills/engram/SKILL.md` para que los agentes que descubren Agent Skills puedan enrutar Engram como una skill invocable.

## Instalación

```bash
engram link codex
```

## Archivos escritos

| Archivo | Propósito |
| --- | --- |
| `AGENTS.md` | Bootstrap de instrucciones del proyecto |
| `.agents/skills/engram/SKILL.md` | Agent Skill con flujo de escritura/aprobación completo |
| `.codex/hooks.json` | Hooks `SessionStart` y `UserPromptSubmit` |
| `.mcp.json` | Registro de MCP |

## Instalación global

```bash
engram link --global codex
```

Escribe la skill de Codex en `~/.codex/skills/engram/SKILL.md` y añade un bloque gestionado a los archivos de instrucciones de Codex compartidos.

## Comportamiento de los hooks

Codex soporta la inyección de contexto adicional en el inicio y en el momento del prompt. `SessionStart` carga la memoria enrutada al inicio; `UserPromptSubmit` vuelve a inyectar solo cuando cambia el contexto de Engram enrutado.

## Objetivo centrado en tiempo de ejecución

Codex es un objetivo centrado en el tiempo de ejecución. `AGENTS.md` contiene instrucciones breves de bootstrap que dependen de herramientas y hooks de MCP para el protocolo detallado; el archivo Agent Skill maneja todo el flujo de escritura/aprobación.

## Siguientes pasos

- [Descripción general de las integraciones de agentes](overview.md)
- [Hooks y líneas de verificación](hooks.md)
