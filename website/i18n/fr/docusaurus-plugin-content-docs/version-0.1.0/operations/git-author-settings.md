---
title: Paramètres de l’auteur Git
sidebar_position: 2
description: Configurer l’identité écrite dans les futures mémoires Engram et dans les commits Git créés par Engram.
---

# Paramètres de l’auteur Git {#git-author-settings}

Engram conserve un profil d’auteur afin que la paternité des mémoires soit explicite et portable. Le nom résolu est écrit dans le frontmatter des mémoires futures (l’e-mail uniquement lorsque `memory.include_author_email` vaut `true`), et l’identité complète est fournie aux commits Git créés par Engram via des variables d’environnement propres au processus. La configuration Git du dépôt n’est pas modifiée.

<!-- future-memories-only -->
Les paramètres d’auteur n’affectent que les **mémoires futures**. Les mémoires existantes ne changent que via la commande de migration explicite.

<a id="global-author"></a>
## Auteur global {#global-author}

Définissez l’identité Engram par défaut pour tous les workspaces :

```bash
engram author set --name "Jane Doe" --email "jane@example.com"
engram author show
engram author --help
engram author set --help
```

Les nouveaux fichiers de mémoire n’écrivent que `author_name`. L’e-mail reste dans votre profil d’auteur et dans les commits Git ; il ne se retrouve donc pas dans les fichiers de mémoire commités. Pour l’écrire aussi, activez la clé facultative `memory.include_author_email` (`false` par défaut) :

```bash
engram config set memory.include_author_email true
```

```yaml
author_name: Jane Doe
author_email: jane@example.com   # opt-in: only with memory.include_author_email: true
```

Mettre à jour une mémoire existante réécrit ses champs d’auteur ; un ancien `author_email` est donc supprimé à la mise à jour suivante, sauf si l’option est activée.

L’ancien `author: jane@example.com` reste lisible, mais les nouvelles mémoires ne l’écrivent pas.

<a id="workspace-override"></a>
## Surcharge du workspace {#workspace-override}

Un workspace peut surcharger le profil Engram global sans modifier les autres workspaces :

```bash
engram author set --scope workspace --name "Workspace Jane" --email "jane@work.com"
engram author show --scope workspace
```

<!-- workspace-never-syncs-global-git -->
Une surcharge de workspace ne modifie jamais la configuration Git globale. Elle est stockée dans le workspace et n’est utilisée que pour les mémoires et les commits créés par Engram dans ce workspace.

<a id="resolution-order"></a>
## Ordre de résolution {#resolution-order}

Engram résout l’identité dans cet ordre :

1. Auteur Engram du workspace.
2. Auteur Engram global.
3. Repli en lecture seule sur les `user.name` et `user.email` Git effectifs.
4. Non résolu.

```bash
engram author show
engram author show --json
engram author show --help
```

Un nom et un e-mail valides et complets sont requis avant l’écriture d’une mémoire. Les commits créés par Engram reçoivent `GIT_AUTHOR_NAME`, `GIT_AUTHOR_EMAIL`, `GIT_COMMITTER_NAME` et `GIT_COMMITTER_EMAIL` ; la configuration Git locale et globale reste inchangée.

Dans Entry, le nom résolu est suivi d’un badge de source compact : `WORKSPACE` pour une surcharge de workspace, `GLOBAL` pour le profil global d’Engram, `GIT` pour le repli Git et `UNRESOLVED` lorsqu’aucune identité complète n’existe.

<a id="remove-an-author-profile"></a>
## Supprimer un profil d’auteur {#remove-an-author-profile}

```bash
engram author unset --scope workspace
engram author unset --scope global
engram author unset --help
```

L’interface web demande une confirmation. La CLI supprime le profil immédiatement après la commande `unset` explicite. Après la suppression, la source suivante dans l’ordre de résolution devient active.

<a id="global-git-configuration"></a>
## Configuration Git globale {#global-git-configuration}

Entry expose les paramètres Git existants de la mémoire globale **uniquement dans l’onglet Global** sous **Settings → Git**. Ils continuent d’utiliser le backend de configuration partagé ; déplacer les contrôles ne crée pas un second magasin de configuration Git.

L’onglet Global peut modifier `global_git.enabled`, `global_git.remote`, `global_git.remote_url`, `global_git.branch`, `global_git.auto_sync` et `global_git.auto_resolve`. Ces champs sont risqués ; Entry valide donc le correctif, affiche les clés exactes modifiées et exige une relecture avant l’enregistrement. L’onglet Workspace n’affiche jamais ces contrôles globaux.

<a id="sync-to-global-git"></a>
## Synchroniser vers Git global {#sync-to-global-git}

Seul le profil Engram global peut être copié dans la configuration Git globale. Prévisualisez d’abord, puis confirmez explicitement :

```bash
engram author sync-git-global --plan
engram author sync-git-global --confirm
engram author sync-git-global --help
```

L’opération confirmée écrit `git config --global user.name` et `git config --global user.email`, vérifie les deux valeurs et restaure exactement les valeurs précédentes si une écriture ou la vérification échoue. Un profil de workspace n’est jamais éligible pour cette opération.

<a id="migrate-existing-memories"></a>
## Migrer les mémoires existantes {#migrate-existing-memories}

Renseignez rétroactivement `author_name` (et `author_email` uniquement lorsque `memory.include_author_email` vaut `true`) lorsqu’une identité déterministe complète est disponible :

```bash
engram author migrate-memories --plan
engram author migrate-memories --scope workspace --confirm
engram author migrate-memories --scope both --confirm
engram author migrate-memories --help
```

La migration préserve le corps Markdown, écrit une sauvegarde `.pre-author-v3.bak` sous `backups/author-v3/`, ignore les archives et les fichiers invalides, et est idempotente. Elle ne devine jamais un nom manquant. L’aperçu liste les fichiers éligibles, à jour, ignorés et invalides avant toute écriture.

Pour supprimer les e-mails que des versions antérieures ont déjà écrits dans des fichiers de mémoire, retirez-les. `--strip-email` planifie par défaut et n’écrit qu’avec `--confirm` ; il conserve `author_name`, supprime `author_email` et les e-mails de l’ancien `author:`, actualise les hachages et les index, et sauvegarde l’original sous `backups/author-strip-email-<date>/` :

```bash
engram author migrate-memories --strip-email --scope both
engram author migrate-memories --strip-email --scope both --confirm
```

Les mémoires écrites par cette version portent un nom sans e-mail ; un Engram plus ancien ne peut donc pas les indexer. Mettez à niveau tous vos collègues avant de vous appuyer sur des mémoires à nom seul.

## Interface web Entry {#entry-web-ui}

Ouvrez `engram entry`, puis choisissez **Settings → Git**. Les onglets Global et Workspace affichent les profils stockés, le badge de source résolue, des boîtes de dialogue de relecture avant enregistrement et un aperçu de migration des mémoires. L’onglet Global possède en plus la **configuration Git globale** et l’aperçu explicite de synchronisation Git ; ces contrôles sont masqués dans Workspace. Chaque bouton d’information ouvre cette page localisée dans un nouvel onglet et affiche la commande CLI `--help` correspondante.

## Confidentialité et dépannage {#privacy-and-troubleshooting}

Les noms deviennent des métadonnées durables dans le Markdown et l’historique Git ; les adresses e-mail restent hors des fichiers de mémoire sauf si vous activez `memory.include_author_email`. Les commits créés par Engram portent toujours votre e-mail d’auteur ; utilisez donc une adresse adaptée à la visibilité du dépôt. Si l’enregistrement signale un auteur non résolu, exécutez `engram author show`, définissez un profil global ou de workspace, ou configurez les valeurs de repli Git. La synchronisation Git globale n’est jamais automatique.
