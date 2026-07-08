---
title: Résolution des problèmes
sidebar_position: 3
description: Problèmes courants d'Engram et comment les résoudre.
---

# Résolution des problèmes

Première étape : ouvrez `engram entry` et lisez l'onglet **Runtime**. Il présente le profil résolu, les racines de mémoire, la configuration principale, le routage, le graphe et la détection Git.

## La mémoire ne se charge pas

- Exécutez `engram load --dry-run "<tâche>"` pour inspecter le nombre de candidats et les étiquettes de restriction.
- Vérifiez `engram config view` pour les paramètres `enabled`, `read` et `load.limit`.
- Confirmez que la mémoire de l'espace de travail existe dans le répertoire `.agents/.engram/`.
- Exécutez `engram verify` pour contrôler les hachages.

## Les hooks ne s'injectent pas

- Confirmez que le paramètre `engram set-read status` n'est ni à `off` ni à `manual`.
- Confirmez que l'hôte est lié : `engram link <cible>`.
- Redémarrez ou rechargez l'hôte après un `link`/`unlink` (notamment OpenCode).
- Vérifiez `engram set-proof status` pour s'assurer de la visibilité de la ligne de preuve.

## Échec de la sauvegarde

- Lisez l'aperçu d'approbation pour identifier les indices concernant la mémoire liée.
- Si une requête d'acceptation globale a signalé des mémoires liées, aucun fichier n'a été enregistré. Relancez la commande avec les candidats `DEPENDS_ON` ou `UPDATE`.
- Vérifiez les erreurs de validation de schéma, de détection de secrets et d'injections dans la sortie CLI.

## Confusion de profils

- Exécutez `engram profile status`.
- Confirmez le profil par défaut (`default_profile`) de l'espace de travail et le profil utilisateur actif.
- Rappel : l'utilisation d'un profil explicite différent de celui par défaut de l'espace de travail désactive la mémoire de l'espace de travail pour cette commande.

## Fichiers de mémoire non valides

```bash
engram verify
engram repair
engram rebuild-index
engram graph --rebuild
```

## Adaptateurs obsolètes après une mise à jour de package

```bash
engram upgrade
engram upgrade --latest
engram link all
```

N'utilisez `--force` que pour remplacer intentionnellement des fichiers d'adaptateur Engram générés.

## Base SQLite de configuration indisponible

Les commandes normales de lecture/écriture se replient sur des instantanés de configuration JSON. Les commandes spécifiques à la base de données signalent que SQLite est indisponible au lieu de bloquer l'utilisation normale de la mémoire.

## Problèmes de synchronisation Git globale

- Confirmez que `global_git.enabled` est à `true`.
- Vérifiez que `global_git.remote_url` est une URL de dépôt distant Git valide.
- Revise `global_git.auto_resolve` — la gestion automatique des conflits peut masquer les différences de mémoire.
- Exécutez `engram entry`, onglet Runtime, pour inspecter la variable `global_git_detected`.

## Étapes suivantes

- [FAQ](faq.md)
- [CLI : verify / repair / quality-check](../cli/verify-repair-quality.md)
