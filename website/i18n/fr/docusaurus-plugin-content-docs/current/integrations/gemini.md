---
title: Gemini
sidebar_position: 4
description: Intégration d’Engram avec Gemini CLI et les surfaces Antigravity compatibles Gemini.
---

# Gemini

Gemini CLI recherche des fichiers `GEMINI.md` comme contexte. La cible `slash` écrit `.gemini/commands/engram.toml` afin que `/engram <args>` devienne une commande personnalisée de projet dans Gemini CLI.

Engram considère aussi `gemini` comme la cible annoncée pour Antigravity 2.0, Antigravity CLI et Antigravity IDE, car la documentation Google actuelle rattache encore le contexte et les skills d’Antigravity à des emplacements compatibles Gemini. Les noms de cible masqués `antigravity` et `antigravity-cli` restent des chemins de compatibilité explicites, mais ils n’apparaissent ni dans `engram link list`, ni dans l’aide, la complétion ou `all`.

## Installation {#install}

```bash
engram link gemini
```

## Fichiers écrits {#files-written}

| Fichier | Rôle |
| --- | --- |
| `GEMINI.md` | Amorçage du contexte du projet |
| `.gemini/commands/engram.toml` | Adaptateur slash `/engram` |
| `.gemini/settings.json` | Hooks `SessionStart`, `BeforeAgent`, `AfterTool` et `PreCompress` |
| `.gemini/settings.json` | Enregistrement MCP (`mcpServers.engram`, fusionné à côté des hooks) |

## Installation globale {#global-install}

```bash
engram link --global gemini
```

Écrit `~/.gemini/GEMINI.md`, `~/.gemini/skills/engram/SKILL.md` et fusionne `mcpServers.engram` dans `~/.gemini/settings.json`.

## Cible orientée exécution {#runtime-first-target}

Gemini est une cible orientée exécution. `GEMINI.md` contient de courtes instructions d’amorçage qui s’appuient sur les outils MCP et les hooks pour le protocole détaillé ; le guide compagnon porte le flux complet d’écriture/approbation, et le fichier Agent Skill n’en est qu’un court pointeur.

## Comportement des hooks {#hook-behavior}

Gemini prend en charge l’injection de `hookSpecificOutput.additionalContext` au démarrage et au moment de l’invite via les événements `SessionStart` et `BeforeAgent` ; `PreCompress` (avant que la CLI ne résume l’historique) réinitialise l’ensemble des mémoires livrées. `AfterTool` (matcher `read_file|write_file|replace`, délai en millisecondes) injecte jusqu’à 3 mémoires non encore livrées dont les globs `applies_to` correspondent au fichier touché par l’outil ; le contexte est ajouté au résultat de l’outil, il arrive donc une étape après la lecture. Il partage l’ensemble des mémoires livrées avec `BeforeAgent` et ne renvoie jamais de décision. `engram link gemini` ou `engram upgrade --latest` ajoute l’événement à une installation existante.

Si `mcpServers.engram` dans `.gemini/settings.json` définit `trust: true`, Gemini ignore sa confirmation pour `engram_commit` ; `engram doctor` vous en avertit (`host.gemini_trust`).

## Compatibilité Antigravity {#antigravity-compatibility}

Pour les hooks, `gemini` est aussi le repli public pour Antigravity. Les cibles de hook masquées `antigravity` et `antigravity-cli` se normalisent vers le comportement et les chemins des hooks Gemini, jusqu’à ce que Google publie une documentation stable des hooks/configuration principaux d’Antigravity.

## Étapes suivantes {#next-steps}

- [Vue d’ensemble des intégrations d’agents](overview.md)
- [Hooks et lignes de preuve](hooks.md)
