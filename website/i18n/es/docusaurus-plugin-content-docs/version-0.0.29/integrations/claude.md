---
title: Claude
sidebar_position: 3
description: Integración de Engram con Claude Code mediante CLAUDE.md, comandos slash, Agent Skills, MCP y hooks.
---

# Claude

Claude Code lee `CLAUDE.md` para obtener orientación del proyecto (y un `AGENTS.md` del proyecto solo cuando no existe `CLAUDE.md`) y admite la configuración de herramientas externas a través de `.mcp.json`. La inicialización de Engram prioriza AGENTS.md.

## Instalación {#install}

```bash
engram link claude
```

## Archivos escritos {#files-written}

| Archivo | Propósito |
| --- | --- |
| `AGENTS.md` | Inicialización de instrucciones del proyecto (bloque gestionado, compartido con Codex y OpenCode) |
| `CLAUDE.md` o `.claude/CLAUDE.md` | Bloque de inicialización, solo cuando ese archivo ya existe y no importa `@AGENTS.md`; nunca se crea |
| `.claude/engram.md`, `.agents/engram.md` | Guías complementarias con el flujo completo de escritura/aprobación |
| `.claude/rules/engram/<id>.md` | Una regla de ruta generada por memoria de workspace con `applies_to` (`hooks.path_rules native`) |
| `.claude/commands/engram.md` | Comando slash clásico `/engram` |
| `.claude/skills/engram/SKILL.md` | Agent Skill para invocación slash |
| `.claude/settings.json` | Hooks `SessionStart`, `UserPromptSubmit`, `InstructionsLoaded`, `PreCompact` y `SubagentStart` |
| `.mcp.json` | Registro MCP |

Claude recibe tanto `.claude/commands/engram.md` como `.claude/skills/engram/SKILL.md` para que `/engram` aparezca en menús de comandos antiguos y en sesiones más recientes de Claude Code compatibles con skills.

## Instalación global {#global-install}

```bash
engram link --global claude
```

Engram añade un bloque gestionado a `~/.claude/CLAUDE.md` (conservando el texto del usuario) y escribe la skill de Claude en `~/.claude/skills/engram/SKILL.md`. Claude Code no lee `~/.claude/mcp.json`, por lo que el MCP global es una sugerencia: Engram imprime `claude mcp add --scope user engram -- engram-mcp` para que lo ejecute.

## Destino orientado a tiempo de ejecución {#runtime-first-target}

Claude es un destino orientado al runtime. El bloque `AGENTS.md` (y un bloque `CLAUDE.md` donde exista ese archivo) contiene instrucciones breves de inicialización que se basan en herramientas MCP y hooks para el protocolo detallado; la guía complementaria lleva el flujo completo de escritura/aprobación, y el archivo Agent Skill es un puntero breve hacia ella. Un bloque `CLAUDE.md` existente se actualiza y nunca se elimina, y `engram link` informa de un `CLAUDE.local.md` o un `CLAUDE.md` en el directorio superior que oculte `AGENTS.md` a Claude. La skill generada sigue la especificación de Agent Skills y añade `when_to_use` y `user-invocable: true`; `engram doctor` la valida (`host.skill_frontmatter`). La instalación global sigue escribiendo en `~/.claude/CLAUDE.md`, porque Claude no lee ningún `AGENTS.md` a nivel de usuario.

## Comportamiento de los hooks {#hook-behavior}

Claude admite la inyección de contexto adicional al inicio y en el momento del prompt. `SessionStart` carga la memoria enrutada al inicio; `UserPromptSubmit` solo inyecta cuerpos de memoria que aún no se hayan entregado en la sesión. `PreCompact` restablece el conjunto entregado. `SubagentStart` (matcher `*`) inyecta el contexto enrutado en cada subagente bajo su propio conjunto entregado, y la salida del hook se mantiene por debajo de 9.500 caracteres. Las memorias con globs `applies_to` llegan a Claude como reglas de ruta nativas: `engram link claude` escribe `.claude/rules/engram/<id>.md` (frontmatter solo con rutas más un marcador `<!-- engram:<scope>:<file> sha:<8> -->`), y el hook `InstructionsLoaded` (matcher `path_glob_match`) registra cada carga en el conjunto entregado y en `usage.json`. Las memorias del nivel de trabajo nunca se escriben, las memorias globales van a `~/.claude/rules/engram/` con `engram link --global claude`, y los archivos sin el marcador no se tocan. Los globs con llaves requieren Claude Code v2.1.217 o superior. Para mantener la inyección anterior de `PreToolUse`, ejecute `engram config set hooks.path_rules hook` y `engram link claude`; esto también elimina los archivos de reglas generados.

## Aprobación MCP {#mcp-approval}

`engram_commit` incluye `_meta["anthropic/requiresUserInteraction"]: true`, por lo que Claude Code le solicita confirmación antes de cada llamada, incluso en modos bypass. Manténgalo así: el `approval_token` solo demuestra que existe una propuesta. Consulte [Herramientas MCP](mcp.md).

## Próximos pasos {#next-steps}

- [Resumen de integraciones de agentes](overview.md)
- [Adaptadores slash](slash.md)
- [Herramientas MCP](mcp.md)
