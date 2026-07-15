---
title: Installer et configurer
sidebar_position: 3
description: Installer la CLI d'Engram, initialiser un espace de travail, configurer la mémoire globale et lier les agents d'IA.
---

# Installer et configurer

## Configuration requise

- Node.js `>=20`
- Un agent d'IA pris en charge (Codex, Claude, Gemini, Cursor, Windsurf, OpenCode, Copilot, Cline ou tout hôte compatible avec AGENTS.md)

## Installer la CLI

```bash
npm install -g @the-long-ride/engram
```

Vérifier :

```bash
engram --version
```

Deux binaires sont installés :

- `engram` — CLI principale
- `engram-mcp` — binaire du serveur MCP pour les hôtes qui enregistrent des processus d'outils externes

## Initialiser un espace de travail (workspace)

Depuis la racine du projet :

```bash
engram inject
```

Cela crée `.agents/.engram/` et installe la cible Codex compacte par défaut : `AGENTS.md` plus `.agents/skills/engram/SKILL.md`.

Utilisez `engram inject --no-skillset` pour ignorer les fichiers de l'agent, ou `engram inject --skillset all` pour installer tous les adaptateurs pris en charge lors de l'injection. Les fichiers existants écrits par des humains sont ignorés.

## Configurer avec l'interface Web d'Entry

Le chemin de configuration le plus convivial :

```bash
engram entry
```

Cela lance un panneau de contrôle local uniquement. Configurez les racines de mémoire, liez les agents et ajustez le routage sans modifier le JSON à la main. Voir [Interface Web d'Entry](entry/index.md) pour chaque onglet et champ.

## Configurer la mémoire globale

La mémoire globale est facultative et vit là où vous la configurez. Elle contient les préférences et le contexte d'équipe qui doivent vous suivre à travers les dépôts.

```bash
engram inject --global-only --global-path ~/Documents/engram
```

Or mettez à jour le dossier global plus tard :

```bash
engram update-global-folder ~/Documents/engram
engram ugf ~/Documents/engram
```

Les commandes de type chat telles que `engram set global memory path to <new-path>` et `engram move global folder from <old-path> to <new-path>` se normalisent dans la même commande. Ajoutez `--move-from-path <old-path>` lorsqu'ils souhaitent également qu'Engram déplace toute l'ancienne racine globale vers le nouvel emplacement.

## Lier des agents d'IA

Installez les hooks d'agent et l'enregistrement MCP pour un hôte :

```bash
engram link codex
engram link claude
engram link gemini
engram link cursor
engram link windsurf
engram link --global opencode
engram set-proof compact
```

`engram link all` installe l'ensemble des cibles publiques et signale les raisons déterministes `SKIPPED` pour les hôtes partiels dans les fichiers d'instructions de compétences, la configuration MCP, les adaptateurs slash et les hooks d'agent en une seule installation unifiée. `engram unlink` supprime tout cela ensemble.

Voir [Intégrations d'agents](integrations/overview.md) pour la matrice complète des cibles.

## Flux de travail du sous-module (Submodule)

Si l'humain souhaite que `.agents/.engram` soit suivi comme un dépôt séparé :

```bash
engram inject --submodule
```

Ajoutez `--submodule-remote <git-url>` uniquement après que l'humain a fourni une URL. Engram valide l'URL, initialise le sous-module sur `main` et crée le premier commit du sous-module sous le nom `Initialize engram`.

## Origine Git globale partagée

Si `engram entry` n'affiche aucun `global_git_detected.remote_url`, demandez à l'humain si la mémoire globale doit être partagée via Git. Lorsqu'ils fournissent une URL :

```bash
engram inject --global-remote <git-url>
```

## Vérifier l'installation

```bash
engram verify
engram load --dry-run "setup"
engram llm
```

`engram llm` imprime le guide d'utilisation de l'agent d'IA fourni et ne nécessite pas d'espace de travail injecté.

## Étapes suivantes

- [Flux de travail quotidien](daily-workflow.md)
- [Interface Web d'Entry](entry/index.md)
- [Intégrations d'agents](integrations/overview.md)
