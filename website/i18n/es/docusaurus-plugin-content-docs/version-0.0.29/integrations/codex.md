---
title: Codex
sidebar_position: 2
description: Integración de Engram con OpenAI Codex mediante AGENTS.md y Agent Skills.
---

# Codex

OpenAI Codex y otros agentes compatibles con AGENTS.md utilizan `AGENTS.md` como archivo de instrucciones del proyecto. El alias `codex` también escribe `.agents/skills/engram/SKILL.md` para que los agentes que descubran Agent Skills puedan enrutar Engram como una skill invocable.

## Instalación {#install}

```bash
engram link codex
```

## Archivos escritos {#files-written}

| Archivo | Propósito |
| --- | --- |
| `AGENTS.md` | Inicialización de instrucciones del proyecto |
| `.agents/skills/engram/SKILL.md` | Puntero breve de Agent Skill hacia la guía |
| `.agents/engram.md` | Guía complementaria con el flujo completo de escritura/aprobación |
| `.codex/hooks.json` | Hooks `SessionStart`, `UserPromptSubmit`, `PreToolUse`, `PreCompact` y `SubagentStart` |
| `.mcp.json` | Registro MCP |

## Instalación global {#global-install}

```bash
engram link --global codex
```

Escribe la skill de Codex en `~/.codex/skills/engram/SKILL.md` y añade un bloque gestionado a los archivos compartidos de instrucciones de Codex. MCP global es un bloque gestionado `[mcp_servers.engram]` en `~/.codex/config.toml`; también establece `approval_mode = "approve"` en `[mcp_servers.engram.tools.engram_commit]` para que Codex pregunte antes de cada commit (`engram upgrade` o `engram link codex` actualiza bloques anteriores). `engram doctor` informa del tamaño de su cadena AGENTS.md frente al límite de 32 KiB de Codex (`host.agents_md_chain`).

## Comportamiento de los hooks {#hook-behavior}

Codex admite la inyección de contexto adicional al inicio y en el momento del prompt. `SessionStart` carga la memoria enrutada al inicio; `UserPromptSubmit` solo inyecta cuerpos de memoria aún no entregados en la sesión. `PreToolUse` inyecta memorias cuyos globs `applies_to` coinciden con archivos editados a través de `apply_patch` (no se activa en lecturas), y `PreCompact` restablece el conjunto entregado. `SubagentStart` (matcher `*`) inyecta el contexto enrutado en cada subagente; el conjunto entregado del subagente tiene la clave `<session_id>#agent:<agent_id>`, por lo que nunca toca el del padre. Codex limita un mensaje de hook a unos 2.500 tokens, por lo que Engram mantiene `additionalContext` en 2.400 tokens o menos y degrada los cuerpos a tarjetas en lugar de recortarlos.

## Destino orientado a tiempo de ejecución {#runtime-first-target}

Codex es un destino orientado al runtime. `AGENTS.md` contiene instrucciones breves de inicialización que se basan en herramientas MCP y hooks para el protocolo detallado; la guía complementaria contiene el flujo completo de escritura/aprobación, y el archivo Agent Skill es un puntero breve hacia ella.

## Próximos pasos {#next-steps}

- [Resumen de integraciones de agentes](overview.md)
- [Hooks y líneas de prueba](hooks.md)
