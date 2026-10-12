---
title: Onglet Review
sidebar_position: 5
description: Résolvez les constats de révision, orientez un agent IA et confirmez explicitement les écritures de mémoire de secours.
---

import RiskCallout from '@site/src/components/RiskCallout';

# Onglet Review

Review est la voie contrôlée pour traiter les constats et candidats différés. Cet onglet n’appelle jamais lui-même un fournisseur d’IA. Vous inspectez le contexte, copiez une invite délimitée destinée à un agent IA, puis laissez cet agent enregistrer via son terminal ou confirmez explicitement une réponse collée.

## File d’attente et contexte

La file combine les constats de révision et les candidats différés de la boîte de réception. Sélectionnez un élément pour inspecter son résumé, les métadonnées de mémoire liée et l’intégralité du contenu. Les fichiers liés vides ou indisponibles sont signalés sans interrompre la révision du reste de la file.

## Invite de révision pour IA

Choisissez une mémoire liée comme dépendance ou remplacement, puis utilisez **Copy AI review prompt**. L’invite ne contient que le candidat sélectionné, le contexte de mémoire visible, les instructions de relation et la portée d’écriture requise.

Lorsque l’agent IA dispose d’un accès au terminal et de l’approbation d’écrire, il doit enregistrer le résultat nettoyé à l’aide de la commande intégrée dans l’invite. La voie intégrée à l’application est un repli, pas une voie d’écriture autonome.

## Collage, diff et confirmation

Collez uniquement la proposition de mémoire révisée par l’IA. Review affiche un diff ligne par ligne en lecture seule : les lignes supprimées apparaissent en rouge et les lignes ajoutées en vert. **Approve & write** ouvre une boîte de dialogue de confirmation avant qu’Engram ne valide et n’écrive la proposition.

<RiskCallout level="risky">
La confirmation écrit immédiatement dans la mémoire du workspace ou globale. Relisez la proposition, la portée et toute consigne de remplacement avant de confirmer.
</RiskCallout>

Une seule relation de remplacement peut être sélectionnée. Les dépendances peuvent être sélectionnées indépendamment. Actualisez la file après l’enregistrement pour charger son état actuel.

## Étapes suivantes

- [Onglet Construct](construct.md)
- [Onglet Memories](memories.md)
- [CLI : save-session](../cli/save-session.md)
