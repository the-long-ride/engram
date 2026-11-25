---
title: Onglet Connections
sidebar_position: 3
description: Détecter et lier les agents IA pris en charge depuis l’interface web Entry.
---

import RiskCallout from '@site/src/components/RiskCallout';

# Onglet Connections {#connections-tab}

L’onglet Connections analyse votre machine à la recherche des surfaces d’agents IA pris en charge et vous permet de lier Engram à chacune au niveau du workspace ou au niveau global.

## Badge de santé Doctor {#doctor-health-badge}

L’en-tête de Connections affiche un **Doctor health badge** résumant les résultats pass/warn de `/api/doctor`. Utilisez-le pour repérer d’un coup d’œil les avertissements de hooks, de liens ou de configuration avant de lier ou de dépanner un agent.

## Analyse des agents {#agent-scan}

L’onglet affiche une carte par agent pris en charge. Chaque carte indique un statut détecté ou manquant.

- **Detected** — Engram a trouvé une surface d’agent locale prise en charge (chemin de configuration ou application présents).
- **Missing** — Engram n’a pas trouvé la surface de l’agent. Manquant ne signifie pas toujours non pris en charge ; cela peut signifier que l’application ou le chemin de configuration n’existe pas encore.

<RiskCallout level="caution">
Manquant ne signifie pas toujours non pris en charge. Cela peut signifier que l’application ou le chemin de configuration n’est pas encore présent sur cette machine.
</RiskCallout>

## Bascule de lien workspace {#workspace-link-toggle}

Lie Engram au dépôt/workspace courant pour cet agent. À utiliser lorsque la mémoire doit suivre le dépôt : règles par projet, mémoire propre au dépôt, instructions partagées par l’équipe.

## Bascule de lien global {#global-link-toggle}

Lie Engram globalement pour cet agent. À utiliser pour la mémoire personnelle, les flux de travail inter-projets et les styles/règles réutilisables.

<RiskCallout level="risky">
Utilisez les liens globaux avec précaution sur les machines partagées. Engram écrit des blocs gérés dans des fichiers d’instructions partagés. Examinez les fichiers qu’Engram écrit pour chaque agent avant de lier globalement.
</RiskCallout>

## Bascule de file SessionEnd {#sessionend-queue-toggle}

Les cartes **Claude** et **Codex** incluent une bascule dédiée **`SessionEnd queue` toggle** qui active ou désactive la mise en file des candidats d’apprentissage en fin de session pour relecture (correspondant à `engram link claude --session-end` et `engram link codex --session-end`).

## Fichiers qu’Engram écrit pour chaque agent {#what-files-engram-writes-per-agent}

| Cible | Fichier |
| --- | --- |
| `codex` | `AGENTS.md`, `.agents/skills/engram/SKILL.md` |
| `agents-md` | `AGENTS.md` |
| `copilot` | `.github/copilot-instructions.md` ; global : `~/.copilot/copilot-instructions.md` |
| `claude` | `AGENTS.md`, `.claude/engram.md`, `.agents/engram.md`, plus un bloc `CLAUDE.md` uniquement lorsque ce fichier existe déjà |
| `cursor` | `.cursor/rules/engram.mdc` ; global : `~/.cursor/plugins/local/engram/` |
| `gemini` | `GEMINI.md` ; global : `~/.gemini/GEMINI.md`, `~/.gemini/skills/engram/SKILL.md` |
| `cline` | `.clinerules` |
| `windsurf` | `.windsurf/rules/engram.md` ; global : `~/.codeium/windsurf/memories/global_rules.md` |
| `opencode` | `AGENTS.md`, `.opencode/engram.md`, `.opencode/skills/engram/SKILL.md`, `opencode.json` |
| `mcp` | `.mcp.json` ; global : fichiers de configuration MCP de l’hôte |
| `slash` | `.claude/commands/engram.md`, `.claude/skills/engram/SKILL.md`, `.cursor/commands/engram.md`, `.gemini/commands/engram.toml`, `.opencode/commands/engram.md` |

## Quand délier {#when-to-unlink}

- Archivage d’un dépôt ou d’un workspace de test
- Abandon d’Engram pour un agent
- Nettoyage des blocs gérés obsolètes avant un nouveau `engram upgrade --latest`

`engram unlink` ne supprime que les entrées de hook et les fichiers d’adaptateur gérés par Engram. Les fichiers rédigés par un humain sont conservés sauf si `--force` est explicite.

## Équivalent CLI {#cli-equivalent}

```bash
engram link codex
engram link codex --session-end
engram link claude
engram link claude --session-end
engram link --global opencode
engram unlink
```

## Étapes suivantes {#next-steps}

- [Onglet Construct](construct.md)
- [Vue d’ensemble des intégrations d’agents](../integrations/overview.md)
