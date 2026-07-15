---
title: Adaptadores slash
sidebar_position: 10
description: Los adaptadores slash de Engram exponen comandos /engram en Claude, Cursor, Gemini y OpenCode.
---

# Adaptadores slash

El objetivo `slash` escribe adaptadores slash `/engram` nativos para hosts que admiten comandos slash de proyecto o Agent Skills.

## Archivos escritos

| Archivo | Host |
| --- | --- |
| `.claude/commands/engram.md` | Claude Code |
| `.claude/skills/engram/SKILL.md` | Claude Code (forma de skill) |
| `.cursor/commands/engram.md` | Cursor |
| `.gemini/commands/engram.toml` | Gemini CLI |
| `.opencode/commands/engram.md` | OpenCode |

## Comandos comunes

```text
/engram
/engram propose
/engram load deployment workflow
/engram entry
/engram save knowledge
/engram save-session
/engram save-session --query-level 3
/engram ss
/engram ss -f
/engram ss -f last 50 sessions
/engram take-control
/engram take control accept all
/engram restructure workspace memory accept all
/engram resolve conflicts and metacognize
/engram graph release workflow
/engram archive --reason "Superseded" knowledge/old-fact.md
/engram set-rule-variant strict
/engram verify
```

## Comportamiento

Si el host expone solo un comando `/engram` visible, el comando `/engram` sin argumentos debe devolver un menú compacto de `load`, `search`, `save`, `propose`, `entry` y `help` en lugar de ejecutar la CLI. `/engram propose` es un alias a nivel de slash: se normaliza a `engram save-session` sobre el chat/sesión actual.

`/engram ss -f` es el atajo para aceptar todo. Los agentes no deben añadir `--force` a menos que el humano lo haya solicitado.

## Normalización de lenguaje natural

| Lenguaje natural | Se normaliza a |
| --- | --- |
| `/engram auto save` | `engram save-session` |
| `/engram take control accept all` | `engram take-control --force` |
| `/engram restructure workspace memory accept all` | `engram metacognize --workspace --force` |
| `/engram take control accept all metacognize` | `engram take-control --force --metacognize` |
| `/engram resolve conflicts and metacognize` | `engram resolve-conflicts --metacognize` |
| `/engram ss -f last 50 sessions` | `engram save-session --query-level 50 --force` |

## Siguientes pasos

- [Herramientas MCP](mcp.md)
- [Hooks y líneas de verificación](hooks.md)

