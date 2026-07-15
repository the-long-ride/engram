---
title: Hooks et lignes de preuve
sidebar_position: 12
description: Les hooks d'agent Engram injectent la mémoire routée au démarrage de la session et aux invites (prompts). Les lignes de preuve rendent l'injection visible.
---

# Hooks et lignes de preuve

Les hooks d'agent sont des hooks d'hôte facultatifs (opt-in) qui injectent le contexte Engram routé au démarrage de la session et lors des changements de tâche ultérieurs lorsque l'hôte expose un canal de contexte sécurisé au moment du prompt.

## Installer les hooks

```bash
engram link codex
engram link claude
engram link gemini
engram link cursor
engram link windsurf
engram link --global opencode
engram set-proof compact
```

Utilisez `--global` pour la configuration au niveau de l'utilisateur et `engram unlink` pour supprimer uniquement les entrées de hook gérées par Engram.

## Mode de lecture

`engram set-read startup|auto|always|manual|off` contrôle le comportement au runtime :

- `auto` charge au démarrage de la session et réinjecte uniquement lorsque le contexte Engram routé change.
- `startup` charge uniquement au démarrage de la session.
- `always` réinjecte à chaque tour éligible.
- `manual` et `off` réduisent l'automatisation.

Le cache des hooks stocke les hachages, les identifiants de session, l'hôte, le répertoire de travail (cwd) et les signatures routées — jamais le texte brut du prompt.

## Mode de preuve

`engram set-proof off|compact` contrôle si les hooks pris en charge ajoutent également une ligne compacte `Engram proof:` à chaque tour éligible. La visibilité de la preuve est distincte de `set-read` : `compact` peut signaler des tours chargés, réutilisés ou ignorés sans modifier le moment où la mémoire complète d'Engram est injectée.

## Matrice des fonctionnalités des hooks

| Hôte | Chemin de config | Événements |
| --- | --- | --- |
| `codex` | `.codex/hooks.json`; global `~/.codex/hooks.json` | `SessionStart`, `UserPromptSubmit` |
| `claude` | `.claude/settings.json`; global `~/.claude/settings.json` | `SessionStart`, `UserPromptSubmit` |
| `gemini` | `.gemini/settings.json`; global `~/.gemini/settings.json` | `SessionStart`, `BeforeAgent` |
| `cursor` | `.cursor/hooks.json`; plugin global `hooks/hooks.json` | `sessionStart` |
| `windsurf` / `cascade` | `.windsurf/hooks.json`; global `~/.codeium/windsurf/hooks.json` | `pre_user_prompt` |
| `opencode` | `~/.config/opencode/plugins/engram.js` | `chat.message`, `experimental.chat.system.transform` |
| `copilot` | Aucun écrit | N/A |
| `cline` | Aucun écrit | N/A |

## Étapes suivantes

- [Présentation des intégrations d'agents](overview.md)
- [CLI : injecter / lier / mettre à niveau](../cli/inject-link-upgrade.md)
