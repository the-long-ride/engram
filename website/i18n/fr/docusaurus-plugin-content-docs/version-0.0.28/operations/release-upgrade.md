---
title: Processus de publication et de mise à niveau
sidebar_position: 2
description: Mettez à niveau les packages d'Engram et réconciliez les racines de mémoire en toute sécurité.
---

# Processus de publication et de mise à niveau

## Après une mise à jour de package npm

La commande normale Engram suivante réconcilie silencieusement les racines de l'espace de travail et globales déjà initialisées une fois pour la nouvelle version. Cela prend en charge les modifications de schéma de mémoire d'une version à l'autre à partir de la version v0.0.8, en rafraîchissant l'aide générée, les index de mémoire, les fichiers de graphes et les sidecars vectoriels éligibles lorsqu'une métadonnée plus ancienne est détectée.

Le contrôle au démarrage est volontairement peu coûteux après la première exécution : il se contente de lire de petits marqueurs de configuration lorsque la version actuelle est déjà enregistrée. Il ne s'exécute pas lors du postinstall npm, ne crée pas de nouvelles racines de mémoire et ne remplace pas les fichiers rédigés par l'utilisateur. Utilisez `--no-auto-upgrade` ou `ENGRAM_NO_AUTO_UPGRADE=1` pour l'ignorer pour une commande.

## Mise à niveau explicite

```bash
engram upgrade
engram upgrade --plan
engram upgrade --latest
```

`engram upgrade` actualise l'aide de l'espace de travail générée, les index de mémoire, les fichiers de graphes, les sidecars vectoriels éligibles, les fichiers de skillset de l'espace de travail existants générés par Engram et les skillsets globaux enregistrés, tout en préservant les fichiers rédigés par l'utilisateur.

`engram upgrade --latest` est plus forte : elle écrase les artefacts d'agents liés gérés par Engram pour les agents de l'espace de travail déjà liés et les installations globales enregistrées, y compris les fichiers d'instructions, les règles, la configuration MCP/plugin et les hooks gérés, afin que les hôtes liés récupèrent immédiatement le nouveau package.

N'utilisez `--force` que pour remplacer intentionnellement des fichiers d'adaptateur Engram générés.

## Profils de rendu des skillsets

Pour les hôtes capables d'exécuter un runtime, Engram installe de petites instructions d'amorçage (bootstrap) au lieu du protocole complet. Les hooks fournissent un contexte de tâche routé, les outils MCP fournissent le comportement de chargement/recherche/proposition, et les adaptateurs de type slash ou les Agent Skills exécutent des flux de travail de commandes détaillés. Les cibles de repli sans injection fiable de contexte d'exécution reçoivent toujours des instructions manuelles compactes.

## Solution de repli sur la base SQLite de configuration

La base de données de configuration SQLite d'Engram est une optimisation pour la gestion des espaces de travail et des profils. Si la base de données ne peut pas être ouverte ou initialisée, les commandes normales de lecture/écriture se replient sur des instantanés de configuration JSON. Les commandes spécifiques à la base de données signalent que SQLite est indisponible au lieu de bloquer l'utilisation normale de la mémoire.

## Étapes suivantes

- [Résolution des problèmes](troubleshooting.md)
- [CLI : inject / link / upgrade](../cli/inject-link-upgrade.md)

## Legacy memory migration to schema v3

`engram upgrade --latest` also migrates active v1/v2 memory files in the workspace and configured global roots to schema v3. Engram preserves each Markdown body exactly, creates `<memory-file>.pre-v3.bak`, fills only deterministic metadata, refreshes integrity hashes, and rebuilds the index, graph, and eligible vector sidecars. It never invents `evidence_refs`; a memory without verified trace links is marked `evidence_status: unverified`. Invalid memories are reported and skipped, archived memories are not rewritten, and a second run is idempotent.

Preview all changes without writing:

```bash
engram upgrade --latest --plan
```

Run only the memory migration, without overwriting linked agent artifacts:

```bash
engram upgrade --migrate-memories
```

Skip memory migration during a latest upgrade:

```bash
engram upgrade --latest --no-migrate-memories
```

<!-- configuration-upgrade-inventory -->

La révision des conflits utilise le même plan partagé dans la CLI et Entry. Exécutez ngram upgrade --latest --review pour accepter la dernière proposition adaptée au type, l'éditer via $VISUAL/$EDITOR ou confirmer **Keep current**. Entry fournit les vues **Current**, **Proposed** et **Diff** ; **Diff** est par défaut en mode **Inline** et peut basculer en **Parallel**, avec le contenu supprimé sur fond rouge et le contenu ajouté sur fond vert. L'application finale est bloquée tant que pendingReviewCount n'est pas zéro, et ngram upgrade --latest --yes refuse les décisions non résolues ou périmées. Chaque décision est vérifiée par rapport à son empreinte source avant écriture.

## Réconciliation de configuration sensible à la propriété

L'inventaire de mise à jour dédoublonne les intégrations enregistrées par fichier physique. Si plusieurs hôtes partagent le même guide Engram, Engram génère et écrit ce fichier une seule fois.

Lorsque des modifications manuelles rendent un artefact Engram non sécurisé pour un remplacement normal, Entry ne propose **Force upgrade** que si la propriété peut être prouvée. Pour un bloc Engram marqué, le remplacement forcé remplace uniquement ce bloc et conserve le texte utilisateur environnant. Pour un fichier généré/enregistré Engram, le remplacement forcé peut remplacer l'ensemble du fichier généré. Une propriété inconnue n'est jamais forçable, et la confirmation en lot ne force jamais d'action.

Une application réussie est vérifiée par une nouvelle analyse après écriture. Les artefacts attendus qui ne convergent pas vers current sont signalés comme des erreurs de vérification.

## Git author identity

Engram can store a global author and an optional workspace override. Resolution is workspace, global, then read-only Git fallback. Settings affect future memories only; a workspace override never changes global Git configuration. Use explicit plan and confirmation for global Git sync or legacy-memory migration.

```bash
engram author show
engram author set --name "Jane Doe" --email "jane@example.com"
engram author unset --scope workspace
engram author sync-git-global --plan
engram author sync-git-global --confirm
engram author migrate-memories --plan
engram author migrate-memories --confirm
```

Read the complete [Git author settings guide](git-author-settings.md).
