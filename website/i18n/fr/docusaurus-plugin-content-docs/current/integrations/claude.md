---
title: Claude
sidebar_position: 3
description: Intégration d’Engram avec Claude Code via CLAUDE.md, les commandes slash, les Agent Skills, MCP et les hooks.
---

# Claude

Claude Code lit `CLAUDE.md` pour les consignes du projet (et un `AGENTS.md` de projet uniquement lorsqu’aucun `CLAUDE.md` n’existe) et prend en charge la configuration d’outils externes via `.mcp.json`. L’amorçage d’Engram privilégie AGENTS.md.

## Installation {#install}

```bash
engram link claude
```

## Fichiers écrits {#files-written}

| Fichier | Rôle |
| --- | --- |
| `AGENTS.md` | Amorçage des consignes du projet (le bloc géré, partagé avec Codex et OpenCode) |
| `CLAUDE.md` ou `.claude/CLAUDE.md` | Un bloc d’amorçage, uniquement lorsque ce fichier existe déjà et n’importe pas `@AGENTS.md` ; jamais créé |
| `.claude/engram.md`, `.agents/engram.md` | Guides compagnons avec le flux complet d’écriture/approbation |
| `.claude/rules/engram/<id>.md` | Une règle de chemin générée par mémoire de workspace avec `applies_to` (`hooks.path_rules native`) |
| `.claude/commands/engram.md` | Commande slash `/engram` classique |
| `.claude/skills/engram/SKILL.md` | Agent Skill pour l’invocation par slash |
| `.claude/settings.json` | Hooks `SessionStart`, `UserPromptSubmit`, `InstructionsLoaded`, `PreCompact` et `SubagentStart` |
| `.mcp.json` | Enregistrement MCP |

Claude reçoit à la fois `.claude/commands/engram.md` et `.claude/skills/engram/SKILL.md`, de sorte que `/engram` apparaît dans les anciens menus de commandes comme dans les sessions Claude Code récentes compatibles avec les skills.

## Installation globale {#global-install}

```bash
engram link --global claude
```

Engram ajoute un bloc géré à `~/.claude/CLAUDE.md` (en préservant le texte de l’utilisateur) et écrit le skill Claude dans `~/.claude/skills/engram/SKILL.md`. Claude Code ne lit pas `~/.claude/mcp.json` ; le MCP global est donc une indication : Engram affiche `claude mcp add --scope user engram -- engram-mcp` que vous exécutez vous-même.

## Cible orientée exécution {#runtime-first-target}

Claude est une cible orientée exécution. Le bloc `AGENTS.md` (et un bloc `CLAUDE.md` là où ce fichier existe) contient de courtes instructions d’amorçage qui s’appuient sur les outils MCP et les hooks pour le protocole détaillé ; le guide compagnon porte le flux complet d’écriture/approbation, et le fichier Agent Skill n’en est qu’un court pointeur. Un bloc `CLAUDE.md` existant est actualisé et jamais supprimé, et `engram link` signale un `CLAUDE.local.md` ou un `CLAUDE.md` d’un répertoire parent qui masque `AGENTS.md` pour Claude. Le skill généré suit la spécification Agent Skills et ajoute `when_to_use` et `user-invocable: true` ; `engram doctor` le valide (`host.skill_frontmatter`). L’installation globale écrit toujours `~/.claude/CLAUDE.md`, car Claude ne lit aucun `AGENTS.md` au niveau utilisateur.

## Comportement des hooks {#hook-behavior}

Claude prend en charge l’injection de contexte supplémentaire au démarrage et au moment de l’invite. `SessionStart` charge la mémoire routée au démarrage ; `UserPromptSubmit` n’injecte que les corps de mémoire pas encore livrés dans la session. `PreCompact` réinitialise l’ensemble des mémoires livrées. `SubagentStart` (matcher `*`) injecte le contexte routé dans chaque sous-agent avec son propre ensemble de mémoires livrées, et la sortie des hooks reste sous 9 500 caractères. Les mémoires avec des globs `applies_to` parviennent à Claude sous forme de règles de chemin natives : `engram link claude` écrit `.claude/rules/engram/<id>.md` (frontmatter limité aux chemins, plus un marqueur `<!-- engram:<scope>:<file> sha:<8> -->`), et le hook `InstructionsLoaded` (matcher `path_glob_match`) consigne chaque chargement dans l’ensemble des mémoires livrées et dans `usage.json`. Les mémoires du niveau de travail ne sont jamais écrites, les mémoires globales vont dans `~/.claude/rules/engram/` avec `engram link --global claude`, et les fichiers sans le marqueur sont laissés intacts. Les globs à accolades nécessitent Claude Code v2.1.217 ou plus récent. Pour conserver plutôt l’ancienne injection `PreToolUse`, exécutez `engram config set hooks.path_rules hook` puis `engram link claude` ; cela supprime aussi les fichiers de règles générés.

## Approbation MCP {#mcp-approval}

`engram_commit` porte `_meta["anthropic/requiresUserInteraction"]: true` ; Claude Code vous demande donc confirmation avant chaque appel, même dans les modes de contournement. Gardez-le ainsi : l’`approval_token` prouve seulement qu’une proposition existe. Voir [Outils MCP](mcp.md).

## Étapes suivantes {#next-steps}

- [Vue d’ensemble des intégrations d’agents](overview.md)
- [Adaptateurs slash](slash.md)
- [Outils MCP](mcp.md)
