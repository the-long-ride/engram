---
title: Onglet Connections (Connexions)
sidebar_position: 3
description: Détectez et liez les agents IA pris en charge depuis l'interface Entry Web UI.
---

import RiskCallout from '@site/src/components/RiskCallout';

# Onglet Connections

L'onglet Connections scanne votre machine à la recherche des interfaces d'agents IA prises en charge et vous permet de lier Engram à chacune d'elles au niveau de l'espace de travail ou au niveau global.

## Scan des agents (Agent scan)

L'onglet affiche une carte par agent pris en charge. Chaque carte signale un statut détecté (detected) ou manquant (missing).

- **Detected** — Engram a trouvé une interface d'agent local prise en charge (chemin de configuration ou application présente).
- **Missing** — Engram n'a pas trouvé l'interface de l'agent. Manquant ne signifie pas toujours non pris en charge ; cela peut signifier que l'application ou le chemin de configuration n'est pas encore présent.

<RiskCallout level="caution">
Manquant ne signifie pas toujours non pris en charge. Cela peut signifier que l'application ou le chemin de configuration n'est pas encore présent sur cette machine.
</RiskCallout>

## Option de liaison à l'espace de travail (Workspace link toggle)

Lie Engram au dépôt/espace de travail actuel pour cet agent. À utiliser lorsque la mémoire doit suivre le dépôt : règles spécifiques au projet, mémoire spécifique au dépôt, instructions partagées par l'équipe.

## Option de liaison globale (Global link toggle)

Lie Engram globalement pour cet agent. À utiliser pour la mémoire personnelle, les flux de travail multi-projets et les styles/règles réutilisables.

<RiskCallout level="risky">
Utilisez les liens globaux avec prudence sur les machines partagées. Engram écrit des blocs gérés dans des fichiers d'instructions partagés. Examinez les fichiers écrits par Engram pour chaque agent avant de le lier globalement.
</RiskCallout>

## Fichiers écrits par Engram par agent

| Cible | Fichier |
| --- | --- |
| `codex` | `AGENTS.md`, `.agents/skills/engram/SKILL.md` |
| `agents-md` | `AGENTS.md` |
| `copilot` | `.github/copilot-instructions.md` ; global : `~/.copilot/copilot-instructions.md` |
| `claude` | `CLAUDE.md` |
| `cursor` | `.cursor/rules/engram.mdc` ; global : `~/.cursor/plugins/local/engram/` |
| `gemini` | `GEMINI.md` ; global : `~/.gemini/GEMINI.md`, `~/.gemini/skills/engram/SKILL.md` |
| `cline` | `.clinerules` |
| `windsurf` | `.windsurf/rules/engram.md` ; global : `~/.codeium/windsurf/memories/global_rules.md` |
| `opencode` | `AGENTS.md`, `.opencode/engram.md`, `.opencode/skills/engram/SKILL.md`, `opencode.json` |
| `mcp` | `.mcp.json` ; global : fichiers de configuration MCP de l'hôte |
| `slash` | `.claude/commands/engram.md`, `.cursor/commands/engram.md`, `.gemini/commands/engram.toml`, `.opencode/commands/engram.md` |

## Quand délier

- Archivage d'un dépôt ou d'un espace de travail de test
- Remplacement d'un agent pour ne plus utiliser Engram
- Nettoyage des blocs gérés obsolètes avant une nouvelle commande `engram upgrade --latest`

`engram unlink` supprime uniquement les entrées de hook et les fichiers adaptateurs gérés par Engram. Les fichiers écrits par des humains sont préservés sauf si `--force` est explicitement spécifié.

## Équivalent CLI

```bash
engram link codex
engram link claude
engram link --global opencode
engram unlink
```

## Étapes suivantes

- [Onglet Construct](construct.md)
- [Présentation des intégrations d'agents](../integrations/overview.md)
