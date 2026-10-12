---
title: Windsurf / Cascade
sidebar_position: 6
description: Intégration d'Engram avec Windsurf Cascade via des règles, MCP, des hooks et des mémoires globales.
---

# Windsurf / Cascade

Windsurf lit les règles de l'espace de travail depuis `.windsurf/rules/*.md`. Engram écrit `.windsurf/rules/engram.md` avec le frontmatter `trigger: always_on`. `cascade` est un alias pour `windsurf`.

## Installation

```bash
engram link windsurf
```

Le MCP d'espace de travail n'est pas généré car les documents officiels ne décrivent que la configuration MCP au niveau de l'utilisateur. `engram link windsurf` le signale explicitement et suggère `engram link --global windsurf` pour le MCP.

## Fichiers écrits

| Fichier | Objectif |
| --- | --- |
| `.windsurf/rules/engram.md` | Règles du projet avec `trigger: always_on` |
| `.windsurf/hooks.json` | Hook `pre_user_prompt` |

## Installation globale

```bash
engram link --global windsurf
```

Engram écrit un bloc géré dans `~/.codeium/windsurf/memories/global_rules.md` (en préservant le texte de l'utilisateur et en restant sous la limite de caractères), fusionne MCP dans `~/.codeium/windsurf/mcp_config.json` et fusionne les hooks dans `~/.codeium/windsurf/hooks.json`.

## Comportement des hooks

Le hook `pre_user_prompt` peut auditer/précharger/bloquer mais ne peut pas injecter directement le contexte du modèle. Les règles et le MCP fournissent des canaux de contexte d'IA fiables.

## Étapes suivantes

- [Présentation des intégrations d'agents](overview.md)
- [Hooks et lignes de preuve](hooks.md)
