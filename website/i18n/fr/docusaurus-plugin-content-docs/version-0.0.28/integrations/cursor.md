---
title: Cursor
sidebar_position: 5
description: Intégration d'Engram avec Cursor via des règles, MCP, un plugin local, des commandes slash et des hooks de début de session.
---

# Cursor

Cursor lit les règles du projet depuis les fichiers `.cursor/rules/*.mdc`. Engram écrit `.cursor/rules/engram.mdc` avec un frontmatter valide (`alwaysApply: true`) et un bloc d'instructions de bootstrap.

## Installation

```bash
engram link cursor
```

## Fichiers écrits

| Fichier | Objectif |
| --- | --- |
| `.cursor/rules/engram.mdc` | Règles du projet avec `alwaysApply: true` |
| `.cursor/mcp.json` | Enregistrement MCP (`type: "stdio"`) |
| `.cursor/hooks.json` | Hook `sessionStart` |
| `.cursor/commands/engram.md` | Adaptateur slash `/engram` |

## Installation globale

```bash
engram link --global cursor
```

Engram crée un plugin local dans `~/.cursor/plugins/local/engram/` contenant le manifeste du plugin, les règles, les compétences (skills), les commandes, la configuration MCP et les hooks.

## Cible axée sur le runtime

Cursor est une cible axée sur le runtime. Les règles du projet contiennent des instructions de bootstrap courtes qui s'appuient sur les outils et hooks MCP pour le protocole détaillé ; le fichier Agent Skill gère l'ensemble du flux d'écriture et d'approbation.

## Comportement des hooks

Le hook `sessionStart` injecte le contexte de démarrage d'Engram via le champ de sortie `additional_context`. `beforeSubmitPrompt` est réservé à l'autorisation/blocage uniquement et n'est pas utilisé pour l'injection de contexte.

## Étapes suivantes

- [Présentation des intégrations d'agents](overview.md)
- [Hooks et lignes de preuve](hooks.md)
