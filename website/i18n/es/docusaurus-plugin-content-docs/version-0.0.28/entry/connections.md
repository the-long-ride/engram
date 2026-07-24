---
title: Pestaña Connections (Conexiones)
sidebar_position: 3
description: Detecte y vincule agentes de IA compatibles desde la interfaz Entry Web UI.
---

import RiskCallout from '@site/src/components/RiskCallout';

# Pestaña Connections

La pestaña Connections escanea su máquina en busca de interfaces de agentes de IA compatibles y le permite vincular Engram a cada una a nivel de espacio de trabajo o global.

## Escaneo de agentes (Agent scan)

La pestaña muestra una tarjeta por cada agente compatible. Cada tarjeta reporta un estado detectado (detected) o faltante (missing).

- **Detected** — Engram encontró una interfaz de agente local compatible (ruta de configuración o aplicación presente).
- **Missing** — Engram no encontró la interfaz del agente. Faltante no siempre significa no compatible; puede significar que la aplicación o la ruta de configuración aún no están presentes.

<RiskCallout level="caution">
Faltante no siempre significa no compatible. Puede significar que la aplicación o la ruta de configuración aún no están presentes en esta máquina.
</RiskCallout>

## Alternancia de enlace de espacio de trabajo (Workspace link toggle)

Vincula Engram al repositorio/espacio de trabajo actual para ese agente. Úselo cuando la memoria deba seguir al repositorio: reglas específicas del proyecto, memoria específica del repositorio, instrucciones compartidas del equipo.

## Alternancia de enlace global (Global link toggle)

Vincula Engram globalmente para ese agente. Úselo para memoria personal, flujos de trabajo entre proyectos y estilos/reglas reutilizables.

<RiskCallout level="risky">
Use los enlaces globales con cuidado en máquinas compartidas. Engram escribe bloques administrados en archivos de instrucciones compartidos. Revise qué archivos escribe Engram por agente antes de vincular globalmente.
</RiskCallout>

## Qué archivos escribe Engram por agente

| Objetivo | Archivo |
| --- | --- |
| `codex` | `AGENTS.md`, `.agents/skills/engram/SKILL.md` |
| `agents-md` | `AGENTS.md` |
| `copilot` | `.github/copilot-instructions.md`; global: `~/.copilot/copilot-instructions.md` |
| `claude` | `CLAUDE.md` |
| `cursor` | `.cursor/rules/engram.mdc`; global: `~/.cursor/plugins/local/engram/` |
| `gemini` | `GEMINI.md`; global: `~/.gemini/GEMINI.md`, `~/.gemini/skills/engram/SKILL.md` |
| `cline` | `.clinerules` |
| `windsurf` | `.windsurf/rules/engram.md`; global: `~/.codeium/windsurf/memories/global_rules.md` |
| `opencode` | `AGENTS.md`, `.opencode/engram.md`, `.opencode/skills/engram/SKILL.md`, `opencode.json` |
| `mcp` | `.mcp.json`; global: archivos de configuración MCP del host |
| `slash` | `.claude/commands/engram.md`, `.cursor/commands/engram.md`, `.gemini/commands/engram.toml`, `.opencode/commands/engram.md` |

## Cuándo desvincular

- Archivar un repositorio o espacio de trabajo de prueba
- Cambiar un agente fuera de Engram
- Limpiar bloques administrados obsoletos antes de un `engram upgrade --latest` limpio

`engram unlink` elimina solo las entradas de hook y los archivos adaptadores administrados por Engram. Los archivos creados por humanos se conservan a menos que `--force` sea explícito.

## Equivalente en CLI

```bash
engram link codex
engram link claude
engram link --global opencode
engram unlink
```

## Siguientes pasos

- [Pestaña Construct](construct.md)
- [Descripción general de integraciones de agentes](../integrations/overview.md)
