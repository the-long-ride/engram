---
title: Gemini
sidebar_position: 4
description: Integración de Engram con Gemini CLI y las superficies compatibles con Gemini de Antigravity.
---

# Gemini

Gemini CLI busca archivos `GEMINI.md` como contexto. El destino `slash` escribe `.gemini/commands/engram.toml`, haciendo que `/engram <args>` sea un comando personalizado del proyecto en Gemini CLI.

Engram también trata a `gemini` como el destino anunciado para Antigravity 2.0, Antigravity CLI y Antigravity IDE, ya que los documentos actuales de Google todavía asocian el contexto y las skills de Antigravity a ubicaciones compatibles con Gemini. Los nombres de destino ocultos `antigravity` y `antigravity-cli` siguen siendo rutas de compatibilidad explícitas, pero no aparecen en `engram link list`, ayuda, autocompletado ni `all`.

## Instalación {#install}

```bash
engram link gemini
```

## Archivos escritos {#files-written}

| Archivo | Propósito |
| --- | --- |
| `GEMINI.md` | Inicialización de contexto del proyecto |
| `.gemini/commands/engram.toml` | Adaptador slash `/engram` |
| `.gemini/settings.json` | Hooks `SessionStart`, `BeforeAgent`, `AfterTool` y `PreCompress` |
| `.gemini/settings.json` | Registro MCP (`mcpServers.engram`, fusionado junto a los hooks) |

## Instalación global {#global-install}

```bash
engram link --global gemini
```

Escribe `~/.gemini/GEMINI.md`, `~/.gemini/skills/engram/SKILL.md`, y fusiona `mcpServers.engram` en `~/.gemini/settings.json`.

## Destino orientado a tiempo de ejecución {#runtime-first-target}

Gemini es un destino orientado al runtime. `GEMINI.md` contiene instrucciones breves de inicialización que se basan en herramientas MCP y hooks para el protocolo detallado; la guía complementaria contiene el flujo completo de escritura/aprobación, y el archivo Agent Skill es un puntero breve hacia ella.

## Comportamiento de los hooks {#hook-behavior}

Gemini admite inyección de `hookSpecificOutput.additionalContext` al inicio y en el prompt a través de los eventos `SessionStart` y `BeforeAgent`; `PreCompress` (antes de que la CLI resuma el historial) restablece el conjunto entregado. `AfterTool` (matcher `read_file|write_file|replace`, tiempo de espera en milisegundos) inyecta hasta 3 memorias no entregadas cuyos globs `applies_to` coinciden con el archivo tocado por la herramienta; el contexto se agrega al resultado de la herramienta, por lo que llega un paso después de la lectura. Comparte el conjunto entregado con `BeforeAgent` y nunca devuelve una decisión. `engram link gemini` o `engram upgrade --latest` agrega el evento a una instalación existente.

Si `mcpServers.engram` en `.gemini/settings.json` establece `trust: true`, Gemini omite su confirmación para `engram_commit`; `engram doctor` advierte sobre ello (`host.gemini_trust`).

## Compatibilidad con Antigravity {#antigravity-compatibility}

Para hooks, `gemini` es también el respaldo público de Antigravity. Los destinos de hooks ocultos `antigravity` y `antigravity-cli` se normalizan al comportamiento y rutas de hooks de Gemini hasta que Google publique documentación estable sobre hooks/configuración principales de Antigravity.

## Próximos pasos {#next-steps}

- [Resumen de integraciones de agentes](overview.md)
- [Hooks y líneas de prueba](hooks.md)
