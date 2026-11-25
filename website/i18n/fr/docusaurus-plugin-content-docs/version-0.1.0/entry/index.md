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
Le panneau Entry est exclusivement local. Traitez-le comme ouvert pendant la configuration de la mémoire, puis fermez le serveur depuis le pied de la barre latérale lorsque vous avez terminé.
</RiskCallout>

## Relation avec les commandes CLI

Chaque contrôle visible correspond à une commande CLI ou à une clé de configuration. Lorsqu'un équivalent CLI existe, la référence du champ le répertorie. La CLI reste la source de vérité pour les scripts et l'automatisation.

## Navigation et routage d'URL

L'interface Entry Web UI utilise le routage d'URL `#hash` afin que chaque onglet puisse être mis en favori, rechargé ou parcouru via l'historique du navigateur :

- `#config` — Construct
- `#author` — Git
- `#upgrade` — Updates
- `#recall` — Memories
- `#review` — Review
- `#maintain` — Core
- `#connect` — Connections

La barre latérale comprend une section **Workspace** pour les contrôles liés à l'espace de travail et affiche un badge de décompte sur **Review** dès que des constats, des candidats différés ou des reçus attendent un triage. Sur les écrans étroits, la barre latérale se replie dans un tiroir mobile que vous pouvez fermer avec le bouton de fermeture ou la touche `Escape`.

## Onglets en un coup d'œil

| Onglet | Hash | Rôle |
| --- | --- | --- |
| [Construct](construct.md) | `#config` | Configurer les champs d'exécution, profils, espaces de travail et l'état d'exécution d'Engram |
| [Git](../operations/git-author-settings.md) | `#author` | Gérer l'identité d'auteur et la configuration Git globale |
| [Updates](../operations/configuration-upgrades.md) | `#upgrade` | Vérifier les mises à jour du paquet et appliquer les mises à niveau de configuration |
| [Memories](memories.md) | `#recall` | Rechercher, simuler le routage, inspecter, promouvoir et archiver la mémoire active |
| [Review](review.md) | `#review` | Trier les reçus d'apprentissage de session, constats et écritures différées |
| [Core](core.md) | `#maintain` | Examiner les mémoires en doublon et en conflit |
| [Connections](connections.md) | `#connect` | Vérifier la santé Doctor, détecter les agents et lier les agents IA pris en charge |

## Étapes suivantes

- [Lancement du panneau de contrôle](launch.md)
- [Onglet Construct](construct.md)
- [Onglet Core](core.md)
- [Référence complète des champs](field-reference.md)


## Identité d’auteur Git {#git-author-identity}

Engram peut stocker un auteur global et une surcharge d’espace de travail facultative. La résolution suit l’ordre workspace, global, puis repli Git en lecture seule. Les paramètres n’affectent que les mémoires futures ; une surcharge d’espace de travail ne modifie jamais la configuration Git globale. Utilisez un plan explicite et une confirmation pour la synchronisation Git globale ou la migration des anciennes mémoires.

```bash
engram author show
engram author set --name "Jane Doe" --email "jane@example.com"
engram author unset --scope workspace
engram author sync-git-global --plan
engram author sync-git-global --confirm
engram author migrate-memories --plan
engram author migrate-memories --confirm
```

Lisez le [guide complet des paramètres de l’auteur Git](../operations/git-author-settings.md)
