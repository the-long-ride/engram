---
title: Visión general de integraciones de agentes
sidebar_position: 1
description: Engram admite archivos de skill, adaptadores slash, herramientas MCP y hooks de agente en muchos hosts de IA.
---

# Visión general de integraciones de agentes {#agent-integrations-overview}

Engram admite dos capas de integración:

- **Archivos de skill** — instrucciones generadas para agentes que leen el contexto del proyecto.
- **Adaptadores slash** — prompts de comandos `/engram` generados para agentes que admiten comandos slash del proyecto o Agent Skills.
- **Herramientas estilo MCP** — un wrapper JSON-lines para agentes que pueden registrar procesos de herramientas externas.
- **Hooks de agente** — hooks de host opcionales que inyectan el contexto enrutado de Engram al inicio de la sesión y en los turnos posteriores de cambio de tarea.

## Inicio rápido {#quick-start}

```bash
engram inject
engram link all
```

`engram link all` instala el conjunto de objetivos públicos e informa motivos `SKIPPED` deterministas para hosts parciales en archivos de instrucciones de skillset, configuración de MCP, adaptadores slash y hooks de agente en una sola instalación unificada.

## Categorías de objetivos {#target-categories}

| Categoría | Objetivos | Comportamiento |
| --- | --- | --- |
| Primero en tiempo de ejecución | `codex`, `claude`, `cursor`, `gemini` | Instrucciones breves de inicio, una guía complementaria con el flujo de trabajo completo, punteros breves de Agent Skill y configuración de MCP |
| Capaz de hooks | `codex`, `claude`, `gemini`, `opencode`, `cursor`, `windsurf`/`cascade` | Hooks de agente con esquemas de eventos específicos del host |
| Fallback compacto/manual | `agents-md`, `copilot`, `cline` | Protocolo compacto completo; sin inyección confiable de contexto en tiempo de ejecución en v1 |

## Objetivos compatibles {#supported-targets}

| Objetivo | Archivo | Uso principal |
| --- | --- | --- |
| `codex` | `AGENTS.md`, `.agents/skills/engram/SKILL.md` | Instrucciones de proyecto OpenAI Codex y Agent Skill |
| `agents-md` | `AGENTS.md` | Fallback genérico para agentes compatibles con AGENTS.md no listados |
| `copilot` | `.github/copilot-instructions.md`; global: `~/.copilot/copilot-instructions.md` | Instrucciones de repositorio y usuario de GitHub Copilot |
| `claude` | `AGENTS.md`, `.claude/engram.md`, `.agents/engram.md`, más un bloque `CLAUDE.md` solo cuando ese archivo ya existe, y reglas de ruta `.claude/rules/engram/<id>.md` | Guía de proyecto de Claude Code y reglas de ruta nativas |
| `cursor` | `.cursor/rules/engram.mdc`, reglas de ruta `.cursor/rules/engram/<id>.mdc`; global: `~/.cursor/plugins/local/engram/` | Reglas de proyecto de Cursor, reglas de ruta nativas y plugin local |
| `gemini` | `GEMINI.md`; global: `~/.gemini/GEMINI.md`, `~/.gemini/skills/engram/SKILL.md` | Contexto de Gemini CLI, incluidas las superficies compatibles con Gemini de Antigravity |
| `cline` | `.clinerules` | Reglas de espacio de trabajo estilo Cline |
| `windsurf` | `.windsurf/rules/engram.md`; global: `~/.codeium/windsurf/memories/global_rules.md` | Reglas de espacio de trabajo de Windsurf y reglas/MCP globales |
| `opencode` | `AGENTS.md`, `.opencode/engram.md`, `.opencode/skills/engram/SKILL.md`, `opencode.json` | Reglas de OpenCode, Agent Skill, herramientas MCP, comandos personalizados, hooks de plugins |
| `mcp` | `.mcp.json`; global: `~/.gemini/settings.json`, `~/.codex/config.toml`, y una sugerencia de `claude mcp add` | Registro de wrapper JSON-lines estilo MCP |
| `slash` | `.claude/commands/engram.md`, `.cursor/commands/engram.md`, `.gemini/commands/engram.toml`, `.opencode/commands/engram.md` | Adaptadores slash nativos `/engram` |

Alias: `codex` instala el adaptador `agents-md` más el archivo genérico Agent Skill, `open-code` se asigna a `opencode` y `cascade` se asigna a `windsurf`. Los antiguos objetivos `antigravity` y `antigravity-cli` son alias de compatibilidad ocultos por ahora.

## Matriz de capacidades de hooks {#hook-capability-matrix}

| Host | Instalación de hook en v1 | Eventos |
| --- | --- | --- |
| `codex` | Sí | `SessionStart`, `UserPromptSubmit`, `PreToolUse`, `PreCompact`, `SubagentStart` (`SessionEnd` opcional) |
| `claude` | Sí | `SessionStart`, `UserPromptSubmit`, `InstructionsLoaded` (`PreToolUse` con `hooks.path_rules hook`), `PreCompact`, `SubagentStart` (`SessionEnd` opcional) |
| `gemini` | Sí | `SessionStart`, `BeforeAgent`, `AfterTool`, `PreCompress` |
| `cursor` | Sí | `sessionStart` |
| `windsurf` / `cascade` | Sí | `pre_user_prompt` |
| `opencode` | Compatible mediante plugin local | `chat.message`, `experimental.chat.system.transform` |
| `copilot` | Omitido | N/A |
| `cline` | Omitido | N/A |

## Pasos siguientes {#next-steps}

- [Codex](codex.md)
- [Claude](claude.md)
- [Gemini](gemini.md)
- [Cursor](cursor.md)
- [Windsurf / Cascade](windsurf.md)
- [OpenCode](opencode.md)
- [Copilot](copilot.md)
- [Cline](cline.md)
- [Adaptadores slash](slash.md)
- [Herramientas MCP](mcp.md)
- [Hooks y líneas de prueba](hooks.md)
