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
