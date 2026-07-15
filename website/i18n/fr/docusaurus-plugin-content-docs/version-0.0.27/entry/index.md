---
title: Présentation de l'interface Entry Web UI
sidebar_position: 1
description: L'interface Entry Web UI est le panneau de contrôle exclusivement local permettant de configurer la mémoire, les profils, les espaces de travail et les connexions d'agents d'Engram.
---

import RiskCallout from '@site/src/components/RiskCallout';

# Présentation de l'interface Entry Web UI

L'interface Entry Web UI est le panneau de contrôle local pour Engram. Utilisez-le pour configurer les racines de mémoire, lier les agents IA, ajuster le routage, examiner les doublons, inspecter le graphe de mémoire et déboguer la configuration d'exécution sans modifier manuellement les fichiers JSON.

## Quand l'utiliser

- Configuration initiale d'un espace de travail ou d'une racine de mémoire globale
- Liaison ou déliaison d'agents IA sans avoir à se souvenir des drapeaux CLI
- Réglage du routage, du graphe, du vecteur et des paramètres de variante de règle
- Examen des mémoires en doublon ou en conflit
- Inspection du graphe de mémoire
- Débogage des configurations résolues, des chemins et de la détection Git

## Modèle d'accès exclusivement local (Local-only)

Le panneau s'exécute sur votre machine. Ce n'est pas un service cloud. Fermez le serveur lorsque vous avez terminé pour des raisons d'hygiène de sécurité.

<RiskCallout level="risky">
Le panneau Entry est exclusivement local. Traitez-le comme ouvert pendant la configuration de la mémoire, puis fermez le serveur depuis l'onglet Runtime lorsque vous avez terminé.
</RiskCallout>

## Relation avec les commandes CLI

Chaque contrôle visible correspond à une commande CLI ou à une clé de configuration. Lorsqu'un équivalent CLI existe, la référence du champ le répertorie. La CLI reste la source de vérité pour les scripts et l'automatisation.

## Onglets en un coup d'œil

| Onglet | Rôle |
| --- | --- |
| [Connections](connections.md) | Détecter et lier les agents IA pris en charge |
| [Construct](construct.md) | Configurer chaque champ d'exécution d'Engram |
| [Profiles](profiles.md) | Gérer les profils de mémoire globale isolés |
| [Workspaces](workspaces.md) | Enregistrer et lier les dépôts de projet |
| [Core](core.md) | Examiner les mémoires en doublon et en conflit |
| [Memories](memories.md) | Inspecter le graphe de mémoire et archiver les mémoires |
| [Runtime](runtime.md) | Configuration résolue et chemins en lecture seule |

## Étapes suivantes

- [Lancement du panneau de contrôle](launch.md)
- [Onglet Construct](construct.md)
- [Référence complète des champs](field-reference.md)
