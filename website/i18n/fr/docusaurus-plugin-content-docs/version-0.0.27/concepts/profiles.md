---
title: Profils et résolution de portée
sidebar_position: 4
description: Les profils isolent les racines de mémoire globale pour les contextes d'entreprise, d'équipe et personnels.
---

# Profils et résolution de portée

Les profils isolent les racines de mémoire globale pour les contextes d'entreprise, d'équipe et personnels. Ils empêchent les mémoires client, entreprise et personnelle de fuir au-delà de leurs limites respectives.

## Créer et changer de profil

```bash
engram profile create personal --global-path ~/Documents/engram-personal --use
engram profile use company --workspace
engram profile merge personal company --dry-run
```

## Ordre de résolution

L'ordre de résolution des profils est le suivant :

1. Paramètre explicite `--profile` ou variable `ENGRAM_PROFILE`
2. Le profil par défaut de l'espace de travail (`default_profile`)
3. Le profil utilisateur actif

Si l'espace de travail `W` est associé au profil `B` alors que le profil par défaut de l'utilisateur reste le profil `A`, chaque chargement normal, chargement MCP et injection de hook d'agent pour `W` lira la mémoire globale du profil `B` et jamais celle du profil `A`. Un profil explicite différent du profil par défaut de l'espace de travail utilise la mémoire globale de ce profil et désactive la mémoire de l'espace de travail pour cette commande.

## Quand utiliser des profils

- Mémoire personnelle qui ne doit jamais atteindre le dépôt d'un client
- Mémoire d'entreprise qui ne doit jamais atteindre un dépôt personnel
- Mémoire isolée par client pour les consultants travaillant sur différentes missions
- Mémoire partagée en équipe qui ne doit pas déborder sur les expériences individuelles

## Solution de repli sur la base SQLite de configuration

La base de données de configuration SQLite d'Engram is une optimisation pour la gestion des espaces de travail et des profils. Si la base de données ne peut pas être ouverte ou initialisée, les commandes normales de lecture/écriture se replient sur des instantanés de configuration JSON. Les commandes spécifiques à la base de données signalent que SQLite est indisponible au lieu de bloquer l'utilisation normale de la mémoire.

## Étapes suivantes

- [Mémoire de l'espace de travail vs mémoire globale](scopes.md)
- [Chemin d'écriture et approbation](write-path.md)
