---
title: Claude
sidebar_position: 3
description: Intégration d'Engram avec Claude Code via CLAUDE.md, commandes slash, Agent Skills, MCP et hooks.
---

# Claude

Claude Code lit `CLAUDE.md` pour guider le projet et prend en charge la configuration des outils externes via `.mcp.json`.

## Installation

```bash
engram link claude
```

## Fichiers écrits

| Fichier | Objectif |
| --- | --- |
| `CLAUDE.md` | Bootstrap du guide de projet |
| `.claude/commands/engram.md` | Commande slash `/engram` classique |
| `.claude/skills/engram/SKILL.md` | Agent Skill pour l'invocation slash |
| `.claude/settings.json` | Hooks `SessionStart` et `UserPromptSubmit` |
| `.mcp.json` | Enregistrement MCP |

Claude reçoit à la fois `.claude/commands/engram.md` et `.claude/skills/engram/SKILL.md` pour que `/engram` apparaisse dans les anciens menus de commande et dans les sessions Claude Code plus récentes prenant en charge les compétences (skills).

## Installation globale

```bash
engram link --global claude
```

Engram ajoute un bloc géré à `~/.claude/CLAUDE.md` (en préservant le texte de l'utilisateur) et écrit la compétence Claude dans `~/.claude/skills/engram/SKILL.md`. Le MCP global s'écrit dans `~/.claude/mcp.json`.

## Cible axée sur le runtime

Claude est une cible axée sur le runtime. `CLAUDE.md` contient des instructions de bootstrap courtes qui s'appuient sur les outils et hooks MCP pour le protocole détaillé ; le fichier Agent Skill gère l'ensemble du flux d'écriture et d'approbation.

## Comportement des hooks

Claude prend en charge l'injection de contexte supplémentaire au démarrage et au moment de la saisie (prompt). `SessionStart` charge la mémoire routée au démarrage ; `UserPromptSubmit` réinjecte uniquement lorsque le contexte Engram routé change.

## Étapes suivantes

- [Présentation des intégrations d'agents](overview.md)
- [Adaptateurs slash](slash.md)
- [Outils MCP](mcp.md)
