---
title: inject / link / upgrade
sidebar_position: 4
description: Commandes de configuration et d'adaptateur — initialiser les espaces de travail, lier les agents et réconcilier après les mises à jour de paquets.
---

# inject / link / upgrade

Les commandes de configuration et d'adaptateur initialisent les espaces de travail, lient les agents et réconcilient après les mises à jour de paquets.

## inject

```bash
engram inject
engram inject --global-only --global-path <path>
engram inject --submodule
engram inject --submodule-remote <git-url>
engram inject --global-remote <git-url>
engram inject --no-skillset
engram inject --skillset all
```

`engram inject` crée `.agents/.engram/` et installe la cible Codex compacte par défaut. Les fichiers existants écrits par des humains sont ignorés.

L'injection interactive demande dans cet ordre : s'il faut ajouter `./.agents/.engram` comme sous-module, s'il faut utiliser un chemin Engram global et s'il faut ajouter une origine Git globale partagée.

Utilisez `engram update-global-folder <new-path>` ou `engram ugf <new-path>` pour mettre à jour uniquement le chemin global configuré. Les formes de type chat telles que `engram set global memory path to <new-path>` et `engram move global folder from <old-path> to <new-path>` se normalisent dans la même commande. Ajoutez `--move-from-path <old-path>` lorsqu'ils souhaitent également qu'Engram déplace toute l'ancienne racine globale.

## link

```bash
engram link codex
engram link claude
engram link gemini
engram link cursor
engram link windsurf
engram link --global opencode
engram link all
engram unlink
```

`engram link all` installe l'ensemble des cibles publiques et signale les raisons déterministes `SKIPPED` pour les hôtes partiels dans les fichiers d'instructions de compétences, la configuration MCP, les adaptateurs slash et les hooks d'agent en une seule installation unifiée. `engram unlink` supprime tout cela ensemble. `engram unlink --global <target>` supprime uniquement le plugin global généré par Engram ; un fichier écrit par un humain est conservé à moins que `--force` ne soit explicite.

## upgrade

```bash
engram upgrade
engram upgrade --plan
engram upgrade --latest
```

Utilisez `engram upgrade` après avoir installé un paquet Engram plus récent. La commande compare les racines de mémoire initialisées à partir de la version v0.0.8 avec le schéma de la version actuelle et actualise le fichier `HELP.md` généré, les index de mémoire, les fichiers de graphe, les sidecars vectoriels éligibles, les compétences d'espace de travail générées, le canevas de mémoire globale et les compétences d'agent global enregistrées tout en préservant les fichiers écrits par des humains.

Les commandes normales exécutent également la même réconciliation de racine silencieusement une fois par version de paquet, à moins que `--no-auto-upgrade` ou `ENGRAM_NO_AUTO_UPGRADE=1` ne soit défini.

Utilisez `engram upgrade --latest` lorsque la sortie du nouveau paquet doit remplacer les artefacts d'agents liés actuels gérés par Engram. Ce chemin réapplique les fichiers d'instructions d'espace de travail liés, les règles, la configuration MCP/plugin et les hooks gérés, et actualise également les installations d'agents globaux enregistrées avec les derniers fichiers générés.

Utilisez `--force` uniquement lors du remplacement intentionnel des fichiers d'adaptateur générés par Engram.

## take-control

```bash
engram take-control --plan
engram take-control --all
engram take-control --file AGENTS.md
engram take-control --dir docs
engram take-control --include "docs/**/*.md" --exclude "docs/private/**"
engram take-control --max-sources 5 --max-chars 900
engram take-control --all --metacognize --accept-all
```

`take-control` is the flux de prise de contrôle assisté par agent pour les directives d'espace de travail existantes. Il construit un dossier source compact à partir de fichiers tels que `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, les règles Cursor, les notes de banque de mémoire et les dossiers de niveau supérieur `rules/`, `skills/`, `workflows/`, `knowledge/` ou `notes/`, y compris les notes `.txt`.

Les mémoires enregistrées par take-control enregistrent `source_files` et `source_hashes`, de sorte que les sources inchangées sont ignorées ultérieurement.

## metacognize

```bash
engram metacognize --workspace
engram metacognize --global --dry-run
engram metacognize --all --accept-all
```

Utilisez `metacognize` lorsque vous souhaitez qu'un agent d'IA examine un dossier de mémoire Engram existant et propose une structure plus sûre via le même flux d'approbation save-session. Les agents doivent utiliser `UPDATE: memory-id` pour la consolidation ou le nettoyage de la formulation et `DEPENDS_ON: memory-id` pour les mémoires superposées.

## Étapes suivantes

- [profiles / workspaces / config](profiles-workspaces-config.md)
- [Présentation des intégrations d'agents](../integrations/overview.md)
