---
title: Codex
sidebar_position: 2
description: Intégration d’Engram avec OpenAI Codex via AGENTS.md et les Agent Skills.
---

# Codex

OpenAI Codex et les autres agents compatibles AGENTS.md utilisent `AGENTS.md` comme fichier d’instructions du projet. L’alias `codex` écrit aussi `.agents/skills/engram/SKILL.md` afin que les agents qui découvrent les Agent Skills puissent router Engram comme un skill invocable.

## Installation {#install}

```bash
engram link codex
```

## Fichiers écrits {#files-written}

| Fichier | Rôle |
| --- | --- |
| `AGENTS.md` | Amorçage des instructions du projet |
| `.agents/skills/engram/SKILL.md` | Court pointeur Agent Skill vers le guide |
| `.agents/engram.md` | Guide compagnon avec le flux complet d’écriture/approbation |
| `.codex/hooks.json` | Hooks `SessionStart`, `UserPromptSubmit`, `PreToolUse`, `PreCompact` et `SubagentStart` |
| `.mcp.json` | Enregistrement MCP |

## Installation globale {#global-install}

```bash
engram link --global codex
```

Écrit le skill Codex dans `~/.codex/skills/engram/SKILL.md` et ajoute un bloc géré aux fichiers d’instructions Codex partagés. Le MCP global est un bloc géré `[mcp_servers.engram]` dans `~/.codex/config.toml` ; il définit aussi `approval_mode = "approve"` sur `[mcp_servers.engram.tools.engram_commit]` afin que Codex demande confirmation avant chaque commit (`engram upgrade` ou `engram link codex` actualise les anciens blocs). `engram doctor` indique la taille de votre chaîne AGENTS.md par rapport à la limite de 32 Kio de Codex (`host.agents_md_chain`).

## Comportement des hooks {#hook-behavior}

Codex prend en charge l’injection de contexte supplémentaire au démarrage et au moment de l’invite. `SessionStart` charge la mémoire routée au démarrage ; `UserPromptSubmit` n’injecte que les corps de mémoire pas encore livrés dans la session. `PreToolUse` injecte les mémoires dont les globs `applies_to` correspondent aux fichiers modifiés via `apply_patch` (il ne se déclenche pas sur les lectures), et `PreCompact` réinitialise l’ensemble des mémoires livrées. `SubagentStart` (matcher `*`) injecte le contexte routé dans chaque sous-agent ; l’ensemble des mémoires livrées du sous-agent a pour clé `<session_id>#agent:<agent_id>`, de sorte qu’il ne touche jamais celui du parent. Codex limite un message de hook à environ 2 500 tokens ; Engram garde donc `additionalContext` à 2 400 tokens ou moins et rétrograde les corps en cartes au lieu de les couper.

## Cible orientée exécution {#runtime-first-target}

Codex est une cible orientée exécution. `AGENTS.md` contient de courtes instructions d’amorçage qui s’appuient sur les outils MCP et les hooks pour le protocole détaillé ; le guide compagnon porte le flux complet d’écriture/approbation, et le fichier Agent Skill n’en est qu’un court pointeur.

## Étapes suivantes {#next-steps}

- [Vue d’ensemble des intégrations d’agents](overview.md)
- [Hooks et lignes de preuve](hooks.md)
