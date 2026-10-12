---
title: Pestaña Connections
sidebar_position: 3
description: Detecte y vincule los agentes de IA compatibles desde la Entry Web UI.
---

import RiskCallout from '@site/src/components/RiskCallout';

# Pestaña Connections

La pestaña Connections analiza su máquina en busca de superficies de agentes de IA compatibles y le permite vincular Engram a cada una en el nivel de workspace o global.

## Análisis de agentes

La pestaña muestra una tarjeta por cada agente compatible. Cada tarjeta informa de un estado de detectado o ausente.

- **Detected** — Engram encontró una superficie local de agente compatible (ruta de configuración o aplicación presente).
- **Missing** — Engram no encontró la superficie del agente. Ausente no siempre significa no compatible; puede significar que la aplicación o la ruta de configuración aún no existe.

<RiskCallout level="caution">
Ausente no siempre significa no compatible. Puede significar que la aplicación o la ruta de configuración aún no existe en esta máquina.
</RiskCallout>

## Interruptor de vínculo de workspace {#workspace-link-toggle}

Vincula Engram al repositorio/workspace actual para ese agente. Úselo cuando la memoria deba acompañar al repositorio: reglas por proyecto, memoria específica del repositorio, instrucciones compartidas por el equipo.

## Interruptor de vínculo global {#global-link-toggle}

Vincula Engram globalmente para ese agente. Úselo para memoria personal, flujos de trabajo entre proyectos y estilo/reglas reutilizables.

<RiskCallout level="risky">
Use los vínculos globales con cuidado en máquinas compartidas. Engram escribe bloques gestionados en archivos de instrucciones compartidos. Revise qué archivos escribe Engram por agente antes de vincular globalmente.
</RiskCallout>

## Qué archivos escribe Engram por agente

| Destino | Archivo |
| --- | --- |
| `codex` | `AGENTS.md`, `.agents/skills/engram/SKILL.md` |
| `agents-md` | `AGENTS.md` |
| `copilot` | `.github/copilot-instructions.md`; global: `~/.copilot/copilot-instructions.md` |
| `claude` | `AGENTS.md`, `.claude/engram.md`, `.agents/engram.md`, más un bloque en `CLAUDE.md` solo cuando ese archivo ya existe |
| `cursor` | `.cursor/rules/engram.mdc`; global: `~/.cursor/plugins/local/engram/` |
| `gemini` | `GEMINI.md`; global: `~/.gemini/GEMINI.md`, `~/.gemini/skills/engram/SKILL.md` |
| `cline` | `.clinerules` |
| `windsurf` | `.windsurf/rules/engram.md`; global: `~/.codeium/windsurf/memories/global_rules.md` |
| `opencode` | `AGENTS.md`, `.opencode/engram.md`, `.opencode/skills/engram/SKILL.md`, `opencode.json` |
| `mcp` | `.mcp.json`; global: archivos de configuración MCP del host |
| `slash` | `.claude/commands/engram.md`, `.claude/skills/engram/SKILL.md`, `.cursor/commands/engram.md`, `.gemini/commands/engram.toml`, `.opencode/commands/engram.md` |

## Cuándo desvincular

- Al archivar un repositorio o un workspace de prueba
- Al dejar de usar Engram con un agente
- Al limpiar bloques gestionados obsoletos antes de un nuevo `engram upgrade --latest`

`engram unlink` elimina solo las entradas de hooks y los archivos de adaptador gestionados por Engram. Los archivos escritos por personas se conservan salvo que se indique `--force` explícitamente.

## Equivalente en la CLI

```bash
engram link codex
engram link claude
engram link --global opencode
engram unlink
```

## Próximos pasos

- [Pestaña Construct](construct.md)
- [Resumen de integraciones de agentes](../integrations/overview.md)
