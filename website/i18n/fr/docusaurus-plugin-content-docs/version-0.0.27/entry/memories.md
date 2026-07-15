---
title: Onglet Memories (Mémoires)
sidebar_position: 8
description: Inspectez le graphe de mémoire, prévisualisez les mémoires, modifiez-les et archivez-les.
---

import RiskCallout from '@site/src/components/RiskCallout';

# Onglet Memories

L'onglet Memories inspecte le graphe de mémoire et effectue des actions de maintenance de la mémoire.

## Jetons de portée (Scope chips)

Filtrez le graphe par source de mémoire. Comparez la mémoire de l'espace de travail à la mémoire globale. Commencez avec l'espace de travail actuel uniquement lorsque le graphe semble trop chargé en bruit.

## Jetons de type (Type chips)

Filtrez le graphe par type de mémoire. Inspectez séparément les règles, les compétences ou les connaissances.

## Commutateur des liens sémantiques

Affiche les arêtes sémantiques du graphe. Désactivez-le lorsque le graphe est visuellement trop chargé.

## Rafraîchir / reconstruire (Refresh / rebuild)

Recharge ou reconstruit les données du graphe. À utiliser après des modifications, des importations, des actions d'archivage ou des changements de configuration.

## Aperçu de la mémoire

Lit le contenu de la mémoire sélectionnée. Utile pour auditer ce que l'agent recevra.

<RiskCallout level="caution">
Le contenu local sensible peut être visible dans le navigateur. Traitez le panneau comme ouvert pendant la prévisualisation.
</RiskCallout>

## Modifier la mémoire

Ouvre le fichier dans un éditeur et copie le chemin. À utiliser pour une correction manuelle ou un examen. La source de vérité est le fichier Markdown.

## Archiver la mémoire

Supprime la mémoire du routage actif tout en la préservant dans `archive/`. Utilisez l'archivage, pas la suppression, pour l'auditabilité.

<RiskCallout level="caution">
L'archivage modifie le routage immédiatement. Utilisez l'archivage, pas la suppression manuelle, afin que l'historique soit préservé.
</RiskCallout>

## Équivalent CLI

```bash
engram graph "<topic>"
engram quality-check
engram archive --reason "<why>" <id-or-file>
```

## Étapes suivantes

- [Onglet Core](core.md)
- [Onglet Runtime](runtime.md)
