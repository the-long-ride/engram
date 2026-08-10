---
title: Codex
sidebar_position: 2
description: Intégration d'Engram avec OpenAI Codex via AGENTS.md et Agent Skills.
---

# Codex

OpenAI Codex et d'autres agents compatibles avec AGENTS.md utilisent `AGENTS.md` comme fichier d'instructions de projet. L'alias `codex` écrit également `.agents/skills/engram/SKILL.md` pour que les agents qui découvrent des Agent Skills puissent router Engram comme une compétence invocable.

## Installation

```bash
engram link codex
```

## Fichiers écrits

| Fichier | Objectif |
| --- | --- |
| `AGENTS.md` | Bootstrap des instructions du projet |
| `.agents/skills/engram/SKILL.md` | Agent Skill avec flux d'écriture/approbation complet |
| `.codex/hooks.json` | Hooks `SessionStart` et `UserPromptSubmit` |
| `.mcp.json` | Enregistrement MCP |

## Installation globale

```bash
engram link --global codex
```

Écrit la compétence Codex dans `~/.codex/skills/engram/SKILL.md` et ajoute un bloc géré aux fichiers d'instructions Codex partagés.

## Comportement des hooks

Codex prend en charge l'injection de contexte supplémentaire au démarrage et au moment de la saisie (prompt). `SessionStart` charge la mémoire routée au démarrage ; `UserPromptSubmit` réinjecte uniquement lorsque le contexte Engram routé change.

## Cible axée sur le runtime

Codex est une cible axée sur le runtime. `AGENTS.md` contient des instructions de bootstrap courtes qui s'appuient sur les outils et hooks MCP pour le protocole détaillé ; le fichier Agent Skill gère l'ensemble du flux d'écriture et d'approbation.

## Étapes suivantes

- [Présentation des intégrations d'agents](overview.md)
- [Hooks et lignes de preuve](hooks.md)
