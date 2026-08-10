---
title: Paramètres d'auteur Git
sidebar_position: 2
description: Configurez l'identité écrite dans les futures mémoires Engram et commits Git.
---

# Paramètres d'auteur Git

Engram possède un profil d'auteur pour que la paternité des mémoires soit explicite et portable.

<!-- future-memories-only -->
Les paramètres d'auteur affectent **uniquement les futures mémoires**.

<a id="global-author"></a>
## Auteur global

Définissez l'identité Engram par défaut pour tous les espaces de travail :

```bash
engram author set --name "Jane Doe" --email "jane@example.com"
engram author show
engram author --help
engram author set --help
```

Les nouveaux fichiers utilisent des champs distincts `author_name` et `author_email`.

<a id="workspace-override"></a>
## Surcharge d'espace de travail

Un espace de travail peut surcharger le profil global Engram :

```bash
engram author set --scope workspace --name "Workspace Jane" --email "jane@work.com"
engram author show --scope workspace
```

<!-- workspace-never-syncs-global-git -->
Une surcharge d'espace de travail ne synchronise jamais la configuration Git globale.

<a id="resolution-order"></a>
## Ordre de résolution

```bash
engram author show
engram author show --json
engram author show --help
```

Engram résout l'identité dans cet ordre :
1. Auteur Engram de l'espace de travail.
2. Auteur Engram global.
3. Valeur de secours Git en lecture seule.
4. Non résolu.

Dans Entry, la source est indiquée par `WORKSPACE`, `GLOBAL`, `GIT` ou `UNRESOLVED`.

<a id="remove-an-author-profile"></a>
## Supprimer un profil d'auteur

```bash
engram author unset --scope workspace
engram author unset --scope global
engram author unset --help
```

Utilisez `engram author unset --scope workspace` ou `--scope global`.

<a id="global-git-configuration"></a>
## Configuration Git globale

Entry affiche les paramètres Git sous **Paramètres → Git** dans l'onglet Global.

<a id="sync-to-global-git"></a>
## Synchroniser avec Git global

```bash
engram author sync-git-global --plan
engram author sync-git-global --confirm
engram author sync-git-global --help
```

Seul le profil global peut être copié. Prévisualisez d'abord, puis utilisez `--confirm`.

<a id="migrate-existing-memories"></a>
## Migrer les mémoires existantes

```bash
engram author migrate-memories --plan
engram author migrate-memories --confirm
```

Remplissez `author_name` et `author_email` avec `engram author migrate-memories --plan` puis `--confirm`.
