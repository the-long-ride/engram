---
title: Gemini
sidebar_position: 4
description: Intégration d'Engram avec Gemini CLI et les interfaces compatibles Gemini d'Antigravity.
---

# Gemini

Gemini CLI recherche les fichiers `GEMINI.md` comme contexte. La cible `slash` écrit `.gemini/commands/engram.toml` pour que `/engram <args>` devienne une commande personnalisée du projet dans Gemini CLI.

Engram traite également `gemini` comme la cible annoncée pour Antigravity 2.0, Antigravity CLI et Antigravity IDE, car les documents actuels de Google associent toujours le contexte et les compétences Antigravity à des emplacements compatibles Gemini. Les noms de cibles cachés `antigravity` et `antigravity-cli` restent des chemins de compatibilité explicites, mais ils ne sont pas affichés dans `engram link list`, l'aide, la complétion automatique ou `all`.

## Installation

```bash
engram link gemini
```

## Fichiers écrits

| Fichier | Objectif |
| --- | --- |
| `GEMINI.md` | Bootstrap de contexte du projet |
| `.gemini/commands/engram.toml` | Adaptateur slash `/engram` |
| `.gemini/settings.json` | Hooks `SessionStart` et `BeforeAgent` |
| Gemini MCP config | Enregistrement MCP |

## Installation globale

```bash
engram link --global gemini
```

Écrit `~/.gemini/GEMINI.md`, `~/.gemini/skills/engram/SKILL.md` et le fichier de configuration Gemini MCP.

## Cible axée sur le runtime

Gemini est une cible axée sur le runtime. `GEMINI.md` contient des instructions de bootstrap courtes qui s'appuient sur les outils et hooks MCP pour le protocole détaillé ; le fichier Agent Skill gère l'ensemble du flux d'écriture et d'approbation.

## Comportement des hooks

Gemini prend en charge l'injection au démarrage et au moment de la saisie (prompt) de `hookSpecificOutput.additionalContext` via les événements `SessionStart` et `BeforeAgent`.

## Compatibilité Antigravity

Pour les hooks, `gemini` est également la solution de secours publique d'Antigravity. Les cibles de hook cachées `antigravity` et `antigravity-cli` se normalisent par rapport au comportement et aux chemins de hook de Gemini jusqu'à ce que Google publie une documentation stable sur les hooks/configurations principaux d'Antigravity.

## Étapes suivantes

- [Présentation des intégrations d'agents](overview.md)
- [Hooks et lignes de preuve](hooks.md)
