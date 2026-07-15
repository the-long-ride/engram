---
title: Gemini
sidebar_position: 4
description: Integración de Engram con Gemini CLI y superficies compatibles con Gemini de Antigravity.
---

# Gemini

Gemini CLI busca archivos `GEMINI.md` como contexto. El objetivo `slash` escribe `.gemini/commands/engram.toml` para que `/engram <args>` se convierta en un comando personalizado del proyecto en Gemini CLI.

Engram también trata a `gemini` como el objetivo anunciado para Antigravity 2.0, Antigravity CLI y Antigravity IDE porque los documentos actuales de Google todavía vinculan el contexto y las habilidades de Antigravity a ubicaciones compatibles con Gemini. Los nombres de objetivos ocultos `antigravity` y `antigravity-cli` siguen siendo rutas de compatibilidad explícitas, pero no se muestran en `engram link list`, ayuda, autocompletado o `all`.

## Instalación

```bash
engram link gemini
```

## Archivos escritos

| Archivo | Propósito |
| --- | --- |
| `GEMINI.md` | Bootstrap de contexto de proyecto |
| `.gemini/commands/engram.toml` | Adaptador slash `/engram` |
| `.gemini/settings.json` | Hooks `SessionStart` y `BeforeAgent` |
| Gemini MCP config | Registro de MCP |

## Instalación global

```bash
engram link --global gemini
```

Escribe `~/.gemini/GEMINI.md`, `~/.gemini/skills/engram/SKILL.md` y el archivo de configuración MCP de Gemini.

## Objetivo centrado en tiempo de ejecución

Gemini es un objetivo centrado en el tiempo de ejecución. `GEMINI.md` contiene instrucciones breves de bootstrap que dependen de herramientas y hooks de MCP para el protocolo detallado; el archivo Agent Skill maneja todo el flujo de escritura/aprobación.

## Comportamiento de los hooks

Gemini admite la inyección en el inicio y en el momento del prompt de `hookSpecificOutput.additionalContext` a través de los eventos `SessionStart` y `BeforeAgent`.

## Compatibilidad con Antigravity

Para los hooks, `gemini` es también el respaldo público de Antigravity. Los objetivos de hooks ocultos `antigravity` y `antigravity-cli` se normalizan al comportamiento y rutas de los hooks de Gemini hasta que Google publique documentación oficial y estable sobre hooks/configuraciones de Antigravity.

## Siguientes pasos

- [Descripción general de las integraciones de agentes](overview.md)
- [Hooks y líneas de verificación](hooks.md)
