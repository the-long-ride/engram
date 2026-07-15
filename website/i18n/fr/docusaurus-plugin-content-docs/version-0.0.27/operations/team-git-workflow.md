---
title: Flux de travail en équipe avec Git
sidebar_position: 1
description: Utilisez Git pour transférer la mémoire Engram d'une machine à l'autre et conserver un historique des révisions.
---

# Flux de travail en équipe avec Git

Git transporte la mémoire d'une machine à l'autre et fournit un historique des révisions. Engram is natif de Git : la mémoire est stockée en Markdown brut, ce qui permet d'appliquer le flux de travail Git habituel.

## Mémoire de l'espace de travail en tant que sous-module

Si l'utilisateur souhaite que le répertoire `.agents/.engram` soit suivi comme un dépôt distinct :

```bash
engram inject --submodule
engram inject --submodule-remote <git-url>
```

Engram valide l'URL, initialise le sous-module sur la branche `main` et effectue le premier commit du sous-module intitulé `Initialize engram`.

## Dépôt Git global partagé (Git origin)

Si la commande `engram entry` n'affiche aucune valeur pour `global_git_detected.remote_url`, demandez à l'utilisateur si la mémoire globale doit être partagée via Git. Lorsqu'il fournit une URL :

```bash
engram inject --global-remote <git-url>
```

Configurez le comportement de synchronisation avec les champs `global_git.*` :

- `global_git.enabled` — active le comportement Git pour la mémoire globale
- `global_git.remote` — nom du dépôt distant (par défaut `origin`)
- `global_git.remote_url` — URL du dépôt distant de la mémoire globale partagée
- `global_git.branch` — branche cible (par défaut `main`)
- `global_git.auto_sync` — comportement de pull/push automatique
- `global_git.auto_resolve` — gestion automatique des conflits

:::warning
La gestion automatique des conflits peut masquer les différences (diffs) de mémoire. Vérifiez les diffs avant de vous fier à `global_git.auto_resolve`.
:::

## Flux de travail de révision

1. L'agent propose des candidats de mémoire.
2. L'humain approuve via l'étape de validation A/B/C (terminal) or `yes`/`audit`/`cancel` (chat).
3. Engram écrit le fichier Markdown approuvé et régénère les hachages, l'index, le graphe et le journal des modifications.
4. Commitez et poussez (push) les modifications de la mémoire via Git.
5. Les collaborateurs récupèrent (pull) les modifications et exécutent `engram upgrade` pour synchroniser.

## Étapes suivantes

- [Processus de publication et de mise à niveau](release-upgrade.md)
- [Concepts : chemin d'écriture et approbation](../concepts/write-path.md)
