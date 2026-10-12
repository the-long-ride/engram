---
title: Cursor
sidebar_position: 5
description: Intégration d’Engram avec Cursor via les règles, MCP, un plugin local, les commandes slash et les hooks de démarrage de session.
---

# Cursor

Cursor lit les règles du projet dans les fichiers `.cursor/rules/*.mdc`. Engram écrit `.cursor/rules/engram.mdc` avec un frontmatter valide (`alwaysApply: true`) et un bloc d’instructions d’amorçage.

## Installation {#install}

```bash
engram link cursor
```

## Fichiers écrits {#files-written}

| Fichier | Rôle |
| --- | --- |
| `.cursor/rules/engram.mdc` | Règles du projet avec `alwaysApply: true` |
| `.cursor/mcp.json` | Enregistrement MCP (`type: "stdio"`) |
| `.cursor/rules/engram/<id>.mdc` | Une règle générée par mémoire de workspace avec `applies_to` (`alwaysApply: false`, globs joints par des virgules) ; les mémoires du niveau de travail ne sont jamais écrites |
| `.cursor/hooks.json` | Hook `sessionStart` |
| `.cursor/commands/engram.md` | Adaptateur slash `/engram` |

## Installation globale {#global-install}

```bash
engram link --global cursor
```

Engram crée un plugin local dans `~/.cursor/plugins/local/engram/` contenant le manifeste du plugin, les règles, les skills, les commandes, la configuration MCP et les hooks.

## Cible orientée exécution {#runtime-first-target}

Cursor est une cible orientée exécution. Les règles du projet contiennent de courtes instructions d’amorçage qui s’appuient sur les outils MCP et les hooks pour le protocole détaillé ; le guide compagnon porte le flux complet d’écriture/approbation, et le fichier Agent Skill n’en est qu’un court pointeur.

## Comportement des hooks {#hook-behavior}

Le hook `sessionStart` injecte le contexte de démarrage d’Engram via le champ de sortie `additional_context`. `beforeSubmitPrompt` ne permet que d’autoriser ou de bloquer et n’est pas utilisé pour l’injection de contexte.

## Format d’export {#export-format}

`engram export --format cursor-rules` écrit `.cursor/rules/engram.mdc` avec un frontmatter `description` et `alwaysApply: false`. Il remplace `cursorrules`, qui reste un alias accepté pendant une version et affiche une note d’obsolescence sur stderr. `live_sync.targets` utilise le nouveau nom.

## Étapes suivantes {#next-steps}

- [Vue d’ensemble des intégrations d’agents](overview.md)
- [Hooks et lignes de preuve](hooks.md)
