---
title: Onglet Profiles (Profils)
sidebar_position: 5
description: Gérez les profils de mémoire globale isolés depuis l'interface Entry Web UI.
---

import RiskCallout from '@site/src/components/RiskCallout';

# Onglet Profiles

L'onglet Profiles gère les profils de mémoire globale isolés. Les profils empêchent la mémoire du client, de l'entreprise et la mémoire personnelle de fuiter à travers les limites.

## Nom du profil (Profile name)

Contexte de mémoire nommé tel que `personal`, `client-a`, `team-platform`. Utilisez des lettres, des chiffres, `.`, `_`, `-` ; évitez les espaces et les noms sensibles. Les noms doivent correspondre à `^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$`.

## Chemin global (Global path)

Dossier du système de fichiers hébergeant le profil. Préférez les chemins absolus en dehors des dossiers temporaires volatiles ; assurez-vous d'avoir l'autorisation d'écriture.

## Activer (Activate)

Rend le profil actif pour la résolution par défaut au niveau de l'utilisateur. Passer de la mémoire personnelle à la mémoire de travail/client affecte les chargements et enregistrements futurs.

<RiskCallout level="caution">
L'activation d'un profil modifie la mémoire globale utilisée par les chargements et enregistrements futurs. Confirmez le nom du profil avant d'activer.
</RiskCallout>

## Supprimer (Delete)

Supprime l'enregistrement du profil. Les métadonnées du profil sont supprimées ; les fichiers de mémoire peuvent toujours exister sur le disque à moins que le comportement du code ne change. Examinez le dossier avant de vous fier à la suppression.

## Équivalent CLI

```bash
engram profile create personal --global-path ~/Documents/engram-personal --use
engram profile use company --workspace
engram profile merge personal company --dry-run
```

## Étapes suivantes

- [Profils et résolution de portée](../concepts/profiles.md)
- [Onglet Workspaces](workspaces.md)
