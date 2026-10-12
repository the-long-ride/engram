---
title: OpenCode
sidebar_position: 7
description: Intégration d'Engram avec OpenCode via AGENTS.md, Agent Skills, MCP, des commandes personnalisées et un plugin local.
---

# OpenCode

OpenCode lit le fichier projet `AGENTS.md` et le fichier global `~/.config/opencode/AGENTS.md` pour les règles. Engram y écrit un bloc géré, écrit le guide complet dans `.opencode/engram.md` ou `~/.config/opencode/engram.md`, écrit la compétence complète dans `.opencode/skills/engram/SKILL.md` ou `~/.config/opencode/skills/engram/SKILL.md`, et réserve le projet `opencode.json` (or un fichier `opencode.jsonc` existant) et le fichier global `~/.config/opencode/opencode.jsonc` pour l'enregistrement MCP.

## Installation

```bash
engram link opencode
```

## Fichiers écrits

| Fichier | Objectif |
| --- | --- |
| `AGENTS.md` | Règles du projet avec bloc géré |
| `.opencode/engram.md` | Guide complet |
| `.opencode/skills/engram/SKILL.md` | Agent Skill |
| `.opencode/commands/engram.md` | Adaptateur slash `/engram` |
| `opencode.json` / `opencode.jsonc` | Enregistrement MCP (`mcp.engram`) |

## Installation globale

```bash
engram link --global opencode
```

Installe également un plugin JavaScript local géré dans `~/.config/opencode/plugins/engram.js`. Le plugin utilise `chat.message` pour router le prompt de l'utilisateur actuel et `experimental.chat.system.transform` pour injecter la mémoire routée avant chaque requête LLM.

:::warning
OpenCode doit être redémarré ou rechargé après `link`/`unlink` car les fichiers de plugins locaux sont chargés au démarrage.
:::

## Enregistrement MCP

```json
"engram": {
  "type": "local",
  "command": ["engram-mcp"],
  "args": [],
  "enabled": true
}
```

Le serveur MCP implémente la liaison JSON-RPC standard (`initialize`, `notifications/initialized`, `tools/list` et `tools/call`) afin qu'OpenCode puisse découvrir et appeler les outils Engram.

## Comportement du plugin

Le plugin échoue en mode ouvert (fails open) et ne conserve la mémoire routée brute que dans le processus OpenCode en cours d'exécution. Le cache des hooks de disque d'Engram ne contient que des hachages, des identifiants de session, l'hôte, le répertoire de travail (cwd) et les signatures routées. `engram unlink --global opencode` supprime uniquement le plugin généré par Engram ; un fichier `engram.js` créé par un humain est préservé à moins que `--force` ne soit explicite.

## Étapes suivantes

- [Présentation des intégrations d'agents](overview.md)
- [Outils MCP](mcp.md)
- [Hooks et lignes de preuve](hooks.md)
