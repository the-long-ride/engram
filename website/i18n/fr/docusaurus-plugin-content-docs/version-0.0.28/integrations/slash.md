---
title: Adaptateurs slash
sidebar_position: 10
description: Les adaptateurs slash d'Engram exposent les commandes /engram sur Claude, Cursor, Gemini et OpenCode.
---

# Adaptateurs slash

La cible `slash` écrit des adaptateurs slash `/engram` natifs pour les hôtes qui prennent en charge les commandes slash de projet ou les Agent Skills.

## Fichiers écrits

| Fichier | Hôte |
| --- | --- |
| `.claude/commands/engram.md` | Claude Code |
| `.claude/skills/engram/SKILL.md` | Claude Code (format compétence) |
| `.cursor/commands/engram.md` | Cursor |
| `.gemini/commands/engram.toml` | Gemini CLI |
| `.opencode/commands/engram.md` | OpenCode |

## Commandes courantes

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

## Comportement

Si l'hôte n'expose qu'une seule commande `/engram` visible, un `/engram` simple doit renvoyer un menu compact comprenant `load`, `search`, `save`, `propose`, `entry` et `help` au lieu d'exécuter la CLI. `/engram propose` est un alias au niveau slash : il est normalisé en `engram save-session` sur le chat/la session en cours.

`/engram ss -f` est le raccourci pour tout accepter. Les agents ne doivent pas ajouter `--force` à moins que l'humain ne l'ait explicitement demandé.

## Normalisation du langage naturel

| Langage naturel | Normalisé en |
| --- | --- |
| `/engram auto save` | `engram save-session` |
| `/engram take control accept all` | `engram take-control --force` |
| `/engram restructure workspace memory accept all` | `engram metacognize --workspace --force` |
| `/engram take control accept all metacognize` | `engram take-control --force --metacognize` |
| `/engram resolve conflicts and metacognize` | `engram resolve-conflicts --metacognize` |
| `/engram ss -f last 50 sessions` | `engram save-session --query-level 50 --force` |

## Étapes suivantes

- [Outils MCP](mcp.md)
- [Hooks et lignes de preuve](hooks.md)

