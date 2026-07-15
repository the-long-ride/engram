---
title: Onglet Runtime (Temps d'exécution)
sidebar_position: 9
description: Configuration résolue et chemins en lecture seule, avec l'action de fermeture du serveur.
---

import RiskCallout from '@site/src/components/RiskCallout';

# Onglet Runtime

L'onglet Runtime est le rapport en lecture seule de la configuration et des chemins résolus. Traitez-le comme la première page de dépannage.

## Groupes de rapports d'exécution

Le rapport regroupe les valeurs résolues pour :

- **Profile** — profil actif et source de résolution
- **Memory roots** — chemins des mémoires de l'espace de travail et globale
- **Core config** — activé, portée, lecture, preuve, rôles
- **Routing** — limite de charge, paramètres du graphe et vectoriels
- **Graph** — activé, max liés, score min
- **Git detection** — dépôt distant, URL distante, branche, synchro auto

Chaque sortie explique ce que Engram a réellement résolu, et pas seulement ce qui a été configuré. Utilisez-le pour déboguer le comportement du profil, de la racine, de Git, du routage et des hooks.

## Fermer le serveur (Close server)

Arrête le serveur Entry local. Utilisez-le pour l'hygiène de sécurité après le travail de configuration.

<RiskCallout level="risky">
Le panneau est exclusivement local. Fermez le serveur depuis l'onglet Runtime lorsque vous avez terminé pour éviter de le laisser ouvert.
</RiskCallout>

## Équivalent CLI

```bash
engram config view
engram entry
```

## Étapes suivantes

- [Référence complète des champs](field-reference.md)
- [Dépannage des opérations](../operations/troubleshooting.md)
